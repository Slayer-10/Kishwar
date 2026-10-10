-- KISHWAR database foundation.
-- Additive migration: preserve existing records and legacy billing tables.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationReviewStatus') THEN
    CREATE TYPE "RegistrationReviewStatus" AS ENUM (
      'PENDING_AMBASSADOR',
      'PENDING_ADMIN',
      'APPROVED',
      'REJECTED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationSource') THEN
    CREATE TYPE "RegistrationSource" AS ENUM (
      'PUBLIC',
      'AMBASSADOR'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationEvidenceType') THEN
    CREATE TYPE "RegistrationEvidenceType" AS ENUM (
      'STUDENT_DOCUMENT',
      'PAYMENT_PROOF'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EvidenceReviewStatus') THEN
    CREATE TYPE "EvidenceReviewStatus" AS ENUM (
      'PENDING',
      'VERIFIED',
      'REJECTED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccommodationSelection') THEN
    CREATE TYPE "AccommodationSelection" AS ENUM (
      'NONE_OR_ALREADY_ARRANGED',
      'THREE_DAY_STAY_WITH_FOOD'
    );
  END IF;
END $$;

-- Allow public participants to exist without User accounts.
ALTER TABLE "Participant"
  ALTER COLUMN "userId" DROP NOT NULL;

-- Preserve the original CNIC and store a normalized lookup value.
-- This intentionally does not add a unique constraint because legacy
-- duplicate identities must be audited before enforcing uniqueness.
ALTER TABLE "Participant"
  ADD COLUMN IF NOT EXISTS "normalizedCnic" TEXT;

UPDATE "Participant"
SET "normalizedCnic" = NULLIF(
  regexp_replace("cnic", '[^0-9]', '', 'g'),
  ''
)
WHERE "cnic" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Participant_normalizedCnic_idx"
  ON "Participant"("normalizedCnic");

-- Capacity is optional; do not invent capacity values for existing events.
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "seatCapacity" INTEGER;

-- Add the new review workflow without removing legacy Registration.status.
ALTER TABLE "Registration"
  ADD COLUMN IF NOT EXISTS "reviewStatus" "RegistrationReviewStatus"
    NOT NULL DEFAULT 'PENDING_ADMIN',
  ADD COLUMN IF NOT EXISTS "source" "RegistrationSource"
    NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS "seatReserved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "accommodationSelection" "AccommodationSelection"
    NOT NULL DEFAULT 'NONE_OR_ALREADY_ARRANGED',
  ADD COLUMN IF NOT EXISTS "accommodationGender" TEXT,
  ADD COLUMN IF NOT EXISTS "accommodationFee" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "ambassadorApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "adminApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

CREATE INDEX IF NOT EXISTS "Registration_reviewStatus_idx"
  ON "Registration"("reviewStatus");

CREATE INDEX IF NOT EXISTS "Registration_seatReserved_eventId_idx"
  ON "Registration"("seatReserved", "eventId");

CREATE INDEX IF NOT EXISTS "Registration_source_idx"
  ON "Registration"("source");

-- Private evidence metadata. storagePath must point to a private storage object.
CREATE TABLE IF NOT EXISTS "RegistrationEvidence" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "participantId" TEXT,
  "type" "RegistrationEvidenceType" NOT NULL DEFAULT 'STUDENT_DOCUMENT',
  "reviewStatus" "EvidenceReviewStatus" NOT NULL DEFAULT 'PENDING',
  "storagePath" TEXT NOT NULL DEFAULT '',
  "originalFileName" TEXT,
  "contentType" TEXT,
  "byteSize" BIGINT,
  "uploadedByUserId" TEXT,
  "reviewedByUserId" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),

  CONSTRAINT "RegistrationEvidence_pkey" PRIMARY KEY ("id")
);

-- Ensure all required columns exist even if RegistrationEvidence table already existed
ALTER TABLE "RegistrationEvidence"
  ADD COLUMN IF NOT EXISTS "type" "RegistrationEvidenceType" NOT NULL DEFAULT 'STUDENT_DOCUMENT',
  ADD COLUMN IF NOT EXISTS "reviewStatus" "EvidenceReviewStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "storagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "contentType" TEXT,
  ADD COLUMN IF NOT EXISTS "byteSize" BIGINT,
  ADD COLUMN IF NOT EXISTS "uploadedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- Migrate studentCardPath if present in existing table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RegistrationEvidence' AND column_name = 'studentCardPath') THEN
    EXECUTE 'UPDATE "RegistrationEvidence" SET "storagePath" = "studentCardPath" WHERE "storagePath" IS NULL AND "studentCardPath" IS NOT NULL;';
  END IF;
END $$;

UPDATE "RegistrationEvidence" SET "storagePath" = '' WHERE "storagePath" IS NULL;

