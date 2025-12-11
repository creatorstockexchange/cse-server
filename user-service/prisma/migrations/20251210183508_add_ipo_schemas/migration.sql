-- CreateEnum
CREATE TYPE "IpoStatus" AS ENUM ('draft', 'pending_review', 'under_review', 'approved', 'live', 'closed', 'successful', 'failed', 'cancelled', 'rejected');

-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('general', 'milestone', 'financial', 'technical', 'announcement');

-- CreateTable
CREATE TABLE "creator_ipos" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "total_tokens" BIGINT NOT NULL,
    "tokens_for_sale" BIGINT NOT NULL,
    "price_per_token" DECIMAL(18,9) NOT NULL,
    "min_purchase" DECIMAL(18,9) NOT NULL,
    "max_purchase" DECIMAL(18,9),
    "accepted_currencies" "Currency"[],
    "soft_cap" DECIMAL(18,2) NOT NULL,
    "hard_cap" DECIMAL(18,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "vesting_period" INTEGER,
    "vesting_schedule" JSONB,
    "status" "IpoStatus" NOT NULL DEFAULT 'draft',
    "rejection_reason" TEXT,
    "milestones" JSONB,
    "roadmap" TEXT,
    "use_of_funds" JSONB NOT NULL,
    "terms_conditions" TEXT NOT NULL,
    "risk_disclosure" TEXT NOT NULL,
    "whitepaper_url" TEXT,
    "pitch_deck_url" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "launched_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_ipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipo_investments" (
    "id" TEXT NOT NULL,
    "ipo_id" TEXT NOT NULL,
    "investor_id" INTEGER NOT NULL,
    "amount" DECIMAL(18,9) NOT NULL,
    "currency" "Currency" NOT NULL,
    "tokens_allocated" BIGINT NOT NULL,
    "transaction_hash" TEXT,
    "transaction_status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "tokens_claimed" BIGINT NOT NULL DEFAULT 0,
    "last_claim_date" TIMESTAMP(3),
    "next_claim_date" TIMESTAMP(3),
    "invested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipo_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipo_updates" (
    "id" TEXT NOT NULL,
    "ipo_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "UpdateType" NOT NULL DEFAULT 'general',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipo_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_ipos_user_id_key" ON "creator_ipos"("user_id");

-- CreateIndex
CREATE INDEX "creator_ipos_user_id_idx" ON "creator_ipos"("user_id");

-- CreateIndex
CREATE INDEX "creator_ipos_status_idx" ON "creator_ipos"("status");

-- CreateIndex
CREATE INDEX "creator_ipos_start_date_idx" ON "creator_ipos"("start_date");

-- CreateIndex
CREATE INDEX "creator_ipos_end_date_idx" ON "creator_ipos"("end_date");

-- CreateIndex
CREATE INDEX "ipo_investments_ipo_id_idx" ON "ipo_investments"("ipo_id");

-- CreateIndex
CREATE INDEX "ipo_investments_investor_id_idx" ON "ipo_investments"("investor_id");

-- CreateIndex
CREATE INDEX "ipo_investments_transaction_status_idx" ON "ipo_investments"("transaction_status");

-- CreateIndex
CREATE INDEX "ipo_updates_ipo_id_idx" ON "ipo_updates"("ipo_id");

-- CreateIndex
CREATE INDEX "ipo_updates_created_at_idx" ON "ipo_updates"("created_at");

-- AddForeignKey
ALTER TABLE "creator_ipos" ADD CONSTRAINT "creator_ipos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_ipos" ADD CONSTRAINT "creator_ipos_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_investments" ADD CONSTRAINT "ipo_investments_ipo_id_fkey" FOREIGN KEY ("ipo_id") REFERENCES "creator_ipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_investments" ADD CONSTRAINT "ipo_investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_updates" ADD CONSTRAINT "ipo_updates_ipo_id_fkey" FOREIGN KEY ("ipo_id") REFERENCES "creator_ipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
