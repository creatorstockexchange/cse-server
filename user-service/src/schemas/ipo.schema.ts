import { z } from "zod";

// Enums matching Prisma schema
const IpoStatusEnum = z.enum([
  "draft",
  "pending_review",
  "under_review",
  "approved",
  "live",
  "closed",
  "successful",
  "failed",
  "cancelled",
  "rejected"
]);

const CurrencyEnum = z.enum([
  "USDC",
  "SOL",
  "ETH",
  "BTC"
]);

const UpdateTypeEnum = z.enum([
  "general",
  "milestone",
  "financial",
  "technical",
  "announcement"
]);

// IPO Schemas
const createIpo = z.object({
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters"),
  
  description: z.string()
    .min(100, "Description must be at least 100 characters")
    .max(5000, "Description must not exceed 5000 characters"),
  
  totalTokens: z.bigint()
    .positive("Total tokens must be positive")
    .or(z.number().positive().transform(val => BigInt(val)))
    .or(z.string().regex(/^\d+$/).transform(val => BigInt(val))),
  
  tokensForSale: z.bigint()
    .positive("Tokens for sale must be positive")
    .or(z.number().positive().transform(val => BigInt(val)))
    .or(z.string().regex(/^\d+$/).transform(val => BigInt(val))),
  
  pricePerToken: z.number()
    .positive("Price per token must be positive")
    .max(1000000, "Price per token is too large"),
  
  minPurchase: z.number()
    .positive("Minimum purchase must be positive"),
  
  maxPurchase: z.number()
    .positive("Maximum purchase must be positive")
    .optional()
    .nullable(),
  
  acceptedCurrencies: z.array(CurrencyEnum)
    .min(1, "At least one currency must be accepted"),
  
  softCap: z.number()
    .positive("Soft cap must be positive"),
  
  hardCap: z.number()
    .positive("Hard cap must be positive"),
  
  startDate: z.string()
    .datetime("Start date must be a valid ISO datetime")
    .or(z.date())
    .transform(val => typeof val === 'string' ? new Date(val) : val),
  
  endDate: z.string()
    .datetime("End date must be a valid ISO datetime")
    .or(z.date())
    .transform(val => typeof val === 'string' ? new Date(val) : val),
  
  vestingPeriod: z.number()
    .int("Vesting period must be an integer")
    .positive("Vesting period must be positive")
    .optional()
    .nullable(),
  
  vestingSchedule: z.object({
    cliff: z.number().int().nonnegative().optional(),
    duration: z.number().int().positive().optional(),
    intervals: z.number().int().positive().optional()
  })
    .optional()
    .nullable(),
  
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string(),
    date: z.string().datetime().or(z.date())
  }))
    .optional()
    .nullable(),
  
  roadmap: z.string()
    .max(10000, "Roadmap must not exceed 10000 characters")
    .optional()
    .nullable(),
  
  useOfFunds: z.object({
    development: z.number().min(0).max(100).optional(),
    marketing: z.number().min(0).max(100).optional(),
    operations: z.number().min(0).max(100).optional(),
    other: z.number().min(0).max(100).optional()
  }),
  
  termsConditions: z.string()
    .min(100, "Terms and conditions must be at least 100 characters")
    .max(20000, "Terms and conditions must not exceed 20000 characters"),
  
  riskDisclosure: z.string()
    .min(100, "Risk disclosure must be at least 100 characters")
    .max(20000, "Risk disclosure must not exceed 20000 characters"),
  
  whitepaperUrl: z.string()
    .url("Whitepaper URL must be valid")
    .optional()
    .nullable(),
  
  pitchDeckUrl: z.string()
    .url("Pitch deck URL must be valid")
    .optional()
    .nullable()
});

