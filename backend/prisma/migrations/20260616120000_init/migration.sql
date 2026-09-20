-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'REPORTING_MANAGER', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DIVISION', 'MD', 'FINANCE');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_RM', 'PENDING_HOD', 'PENDING_FINANCE', 'RETURNED', 'REJECTED', 'READY_TO_PAY', 'PAID');

-- CreateEnum
CREATE TYPE "InboxClassification" AS ENUM ('CONTEXT', 'INCLUDE', 'EXCLUDE', 'DUPLICATE', 'NOISE', 'OTHER_PERSON');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('LODGING', 'MEALS', 'LOCAL_CONVEYANCE', 'BUSINESS_ENTERTAINMENT', 'AIR_TRAVEL', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "empCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "costCentre" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "reportingManagerCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequest" (
    "id" TEXT NOT NULL,
    "travelRequestId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "cityClass" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "estimatedPaise" INTEGER NOT NULL,
    "advanceRequested" INTEGER NOT NULL,
    "advanceDisbursed" INTEGER NOT NULL,
    "advanceRef" TEXT,
    "nightsRequested" INTEGER NOT NULL,
    "nightsBooked" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "travelRequestId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "fromAddr" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "body" TEXT NOT NULL,
    "classification" "InboxClassification" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "travelRequestId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "claimedPaise" INTEGER NOT NULL DEFAULT 0,
    "reimbursablePaise" INTEGER NOT NULL DEFAULT 0,
    "disallowedPaise" INTEGER NOT NULL DEFAULT 0,
    "advanceAppliedPaise" INTEGER NOT NULL DEFAULT 0,
    "payablePaise" INTEGER NOT NULL DEFAULT 0,
    "financeNotes" TEXT,
    "employeeNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "inboxMessageId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "merchant" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incurredOn" TIMESTAMP(3) NOT NULL,
    "claimedPaise" INTEGER NOT NULL,
    "reimbursablePaise" INTEGER NOT NULL,
    "disallowedPaise" INTEGER NOT NULL,
    "proofRef" TEXT,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "flags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "actedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_empCode_key" ON "User"("empCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TravelRequest_travelRequestId_key" ON "TravelRequest"("travelRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "ApprovalStep_claimId_stepOrder_idx" ON "ApprovalStep"("claimId", "stepOrder");

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_inboxMessageId_fkey" FOREIGN KEY ("inboxMessageId") REFERENCES "InboxMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
