import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Try backend/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// 2. Try root .env if running from workspace root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
// 3. Fallback to process.cwd()
dotenv.config();

export default process.env;
