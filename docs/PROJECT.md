
# Project Specification – StayWise

## 1. Overview

StayWise is a backend hotel offer aggregation service that fetches hotel listings from multiple suppliers, compares prices, and returns the cheapest available offer for each hotel.

The application uses:

- Express.js to expose REST APIs.
- Temporal to orchestrate supplier API calls.
- Redis to store aggregated hotel offers and perform price-based filtering.
- Docker Compose to run the application and supporting services.
- Vitest for automated testing.

The objective is to demonstrate backend API development, workflow orchestration, concurrent supplier integration, data aggregation, caching, concurrency handling, and automated testing.

## 2. Objectives

- Expose a hotel search API.
- Integrate two mock hotel suppliers.
- Fetch supplier data concurrently.
- Deduplicate hotels by name.
- Select the cheapest offer when the same hotel is available from multiple suppliers.
- Retain hotels available from only one supplier.
- Store aggregated results in Redis.
- Support minimum and maximum price filtering inside Redis.
- Handle supplier and infrastructure failures.
- Prevent duplicate supplier workflows for concurrent requests for the same city.
- Provide a Docker-based environment.

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Application runtime |
| TypeScript | Application language |
| Express.js | REST API framework |
| Temporal | Workflow orchestration |
| Redis | Hotel offer storage and price filtering |
| Docker | Containerization |
| Docker Compose | Service orchestration |
| Vitest | Automated testing |

## 4. API Requirements

### Hotel Search API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hotels?city=delhi` | Fetch aggregated hotel offers |
| GET | `/api/hotels?city=delhi&minPrice=3000&maxPrice=6000` | Filter hotels by price |

Query parameters:

| Parameter | Required | Description |
|---|---|---|
| `city` | Yes | City for hotel search |
| `minPrice` | No | Minimum acceptable price |
| `maxPrice` | No | Maximum acceptable price |

Price filters must be valid non-negative numbers. The minimum price cannot exceed the maximum price.

### Mock Supplier APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/supplierA/hotels?city=delhi` | Mock Supplier A |
| GET | `/supplierB/hotels?city=delhi` | Mock Supplier B |

Both supplier APIs accept a city query parameter.

### Health API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check application health |

### Response Format

The hotel search endpoint returns a JSON array of hotel offers.

Each hotel contains:

- `name`
- `price`
- `supplier`
- `commissionPct`

Example:

```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  }
]
```

## 5. End-to-End Workflow

The implemented hotel search workflow is:

1. Client requests hotel offers for a city.
2. Express validates the request and query parameters.
3. The `HotelSearchService` checks whether a search for the city is already in progress.
4. If an in-flight search exists, the request joins the existing promise.
5. Otherwise, the service checks Redis for a cached hotel snapshot.
6. If a cached snapshot exists, Redis applies the requested price filters.
7. If no cached snapshot exists, the service starts a Temporal workflow.
8. Temporal executes Supplier A and Supplier B activities concurrently.
9. Both supplier responses are combined.
10. Hotels are deduplicated by normalized name.
11. The lowest-priced offer is selected for each hotel.
12. Aggregated results are stored in Redis.
13. Redis applies the requested price filters.
14. The final hotel list is returned to the client.

A cached empty result is considered a valid snapshot. The application does not repeatedly call suppliers when a previous search returned no hotels and its cache has not expired.

Concurrent requests for the same city share the same in-flight operation. Requests for different cities can execute independently.

## 6. Architecture

The application has the following components.

### Express API

- Handles incoming HTTP requests.
- Validates query parameters.
- Coordinates the hotel search process.
- Checks Redis for cached results through the hotel search service.
- Initiates or joins Temporal workflows when required.
- Returns appropriate HTTP responses.

### Hotel Search Service

