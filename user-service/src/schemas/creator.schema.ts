import { z } from "zod";

// Individual schemas for reusability
const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  creatorHandle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores"),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(500),
  category: z.enum([
    "technology",
    "gaming",
    "music",
    "art",
    "education",
    "lifestyle",
    "sports",
    "comedy",
    "science",
    "business",
    "other"
  ]),
  customCategory: z.string().max(50).optional().nullable(),
  tokenName: z.string().min(3, "Token name must be at least 3 characters").max(50),
  tokenSymbol: z
    .string()
    .min(2, "Token symbol must be at least 2 characters")
    .max(10)
    .regex(/^[A-Z]+$/, "Token symbol must be uppercase letters only"),
  tokenPitch: z.string().min(100, "Token pitch must be at least 100 characters").max(1000),
  fundingGoal: z
    .number()
    .positive("Funding goal must be positive")
    .min(1000, "Minimum funding goal is 1000")
    .max(10000000, "Maximum funding goal is 10,000,000"),
  icoSupply: z
    .number()
    .positive("ICO supply must be positive")
    .min(1000, "Minimum ICO supply is 1000")
    .max(1000000000, "Maximum ICO supply is 1,000,000,000"),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  profilePicture: z.string().url("Invalid profile picture URL").optional().nullable()
});

const documentSchema = z.object({
  type: z.enum([
    "identity_proof",
    "address_proof",
    "content_ownership",
    "tax_document",
    "business_registration",
    "other"
  ]),
  fileUrl: z.string().url("Invalid file URL"),
  notes: z.string().max(500).optional().nullable()
});

const socialLinkSchema = z.object({
  platform: z.enum([
    "youtube",
    "instagram",
    "tiktok",
    "twitter",
    "twitch",
    "facebook",
    "linkedin",
    "spotify",
    "soundcloud",
    "other"
  ]),
  handle: z.string().min(1, "Handle is required").max(100),
  url: z.string().url("Invalid URL"),
  followerCount: z.number().int().min(0).optional().nullable()
});

// Main complete submission schema
const completeSubmission = z.object({
  contentOwnershipDeclared: z.boolean().refine((val) => val === true, {
    message: "You must declare content ownership to proceed"
  }),
  profile: profileSchema,
  documents: z
    .array(documentSchema)
    .min(1, "At least one document is required")
    .max(10, "Maximum 10 documents allowed"),
  socialLinks: z
    .array(socialLinkSchema)
    .min(1, "At least one social link is required")
    .max(10, "Maximum 10 social links allowed")
});

// Update application schema (similar to complete but more flexible)
const updateApplication = z.object({
  contentOwnershipDeclared: z.boolean().refine((val) => val === true, {
    message: "Content ownership declaration is required"
  }),
  profile: profileSchema,
  documents: z
    .array(documentSchema)
    .min(1, "At least one document is required")
    .max(10, "Maximum 10 documents allowed"),
  socialLinks: z
    .array(socialLinkSchema)
    .min(1, "At least one social link is required")
    .max(10, "Maximum 10 social links allowed")
});

// Legacy/individual schemas (if still needed for other endpoints)
const submitApplication = z.object({
  contentOwnershipDeclared: z.boolean().refine((val) => val === true, {
    message: "You must declare content ownership to proceed"
  })
});

const createProfile = profileSchema;

const uploadDocument = documentSchema;

const addSocialLink = socialLinkSchema;

const updateProfile = z.object({
  bio: z.string().min(50).max(500).optional(),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  profilePicture: z.string().url("Invalid profile picture URL").optional().nullable(),
  engagementMetrics: z.any().optional().nullable() // JSON field, flexible structure
});

// Type exports for TypeScript
export type ProfileSchema = z.infer<typeof profileSchema>;
export type DocumentSchema = z.infer<typeof documentSchema>;
export type SocialLinkSchema = z.infer<typeof socialLinkSchema>;
export type CompleteSubmissionSchema = z.infer<typeof completeSubmission>;
export type UpdateApplicationSchema = z.infer<typeof updateApplication>;
export type SubmitApplicationSchema = z.infer<typeof submitApplication>;
export type CreateProfileSchema = z.infer<typeof createProfile>;
export type UploadDocumentSchema = z.infer<typeof uploadDocument>;
export type AddSocialLinkSchema = z.infer<typeof addSocialLink>;
export type UpdateProfileSchema = z.infer<typeof updateProfile>;

// Export all schemas
const creatorSchema = {
  // Main schemas for unified approach
  completeSubmission,
  updateApplication,
  
  // Individual component schemas
  profile: profileSchema,
  document: documentSchema,
  socialLink: socialLinkSchema,
  
  // Legacy schemas (for backward compatibility)
  submitApplication,
  createProfile,
  uploadDocument,
  addSocialLink,
  updateProfile
};

export default creatorSchema;