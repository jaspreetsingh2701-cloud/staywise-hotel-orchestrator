# StayWise – Hotel Offer Orchestrator

A backend service that aggregates hotel offers from multiple suppliers, compares prices, and returns the best available offer for each hotel.

Built with Node.js, TypeScript, Express, Temporal, and Redis.

## Features

- Fetch hotel offers from two mock suppliers.
- Execute supplier requests in parallel using Temporal.
- Deduplicate hotels by name.
- Select the lowest-priced offer for each hotel.
- Store aggregated results in Redis.
- Filter hotels by minimum and maximum price.
- Docker-based local environment.

## Tech Stack

- Node.js
- TypeScript
- Express.js
- Temporal.io
- Redis
- Docker & Docker Compose
- Postman

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hotels?city=delhi` | Get aggregated hotel offers |
| GET | `/api/hotels?city=delhi&minPrice=3000&maxPrice=6000` | Filter offers by price |
| GET | `/supplierA/hotels` | Mock Supplier A API |
| GET | `/supplierB/hotels` | Mock Supplier B API |
| GET | `/health` | Application and supplier health |

## Project Structure

The source structure and setup instructions will be updated as implementation progresses.

## Getting Started

Setup instructions will be added once the initial application and Docker configuration are implemented.

## API Testing

A Postman collection will be provided in the `postman/` directory.

## Documentation

See [Project Documentation](docs/PROJECT.md) for requirements, architecture, and implementation details.

## License

This project is intended as a technical assignment and demonstration of backend development and workflow orchestration.