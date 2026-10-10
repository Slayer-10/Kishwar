-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "campusPaymentId" TEXT;

-- CreateTable
CREATE TABLE "CampusPayment" (
    "id" TEXT NOT NULL,
    "ambassadorId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "proofUrl" TEXT,
    "verificationStatus" "PaymentVerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampusPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampusPayment_ambassadorId_idx" ON "CampusPayment"("ambassadorId");

-- CreateIndex
CREATE INDEX "CampusPayment_verificationStatus_idx" ON "CampusPayment"("verificationStatus");

-- CreateIndex
CREATE INDEX "Invoice_campusPaymentId_idx" ON "Invoice"("campusPaymentId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_campusPaymentId_fkey" FOREIGN KEY ("campusPaymentId") REFERENCES "CampusPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusPayment" ADD CONSTRAINT "CampusPayment_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "Ambassador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusPayment" ADD CONSTRAINT "CampusPayment_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
