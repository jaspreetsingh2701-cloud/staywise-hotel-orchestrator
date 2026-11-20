import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "redis";

import { HotelRepository } from "../../src/redis/hotel.repository";

const redis = createClient({
  url: process.env.REDIS_TEST_URL || "redis://localhost:6379/15",
});

const repository = new HotelRepository(redis);

const hotels = [
  {
    name: "Holtin",
    price: 5340,
    supplier: "Supplier B",
    commissionPct: 20,
  },
  {
    name: "Radison",
    price: 5900,
    supplier: "Supplier A",
    commissionPct: 13,
  },
  {
    name: "Lemon Tree",
    price: 4200,
    supplier: "Supplier B",
    commissionPct: 18,
  },
  {
    name: "Taj Palace",
    price: 8500,
    supplier: "Supplier A",
    commissionPct: 15,
  },
];

describe("HotelRepository", () => {
  beforeAll(async () => {
    await redis.connect();
  });

  beforeEach(async () => {
    // Use a dedicated Redis database for tests.
    await redis.flushDb();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("saves and retrieves hotels for a city", async () => {
    await repository.saveHotels("delhi", hotels);

    const result = await repository.getHotels("delhi");

    expect(result).toHaveLength(4);
    expect(result).toEqual(expect.arrayContaining(hotels));
  });

  it("returns hotels matching the minimum price", async () => {
    await repository.saveHotels("delhi", hotels);

    const result = await repository.getHotels("delhi", {
      minPrice: 5000,
    });

    expect(result.map((hotel) => hotel.name)).toEqual([
      "Holtin",
      "Radison",
      "Taj Palace",
    ]);
  });

  it("returns hotels matching the maximum price", async () => {
    await repository.saveHotels("delhi", hotels);

    const result = await repository.getHotels("delhi", {
      maxPrice: 5500,
    });

    expect(result.map((hotel) => hotel.name)).toEqual(["Lemon Tree", "Holtin"]);
  });

  it("returns hotels within an inclusive price range", async () => {
    await repository.saveHotels("delhi", hotels);

    const result = await repository.getHotels("delhi", {
      minPrice: 5000,
      maxPrice: 6000,
    });

    expect(result.map((hotel) => hotel.name)).toEqual(["Holtin", "Radison"]);
  });

  it("returns an empty array when no hotels match", async () => {
    await repository.saveHotels("delhi", hotels);

    const result = await repository.getHotels("delhi", {
      minPrice: 12000,
      maxPrice: 15000,
    });

    expect(result).toEqual([]);
  });

  it("does not return hotels belonging to another city", async () => {
    await repository.saveHotels("delhi", hotels);

    const result = await repository.getHotels("mumbai");

    expect(result).toEqual([]);
  });

  it("replaces old hotel data when a city is refreshed", async () => {
    await repository.saveHotels("delhi", hotels);

    const refreshedHotels = [
      {
        name: "Holtin",
        price: 5200,
        supplier: "Supplier B",
        commissionPct: 20,
      },
      {
        name: "Radison",
        price: 5700,
        supplier: "Supplier A",
        commissionPct: 13,
      },
    ];

    await repository.saveHotels("delhi", refreshedHotels);

    const result = await repository.getHotels("delhi");

    expect(result).toHaveLength(2);
    expect(result).toEqual(refreshedHotels);
  });

  it("returns false when no snapshot exists for a city", async () => {
    const result = await repository.hasSnapshot("delhi");

    expect(result).toBe(false);
  });

  it("recognizes an empty hotel result as a cached snapshot", async () => {
    await repository.saveHotels("delhi", []);

    const result = await repository.hasSnapshot("delhi");

    expect(result).toBe(true);
  });
});
