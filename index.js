import { connectMongo } from "./config/mongo.js";
import app from "./app.js";

const PORT = process.env.PORT || 3030;

(async () => {
  try {
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT} ✅`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
})();