const updateIpo = z.object({
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters")
    .optional(),
  
  description: z.string()
    .min(100, "Description must be at least 100 characters")
    .max(5000, "Description must not exceed 5000 characters")
    .optional(),
  
  pricePerToken: z.number()
    .positive("Price per token must be positive")
    .max(1000000, "Price per token is too large")
    .optional(),
  
  minPurchase: z.number()
    .positive("Minimum purchase must be positive")
    .optional(),
  
  maxPurchase: z.number()
    .positive("Maximum purchase must be positive")
    .optional()
    .nullable(),
  
  acceptedCurrencies: z.array(CurrencyEnum)
    .min(1, "At least one currency must be accepted")
    .optional(),
  
  softCap: z.number()
    .positive("Soft cap must be positive")
    .optional(),
  
  hardCap: z.number()
    .positive("Hard cap must be positive")
    .optional(),
  
  startDate: z.string()
    .datetime("Start date must be a valid ISO datetime")
    .or(z.date())
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .optional(),
  
  endDate: z.string()
    .datetime("End date must be a valid ISO datetime")
    .or(z.date())
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .optional(),
  
  vestingPeriod: z.number()
    .int("Vesting period must be an integer")
    .positive("Vesting period must be positive")
    .optional()
    .nullable(),
  
  vestingSchedule: z.object({
    cliff: z.number().int().nonnegative().optional(),
    duration: z.number().int().positive().optional(),
    intervals: z.number().int().positive().optional()
  })
    .optional()
    .nullable(),
  
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string(),
    date: z.string().datetime().or(z.date())
  }))
    .optional()
    .nullable(),
  
  roadmap: z.string()
    .max(10000, "Roadmap must not exceed 10000 characters")
    .optional()
    .nullable(),
  
  useOfFunds: z.object({
    development: z.number().min(0).max(100).optional(),
    marketing: z.number().min(0).max(100).optional(),
    operations: z.number().min(0).max(100).optional(),
    other: z.number().min(0).max(100).optional()
  })
    .optional(),
  
  termsConditions: z.string()
    .min(100, "Terms and conditions must be at least 100 characters")
    .max(20000, "Terms and conditions must not exceed 20000 characters")
    .optional(),
  
  riskDisclosure: z.string()
    .min(100, "Risk disclosure must be at least 100 characters")
    .max(20000, "Risk disclosure must not exceed 20000 characters")
    .optional(),
  
  whitepaperUrl: z.string()
    .url("Whitepaper URL must be valid")
    .optional()
    .nullable(),
  
  pitchDeckUrl: z.string()
    .url("Pitch deck URL must be valid")
    .optional()
    .nullable()
});

const submitForReview = z.object({
  confirm: z.boolean()
    .refine((val) => val === true, {
      message: "You must confirm submission"
    })
});

const reviewIpo = z.object({
  status: z.enum(["under_review", "approved", "rejected"]),
  
  rejectionReason: z.string()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(500, "Rejection reason must not exceed 500 characters")
    .optional()
    .nullable()
});

const launchIpo = z.object({
  confirm: z.boolean()
    .refine((val) => val === true, {
      message: "You must confirm launch"
    })
});

// Investment Schemas
const createInvestment = z.object({
  ipoId: z.string()
    .uuid("Invalid IPO ID"),
  
  amount: z.number()
    .positive("Investment amount must be positive"),
  
  currency: CurrencyEnum
});

const claimTokens = z.object({
  investmentId: z.string()
    .uuid("Invalid investment ID")
});

// Update Schemas
const createUpdate = z.object({
  ipoId: z.string()
    .uuid("Invalid IPO ID"),
  
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters"),
  
  content: z.string()
    .min(50, "Content must be at least 50 characters")
    .max(5000, "Content must not exceed 5000 characters"),
  
  type: UpdateTypeEnum
});

// Query Schemas
const filterIpos = z.object({
  status: IpoStatusEnum.optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(10).optional()
});

const getIpoById = z.object({
  id: z.string().uuid("Invalid IPO ID")
});

// Export all schemas
const ipoSchema = {
  // IPO
  createIpo,
  updateIpo,
  submitForReview,
  reviewIpo,
  launchIpo,
  
  // Investment
  createInvestment,
  claimTokens,
  
  // Updates
  createUpdate,
  
  // Queries
  filterIpos,
  getIpoById
};

export default ipoSchema;
