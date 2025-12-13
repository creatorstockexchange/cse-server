import type { Response } from "express";
import type creatorSchema from "../schemas/creator.schema.js";
import * as z from "zod";
import { prisma } from "../db.js";
import Send from "../utils/response.utils.js";
import AuthRequest from "../types/authRequest.type.js";

class CreatorOnboardingController {
  static submitCompleteApplication = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const submissionData = req.body as z.infer<typeof creatorSchema.completeSubmission>;

    try {
      // Check if user already has an application
      const existingApplication = await prisma.creator_applications.findFirst({
        where: { user_id: userId }
      });

      if (existingApplication) {
        return Send.error(res, null, "Application already exists.");
      }

      // Check if creator_handle or token_symbol is already taken
      const handleExists = await prisma.creator_profiles.findFirst({
        where: { creator_handle: submissionData.profile.creatorHandle }
      });

      if (handleExists) {
        return Send.error(res, null, "Creator handle already taken.");
      }

      const symbolExists = await prisma.creator_profiles.findFirst({
        where: { token_symbol: submissionData.profile.tokenSymbol }
      });

      if (symbolExists) {
        return Send.error(res, null, "Token symbol already taken.");
      }

      // Check for duplicate social platforms
      const platforms = submissionData.socialLinks.map(link => link.platform);
      const uniquePlatforms = new Set(platforms);
      if (platforms.length !== uniquePlatforms.size) {
        return Send.error(res, null, "Duplicate social media platforms found.");
      }

      // Use transaction to ensure all data is saved together
      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Create application
        const application = await tx.creator_applications.create({
          data: {
            user_id: userId,
            content_ownership_declared: submissionData.contentOwnershipDeclared,
            state: "pending_review"
          }
        });

        // 2. Create profile (in draft state until approved)
        const profile = await tx.creator_profiles.create({
          data: {
            user_id: userId,
            full_name: submissionData.profile.fullName,
            creator_handle: submissionData.profile.creatorHandle,
            bio: submissionData.profile.bio,
            category: submissionData.profile.category,
            custom_category: submissionData.profile.customCategory,
            token_name: submissionData.profile.tokenName,
            token_symbol: submissionData.profile.tokenSymbol,
            token_pitch: submissionData.profile.tokenPitch,
            funding_goal: submissionData.profile.fundingGoal,
            ico_supply: submissionData.profile.icoSupply,
            wallet: submissionData.profile.wallet,
            phone_number: submissionData.profile.phoneNumber,
            profile_picture: submissionData.profile.profilePicture,
            status: "pending"
          }
        });

        // 3. Create documents
        const documents = await Promise.all(
          submissionData.documents.map(doc =>
            tx.creator_documents.create({
              data: {
                user_id: userId,
                type: doc.type,
                file_url: doc.fileUrl,
                notes: doc.notes,
                status: "pending"
              }
            })
          )
        );

        // 4. Create social links
        const socialLinks = await Promise.all(
          submissionData.socialLinks.map(link =>
            tx.creator_social_links.create({
              data: {
                user_id: userId,
                platform: link.platform,
                handle: link.handle,
                url: link.url,
                follower_count: link.followerCount,
                verified: false
              }
            })
          )
        );

        // 5. Create verification log
        await tx.verification_logs.create({
          data: {
            user_id: userId,
            action: "complete_application_submitted",
            actor: `user_${userId}`,
            metadata: {
              applicationId: application.id,
              profileId: profile.id,
              documentCount: documents.length,
              socialLinkCount: socialLinks.length
            }
          }
        });

        return {
          application,
          profile,
          documents,
          socialLinks
        };
      });

      return Send.success(res, {
        message: "Application submitted successfully and pending review.",
        application: {
          id: result.application.id,
          state: result.application.state,
          submittedAt: result.application.submitted_at
        },
        profile: {
          id: result.profile.id,
          creatorHandle: result.profile.creator_handle,
          tokenSymbol: result.profile.token_symbol,
          status: result.profile.status
        },
        documentsCount: result.documents.length,
        socialLinksCount: result.socialLinks.length
      });
    } catch (error) {
      console.error("Complete application submission error:", error);
      return Send.error(res, null, "Failed to submit application.");
    }
  };

  // Get complete application details
  static getApplicationDetails = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
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

      const documents = await prisma.creator_documents.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      const socialLinks = await prisma.creator_social_links.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      return Send.success(res, {
        application: {
          id: application.id,
          state: application.state,
          contentOwnershipDeclared: application.content_ownership_declared,
          submittedAt: application.submitted_at,
          reviewedAt: application.reviewed_at,
          approvedAt: application.approved_at,
          rejectionReason: application.rejection_reason
        },
        profile,
        documents,
        socialLinks
      });
    } catch (error) {
      return Send.error(res, null, "Failed to fetch application details.");
    }
  };

  // Update pending application (only if not yet reviewed)
  static updateApplication = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const updateData = req.body as z.infer<typeof creatorSchema.completeSubmission>;

    try {
      const application = await prisma.creator_applications.findFirst({
        where: { user_id: userId }
      });

      if (!application) {
        return Send.error(res, null, "No application found.");
      }

      if (application.state !== "under_review") {
        return Send.error(res, null, "Cannot update application after review has started.");
      }

      const profile = await prisma.creator_profiles.findFirst({
        where: { user_id: userId }
      });

      if (!profile) {
        return Send.error(res, null, "Profile not found.");
      }

      // Check if new handle/symbol conflicts with others (excluding own)
      if (updateData.profile.creatorHandle !== profile.creator_handle) {
        const handleExists = await prisma.creator_profiles.findFirst({
          where: { 
            creator_handle: updateData.profile.creatorHandle,
            user_id: { not: userId }
          }
        });

        if (handleExists) {
          return Send.error(res, null, "Creator handle already taken.");
        }
      }

      if (updateData.profile.tokenSymbol !== profile.token_symbol) {
        const symbolExists = await prisma.creator_profiles.findFirst({
          where: { 
            token_symbol: updateData.profile.tokenSymbol,
            user_id: { not: userId }
          }
        });

        if (symbolExists) {
          return Send.error(res, null, "Token symbol already taken.");
        }
      }

      const result = await prisma.$transaction(async (tx: any) => {
        // Update profile
        const updatedProfile = await tx.creator_profiles.update({
          where: { id: profile.id },
          data: {
            full_name: updateData.profile.fullName,
            creator_handle: updateData.profile.creatorHandle,
            bio: updateData.profile.bio,
            category: updateData.profile.category,
            custom_category: updateData.profile.customCategory,
            token_name: updateData.profile.tokenName,
            token_symbol: updateData.profile.tokenSymbol,
            token_pitch: updateData.profile.tokenPitch,
            funding_goal: updateData.profile.fundingGoal,
            ico_supply: updateData.profile.icoSupply,
            wallet: updateData.profile.wallet,
            phone_number: updateData.profile.phoneNumber,
            profile_picture: updateData.profile.profilePicture
          }
        });

        // Delete and recreate documents
        await tx.creator_documents.deleteMany({
          where: { user_id: userId }
        });

        const documents = await Promise.all(
          updateData.documents.map(doc =>
            tx.creator_documents.create({
              data: {
                user_id: userId,
                type: doc.type,
                file_url: doc.fileUrl,
                notes: doc.notes,
                status: "pending"
              }
            })
          )
        );

        // Delete and recreate social links
        await tx.creator_social_links.deleteMany({
          where: { user_id: userId }
        });

        const socialLinks = await Promise.all(
          updateData.socialLinks.map(link =>
            tx.creator_social_links.create({
              data: {
                user_id: userId,
                platform: link.platform,
                handle: link.handle,
                url: link.url,
                follower_count: link.followerCount,
                verified: false
              }
            })
          )
        );

        // Log the update
        await tx.verification_logs.create({
          data: {
            user_id: userId,
            action: "application_updated",
            actor: `user_${userId}`,
            metadata: {
              profileId: updatedProfile.id,
              documentCount: documents.length,
              socialLinkCount: socialLinks.length
            }
          }
        });

        return { updatedProfile, documents, socialLinks };
      });

      return Send.success(res, {
        message: "Application updated successfully.",
        profile: result.updatedProfile,
        documentsCount: result.documents.length,
        socialLinksCount: result.socialLinks.length
      });
    } catch (error) {
      console.error("Application update error:", error);
      return Send.error(res, null, "Failed to update application.");
    }
  };

  // Withdraw application
  static withdrawApplication = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
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

      if (application.state === "approved") {
        return Send.error(res, null, "Cannot withdraw an approved application.");
      }

      await prisma.$transaction(async (tx: any) => {
        // Delete all related data
        await tx.creator_social_links.deleteMany({ where: { user_id: userId } });
        await tx.creator_documents.deleteMany({ where: { user_id: userId } });
        await tx.creator_profiles.deleteMany({ where: { user_id: userId } });
        await tx.creator_applications.delete({ where: { id: application.id } });

        // Log withdrawal
        await tx.verification_logs.create({
          data: {
            user_id: userId,
            action: "application_withdrawn",
            actor: `user_${userId}`,
            metadata: {
              applicationId: application.id,
              previousState: application.state
            }
          }
        });
      });

      return Send.success(res, { message: "Application withdrawn successfully." });
    } catch (error) {
      return Send.error(res, null, "Failed to withdraw application.");
    }
  };

  // Check application status
  static checkStatus = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const application = await prisma.creator_applications.findFirst({
        where: { user_id: userId }
      });

      if (!application) {
        return Send.success(res, {
          hasApplication: false,
          canApply: true
        });
      }

      return Send.success(res, {
        hasApplication: true,
        canApply: false,
        state: application.state,
        submittedAt: application.submitted_at,
        reviewedAt: application.reviewed_at,
        approvedAt: application.approved_at,
        rejectionReason: application.rejection_reason,
        canUpdate: application.state === "submitted",
        canWithdraw: application.state !== "approved"
      });
    } catch (error) {
      return Send.error(res, null, "Failed to check application status.");
    }
  };

  static approveApplication = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if(!user || user.role !== "admin") {
        return Send.error(res, null, "Only admins can approve applications.");
      }

      const { applicationId, creatorUserId } = req.body;

      const application = await prisma.creator_applications.findFirst({
        where: { id: applicationId }
      })

      if(!application) {
        return Send.error(res, null, "Application not found.");
      }

      if(application.state !== "under_review") {
        return Send.error(res, null, "Only applications under review can be approved.");
      }

      await prisma.$transaction(async (tx: any) => {
        // Update application state
        await tx.creator_applications.update({
          where: { id: applicationId },
          data: {
            state: "approved",
            approved_at: new Date()
          }
        });

        // Update profile status
        const profile = await tx.creator_profiles.findFirst({
          where: { user_id: creatorUserId }
        });

        if(!profile) {
          throw new Error("Creator profile not found.");
        }

        await tx.creator_profiles.update({
          where: { id: profile.id },
          data: {
            status: "approved"
          }
        });

        // Update user role to creator
        await tx.user.update({
          where: { id: creatorUserId },
          data: {
            role: "creator"
          }
        });

        // Log approval
        await tx.verification_logs.create({
          data: {
            user_id: creatorUserId,
            action: "application_approved",
            actor: `admin_${userId}`,
            metadata: {
              applicationId: applicationId
            }
          }
        });
      })

      return Send.success(res, { message: "Application approved successfully." });
    } catch (error) {
      return Send.error(res, null, "Failed to approve application.");
    }
  }
}

export default CreatorOnboardingController;