- Coordinates cache checks and refresh operations.
- Maintains an in-memory Map of in-flight searches keyed by city.
- Ensures concurrent requests for the same city share one operation.
- Allows searches for different cities to run independently.
- Removes completed or failed promises from the in-flight Map.
- Allows subsequent requests to retry after a failed search.

### Temporal

- Orchestrates supplier API activities.
- Executes supplier calls concurrently.
- Configures activity retries.
- Coordinates hotel aggregation through the workflow.

### Supplier Activities

- Call the mock supplier endpoints.
- Normalize supplier responses into the common hotel offer format.
- Return supplier offers to the workflow.

### Hotel Aggregator

- Deduplicates hotels using normalized names.
- Compares prices for duplicate hotels.
- Retains the cheapest offer.
- Preserves single-supplier hotels.

### Redis

- Stores aggregated hotel offers.
- Maintains city-specific price indexes.
- Retrieves complete hotel details.
- Performs minimum and maximum price filtering.
- Identifies whether a cached snapshot exists.

Temporal workers run separately from the Express API.

External I/O, such as supplier HTTP requests, is handled inside Temporal activities. Workflow code coordinates the activities and aggregation.

## 7. Request Coalescing: Design Decision

### 7.1 Problem

Before request coalescing, the API checked Redis for a city snapshot and started a Temporal workflow whenever the snapshot was missing.

This could produce duplicate work when multiple requests for the same city arrived concurrently.

For example:

1. Request A checks Redis and finds no Delhi snapshot.
2. Request B checks Redis before Request A has saved its results.
3. Request B also finds a cache miss.
4. Both requests start separate Temporal workflows.
5. Both workflows call the suppliers and attempt to refresh the same Redis snapshot.

This results in unnecessary supplier calls, duplicate Temporal workflows, and competing cache refreshes.

### 7.2 Options Evaluated

Two approaches were considered.

#### Option A: In-Process Request Coalescing

Maintain a shared in-memory Map of promises, keyed by city.

When a request arrives:

1. Check whether a search for the city is already in progress.
2. If one exists, reuse its promise.
3. Otherwise, create a new refresh operation and register its promise.
4. Check Redis for an existing snapshot.
5. If the snapshot is missing, execute the Temporal workflow and save the results.
6. Remove the promise from the Map when the operation completes or fails.

Advantages:

- Simple implementation.
- No additional infrastructure or Redis lock management.
- Prevents duplicate workflows within the same API process.
- Supports independent searches for different cities.
- Failed operations are cleaned up, allowing subsequent retries.
- Straightforward to test using mocked Temporal calls.

Limitation:

- The in-memory Map is local to one API process.
- Multiple API instances do not share their in-flight state.

Estimated implementation effort: 30–45 minutes.

#### Option B: Redis Distributed Lock

Use Redis to coordinate cache refreshes across multiple API instances.

A request would attempt to acquire a lock associated with the city before starting a Temporal workflow.

Other requests would wait for the lock holder to complete the refresh, then retrieve the resulting snapshot.

Advantages:

- Coordinates refreshes across multiple API instances.
- Suitable for horizontally scaled API deployments.
- Provides distributed coordination through Redis.

Trade-offs:

- More implementation complexity.
- Requires lock ownership and safe release handling.
- Requires lock expiration and recovery considerations.
- Requires handling contention, timeouts, and failed lock holders.
- Requires additional tests for distributed lock behavior.

Estimated implementation effort: 1–2 hours.

### 7.3 Selected Approach: Option A

Option A, in-process request coalescing, was selected.

Reasons:

1. The current assignment uses a single API process.
2. The application does not currently require coordination between multiple API instances.
3. An in-memory promise Map solves the duplicate-work problem without introducing distributed locking complexity.
4. Temporal already handles supplier orchestration and retries.
5. The implementation is easy to test and explain.
6. The solution avoids adding unnecessary infrastructure or dependencies.

Option B remains a suitable future improvement if the API is deployed across multiple instances.

### 7.4 Implementation

