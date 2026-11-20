# StayWise – Hotel Offer Orchestrator

A backend service that aggregates hotel offers from multiple suppliers, compares prices, and returns the cheapest available offer for each hotel.

Built with Node.js, TypeScript, Express, Temporal, and Redis.

## Features

- Fetch hotel offers from two mock suppliers.
- Execute supplier requests in parallel using Temporal.
- Deduplicate hotels by name.
- Select the lowest-priced offer when multiple suppliers return the same hotel.
- Preserve hotels available from only one supplier.
- Store aggregated results in Redis.
- Filter hotels by minimum and maximum price directly inside Redis.
- Cache hotel offers with a five-minute expiration.
- Docker-based local environment.
- Automated tests using Vitest.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| TypeScript | Application language |
| Express.js | REST API framework |
| Temporal.io | Workflow orchestration |
| Redis | Hotel offer storage and price filtering |
| Docker | Containerization |
| Docker Compose | Container orchestration |
| Vitest | Automated testing |
| Postman | API testing |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hotels?city=delhi` | Get aggregated hotel offers |
| GET | `/api/hotels?city=delhi&minPrice=3000&maxPrice=6000` | Filter offers by price |
| GET | `/supplierA/hotels?city=delhi` | Mock Supplier A API |
| GET | `/supplierB/hotels?city=delhi` | Mock Supplier B API |
| GET | `/health` | Application health check |

## Project Structure

    staywise-hotel-orchestrator/
    ├── src/
    │   ├── redis/
    │   │   └── hotel.repository.ts
    │   ├── suppliers/
    │   │   ├── supplier.routes.ts
    │   │   └── supplier.data.ts
    │   └── server.ts
    ├── tests/
    │   └── redis/
    │       └── hotel.repository.test.ts
    ├── docs/
    │   └── PROJECT.md
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    └── README.md

The project structure will expand as Temporal workflows, activities, and API integration are implemented.

## Getting Started

### Prerequisites

- Node.js
- npm
- Docker Desktop

### Installation

Clone the repository and install dependencies:

    git clone https://github.com/jaspreetsingh2701-cloud/staywise-hotel-orchestrator.git
    cd staywise-hotel-orchestrator
    npm install

### Environment Configuration

Create a `.env` file in the project root using `.env.example` as a reference.

    PORT=3000
    REDIS_URL=redis://localhost:6379
    TEMPORAL_ADDRESS=localhost:7233
    REDIS_TEST_URL=redis://localhost:6379/15

### Start Redis Using Docker

Start a local Redis container:

    docker run -d --name staywise-redis -p 6379:6379 redis:7-alpine

Verify the Redis connection:

    docker exec -it staywise-redis redis-cli PING

Expected response:

    PONG

If the container already exists, start it using:

    docker start staywise-redis

### Run the Application

Start the development server:

    npm run dev

The API will be available at:

    http://localhost:3000

### Run Tests

Execute the automated test suite:

    npm test

Run tests in watch mode:

    npm run test:watch

### Production Build

Compile the TypeScript application:

    npm run build

## Redis Implementation

Redis stores aggregated hotel offers so that subsequent requests can retrieve cached data without repeatedly calling supplier APIs.

The implementation uses:

- **Sorted Sets (ZSET):** Store normalized hotel names with hotel prices as scores.
- **Hashes:** Store complete hotel offer details as JSON.
- **Metadata keys:** Identify whether a city has a cached snapshot, including when the result contains zero hotels.
- **ZRANGEBYSCORE:** Perform minimum and maximum price filtering directly inside Redis.
- **Redis transactions:** Group cache replacement operations.
- **TTL:** Expire all snapshot keys after 300 seconds (5 minutes).

Each city has independent Redis keys.

For example:

    staywise:hotels:delhi:prices
    staywise:hotels:delhi:details
    staywise:hotels:delhi:metadata

The `HotelRepository` provides:

- `saveHotels(city, hotels)` – stores or replaces hotel offers for a city.
- `getHotels(city, filters)` – retrieves hotel offers with optional Redis-side price filtering.
- `hasSnapshot(city)` – checks whether a cached snapshot exists, even if it contains no hotels.

The metadata key distinguishes a cache miss from a cached empty result. This prevents unnecessary supplier calls when a city has already been searched and no hotels were found.

Price filtering is performed inside Redis rather than retrieving all records and filtering them in application code.

Automated tests cover:

- Saving and retrieving hotel offers.
- Minimum price filtering.
- Maximum price filtering.
- Combined price filtering.
- Empty search results.
- City isolation.
- Cache refresh behaviour.
- Cache snapshot detection.

## API Testing

A Postman collection will be provided in the `postman/` directory.

The collection will cover:

- Successful hotel aggregation.
- Duplicate hotel resolution using the lowest price.
- Hotels available from only one supplier.
- Minimum price filtering.
- Maximum price filtering.
- Combined price filtering.
- Empty search results.
- Supplier failure scenarios.

## Documentation

See [Project Documentation](docs/PROJECT.md) for:

- Assignment requirements.
- System architecture.
- API specifications.
- Supplier integration.
- Temporal orchestration.
- Redis storage and price filtering.
- Error handling.
- Development milestones.
- Testing strategy.

## License

This project is intended as a technical assignment and demonstration of backend development, API integration, caching, and workflow orchestration.
