import { Router } from "express";

import { supplierAHotels } from "./supplier-a.data";
import { supplierBHotels } from "./supplier-b.data";

const router = Router();

// Returns Supplier A hotels for the requested city.
router.get("/supplierA/hotels", (req, res) => {
  const city = req.query.city;

  if (typeof city !== "string" || !city.trim()) {
    return res.status(400).json({
      error: "City query parameter is required",
    });
  }

  const hotels = supplierAHotels.filter(
    (hotel) => hotel.city === city.trim().toLowerCase(),
  );

  return res.json(hotels);
});

// Returns Supplier B hotels for the requested city.
router.get("/supplierB/hotels", (req, res) => {
  const city = req.query.city;

  if (typeof city !== "string" || !city.trim()) {
    return res.status(400).json({
      error: "City query parameter is required",
    });
  }

  const hotels = supplierBHotels.filter(
    (hotel) => hotel.city === city.trim().toLowerCase(),
  );

  return res.json(hotels);
});

export default router;
