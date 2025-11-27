import { Router } from "express";
import DepositController from "../controllers/deposit.controller.js";

const router = Router();

router.post("/deposit-address", DepositController.createDepositAddress);

export default router;