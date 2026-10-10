-- AlterTable
ALTER TABLE "CollectiveInvoice" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidConfirmedById" TEXT;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "paymentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paymentConfirmedById" TEXT;

-- AddForeignKey
ALTER TABLE "CollectiveInvoice" ADD CONSTRAINT "CollectiveInvoice_paidConfirmedById_fkey" FOREIGN KEY ("paidConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_paymentConfirmedById_fkey" FOREIGN KEY ("paymentConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
