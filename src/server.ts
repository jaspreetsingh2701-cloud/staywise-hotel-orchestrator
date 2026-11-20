import express from "express";
import dotenv from "dotenv";

import supplierRoutes from "./suppliers/supplier.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "staywise-api",
  });
});

// Mock supplier endpoints.
app.use(supplierRoutes);

app.listen(PORT, () => {
  console.log(`StayWise API running on port ${PORT}`);
});
