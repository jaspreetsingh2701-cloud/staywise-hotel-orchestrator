import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchSupplierAHotelsMock, fetchSupplierBHotelsMock } = vi.hoisted(
  () => ({
    fetchSupplierAHotelsMock: vi.fn(),
    fetchSupplierBHotelsMock: vi.fn(),
  }),
);

vi.mock("@temporalio/workflow", () => ({
  proxyActivities: () => ({
    fetchSupplierAHotels: fetchSupplierAHotelsMock,
    fetchSupplierBHotels: fetchSupplierBHotelsMock,
  }),
}));

import { hotelSearchWorkflow } from "../../src/temporal/workflows/hotel.workflow";

const supplierAHotels = [
  {
    name: "Holtin",
    price: 6000,
    supplier: "Supplier A",
    commissionPct: 10,
  },
  {
    name: "Radison",
    price: 5900,
    supplier: "Supplier A",
    commissionPct: 13,
  },
];

const supplierBHotels = [
  {
    name: "Holtin",
    price: 5340,
    supplier: "Supplier B",
    commissionPct: 20,
  },
  {
    name: "Lemon Tree",
    price: 4200,
    supplier: "Supplier B",
    commissionPct: 18,
  },
];

describe("hotelSearchWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchSupplierAHotelsMock.mockResolvedValue(supplierAHotels);
    fetchSupplierBHotelsMock.mockResolvedValue(supplierBHotels);
  });

  it("aggregates offers when both suppliers succeed", async () => {
    const result = await hotelSearchWorkflow("delhi");

    expect(result).toHaveLength(3);

    expect(result).toContainEqual(supplierBHotels[0]);
    expect(result).toContainEqual(supplierAHotels[1]);
    expect(result).toContainEqual(supplierBHotels[1]);
  });

  it("returns Supplier A offers when Supplier B fails", async () => {
    fetchSupplierBHotelsMock.mockRejectedValue(
      new Error("Supplier B unavailable"),
    );

    const result = await hotelSearchWorkflow("delhi");

    expect(result).toEqual(supplierAHotels);
  });

  it("returns Supplier B offers when Supplier A fails", async () => {
    fetchSupplierAHotelsMock.mockRejectedValue(
      new Error("Supplier A unavailable"),
    );

    const result = await hotelSearchWorkflow("delhi");

    expect(result).toEqual(supplierBHotels);
  });

  it("throws an error when both suppliers fail", async () => {
    fetchSupplierAHotelsMock.mockRejectedValue(
      new Error("Supplier A unavailable"),
    );

    fetchSupplierBHotelsMock.mockRejectedValue(
      new Error("Supplier B unavailable"),
    );

    await expect(hotelSearchWorkflow("delhi")).rejects.toThrow(
      "Both suppliers failed",
    );
  });

  it("returns an empty array when both suppliers succeed with no offers", async () => {
    fetchSupplierAHotelsMock.mockResolvedValue([]);
    fetchSupplierBHotelsMock.mockResolvedValue([]);

    const result = await hotelSearchWorkflow("delhi");

    expect(result).toEqual([]);
  });
});
