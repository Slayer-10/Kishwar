-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "universityId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "batchId" TEXT;

-- CreateIndex
CREATE INDEX "Participant_universityId_idx" ON "Participant"("universityId");

-- CreateIndex
CREATE INDEX "Payment_batchId_idx" ON "Payment"("batchId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;
