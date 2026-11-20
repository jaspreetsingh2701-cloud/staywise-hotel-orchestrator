import "dotenv/config";

import express from "express";

import supplierRoutes from "./suppliers/supplier.routes";
import { createHotelRouter } from "./hotels/hotel.routes";
import redisClient from "./redis/redis.client";
import { HotelRepository } from "./redis/hotel.repository";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "staywise-api",
  });
});

// Mock supplier endpoints.
app.use(supplierRoutes);

async function startServer() {
  await redisClient.connect();

  const hotelRepository = new HotelRepository(redisClient);

  app.use("/api/hotels", createHotelRouter(hotelRepository));

  app.listen(PORT, () => {
    console.log(`StayWise API running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start StayWise API:", error);
  process.exit(1);
});
