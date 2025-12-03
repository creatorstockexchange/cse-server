import { z } from "zod";

// Enums matching Prisma schema
const CreatorCategoryEnum = z.enum([
  "artist",
  "musician",
  "writer",
  "developer",
  "influencer",
  "entrepreneur",
  "other"
]);

const DocumentTypeEnum = z.enum([
  "identity",
  "proof_of_address",
  "business_license",
  "tax_document",
  "other"
]);

const SocialPlatformEnum = z.enum([
  "twitter",
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
  "facebook",
  "other"
]);

// Application Schemas
const submitApplication = z.object({
  contentOwnershipDeclared: z.boolean().refine((val) => val === true, {
    message: "You must declare content ownership to proceed"
  })
});

// Profile Schemas
const createProfile = z.object({
  fullName: z.string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  
  creatorHandle: z.string()
    .min(3, "Creator handle must be at least 3 characters")
    .max(30, "Creator handle must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Creator handle can only contain letters, numbers, and underscores")
    .toLowerCase(),
  
  bio: z.string()
    .min(50, "Bio must be at least 50 characters")
    .max(500, "Bio must not exceed 500 characters"),
  
  category: CreatorCategoryEnum,
  
  customCategory: z.string()
    .max(50, "Custom category must not exceed 50 characters")
    .optional()
    .nullable(),
  
  tokenName: z.string()
    .min(2, "Token name must be at least 2 characters")
    .max(50, "Token name must not exceed 50 characters"),
  
  tokenSymbol: z.string()
    .min(2, "Token symbol must be at least 2 characters")
    .max(10, "Token symbol must not exceed 10 characters")
    .regex(/^[A-Z0-9]+$/, "Token symbol must be uppercase letters and numbers only")
    .toUpperCase(),
  
  tokenPitch: z.string()
    .min(100, "Token pitch must be at least 100 characters")
    .max(1000, "Token pitch must not exceed 1000 characters"),
  
  fundingGoal: z.number()
    .positive("Funding goal must be positive")
    .max(1000000000, "Funding goal is too large")
    .optional()
    .nullable(),
  
  icoSupply: z.bigint()
    .positive("ICO supply must be positive")
    .optional()
    .nullable()
    .or(z.number().positive().transform(val => BigInt(val)))
    .or(z.string().regex(/^\d+$/).transform(val => BigInt(val))),
  
  wallet: z.string()
    .min(32, "Invalid wallet address")
    .max(44, "Invalid wallet address")
    .regex(/^[A-HJ-NP-Za-km-z1-9]+$/, "Invalid wallet address format"),
  
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  
  profilePicture: z.string()
    .url("Profile picture must be a valid URL")
    .optional()
    .nullable()
});

const updateProfile = z.object({
  bio: z.string()
    .min(50, "Bio must be at least 50 characters")
    .max(500, "Bio must not exceed 500 characters")
    .optional(),
  
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  
  profilePicture: z.string()
    .url("Profile picture must be a valid URL")
    .optional()
    .nullable(),
  
  engagementMetrics: z.string()
    .optional()
    .nullable()
});

// Document Schemas
const uploadDocument = z.object({
  type: DocumentTypeEnum,
  
  fileUrl: z.string()
    .url("File URL must be a valid URL")
    .max(500, "File URL is too long"),
  
  notes: z.string()
    .max(500, "Notes must not exceed 500 characters")
    .optional()
    .nullable()
});

const updateDocumentStatus = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  
  notes: z.string()
    .max(500, "Notes must not exceed 500 characters")
    .optional()
    .nullable()
});

// Social Link Schemas
const addSocialLink = z.object({
  platform: SocialPlatformEnum,
  
  handle: z.string()
    .min(1, "Handle is required")
    .max(100, "Handle must not exceed 100 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Invalid handle format"),
  
  url: z.string()
    .url("Social link URL must be valid")
    .max(500, "URL is too long"),
  
  followerCount: z.number()
    .int("Follower count must be an integer")
    .nonnegative("Follower count cannot be negative")
    .optional()
    .nullable()
});

const updateSocialLink = z.object({
  handle: z.string()
    .min(1, "Handle is required")
    .max(100, "Handle must not exceed 100 characters")
    .optional(),
  
  url: z.string()
    .url("Social link URL must be valid")
    .max(500, "URL is too long")
    .optional(),
  
  followerCount: z.number()
    .int("Follower count must be an integer")
    .nonnegative("Follower count cannot be negative")
    .optional()
    .nullable(),
  
  verified: z.boolean()
    .optional()
});

// Token Schemas
const createToken = z.object({
  name: z.string()
    .min(2, "Token name must be at least 2 characters")
    .max(50, "Token name must not exceed 50 characters"),
  
  symbol: z.string()
    .min(2, "Token symbol must be at least 2 characters")
    .max(10, "Token symbol must not exceed 10 characters")
    .regex(/^[A-Z0-9]+$/, "Token symbol must be uppercase letters and numbers only")
    .toUpperCase(),
  
  totalSupply: z.bigint()
    .positive("Total supply must be positive")
    .or(z.number().positive().transform(val => BigInt(val)))
    .or(z.string().regex(/^\d+$/).transform(val => BigInt(val))),
  
  mintAddress: z.string()
    .min(32, "Invalid mint address")
    .max(44, "Invalid mint address")
});

// Admin Schemas (for reviewing applications)
const reviewApplication = z.object({
  state: z.enum(["under_review", "approved", "rejected"]),
  
  rejectionReason: z.string()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(500, "Rejection reason must not exceed 500 characters")
    .optional()
    .nullable()
});

const updateCreatorStatus = z.object({
  status: z.enum(["active", "inactive", "suspended", "pending"])
});

// Query/Filter Schemas
const getCreatorByHandle = z.object({
  handle: z.string()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must not exceed 30 characters")
});

const getCreatorBySymbol = z.object({
  symbol: z.string()
    .min(2, "Symbol must be at least 2 characters")
    .max(10, "Symbol must not exceed 10 characters")
    .toUpperCase()
});

const filterCreators = z.object({
  category: CreatorCategoryEnum.optional(),
  status: z.enum(["active", "inactive", "suspended", "pending"]).optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(10).optional()
});

// Export all schemas
const creatorSchema = {
  // Application
  submitApplication,
  reviewApplication,
  
  // Profile
  createProfile,
  updateProfile,
  updateCreatorStatus,
  
  // Documents
  uploadDocument,
  updateDocumentStatus,
  
  // Social Links
  addSocialLink,
  updateSocialLink,
  
  // Token
  createToken,
  
  // Queries
  getCreatorByHandle,
  getCreatorBySymbol,
  filterCreators
};

export default creatorSchema;