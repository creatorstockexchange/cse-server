import { Router } from "express";
import CreatorOnboardingController from "../controllers/creator-onbording.controller.js";
import authMiddleware from "../middlewares/authentication.middleware.js";
import { validate } from "../middlewares/validate-creator-onbording.middleware.js";
import creatorSchema from "../schemas/creator.schema.js";

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

router.post(
  "/application",
  validate(creatorSchema.completeSubmission),
  CreatorOnboardingController.submitCompleteApplication
);

router.get(
  "/application",
  CreatorOnboardingController.getApplicationDetails
);

router.put(
  "/application",
  validate(creatorSchema.updateApplication),
  CreatorOnboardingController.updateApplication
);

router.delete(
  "/application",
  CreatorOnboardingController.withdrawApplication
);

router.get(
  "/application/status",
  CreatorOnboardingController.checkStatus
);

export default router;