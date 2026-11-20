import { beforeEach, describe, expect, it, vi } from "vitest";

const { runHotelSearchMock } = vi.hoisted(() => ({
  runHotelSearchMock: vi.fn(),
}));

vi.mock("../../src/temporal/temporal.client", () => ({
  runHotelSearch: runHotelSearchMock,
}));

import type { HotelOffer } from "../../src/redis/hotel.repository";
import { HotelSearchService } from "../../src/hotels/hotel-search.service";

const sampleHotels: HotelOffer[] = [
  {
    name: "Holtin",
    price: 5340,
    supplier: "Supplier B",
    commissionPct: 20,
  },
];

function createRepositoryMock() {
  return {
    hasSnapshot: vi.fn().mockResolvedValue(false),
    saveHotels: vi.fn().mockResolvedValue(undefined),
  };
}

describe("HotelSearchService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runHotelSearchMock.mockResolvedValue(sampleHotels);
  });

  it("runs only one workflow for concurrent requests for the same city", async () => {
    const repository = createRepositoryMock();
    const service = new HotelSearchService(repository as never);

    let resolveSearch!: (offers: HotelOffer[]) => void;

    runHotelSearchMock.mockImplementation(
      () =>
        new Promise<HotelOffer[]>((resolve) => {
          resolveSearch = resolve;
        }),
    );

    const requestA = service.ensureSnapshot("delhi");
    const requestB = service.ensureSnapshot("delhi");

    await vi.waitFor(() => {
      expect(runHotelSearchMock).toHaveBeenCalledTimes(1);
    });

    resolveSearch(sampleHotels);

    await Promise.all([requestA, requestB]);

    expect(repository.saveHotels).toHaveBeenCalledTimes(1);
    expect(repository.saveHotels).toHaveBeenCalledWith("delhi", sampleHotels);
  });

  it("runs independent workflows for different cities", async () => {
    const repository = createRepositoryMock();
    const service = new HotelSearchService(repository as never);

    await Promise.all([
      service.ensureSnapshot("delhi"),
      service.ensureSnapshot("mumbai"),
    ]);

    expect(runHotelSearchMock).toHaveBeenCalledTimes(2);
    expect(repository.saveHotels).toHaveBeenCalledTimes(2);
  });

  it("does not run a workflow when a cached snapshot exists", async () => {
    const repository = createRepositoryMock();
    repository.hasSnapshot.mockResolvedValue(true);

    const service = new HotelSearchService(repository as never);

    await service.ensureSnapshot("delhi");

    expect(runHotelSearchMock).not.toHaveBeenCalled();
    expect(repository.saveHotels).not.toHaveBeenCalled();
  });

  it("cleans up a failed workflow so a subsequent request can retry", async () => {
    const repository = createRepositoryMock();
    const service = new HotelSearchService(repository as never);

    runHotelSearchMock
      .mockRejectedValueOnce(new Error("Temporal unavailable"))
      .mockResolvedValueOnce(sampleHotels);

    await expect(service.ensureSnapshot("delhi")).rejects.toThrow(
      "Temporal unavailable",
    );

    await expect(service.ensureSnapshot("delhi")).resolves.toBeUndefined();

    expect(runHotelSearchMock).toHaveBeenCalledTimes(2);
    expect(repository.saveHotels).toHaveBeenCalledTimes(1);
  });

  it("shares workflow failures across concurrent requests", async () => {
    const repository = createRepositoryMock();
    const service = new HotelSearchService(repository as never);

    let rejectSearch!: (error: Error) => void;

    runHotelSearchMock.mockImplementation(
      () =>
        new Promise<HotelOffer[]>((_, reject) => {
          rejectSearch = reject;
        }),
    );

    const requestA = service.ensureSnapshot("delhi");
    const requestB = service.ensureSnapshot("delhi");

    await vi.waitFor(() => {
      expect(runHotelSearchMock).toHaveBeenCalledTimes(1);
    });

    rejectSearch(new Error("Supplier workflow failed"));

    await expect(Promise.all([requestA, requestB])).rejects.toThrow(
      "Supplier workflow failed",
    );

    expect(repository.saveHotels).not.toHaveBeenCalled();
  });
});
