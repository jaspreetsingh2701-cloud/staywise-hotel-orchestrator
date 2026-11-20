# Project Specification – StayWise

## 1. Overview

StayWise is a backend hotel offer aggregation service that fetches hotel listings from multiple suppliers, compares prices, and returns the cheapest available offer for each hotel.

The application uses:

- Express.js to expose REST APIs.
- Temporal to orchestrate supplier API calls.
- Redis to store aggregated hotel offers and perform price-based filtering.
- Docker Compose to run the application and supporting services.

The objective is to demonstrate backend API development, workflow orchestration, concurrent supplier integration, data aggregation, caching, and automated testing.

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
| `minPrice` | No | Minimum acceptable hotel price |
| `maxPrice` | No | Maximum acceptable hotel price |

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

The hotel search response contains:

- `city`
- `count`
- `hotels`

Each hotel contains:

- `name`
- `price`
- `supplier`
- `commissionPct`

## 5. End-to-End Workflow

The implemented hotel search workflow is:

1. Client requests hotel offers for a city.
2. Express validates the request and query parameters.
3. Express checks Redis for a cached hotel snapshot.
4. If a cached snapshot exists, Redis applies the requested price filters.
5. If no cached snapshot exists, Express initiates a Temporal workflow.
6. Temporal executes Supplier A and Supplier B activities concurrently.
7. Both supplier responses are combined.
8. Hotels are deduplicated by normalized name.
9. The lowest-priced offer is selected for each hotel.
10. Aggregated results are stored in Redis.
11. Redis applies the requested price filters.
12. The final hotel list is returned to the client.

A cached empty result is considered a valid snapshot. The application does not repeatedly call suppliers when a previous search returned no hotels and its cache has not expired.

## 6. Architecture

The application has the following components.

### Express API

- Handles incoming HTTP requests.
- Validates query parameters.
- Coordinates the hotel search process.
- Checks Redis for cached results.
- Initiates Temporal workflows when required.
- Returns appropriate HTTP responses.

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

## 7. Redis Strategy

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

## 8. Error Handling

The application includes:

- Required query parameter validation.
- Non-negative numeric price validation.
- Minimum and maximum price range validation.
- Supplier HTTP error handling.
- Temporal activity retry configuration.
- Redis connection error logging.
- API error responses and logging.

## 9. Docker Environment

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

## 10. Testing Strategy

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

### Docker Integration Verification

The Dockerized application has been verified for:

- Successful hotel aggregation.
- Duplicate hotel resolution.
- Single-supplier hotel retention.
- Combined minimum and maximum price filtering.
- Empty filtered results.
- API, Redis, Temporal, and worker startup.

## 11. Development Milestones

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

### Remaining

- [ ] Prepare Postman collection covering successful aggregation, filtering, empty results, and supplier failure scenarios.
- [ ] Complete final review and submit the feature branch PR.

## 12. Implementation Guidelines

- Use TypeScript interfaces for shared data structures.
- Keep controllers focused on HTTP handling.
- Keep external supplier I/O inside Temporal activities.
- Ensure Temporal workflows remain deterministic.
- Configure retries for supplier activities.
- Perform price filtering inside Redis.
- Keep comments focused on important business logic.
- Avoid unnecessary abstractions and dependencies.