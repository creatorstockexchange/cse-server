import { Router } from "express";
import CreatorOnboardingController from "../controllers/creator-onbording.controller.js";
import authMiddleware from "../middlewares/authentication.middleware.js";
import { validate } from "../middlewares/validate-creator-onbording.middleware.js";
import creatorSchema from "../schemas/creator.schema.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/application",
  validate(creatorSchema.submitApplication),
  CreatorOnboardingController.submitApplication
);

router.get(
  "/application/status",
  CreatorOnboardingController.getApplicationStatus
);

router.post(
  "/profile",
  validate(creatorSchema.createProfile),
  CreatorOnboardingController.createProfile
);

router.get(
  "/profile",
  CreatorOnboardingController.getProfile
);

router.patch(
  "/profile",
  validate(creatorSchema.updateProfile),
  CreatorOnboardingController.updateProfile
);

router.post(
  "/documents",
  validate(creatorSchema.uploadDocument),
  CreatorOnboardingController.uploadDocument
);

router.get(
  "/documents",
  CreatorOnboardingController.getDocuments
);

router.post(
  "/social-links",
  validate(creatorSchema.addSocialLink),
  CreatorOnboardingController.addSocialLink
);

router.get(
  "/social-links",
  CreatorOnboardingController.getSocialLinks
);

router.delete(
  "/social-links/:id",
  CreatorOnboardingController.deleteSocialLink
);

router.get(
  "/progress",
  CreatorOnboardingController.getOnboardingProgress
);

export default router;