The implementation is contained in:

- `src/hotels/hotel-search.service.ts`
- `src/hotels/hotel.routes.ts`

The service maintains:

```ts
private readonly inFlightSearches = new Map<string, Promise<void>>();
```

The Map uses the normalized city as its key.

The service:

- Reuses an existing promise for concurrent requests.
- Registers a new promise before awaiting the Redis cache check.
- Runs Temporal only when no cached snapshot exists.
- Saves aggregated results to Redis.
- Removes completed or failed promises in a `finally` block.

The hotel router creates one `HotelSearchService` instance when the router is initialized. This allows incoming requests handled by the same API process to share the in-flight Map.

### 7.5 Failure Handling

If a Temporal workflow fails:

1. The shared promise rejects.
2. All concurrent callers waiting on that promise receive the failure.
3. The `finally` block removes the failed promise from the Map.
4. A subsequent request can start a new search.

This prevents failed in-flight entries from blocking future searches.

### 7.6 Known Limitation

Request coalescing is currently process-local.

If the application is scaled to multiple API instances, each instance maintains its own in-flight Map. Two instances could still initiate separate workflows for the same city.

A Redis distributed lock or another distributed coordination mechanism would be appropriate in that deployment scenario.

## 8. Redis Strategy

Redis stores aggregated hotel offers so subsequent API requests can retrieve results without repeatedly calling supplier APIs.

### Data Structures

The implementation uses three Redis keys per city:

1. **Sorted Set (ZSET):** Stores normalized hotel names as members and hotel prices as scores.
2. **Hash:** Stores complete hotel offer details as JSON.
3. **Metadata key:** Identifies whether a cached snapshot exists, including when the result contains zero hotels.

Example Redis keys:

```text
staywise:hotels:delhi:prices
staywise:hotels:delhi:details
staywise:hotels:delhi:metadata
```

### Price Filtering

Price filtering is performed directly inside Redis using `ZRANGEBYSCORE`.

- `minPrice` specifies the minimum acceptable price.
- `maxPrice` specifies the maximum acceptable price.
- Both boundaries are inclusive.
- If no filters are supplied, all cached offers for the city are returned.

The repository retrieves matching hotel identifiers from the Sorted Set and fetches their complete details from the Hash.

This ensures price filtering happens in Redis rather than retrieving all records and filtering them in application code.

### Cache Refresh and Expiration

Each city has an independent cache.

When a city is refreshed:

1. Existing price index, hotel details, and metadata keys are deleted.
2. Latest hotel offers are written to the Sorted Set and Hash.
3. A metadata marker is written to indicate that a snapshot exists.
4. All snapshot keys receive a TTL of 300 seconds (5 minutes).

When the supplier search returns no hotels, the repository still writes the metadata marker. This distinguishes a cached empty result from a cache miss.

Redis transactions (`MULTI` / `EXEC`) group the refresh operations.

### Repository Responsibilities

`HotelRepository` encapsulates Redis operations:

- `saveHotels(city, hotels)` – stores or replaces hotel offers.
- `getHotels(city, filters)` – retrieves hotel offers with optional Redis-side price filtering.
- `hasSnapshot(city)` – checks whether a cached snapshot exists, including an empty result.

The repository keeps Redis-specific operations separate from API and supplier orchestration logic.

### Redis Configuration

| Variable | Purpose |
|---|---|
| `REDIS_URL` | Application Redis connection |
| `REDIS_TEST_URL` | Separate Redis database used by integration tests |

Example:

```env
REDIS_URL=redis://localhost:6379
REDIS_TEST_URL=redis://localhost:6379/15
```

## 9. Error Handling

The application includes:

- Required query parameter validation.
- Non-negative numeric price validation.
- Minimum and maximum price range validation.
- Supplier HTTP error handling.
- Temporal activity retry configuration.
- Redis connection error logging.
- API error responses and logging.
- Cleanup of failed in-flight search operations.

