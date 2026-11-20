import { describe, expect, it } from "vitest";
import { aggregateHotels } from "../../../src/hotels/hotel.aggregator";

describe("aggregateHotels", () => {
  it("selects the cheapest offer for duplicate hotels", () => {
    const result = aggregateHotels([
      {
        name: "Holtin",
        price: 6000,
        supplier: "Supplier A",
        commissionPct: 10,
      },
      {
        name: "Holtin",
        price: 5340,
        supplier: "Supplier B",
        commissionPct: 20,
      },
    ]);

    expect(result).toEqual([
      {
        name: "Holtin",
        price: 5340,
        supplier: "Supplier B",
        commissionPct: 20,
      },
    ]);
  });

  it("retains hotels available from only one supplier", () => {
    const result = aggregateHotels([
      {
        name: "Taj Palace",
        price: 8500,
        supplier: "Supplier A",
        commissionPct: 15,
      },
      {
        name: "Lemon Tree",
        price: 4200,
        supplier: "Supplier B",
        commissionPct: 18,
      },
    ]);

    expect(result).toHaveLength(2);
  });

  it("matches duplicate hotel names without case sensitivity", () => {
    const result = aggregateHotels([
      {
        name: "Holtin",
        price: 6000,
        supplier: "Supplier A",
        commissionPct: 10,
      },
      {
        name: " holtin ",
        price: 5340,
        supplier: "Supplier B",
        commissionPct: 20,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(5340);
  });

  it("returns an empty array when no hotels are available", () => {
    expect(aggregateHotels([])).toEqual([]);
  });
});
