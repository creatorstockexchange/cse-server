import type { Response } from "express";
import type creatorSchema from "../schemas/creator.schema.js";
import * as z from "zod";
import { prisma } from "../db.js";
import Send from "../utils/response.utils.js";
import AuthRequest from "../types/authRequest.type.js";

class CreatorOnboardingController {
  // Step 1: Submit initial creator application
  static submitApplication = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const { contentOwnershipDeclared } = req.body as z.infer<typeof creatorSchema.submitApplication>;

    try {
      // Check if user already has an application
      const existingApplication = await prisma.creator_applications.findFirst({
        where: { user_id: userId }
      });

      if (existingApplication) {
        return Send.error(res, null, "Application already exists.");
      }

      const application = await prisma.creator_applications.create({
        data: {
          user_id: userId,
          content_ownership_declared: contentOwnershipDeclared,
          state: "submitted"
        }
      });

      return Send.success(res, {
        id: application.id,
        state: application.state,
        submittedAt: application.submitted_at
      });
    } catch (error) {
      return Send.error(res, null, "Failed to submit application.");
    }
  };

  // Step 2: Create creator profile
  static createProfile = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const profileData = req.body as z.infer<typeof creatorSchema.createProfile>;

    try {
      // Check if application exists and is approved
      const application = await prisma.creator_applications.findFirst({
        where: { user_id: userId }
      });

      if (!application) {
        return Send.error(res, null, "No application found. Please submit an application first.");
      }

      if (application.state !== "approved") {
        return Send.error(res, null, "Application must be approved before creating profile.");
      }

      // Check if profile already exists
      const existingProfile = await prisma.creator_profiles.findFirst({
        where: { user_id: userId }
      });

      if (existingProfile) {
        return Send.error(res, null, "Creator profile already exists.");
      }

      // Check if creator_handle or token_symbol is already taken
      const handleExists = await prisma.creator_profiles.findFirst({
        where: { creator_handle: profileData.creatorHandle }
      });

      if (handleExists) {
        return Send.error(res, null, "Creator handle already taken.");
      }

      const symbolExists = await prisma.creator_profiles.findFirst({
        where: { token_symbol: profileData.tokenSymbol }
      });

      if (symbolExists) {
        return Send.error(res, null, "Token symbol already taken.");
      }

      const profile = await prisma.creator_profiles.create({
        data: {
          user_id: userId,
          full_name: profileData.fullName,
          creator_handle: profileData.creatorHandle,
          bio: profileData.bio,
          category: profileData.category,
          custom_category: profileData.customCategory,
          token_name: profileData.tokenName,
          token_symbol: profileData.tokenSymbol,
          token_pitch: profileData.tokenPitch,
          funding_goal: profileData.fundingGoal,
          ico_supply: profileData.icoSupply,
          wallet: profileData.wallet,
          phone_number: profileData.phoneNumber,
          profile_picture: profileData.profilePicture,
          status: "inactive"
        }
      });

      return Send.success(res, {
        id: profile.id,
        creatorHandle: profile.creator_handle,
        tokenSymbol: profile.token_symbol,
        status: profile.status
      });
    } catch (error) {
      return Send.error(res, null, "Failed to create creator profile.");
    }
  };

  // Step 3: Upload documents
  static uploadDocument = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const documentData = req.body as z.infer<typeof creatorSchema.uploadDocument>;

    try {
      const document = await prisma.creator_documents.create({
        data: {
          user_id: userId,
          type: documentData.type,
          file_url: documentData.fileUrl,
          notes: documentData.notes
        }
      });

      // Log the action
      await prisma.verification_logs.create({
        data: {
          user_id: userId,
          action: "document_uploaded",
          actor: `user_${userId}`,
          metadata: {
            documentId: document.id,
            documentType: document.type
          }
        }
      });

      return Send.success(res, {
        id: document.id,
        type: document.type,
        status: document.status
      });
    } catch (error) {
      return Send.error(res, null, "Failed to upload document.");
    }
  };

  // Step 4: Add social links
  static addSocialLink = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const socialData = req.body as z.infer<typeof creatorSchema.addSocialLink>;

    try {
      // Check if social link already exists for this platform
      const existingLink = await prisma.creator_social_links.findFirst({
        where: {
          user_id: userId,
          platform: socialData.platform
        }
      });

      if (existingLink) {
        return Send.error(res, null, `Social link for ${socialData.platform} already exists.`);
      }

      const socialLink = await prisma.creator_social_links.create({
        data: {
          user_id: userId,
          platform: socialData.platform,
          handle: socialData.handle,
          url: socialData.url,
          follower_count: socialData.followerCount
        }
      });

      return Send.success(res, {
        id: socialLink.id,
        platform: socialLink.platform,
        handle: socialLink.handle,
        verified: socialLink.verified
      });
    } catch (error) {
      return Send.error(res, null, "Failed to add social link.");
    }
  };

  // Get creator profile
  static getProfile = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const profile = await prisma.creator_profiles.findFirst({
        where: { user_id: userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!profile) {
        return Send.error(res, null, "Creator profile not found.");
      }

      return Send.success(res, profile);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch creator profile.");
    }
  };

  // Get application status
  static getApplicationStatus = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const application = await prisma.creator_applications.findFirst({
        where: { user_id: userId }
      });

      if (!application) {
        return Send.error(res, null, "No application found.");
      }

      return Send.success(res, {
        id: application.id,
        state: application.state,
        submittedAt: application.submitted_at,
        reviewedAt: application.reviewed_at,
        approvedAt: application.approved_at,
        rejectionReason: application.rejection_reason
      });
    } catch (error) {
      return Send.error(res, null, "Failed to fetch application status.");
    }
  };

  // Get all documents
  static getDocuments = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const documents = await prisma.creator_documents.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      return Send.success(res, documents);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch documents.");
    }
  };

  // Get all social links
  static getSocialLinks = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const socialLinks = await prisma.creator_social_links.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      return Send.success(res, socialLinks);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch social links.");
    }
  };

  // Update profile
  static updateProfile = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const updateData = req.body as z.infer<typeof creatorSchema.updateProfile>;

    try {
      const profile = await prisma.creator_profiles.findFirst({
        where: { user_id: userId }
      });

      if (!profile) {
        return Send.error(res, null, "Creator profile not found.");
      }

      const updatedProfile = await prisma.creator_profiles.update({
        where: { id: profile.id },
        data: {
          bio: updateData.bio,
          phone_number: updateData.phoneNumber,
          profile_picture: updateData.profilePicture,
          engagement_metrics: updateData.engagementMetrics
        }
      });

      return Send.success(res, updatedProfile);
    } catch (error) {
      return Send.error(res, null, "Failed to update profile.");
    }
  };

  // Delete social link
  static deleteSocialLink = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { id } = req.params;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const socialLink = await prisma.creator_social_links.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!socialLink) {
        return Send.error(res, null, "Social link not found.");
      }

      await prisma.creator_social_links.delete({
        where: { id }
      });

      return Send.success(res, { message: "Social link deleted successfully." });
    } catch (error) {
      return Send.error(res, null, "Failed to delete social link.");
    }
  };

  // Get onboarding progress
  static getOnboardingProgress = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const application = await prisma.creator_applications.findFirst({
        where: { user_id: userId }
      });

      const profile = await prisma.creator_profiles.findFirst({
        where: { user_id: userId }
      });

      const documents = await prisma.creator_documents.findMany({
        where: { user_id: userId }
      });

      const socialLinks = await prisma.creator_social_links.findMany({
        where: { user_id: userId }
      });

      const progress = {
        applicationSubmitted: !!application,
        applicationApproved: application?.state === "approved",
        profileCreated: !!profile,
        documentsUploaded: documents.length > 0,
        socialLinksAdded: socialLinks.length > 0,
        completionPercentage: 0
      };

      let completed = 0;
      const total = 5;

      if (progress.applicationSubmitted) completed++;
      if (progress.applicationApproved) completed++;
      if (progress.profileCreated) completed++;
      if (progress.documentsUploaded) completed++;
      if (progress.socialLinksAdded) completed++;

      progress.completionPercentage = Math.round((completed / total) * 100);

      return Send.success(res, progress);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch onboarding progress.");
    }
  };
}

export default CreatorOnboardingController;