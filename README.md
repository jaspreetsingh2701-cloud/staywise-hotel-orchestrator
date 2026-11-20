# StayWise – Hotel Offer Orchestrator

A backend service that aggregates hotel offers from multiple suppliers, compares prices, and returns the cheapest available offer for each hotel.

Built with Node.js, TypeScript, Express, Temporal, Redis, and Docker Compose.

## Features

- Fetch hotel offers from two mock suppliers.
- Execute supplier requests concurrently using Temporal.
- Deduplicate hotels by normalized name.
- Select the lowest-priced offer when multiple suppliers return the same hotel.
- Preserve hotels available from only one supplier.
- Handle partial supplier failures without discarding successful supplier results.
- Retry supplier activities through Temporal.
- Store aggregated results in Redis.
- Filter hotels by minimum and maximum price directly inside Redis.
- Cache hotel offers with a five-minute expiration.
- Coalesce concurrent requests for the same city to prevent duplicate Temporal workflows.
- Allow independent hotel searches for different cities.
- Run the application and supporting services using Docker Compose.
- Automated tests using Vitest.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| TypeScript | Application language |
| Express.js | REST API framework |
| Temporal | Workflow orchestration |
| Redis | Hotel offer storage and price filtering |
| Docker | Containerization |
| Docker Compose | Service orchestration |
| Vitest | Automated testing |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hotels?city=delhi` | Get aggregated hotel offers |
| GET | `/api/hotels?city=delhi&minPrice=3000&maxPrice=6000` | Filter offers by price |
| GET | `/supplierA/hotels?city=delhi` | Mock Supplier A API |
| GET | `/supplierB/hotels?city=delhi` | Mock Supplier B API |
| GET | `/health` | Application health check |

### Query Parameters

| Parameter | Required | Description |
|---|---|---|
| `city` | Yes | City for hotel search |
| `minPrice` | No | Minimum acceptable hotel price |
| `maxPrice` | No | Maximum acceptable hotel price |

Validation includes:

- City is required and cannot be blank.
- Price filters must be valid non-negative numbers.
- Minimum price cannot exceed maximum price.

The hotel search endpoint returns a JSON array of hotel offers.

Each hotel contains:

- `name`
- `price`
- `supplier`
- `commissionPct`

### Example Response

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

## Interactive API Testing Console

A separate Next.js application is available for testing the StayWise APIs through a browser-based interface.

**[StayWise API Console – GitHub Repository](https://github.com/jaspreetsingh2701-cloud/staywise-api-console)**

The console provides:

- Backend health-check verification.
- Independent testing of Supplier A and Supplier B.
- Aggregated hotel searches.
- Minimum and maximum price filtering.
- Quick tests for empty results, invalid price ranges, and missing city.
- HTTP status and response-time inspection.
- Raw JSON response inspection.

### Run the Console Locally

The console runs independently of the backend.

First, start the backend using Docker Compose as described below.

Clone the console repository:

```bash
git clone https://github.com/jaspreetsingh2701-cloud/staywise-api-console.git
cd staywise-api-console
npm install
```

Create `.env.local` using `.env.example` as a reference:

```env
STAYWISE_API_URL=http://localhost:3000
```

Start the console on port 3001:

```bash
npm run dev -- --port 3001
```

Open:

http://localhost:3001

The console communicates with the backend through its Next.js server-side proxy.

> **Note:** The console is a separate testing application. It does not replace or modify the StayWise backend. Publicly accessible testing requires both the console and backend to be deployed and configured with reachable URLs.

## Getting Started

### Prerequisites

- Git
- Node.js 20.9+
- Docker Desktop
- Docker Compose

### Clone the Repository

```bash
git clone https://github.com/jaspreetsingh2701-cloud/staywise-hotel-orchestrator.git
cd staywise-hotel-orchestrator
```

### Environment Configuration

Create a `.env` file using `.env.example` as a reference.

| Variable | Purpose |
|---|---|
| `PORT` | Express API port |
| `SUPPLIER_API_URL` | Base URL used by supplier activities |
| `REDIS_URL` | Redis connection URL |
| `TEMPORAL_ADDRESS` | Temporal server address |

### Start the Application

Start all services using Docker Compose:

```bash
docker compose up -d --build
```

Docker Compose starts four services:

| Service | Port | Purpose |
|---|---:|---|
| API | 3000 | Express REST API |
| Redis | 6379 | Offer storage and price filtering |
| Temporal | 7233 | Workflow orchestration; UI available on port 8233 |
| Worker | Internal | Executes Temporal workflows |

> **Note:** Temporal runs in development mode for this assignment. A production deployment should use a properly configured Temporal persistence backend and production infrastructure.

API base URL: http://localhost:3000

Temporal UI: http://localhost:8233

### Docker Commands

Validate Docker and Compose installation:

```bash
docker --version
docker compose version
```

Validate the Compose configuration:

```bash
docker compose config
```

Start or rebuild all services:

```bash
docker compose up -d --build --force-recreate
```

Check service status:

```bash
docker compose ps
```

View all service logs:

```bash
docker compose logs --tail=50
```

Inspect Temporal worker logs:

```bash
docker compose logs worker --tail 50
```

Stop the environment:

```bash
docker compose down
```

The shutdown command preserves named Docker volumes unless they are explicitly removed.

### Verify the Application

Check application health:

```bash
curl http://localhost:3000/health
```

Check both supplier APIs:

```bash
curl "http://localhost:3000/supplierA/hotels?city=delhi"
curl "http://localhost:3000/supplierB/hotels?city=delhi"
```

Get aggregated hotel offers:

```bash
curl "http://localhost:3000/api/hotels?city=delhi"
```

Filter offers by price:

```bash
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"
```

Test an empty price range:

```bash
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=1000&maxPrice=2000"
```

### PowerShell Verification

For Windows PowerShell users:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Inspect the raw JSON response:

```powershell
$response = Invoke-WebRequest -UseBasicParsing "http://localhost:3000/api/hotels?city=delhi"
$response.Content
```

Check filtered results:

```powershell
Invoke-RestMethod "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"
```

### Redis Cache Inspection

List Delhi cache keys:

```bash
docker exec staywise-redis redis-cli KEYS "staywise:hotels:delhi:*"
```

Clear only the Delhi cache snapshot when a fresh supplier search is required:

```bash
docker exec staywise-redis redis-cli DEL staywise:hotels:delhi:prices staywise:hotels:delhi:details staywise:hotels:delhi:metadata
```

> **Caution:** The `DEL` command removes the specified cached data. Use it only when intentionally testing cache refresh behavior.

## Architecture Overview

The hotel search request follows this flow:

1. Express receives and validates the request.
2. The hotel search service checks whether a refresh for the requested city is already in progress.
3. Redis is checked for an existing city snapshot.
4. If a snapshot exists, cached results are used.
5. On a cache miss, the service starts or joins an in-flight Temporal search for that city.
6. Temporal executes both supplier activities concurrently.
7. Supplier activities retry failed requests according to the configured retry policy.
8. Successful supplier responses are combined.
9. Hotels are deduplicated by normalized name.
10. The cheapest offer is retained for each hotel.
11. Aggregated offers are stored in Redis.
12. Redis applies the requested price filters.
13. Express returns the response.

The Temporal worker runs separately from the API process.

### Supplier Failure Handling

The Temporal workflow uses `Promise.allSettled` to handle supplier results independently.

- If both suppliers succeed, their offers are aggregated.
- If Supplier A fails, successful Supplier B offers are retained.
- If Supplier B fails, successful Supplier A offers are retained.
- If both suppliers fail, the workflow fails and the API reports the error.

This prevents a single supplier outage from unnecessarily discarding valid offers from the other supplier.

### Concurrent Request Handling

The `HotelSearchService` uses an in-memory Map of promises to coordinate concurrent hotel searches.

- Concurrent requests for the same city share one in-flight search.
- Requests for different cities can execute independently.
- Completed or failed searches are removed from the in-flight Map.
- A failed search can be retried by a subsequent request.
- Once a snapshot exists in Redis, subsequent requests use the cached result.

This implementation uses in-process request coalescing. Each API process maintains its own in-flight Map; distributed coordination would be needed if the API were deployed across multiple instances.

## Redis Implementation

Redis stores aggregated hotel offers so subsequent requests can retrieve cached results without repeatedly calling supplier APIs.

The implementation uses:

- **Sorted Sets (ZSET):** Store normalized hotel names with prices as scores.
- **Hashes:** Store complete hotel offer details as JSON.
- **Metadata keys:** Identify whether a cached snapshot exists, including when the result contains zero hotels.
- **ZRANGEBYSCORE:** Perform minimum and maximum price filtering directly inside Redis.
- **Redis transactions:** Group cache replacement operations.
- **TTL:** Expire snapshot keys after 300 seconds (5 minutes).

Each city has independent Redis keys.

Example:

```text
staywise:hotels:delhi:prices
staywise:hotels:delhi:details
staywise:hotels:delhi:metadata
```

The `HotelRepository` provides:

- `saveHotels(city, hotels)` – stores or replaces hotel offers.
- `getHotels(city, filters)` – retrieves offers with optional Redis-side price filtering.
- `hasSnapshot(city)` – checks whether a cached snapshot exists, including an empty result.

The metadata key distinguishes a cache miss from a cached empty result.

Price filtering is performed inside Redis rather than retrieving all records and filtering them in application code.

## Testing

Run automated tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Build the TypeScript application:

```bash
npm run build
```

### Automated Test Coverage

The automated test suite covers:

- Hotel aggregation and duplicate resolution.
- Hotel-name normalization.
- Redis storage and price filtering.
- Cached snapshot detection.
- Concurrent request coalescing.
- Independent searches for different cities.
- Failed workflow cleanup and retry behavior.
- Concurrent callers sharing workflow failures.
- Temporal workflow success and supplier failure scenarios.
- Empty supplier results.

Latest verified automated test results:

| Test Area | Tests |
|---|---:|
| Hotel aggregation | 4 |
| Redis repository | 9 |
| Hotel search service | 5 |
| Temporal workflow | 5 |
| **Total** | **23** |

All 23 automated tests passed during the latest verification.

The TypeScript build also completed successfully.

### Docker Integration Verification

The Dockerized application has been verified for:

- Successful API, Redis, Temporal, and worker startup.
- Successful supplier API responses.
- Hotel aggregation and duplicate resolution.
- Single-supplier hotel retention.
- Combined minimum and maximum price filtering.
- Empty filtered results.
- Correct bare JSON array response format.
- Partial Supplier B outage with Supplier A results retained.
- Recovery after restoring Supplier B.
- Fresh cache population after clearing the city snapshot.

## Postman Collection

A Postman collection is included in the repository for testing the API endpoints.

It covers:

- Health check.
- Supplier A and Supplier B endpoints.
- Aggregated hotel search.
- Price filtering.
- Empty results.
- Invalid and missing query parameters.

Import the collection into Postman and use `http://localhost:3000` as the local backend base URL.

## Documentation

See [Project Documentation](docs/PROJECT.md) for:

- Assignment requirements.
- System architecture and workflow.
- API specifications.
- Temporal orchestration and supplier failure handling.
- Redis storage and price filtering.
- Request coalescing design decision.
- Docker environment and verification.
- Testing strategy.
- Implementation status.

## Project Scope

This project demonstrates backend development, API integration, caching, workflow orchestration, concurrency handling, failure handling, automated testing, and containerization as part of a technical assignment.