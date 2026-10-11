import { config } from "dotenv";

// Tests read their own environment (test database etc.), never the dev `.env`.
config({ path: ".env.test", quiet: true });
