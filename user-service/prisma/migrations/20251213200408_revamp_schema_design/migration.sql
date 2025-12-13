/*
  Warnings:

  - The `engagement_metrics` column on the `creator_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `creator_token` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[profile_id]` on the table `creator_ipos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[application_id]` on the table `creator_profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profile_id,platform]` on the table `creator_social_links` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transaction_hash]` on the table `ipo_investments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[blockchain_hash]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `profile_id` to the `creator_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `creator_ipos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `application_id` to the `creator_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `creator_social_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `creator_social_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `verification_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "creator_applications" DROP CONSTRAINT "creator_applications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "creator_documents" DROP CONSTRAINT "creator_documents_user_id_fkey";

-- DropForeignKey
ALTER TABLE "creator_ipos" DROP CONSTRAINT "creator_ipos_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "creator_ipos" DROP CONSTRAINT "creator_ipos_user_id_fkey";

-- DropForeignKey
ALTER TABLE "creator_profiles" DROP CONSTRAINT "creator_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "creator_social_links" DROP CONSTRAINT "creator_social_links_user_id_fkey";

-- DropForeignKey
ALTER TABLE "creator_token" DROP CONSTRAINT "creator_token_user_id_fkey";

-- DropForeignKey
ALTER TABLE "deposit_addresses" DROP CONSTRAINT "deposit_addresses_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_investments" DROP CONSTRAINT "ipo_investments_investor_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "verification_logs" DROP CONSTRAINT "verification_logs_user_id_fkey";

-- DropIndex
DROP INDEX "creator_applications_user_id_idx";

-- DropIndex
DROP INDEX "transactions_deposit_address_id_idx";

-- AlterTable
ALTER TABLE "creator_documents" ADD COLUMN     "profile_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "creator_ipos" ADD COLUMN     "profile_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "application_id" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending',
DROP COLUMN "engagement_metrics",
ADD COLUMN     "engagement_metrics" JSONB;

-- AlterTable
ALTER TABLE "creator_social_links" ADD COLUMN     "profile_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "verification_logs" ADD COLUMN     "profile_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "creator_token";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_tokens" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "total_supply" BIGINT NOT NULL,
    "mint_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "creator_tokens_user_id_key" ON "creator_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_tokens_profile_id_key" ON "creator_tokens"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_tokens_symbol_key" ON "creator_tokens"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "creator_tokens_mint_address_key" ON "creator_tokens"("mint_address");

-- CreateIndex
CREATE INDEX "creator_tokens_user_id_idx" ON "creator_tokens"("user_id");

-- CreateIndex
CREATE INDEX "creator_tokens_profile_id_idx" ON "creator_tokens"("profile_id");

-- CreateIndex
CREATE INDEX "creator_tokens_symbol_idx" ON "creator_tokens"("symbol");

-- CreateIndex
CREATE INDEX "creator_applications_submitted_at_idx" ON "creator_applications"("submitted_at");

-- CreateIndex
CREATE INDEX "creator_documents_profile_id_idx" ON "creator_documents"("profile_id");

-- CreateIndex
CREATE INDEX "creator_documents_type_idx" ON "creator_documents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "creator_ipos_profile_id_key" ON "creator_ipos"("profile_id");

-- CreateIndex
CREATE INDEX "creator_ipos_profile_id_idx" ON "creator_ipos"("profile_id");

-- CreateIndex
CREATE INDEX "creator_ipos_reviewed_by_idx" ON "creator_ipos"("reviewed_by");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_application_id_key" ON "creator_profiles"("application_id");

-- CreateIndex
CREATE INDEX "creator_profiles_status_idx" ON "creator_profiles"("status");

-- CreateIndex
CREATE INDEX "creator_profiles_category_idx" ON "creator_profiles"("category");

-- CreateIndex
CREATE INDEX "creator_social_links_profile_id_idx" ON "creator_social_links"("profile_id");

-- CreateIndex
CREATE INDEX "creator_social_links_platform_idx" ON "creator_social_links"("platform");

-- CreateIndex
CREATE INDEX "creator_social_links_verified_idx" ON "creator_social_links"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "creator_social_links_profile_id_platform_key" ON "creator_social_links"("profile_id", "platform");

-- CreateIndex
CREATE INDEX "deposit_addresses_currency_idx" ON "deposit_addresses"("currency");

-- CreateIndex
CREATE INDEX "deposit_addresses_is_active_idx" ON "deposit_addresses"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ipo_investments_transaction_hash_key" ON "ipo_investments"("transaction_hash");

-- CreateIndex
CREATE INDEX "ipo_investments_invested_at_idx" ON "ipo_investments"("invested_at");

-- CreateIndex
CREATE INDEX "ipo_updates_type_idx" ON "ipo_updates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_blockchain_hash_key" ON "transactions"("blockchain_hash");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_currency_idx" ON "transactions"("currency");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "verification_logs_profile_id_idx" ON "verification_logs"("profile_id");

-- CreateIndex
CREATE INDEX "verification_logs_action_idx" ON "verification_logs"("action");

-- AddForeignKey
ALTER TABLE "deposit_addresses" ADD CONSTRAINT "deposit_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_applications" ADD CONSTRAINT "creator_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "creator_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_documents" ADD CONSTRAINT "creator_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_documents" ADD CONSTRAINT "creator_documents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_social_links" ADD CONSTRAINT "creator_social_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_social_links" ADD CONSTRAINT "creator_social_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_tokens" ADD CONSTRAINT "creator_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_tokens" ADD CONSTRAINT "creator_tokens_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_ipos" ADD CONSTRAINT "creator_ipos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_ipos" ADD CONSTRAINT "creator_ipos_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_ipos" ADD CONSTRAINT "creator_ipos_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_investments" ADD CONSTRAINT "ipo_investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
