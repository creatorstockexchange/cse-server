import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/authentication.middleware.js";

const router = Router();

router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.me);

export default router;
