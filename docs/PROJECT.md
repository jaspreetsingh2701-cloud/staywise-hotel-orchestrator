# Project Specification – StayWise

## 1. Overview

StayWise is a backend hotel offer aggregation service that fetches hotel listings from multiple suppliers, compares prices, and returns the cheapest available offer for each hotel.

Temporal is used for workflow orchestration, while Redis stores aggregated results and supports price-based filtering.

## 2. Objectives

- Fetch hotel listings from two mock suppliers concurrently.
- Deduplicate hotels based on their names.
- Select the cheapest offer when a hotel exists in both suppliers.
- Retain hotels available from only one supplier.
- Store aggregated results in Redis.
- Support minimum and maximum price filtering.

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| TypeScript | Application language |
| Express.js | REST API |
| Temporal.io | Workflow orchestration |
| Redis | Caching and price filtering |
| Docker Compose | Container orchestration |
| Postman | API testing |

## 4. API Requirements

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hotels?city=delhi` | Fetch aggregated hotel offers |
| GET | `/api/hotels?city=delhi&minPrice=3000&maxPrice=6000` | Filter hotels by price |
| GET | `/supplierA/hotels` | Mock Supplier A |
| GET | `/supplierB/hotels` | Mock Supplier B |
| GET | `/health` | Check application and supplier health |

### Response Format

Each hotel should contain:

- `name`
- `price`
- `supplier`
- `commissionPct`

Example:

\`\`\`json
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
\`\`\`

## 5. Workflow

1. Client requests hotels for a city.
2. Express initiates a Temporal workflow.
3. Temporal executes Supplier A and Supplier B activities concurrently.
4. Both supplier responses are combined.
5. Hotels are deduplicated by name.
6. The lowest-priced offer is selected for each hotel.
7. Aggregated results are stored in Redis.
8. Optional price filters are applied using Redis.
9. The final hotel list is returned to the client.

## 6. Architecture

The application has three primary responsibilities:

- **Express API:** Handles incoming HTTP requests and responses.
- **Temporal:** Orchestrates supplier activities and hotel aggregation.
- **Redis:** Stores aggregated offers and supports price-range queries.

Temporal workflows and workers will run as separate processes.

## 7. Redis Strategy

Use Redis Sorted Sets (ZSET) to index hotels by price.

- Store aggregated hotel information.
- Maintain a city-specific price index.
- Retrieve hotels within a requested minimum and maximum price.
- Keep cached results consistent when a city is refreshed.

## 8. Error Handling

- Validate required query parameters.
- Handle supplier failures.
- Configure Temporal activity retries.
- Handle Redis connection failures.
- Return meaningful HTTP status codes and error messages.

## 9. Development Milestones

1. Initialize Node.js and TypeScript.
2. Implement mock supplier APIs.
3. Integrate Redis.
4. Configure Temporal workflows and activities.
5. Implement aggregation and deduplication.
6. Implement Redis price filtering.
7. Add error handling and health checks.
8. Configure Docker Compose.
9. Prepare Postman collection and deployment documentation.

## 10. Implementation Guidelines

- Keep the implementation simple and readable.
- Use TypeScript interfaces for shared data structures.
- Keep controllers focused on HTTP handling.
- Keep external I/O inside Temporal activities.
- Add comments around important functions and business logic.
- Avoid unnecessary abstractions and dependencies.