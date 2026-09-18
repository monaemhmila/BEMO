-- Replace the credit + subscription system with a simple trial counter.
-- Every account starts with 3 free story generations and each printed book
-- order grants 1 more (handled in application code).

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialGenerations" INTEGER NOT NULL DEFAULT 3;

-- DropTable (credit + subscription system)
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "UserCredit" CASCADE;
DROP TABLE IF EXISTS "UsageRecord" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "Subscription" CASCADE;
DROP TABLE IF EXISTS "ReferralProgram" CASCADE;
DROP TABLE IF EXISTS "EducationalDiscount" CASCADE;
DROP TABLE IF EXISTS "TicketMessage" CASCADE;
DROP TABLE IF EXISTS "SupportTicket" CASCADE;
DROP TABLE IF EXISTS "GiftSubscription" CASCADE;
DROP TABLE IF EXISTS "BusinessAnalytics" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "TransactionStatus";
DROP TYPE IF EXISTS "PlanType";
DROP TYPE IF EXISTS "SubscriptionTier";
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "PaymentProvider";
DROP TYPE IF EXISTS "ReferralStatus";
DROP TYPE IF EXISTS "TicketStatus";
DROP TYPE IF EXISTS "EducationalStatus";
