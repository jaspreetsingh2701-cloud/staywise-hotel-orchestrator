import "dotenv/config";
import { runHotelSearch } from "./temporal.client";

const city = process.argv[2] ?? "delhi";

runHotelSearch(city)
  .then((hotels) => {
    console.log("Aggregated hotel offers:");
    console.table(hotels);
  })
  .catch((error) => {
    console.error("Hotel search workflow failed:", error);
    process.exitCode = 1;
  });
