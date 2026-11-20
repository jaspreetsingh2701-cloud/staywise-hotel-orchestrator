import { Router } from "express";

import type { HotelRepository } from "../redis/hotel.repository";
import { runHotelSearch } from "../temporal/temporal.client";

export function createHotelRouter(repository: HotelRepository) {
  const router = Router();

  router.get("/", async (req, res) => {
    const city =
      typeof req.query.city === "string"
        ? req.query.city.trim().toLowerCase()
        : "";

    if (!city) {
      return res.status(400).json({
        error: "City query parameter is required",
      });
    }

    const parsePrice = (value: unknown): number | undefined => {
      if (value === undefined) return undefined;

      if (typeof value !== "string" || value.trim() === "") {
        return NaN;
      }

      return Number(value);
    };

    const minPrice = parsePrice(req.query.minPrice);
    const maxPrice = parsePrice(req.query.maxPrice);

    if (
      (minPrice !== undefined &&
        (!Number.isFinite(minPrice) || minPrice < 0)) ||
      (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0))
    ) {
      return res.status(400).json({
        error: "Price filters must be valid non-negative numbers",
      });
    }

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      return res.status(400).json({
        error: "minPrice cannot exceed maxPrice",
      });
    }

    try {
      const hasSnapshot = await repository.hasSnapshot(city);

      if (!hasSnapshot) {
        const offers = await runHotelSearch(city);
        await repository.saveHotels(city, offers);
      }

      const hotels = await repository.getHotels(city, {
        minPrice,
        maxPrice,
      });

      return res.status(200).json(hotels);
    } catch (error) {
      console.error("Hotel search failed:", error);

      return res.status(502).json({
        error: "Unable to retrieve hotel offers",
      });
    }
  });

  return router;
}
