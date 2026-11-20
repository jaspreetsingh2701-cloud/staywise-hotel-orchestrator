# Project Specification – StayWise

## 1. Overview

StayWise is a backend hotel offer aggregation service that fetches hotel listings from multiple suppliers, compares prices, and returns the cheapest available offer for each hotel.

The application uses:

- Express.js to expose REST APIs.
- Temporal to orchestrate supplier API calls.
- Redis to store aggregated hotel offers and perform price-based filtering.

The objective is to demonstrate backend API development, workflow orchestration, concurrent supplier integration, data aggregation, caching, and automated testing.

## 2. Objectives

- Expose a hotel search API.
- Integrate two mock hotel suppliers.
- Fetch supplier data concurrently.
- Deduplicate hotels by name.
- Select the cheapest offer when the same hotel is available from multiple suppliers.
- Retain hotels available from only one supplier.
- Store aggregated results in Redis.
- Support minimum and maximum price filtering.
- Handle supplier and infrastructure failures.
- Provide a Docker-based local development environment.

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Application runtime |
| TypeScript | Application language |
| Express.js | REST API framework |
| Temporal.io | Workflow orchestration |
| Redis | Hotel offer storage and price filtering |
| Docker | Containerization |
| Docker Compose | Local service orchestration |
| Vitest | Automated testing |
| Postman | API testing |

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

Each hotel in the response should contain:

- `name`
- `price`
- `supplier`
- `commissionPct`

Example:

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

## 5. Target Workflow

The intended end-to-end workflow is:

1. Client requests hotel offers for a city.
2. Express validates the request and query parameters.
3. Express checks Redis for a cached hotel snapshot.
4. If a cached snapshot exists, Redis applies the requested price filters.
5. If no cached snapshot exists, Express initiates a Temporal workflow.
6. Temporal executes Supplier A and Supplier B activities concurrently.
7. Both supplier responses are combined.
8. Hotels are deduplicated by name.
9. The lowest-priced offer is selected for each hotel.
10. Aggregated results are stored in Redis.
11. Redis applies the requested price filters.
12. The final hotel list is returned to the client.

A cached empty result is still considered a valid snapshot. The application should not repeatedly call suppliers when a previous search returned no hotels and its cache has not expired.

The Temporal orchestration and API integration will be implemented in subsequent milestones.

## 6. Architecture

The application has three primary responsibilities.

### Express API

- Handles incoming HTTP requests.
- Validates query parameters.
- Coordinates the hotel search process.
- Returns appropriate HTTP responses.

### Temporal

- Orchestrates supplier API activities.
- Executes supplier calls concurrently.
- Manages workflow execution and activity retries.
- Coordinates the aggregation process.

### Redis

- Stores aggregated hotel offers.
- Maintains city-specific price indexes.
- Retrieves complete hotel details.
- Performs minimum and maximum price filtering.
- Identifies whether a cached snapshot exists.

Temporal workflows and workers will run as separate processes.

External I/O, such as supplier HTTP requests and Redis operations, should be handled inside Temporal activities rather than workflow code.

Workflows should remain deterministic, and activities should be safe to retry where practical.

## 7. Redis Strategy

Redis stores aggregated hotel offers so that subsequent API requests can retrieve results without repeatedly calling supplier APIs.

### Data Structures

The implementation uses three Redis keys per city:

1. **Sorted Set (ZSET):** Stores normalized hotel names as members and hotel prices as scores.
2. **Hash:** Stores complete hotel offer details as JSON, using the normalized hotel name as the field.
3. **Metadata key:** Identifies whether a cached snapshot exists, including when the result contains zero hotels.

Example Redis keys:

    staywise:hotels:delhi:prices
    staywise:hotels:delhi:details
    staywise:hotels:delhi:metadata

    staywise:hotels:mumbai:prices
    staywise:hotels:mumbai:details
    staywise:hotels:mumbai:metadata

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

1. The existing price index, hotel details, and metadata keys are deleted.
2. The latest hotel offers are written to the Sorted Set and Hash.
3. A metadata marker is written to indicate that a snapshot exists.
4. All snapshot keys receive a TTL of 300 seconds (5 minutes).

When the supplier search returns no hotels, the repository still writes the metadata marker. This distinguishes a cached empty result from a cache miss.

Redis transactions (`MULTI` / `EXEC`) group the refresh operations.

The TTL provides a bounded cache lifetime and helps prevent indefinitely stale offers.

### Repository Responsibilities

`HotelRepository` encapsulates Redis operations:

- `saveHotels(city, hotels)` – stores or replaces a city's hotel offers.
- `getHotels(city, filters)` – retrieves offers with optional Redis-side price filtering.
- `hasSnapshot(city)` – checks whether a cached snapshot exists, including an empty result.

The repository keeps Redis-specific operations separate from API and supplier orchestration logic.

### Redis Configuration

Redis connection is configured through environment variables:

| Variable | Purpose |
|---|---|
| `REDIS_URL` | Application Redis connection |
| `REDIS_TEST_URL` | Separate Redis database used by integration tests |

Example configuration:

    REDIS_URL=redis://localhost:6379
    REDIS_TEST_URL=redis://localhost:6379/15

The test database is isolated from the application database to avoid interfering with application data.

## 8. Error Handling

The application should:

- Validate required query parameters.
- Reject invalid price ranges.
- Handle supplier API failures.
- Configure Temporal activity retries.
- Handle Redis connection failures.
- Return meaningful HTTP status codes and error messages.
- Log relevant failures for debugging.

## 9. Development Milestones

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

### Pending

- [ ] Configure Temporal workflows and activities.
- [ ] Implement supplier orchestration and hotel aggregation.
- [ ] Implement hotel deduplication and cheapest-offer selection.
- [ ] Integrate Redis with the hotel search API.
- [ ] Add error handling and health checks.
- [ ] Configure Docker Compose.
- [ ] Prepare Postman collection.
- [ ] Complete deployment and setup documentation.

## 10. Implementation Guidelines

- Use TypeScript interfaces for shared data structures.
- Keep controllers focused on HTTP handling.
- Keep external I/O inside Temporal activities.
- Ensure Temporal workflows remain deterministic.
- Make activities safe to retry where practical.
- Perform price filtering inside Redis.
- Add comments around important functions and business logic.
- Avoid unnecessary abstractions and dependencies.

## 11. Testing Strategy

Automated tests are written using Vitest.

### Redis Repository Tests

The Redis repository tests cover:

- Saving and retrieving hotel offers.
- Retrieving offers using minimum price.
- Retrieving offers using maximum price.
- Applying minimum and maximum price together.
- Handling empty search results.
- Keeping city data isolated.
- Replacing previously cached data during refresh.
- Detecting cache misses and cached empty snapshots.

Integration tests use a separate Redis database to avoid interfering with application data.

### API Tests

The Postman collection will cover:

- Successful hotel search.
- Duplicate hotel resolution.
- Single-supplier hotel results.
- Price filtering.
- Empty results.
- Supplier failure scenarios.