ALTER TABLE "RegistrationEvidence" ALTER COLUMN "storagePath" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "RegistrationEvidence_registrationId_idx"
  ON "RegistrationEvidence"("registrationId");

CREATE INDEX IF NOT EXISTS "RegistrationEvidence_participantId_idx"
  ON "RegistrationEvidence"("participantId");

CREATE INDEX IF NOT EXISTS "RegistrationEvidence_type_reviewStatus_idx"
  ON "RegistrationEvidence"("type", "reviewStatus");

CREATE INDEX IF NOT EXISTS "RegistrationEvidence_reviewedByUserId_idx"
  ON "RegistrationEvidence"("reviewedByUserId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistrationEvidence_registrationId_fkey') THEN
    ALTER TABLE "RegistrationEvidence"
      ADD CONSTRAINT "RegistrationEvidence_registrationId_fkey"
      FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistrationEvidence_participantId_fkey') THEN
    ALTER TABLE "RegistrationEvidence"
      ADD CONSTRAINT "RegistrationEvidence_participantId_fkey"
      FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistrationEvidence_uploadedByUserId_fkey') THEN
    ALTER TABLE "RegistrationEvidence"
      ADD CONSTRAINT "RegistrationEvidence_uploadedByUserId_fkey"
      FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RegistrationEvidence_reviewedByUserId_fkey') THEN
    ALTER TABLE "RegistrationEvidence"
      ADD CONSTRAINT "RegistrationEvidence_reviewedByUserId_fkey"
      FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Collective invoices are separate from legacy one-registration invoices.
CREATE TABLE IF NOT EXISTS "CollectiveInvoice" (
  "id" TEXT NOT NULL,
  "ambassadorId" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "subtotal" DECIMAL(10,2) NOT NULL,
  "discountPercent" DECIMAL(5,2) NOT NULL,
  "discountAmount" DECIMAL(10,2) NOT NULL,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "generatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CollectiveInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CollectiveInvoice_invoiceNumber_key"
  ON "CollectiveInvoice"("invoiceNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "CollectiveInvoice_ambassadorId_scopeKey_key"
  ON "CollectiveInvoice"("ambassadorId", "scopeKey");

CREATE INDEX IF NOT EXISTS "CollectiveInvoice_ambassadorId_status_idx"
  ON "CollectiveInvoice"("ambassadorId", "status");

CREATE INDEX IF NOT EXISTS "CollectiveInvoice_status_createdAt_idx"
  ON "CollectiveInvoice"("status", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectiveInvoice_ambassadorId_fkey') THEN
    ALTER TABLE "CollectiveInvoice"
      ADD CONSTRAINT "CollectiveInvoice_ambassadorId_fkey"
      FOREIGN KEY ("ambassadorId") REFERENCES "Ambassador"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectiveInvoice_generatedById_fkey') THEN
    ALTER TABLE "CollectiveInvoice"
      ADD CONSTRAINT "CollectiveInvoice_generatedById_fkey"
      FOREIGN KEY ("generatedById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CollectiveInvoiceItem" (
  "id" TEXT NOT NULL,
  "collectiveInvoiceId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "baseAmount" DECIMAL(10,2) NOT NULL,
  "discountAmount" DECIMAL(10,2) NOT NULL,
  "finalAmount" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CollectiveInvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CollectiveInvoiceItem_registrationId_key"
  ON "CollectiveInvoiceItem"("registrationId");

CREATE INDEX IF NOT EXISTS "CollectiveInvoiceItem_collectiveInvoiceId_idx"
  ON "CollectiveInvoiceItem"("collectiveInvoiceId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectiveInvoiceItem_collectiveInvoiceId_fkey') THEN
    ALTER TABLE "CollectiveInvoiceItem"
      ADD CONSTRAINT "CollectiveInvoiceItem_collectiveInvoiceId_fkey"
      FOREIGN KEY ("collectiveInvoiceId") REFERENCES "CollectiveInvoice"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectiveInvoiceItem_registrationId_fkey') THEN
    ALTER TABLE "CollectiveInvoiceItem"
      ADD CONSTRAINT "CollectiveInvoiceItem_registrationId_fkey"
      FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Configurable tiers only. No assumptions or invented discount values are seeded.
CREATE TABLE IF NOT EXISTS "DiscountTier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "minimumRegistrations" INTEGER NOT NULL,
  "discountPercent" DECIMAL(5,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DiscountTier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscountTier_minimumRegistrations_check"
    CHECK ("minimumRegistrations" >= 1),
  CONSTRAINT "DiscountTier_discountPercent_check"
    CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscountTier_name_key"
  ON "DiscountTier"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "DiscountTier_minimumRegistrations_key"
  ON "DiscountTier"("minimumRegistrations");

CREATE INDEX IF NOT EXISTS "DiscountTier_isActive_minimumRegistrations_idx"
  ON "DiscountTier"("isActive", "minimumRegistrations");
