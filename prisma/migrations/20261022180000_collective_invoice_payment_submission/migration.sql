-- Add collectiveInvoiceId to CampusPayment so a CampusPayment row can serve
-- as the proof-submission record for exactly one CollectiveInvoice.
-- A null collectiveInvoiceId means it is a legacy campus payment.

ALTER TABLE "CampusPayment"
ADD COLUMN "collectiveInvoiceId" TEXT;

CREATE UNIQUE INDEX "CampusPayment_collectiveInvoiceId_key"
ON "CampusPayment"("collectiveInvoiceId");

ALTER TABLE "CampusPayment"
ADD CONSTRAINT "CampusPayment_collectiveInvoiceId_fkey"
FOREIGN KEY ("collectiveInvoiceId")
REFERENCES "CollectiveInvoice"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "CampusPayment_collectiveInvoiceId_idx"
ON "CampusPayment"("collectiveInvoiceId");