## 10. Docker Environment

Docker Compose runs four services:

| Service | Responsibility |
|---|---|
| API | Express application |
| Worker | Temporal workflow execution |
| Redis | Hotel offer storage and price filtering |
| Temporal | Workflow orchestration server |

The API and worker use the same application image with separate startup commands.

The worker connects to Temporal using the `hotel-search` task queue. Supplier activities access the supplier endpoints through the Docker network.

The Temporal development server UI is available at `http://localhost:8233`.

The current Temporal configuration is intended for local development and assignment demonstration, not production deployment.

## 11. Testing Strategy

Automated tests are written using Vitest.

### Aggregator Tests

- Select the cheapest duplicate offer.
- Retain single-supplier hotels.
- Match names case-insensitively and ignore surrounding whitespace.
- Handle empty input.

### Redis Repository Tests

- Save and retrieve hotel offers.
- Apply minimum price filtering.
- Apply maximum price filtering.
- Apply combined price filtering.
- Handle empty search results.
- Keep city data isolated.
- Replace previously cached data during refresh.
- Detect cache misses and cached empty snapshots.

### Hotel Search Service Tests

- Verify that concurrent requests for the same city trigger only one Temporal workflow.
- Verify that different cities trigger independent workflows.
- Verify that an existing Redis snapshot bypasses Temporal.
- Verify that a failed workflow is removed from the in-flight Map and can be retried.
- Verify that concurrent callers share workflow failures.

The Temporal client is mocked in these tests, so the request-coalescing behavior can be verified without requiring a running Temporal server.

### Current Test Results

| Test area | Tests |
|---|---:|
| Hotel aggregation | 4 |
| Redis repository | 9 |
| Hotel search service | 5 |
| **Total** | **18** |

All 18 tests passed during the latest verification.

The TypeScript build also completed successfully.

### Docker Integration Verification

The Dockerized application has been verified for:

- Successful hotel aggregation.
- Duplicate hotel resolution.
- Single-supplier hotel retention.
- Combined minimum and maximum price filtering.
- Empty filtered results.
- API, Redis, Temporal, and worker startup.

## 12. Development Milestones

### Completed

- [x] Initialize Node.js and TypeScript.
- [x] Configure Express application.
- [x] Implement mock supplier APIs.
- [x] Configure Vitest.
- [x] Implement Redis hotel repository.
- [x] Implement Redis Sorted Set price indexing.
- [x] Implement Redis Hash-based hotel details.
- [x] Implement Redis-side price filtering.
- [x] Implement cache refresh and expiration.
- [x] Implement cached snapshot detection.
- [x] Add Redis repository tests.
- [x] Implement hotel aggregation and deduplication.
- [x] Implement Temporal workflows and supplier activities.
- [x] Execute supplier calls concurrently.
- [x] Integrate Temporal and Redis with the hotel search API.
- [x] Add API validation and error handling.
- [x] Configure Docker Compose.
- [x] Verify Dockerized end-to-end hotel search.
- [x] Update API response to the required JSON array format.
- [x] Update Postman collection for the API response contract.
- [x] Standardize hotel-name normalization.
- [x] Document Temporal development-mode configuration.
- [x] Implement in-process request coalescing.
- [x] Add request-coalescing tests.
- [x] Verify TypeScript build and all 18 automated tests.

### Remaining

- [ ] Complete final review and merge the request-coalescing feature PR.

## 13. Implementation Guidelines

- Use TypeScript interfaces for shared data structures.
- Keep controllers focused on HTTP handling.
- Keep external supplier I/O inside Temporal activities.
- Ensure Temporal workflows remain deterministic.
- Configure retries for supplier activities.
- Perform price filtering inside Redis.
- Use request coalescing to avoid duplicate workflows within an API process.
- Keep comments focused on important business logic.
- Avoid unnecessary abstractions and dependencies.
