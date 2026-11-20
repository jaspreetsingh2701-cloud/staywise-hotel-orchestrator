import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic application health check.
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "staywise-api"
  });
});

app.listen(PORT, () => {
  console.log(`StayWise API running on port ${PORT}`);
});