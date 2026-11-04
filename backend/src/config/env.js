import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load in order of precedence: local overrides > base env
// 1. Root .env.local (generated/managed by `neon deploy`)
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
// 2. Backend .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
// 3. Backend .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// 4. Root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
// 5. Fallback process.cwd()
dotenv.config();

export default process.env;
