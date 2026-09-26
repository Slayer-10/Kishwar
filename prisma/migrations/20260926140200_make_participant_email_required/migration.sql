-- AlterTable
ALTER TABLE "Participant" ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");
