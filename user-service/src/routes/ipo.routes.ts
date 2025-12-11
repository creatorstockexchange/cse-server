import { Router } from "express";
import IpoController from "../controllers/ipo.controller.js";
import authMiddleware from "../middlewares/authentication.middleware.js";
import { validate, validateQuery, validateParams } from "../middlewares/validate-creator-onbording.middleware.js";
import ipoSchema from "../schemas/ipo.schema.js";

const router = Router();

router.use(authMiddleware);

// IPO CRUD Operations
router.post(
  "/",
  validate(ipoSchema.createIpo),
  IpoController.createIpo
);

router.get(
  "/my-ipo",
  IpoController.getMyIpo
);

router.get(
  "/",
  validateQuery(ipoSchema.filterIpos),
  IpoController.getAllIpos
);

router.get(
  "/:id",
  validateParams(ipoSchema.getIpoById),
  IpoController.getIpoById
);

router.patch(
  "/:id",
  validateParams(ipoSchema.getIpoById),
  validate(ipoSchema.updateIpo),
  IpoController.updateIpo
);

router.delete(
  "/:id",
  validateParams(ipoSchema.getIpoById),
  IpoController.deleteIpo
);

// IPO Workflow Operations
router.post(
  "/:id/submit",
  validateParams(ipoSchema.getIpoById),
  validate(ipoSchema.submitForReview),
  IpoController.submitForReview
);

router.post(
  "/:id/review",
  validateParams(ipoSchema.getIpoById),
  validate(ipoSchema.reviewIpo),
  IpoController.reviewIpo
);

router.post(
  "/:id/launch",
  validateParams(ipoSchema.getIpoById),
  validate(ipoSchema.launchIpo),
  IpoController.launchIpo
);

router.post(
  "/:id/cancel",
  validateParams(ipoSchema.getIpoById),
  IpoController.cancelIpo
);

// Investment Operations
router.post(
  "/investments",
  validate(ipoSchema.createInvestment),
  IpoController.createInvestment
);

router.get(
  "/investments/my-investments",
  IpoController.getMyInvestments
);

router.get(
  "/:id/investments",
  validateParams(ipoSchema.getIpoById),
  IpoController.getIpoInvestments
);

router.post(
  "/investments/claim",
  validate(ipoSchema.claimTokens),
  IpoController.claimTokens
);

// Update Operations
router.post(
  "/updates",
  validate(ipoSchema.createUpdate),
  IpoController.createUpdate
);

router.get(
  "/:id/updates",
  validateParams(ipoSchema.getIpoById),
  IpoController.getIpoUpdates
);

export default router;
