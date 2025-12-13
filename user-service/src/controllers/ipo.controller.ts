import type { Response } from "express";
import type ipoSchema from "../schemas/ipo.schema.js";
import * as z from "zod";
import { prisma } from "../db.js";
import Send from "../utils/response.utils.js";
import AuthRequest from "../types/authRequest.type.js";

class IpoController {
  // Create IPO (Draft)
  static createIpo = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const ipoData = req.body as z.infer<typeof ipoSchema.createIpo>;

    try {
      // Check if user already has an IPO
      const existingIpo = await prisma.creator_ipos.findFirst({
        where: { user_id: userId }
      });

      if (existingIpo) {
        return Send.error(res, null, "You already have an IPO. Only one IPO per creator is allowed.");
      }

      // Check if user has a creator profile
      const creatorProfile = await prisma.creator_profiles.findFirst({
        where: { user_id: userId }
      });

      if (!creatorProfile) {
        return Send.error(res, null, "You must have a creator profile to create an IPO.");
      }

      const ipo = await prisma.creator_ipos.create({
        data: {
          user_id: userId,
          profile_id: creatorProfile.id,
          title: ipoData.title,
          description: ipoData.description,
          total_tokens: ipoData.totalTokens,
          tokens_for_sale: ipoData.tokensForSale,
          price_per_token: ipoData.pricePerToken,
          min_purchase: ipoData.minPurchase,
          max_purchase: ipoData.maxPurchase,
          accepted_currencies: ipoData.acceptedCurrencies,
          soft_cap: ipoData.softCap,
          hard_cap: ipoData.hardCap,
          start_date: ipoData.startDate,
          end_date: ipoData.endDate,
          vesting_period: ipoData.vestingPeriod,
          vesting_schedule: ipoData.vestingSchedule as any,
          milestones: ipoData.milestones as any,
          roadmap: ipoData.roadmap,
          use_of_funds: ipoData.useOfFunds as any,
          terms_conditions: ipoData.termsConditions,
          risk_disclosure: ipoData.riskDisclosure,
          whitepaper_url: ipoData.whitepaperUrl,
          pitch_deck_url: ipoData.pitchDeckUrl,
          status: "draft"
        }
      });

      return Send.success(res, {
        id: ipo.id,
        title: ipo.title,
        status: ipo.status,
        createdAt: ipo.created_at
      });
    } catch (error) {
      return Send.error(res, null, "Failed to create IPO.");
    }
  };

  // Get IPO by ID
  static getIpoById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true
            }
          },
          investments: {
            select: {
              id: true,
              amount: true,
              currency: true,
              tokens_allocated: true,
              invested_at: true,
              investor: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          updates: {
            orderBy: { created_at: 'desc' },
            take: 10
          }
        }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found.");
      }

      return Send.success(res, ipo);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch IPO.");
    }
  };

  // Get user's IPO
  static getMyIpo = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: { user_id: userId },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true
            }
          },
          investments: {
            select: {
              id: true,
              amount: true,
              currency: true,
              tokens_allocated: true,
              invested_at: true,
              investor: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          updates: {
            orderBy: { created_at: 'desc' }
          }
        }
      });

      if (!ipo) {
        return Send.error(res, null, "You don't have an IPO yet.");
      }

      return Send.success(res, ipo);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch your IPO.");
    }
  };

  // Get all IPOs with filtering
  static getAllIpos = async (req: AuthRequest, res: Response) => {
    const { status, search, page = 1, limit = 10 } = req.query as any;

    try {
      const skip = (page - 1) * limit;
      
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [ipos, total] = await Promise.all([
        prisma.creator_ipos.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prisma.creator_ipos.count({ where })
      ]);

      return Send.success(res, {
        ipos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return Send.error(res, null, "Failed to fetch IPOs.");
    }
  };

  // Update IPO (only in draft status)
  static updateIpo = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const updateData = req.body as z.infer<typeof ipoSchema.updateIpo>;

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found.");
      }

      if (ipo.status !== "draft") {
        return Send.error(res, null, "You can only update IPOs in draft status.");
      }

      const updatedIpo = await prisma.creator_ipos.update({
        where: { id },
        data: {
          title: updateData.title,
          description: updateData.description,
          price_per_token: updateData.pricePerToken,
          min_purchase: updateData.minPurchase,
          max_purchase: updateData.maxPurchase,
          accepted_currencies: updateData.acceptedCurrencies,
          soft_cap: updateData.softCap,
          hard_cap: updateData.hardCap,
          start_date: updateData.startDate,
          end_date: updateData.endDate,
          vesting_period: updateData.vestingPeriod,
          vesting_schedule: updateData.vestingSchedule as any,
          milestones: updateData.milestones as any,
          roadmap: updateData.roadmap,
          use_of_funds: updateData.useOfFunds as any,
          terms_conditions: updateData.termsConditions,
          risk_disclosure: updateData.riskDisclosure,
          whitepaper_url: updateData.whitepaperUrl,
          pitch_deck_url: updateData.pitchDeckUrl
        }
      });

      return Send.success(res, updatedIpo);
    } catch (error) {
      return Send.error(res, null, "Failed to update IPO.");
    }
  };

  // Submit IPO for review
  static submitForReview = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found.");
      }

      if (ipo.status !== "draft") {
        return Send.error(res, null, "Only draft IPOs can be submitted for review.");
      }

      const updatedIpo = await prisma.creator_ipos.update({
        where: { id },
        data: {
          status: "pending_review",
          submitted_at: new Date()
        }
      });

      return Send.success(res, {
        id: updatedIpo.id,
        status: updatedIpo.status,
        submittedAt: updatedIpo.submitted_at
      });
    } catch (error) {
      return Send.error(res, null, "Failed to submit IPO for review.");
    }
  };

  // Review IPO (Admin only)
  static reviewIpo = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const { status, rejectionReason } = req.body as z.infer<typeof ipoSchema.reviewIpo>;

    try {
      const user = await prisma.user.findFirst({
        where: { id: userId }
      });

      if (!user || user.role !== "admin") {
        return Send.error(res, null, "Only admins can review IPOs.");
      }

      const ipo = await prisma.creator_ipos.findFirst({
        where: { id }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found.");
      }

      if (ipo.status !== "pending_review" && ipo.status !== "under_review") {
        return Send.error(res, null, "IPO is not in a reviewable state.");
      }

      const updateData: any = {
        status,
        reviewed_at: new Date(),
        reviewed_by: userId
      };

      if (status === "rejected" && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      if (status === "approved") {
        updateData.approved_at = new Date();
      }

      const updatedIpo = await prisma.creator_ipos.update({
        where: { id },
        data: updateData
      });

      return Send.success(res, {
        id: updatedIpo.id,
        status: updatedIpo.status,
        reviewedAt: updatedIpo.reviewed_at,
        rejectionReason: updatedIpo.rejection_reason
      });
    } catch (error) {
      return Send.error(res, null, "Failed to review IPO.");
    }
  };

  // Launch IPO (Creator only, after approval)
  static launchIpo = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found.");
      }

      if (ipo.status !== "approved") {
        return Send.error(res, null, "Only approved IPOs can be launched.");
      }

      const now = new Date();
      if (ipo.start_date > now) {
        return Send.error(res, null, "IPO cannot be launched before its start date.");
      }

      const updatedIpo = await prisma.creator_ipos.update({
        where: { id },
        data: {
          status: "live",
          launched_at: new Date()
        }
      });

      return Send.success(res, {
        id: updatedIpo.id,
        status: updatedIpo.status,
        launchedAt: updatedIpo.launched_at
      });
    } catch (error) {
      return Send.error(res, null, "Failed to launch IPO.");
    }
  };

  // Cancel IPO
  static cancelIpo = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found.");
      }

      if (ipo.status === "closed" || ipo.status === "successful" || ipo.status === "failed") {
        return Send.error(res, null, "Cannot cancel a closed IPO.");
      }

      const updatedIpo = await prisma.creator_ipos.update({
        where: { id },
        data: {
          status: "cancelled"
        }
      });

      return Send.success(res, {
        id: updatedIpo.id,
        status: updatedIpo.status
      });
    } catch (error) {
      return Send.error(res, null, "Failed to cancel IPO.");
    }
  };

  // Delete IPO (only draft)
  static deleteIpo = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found.");
      }

      if (ipo.status !== "draft") {
        return Send.error(res, null, "Only draft IPOs can be deleted.");
      }

      await prisma.creator_ipos.delete({
        where: { id }
      });

      return Send.success(res, { message: "IPO deleted successfully." });
    } catch (error) {
      return Send.error(res, null, "Failed to delete IPO.");
    }
  };

  // Create investment
  static createInvestment = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const { ipoId, amount, currency } = req.body as z.infer<typeof ipoSchema.createInvestment>;

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: { id: ipoId }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found.");
      }

      if (ipo.status !== "live") {
        return Send.error(res, null, "IPO is not currently accepting investments.");
      }

      // Check if user is trying to invest in their own IPO
      if (ipo.user_id === userId) {
        return Send.error(res, null, "You cannot invest in your own IPO.");
      }

      // Check if currency is accepted
      if (!ipo.accepted_currencies.includes(currency)) {
        return Send.error(res, null, `${currency} is not an accepted currency for this IPO.`);
      }

      // Check min/max purchase amounts
      if (amount < Number(ipo.min_purchase)) {
        return Send.error(res, null, `Investment amount must be at least ${ipo.min_purchase}.`);
      }

      if (ipo.max_purchase && amount > Number(ipo.max_purchase)) {
        return Send.error(res, null, `Investment amount cannot exceed ${ipo.max_purchase}.`);
      }

      // Calculate tokens allocated
      const tokensAllocated = BigInt(Math.floor(amount / Number(ipo.price_per_token)));

      // Calculate next claim date based on vesting schedule
      let nextClaimDate = null;
      if (ipo.vesting_schedule && typeof ipo.vesting_schedule === 'object') {
        const schedule = ipo.vesting_schedule as any;
        if (schedule.cliff) {
          nextClaimDate = new Date();
          nextClaimDate.setDate(nextClaimDate.getDate() + schedule.cliff);
        }
      }

      const investment = await prisma.ipo_investments.create({
        data: {
          ipo_id: ipoId,
          investor_id: userId,
          amount,
          currency,
          tokens_allocated: tokensAllocated,
          next_claim_date: nextClaimDate,
          transaction_status: "pending"
        }
      });

      return Send.success(res, {
        id: investment.id,
        amount: investment.amount,
        currency: investment.currency,
        tokensAllocated: investment.tokens_allocated.toString(),
        nextClaimDate: investment.next_claim_date
      });
    } catch (error) {
      return Send.error(res, null, "Failed to create investment.");
    }
  };

  // Get user's investments
  static getMyInvestments = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const investments = await prisma.ipo_investments.findMany({
        where: { investor_id: userId },
        include: {
          ipo: {
            select: {
              id: true,
              title: true,
              status: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { invested_at: 'desc' }
      });

      return Send.success(res, investments);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch investments.");
    }
  };

  // Get IPO investments (Creator view)
  static getIpoInvestments = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found or you don't have access.");
      }

      const investments = await prisma.ipo_investments.findMany({
        where: { ipo_id: id },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { invested_at: 'desc' }
      });

      return Send.success(res, investments);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch IPO investments.");
    }
  };

  // Claim tokens
  static claimTokens = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { investmentId } = req.body as z.infer<typeof ipoSchema.claimTokens>;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    try {
      const investment = await prisma.ipo_investments.findFirst({
        where: {
          id: investmentId,
          investor_id: userId
        }
      });

      if (!investment) {
        return Send.error(res, null, "Investment not found.");
      }

      if (investment.transaction_status !== "confirmed") {
        return Send.error(res, null, "Investment transaction must be confirmed before claiming tokens.");
      }

      const now = new Date();
      if (investment.next_claim_date && investment.next_claim_date > now) {
        return Send.error(res, null, `Tokens cannot be claimed until ${investment.next_claim_date}.`);
      }

      if (investment.tokens_claimed >= investment.tokens_allocated) {
        return Send.error(res, null, "All tokens have already been claimed.");
      }

      // Calculate claimable tokens (simplified - you may need more complex vesting logic)
      const remainingTokens = investment.tokens_allocated - investment.tokens_claimed;

      const updatedInvestment = await prisma.ipo_investments.update({
        where: { id: investmentId },
        data: {
          tokens_claimed: investment.tokens_allocated,
          last_claim_date: now,
          next_claim_date: null
        }
      });

      return Send.success(res, {
        id: updatedInvestment.id,
        tokensClaimed: remainingTokens.toString(),
        totalClaimed: updatedInvestment.tokens_claimed.toString(),
        lastClaimDate: updatedInvestment.last_claim_date
      });
    } catch (error) {
      return Send.error(res, null, "Failed to claim tokens.");
    }
  };

  // Create IPO update
  static createUpdate = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return Send.error(res, null, "Unauthorized.");
    }

    const { ipoId, title, content, type } = req.body as z.infer<typeof ipoSchema.createUpdate>;

    try {
      const ipo = await prisma.creator_ipos.findFirst({
        where: {
          id: ipoId,
          user_id: userId
        }
      });

      if (!ipo) {
        return Send.error(res, null, "IPO not found or you don't have access.");
      }

      const update = await prisma.ipo_updates.create({
        data: {
          ipo_id: ipoId,
          title,
          content,
          type
        }
      });

      return Send.success(res, {
        id: update.id,
        title: update.title,
        type: update.type,
        createdAt: update.created_at
      });
    } catch (error) {
      return Send.error(res, null, "Failed to create update.");
    }
  };

  // Get IPO updates
  static getIpoUpdates = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const updates = await prisma.ipo_updates.findMany({
        where: { ipo_id: id },
        orderBy: { created_at: 'desc' }
      });

      return Send.success(res, updates);
    } catch (error) {
      return Send.error(res, null, "Failed to fetch IPO updates.");
    }
  };
}

export default IpoController;
