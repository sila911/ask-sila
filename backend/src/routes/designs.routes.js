import { Router } from "express";
import {
  getDesigns,
  saveDesigns,
  deleteDesign,
} from "../controllers/designs.controller.js";
import { requireAdminAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", getDesigns);
router.post("/", requireAdminAuth, saveDesigns);
router.delete("/:id", requireAdminAuth, deleteDesign);

export default router;
