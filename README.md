# StayWise – Hotel Offer Orchestrator

A backend service that aggregates hotel offers from multiple suppliers, compares prices, and returns the cheapest available offer for each hotel.

Built with Node.js, TypeScript, Express, Temporal, Redis, and Docker Compose.

## Features

- Fetch hotel offers from two mock suppliers.
- Execute supplier requests concurrently using Temporal.
- Deduplicate hotels by normalized name.
- Select the lowest-priced offer when multiple suppliers return the same hotel.
- Preserve hotels available from only one supplier.
- Store aggregated results in Redis.
- Filter hotels by minimum and maximum price directly inside Redis.
- Cache hotel offers with a five-minute expiration.
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

The hotel search endpoint returns a JSON array of hotel offers.

Each hotel contains:

- `name`
- `price`
- `supplier`
- `commissionPct`

## Getting Started

### Prerequisites

- Git
- Docker Desktop

### Installation

Clone the repository:

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
docker compose up --build -d
```

Docker Compose starts four services:

| Service | Port | Purpose |
|---|---:|---|
| API | 3000 | Express REST API |
| Redis | 6379 | Offer storage and price filtering |
| Temporal | 7233 | Workflow orchestration; UI available on port 8233 |
| Worker | Internal | Executes Temporal workflows |

> **Note:** Temporal runs in development mode for this assignment. A production deployment should use a properly configured Temporal persistence backend and production infrastructure.

API base URL: `http://localhost:3000`

Temporal UI: `http://localhost:8233`

Check service status:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs --tail=50
```

Stop the environment:

```bash
docker compose down
```

### Example Requests

Get aggregated hotel offers:

```bash
curl "http://localhost:3000/api/hotels?city=delhi"
```

Filter offers by price:

```bash
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"
```

Example response:

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

## Architecture Overview

The hotel search request follows this flow:

1. Express receives and validates the request.
2. Redis is checked for an existing city snapshot.
3. On a cache miss, Express starts a Temporal workflow.
4. Temporal executes both supplier activities concurrently.
5. Supplier responses are combined and deduplicated.
6. The cheapest offer is retained for each hotel.
7. Aggregated offers are stored in Redis.
8. Redis applies the requested price filters.
9. Express returns the response.

The Temporal worker runs separately from the API process.

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

## Documentation

See [Project Documentation](docs/PROJECT.md) for:

- Assignment requirements.
- System architecture and workflow.
- API specifications.
- Temporal orchestration.
- Redis storage and price filtering.
- Docker environment.
- Testing strategy.
- Implementation status.

## Project Scope

This project demonstrates backend development, API integration, caching, workflow orchestration, and containerization as part of a technical assignment.