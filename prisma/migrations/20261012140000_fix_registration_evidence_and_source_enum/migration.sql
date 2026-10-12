-- 1. Ensure 'PUBLIC' is an allowed value in RegistrationSource enum
ALTER TYPE "RegistrationSource" ADD VALUE IF NOT EXISTS 'PUBLIC';

-- 2. Migrate any legacy 'INDEPENDENT' records to 'PUBLIC'
UPDATE "Registration" SET "source" = 'PUBLIC' WHERE "source"::text = 'INDEPENDENT';

-- 3. Make obsolete legacy columns in RegistrationEvidence nullable
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RegistrationEvidence' AND column_name = 'studentCardPath') THEN
    ALTER TABLE "RegistrationEvidence" ALTER COLUMN "studentCardPath" DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RegistrationEvidence' AND column_name = 'universityName') THEN
    ALTER TABLE "RegistrationEvidence" ALTER COLUMN "universityName" DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RegistrationEvidence' AND column_name = 'participantId') THEN
    ALTER TABLE "RegistrationEvidence" ALTER COLUMN "participantId" DROP NOT NULL;
  END IF;
END $$;

-- 4. Drop obsolete legacy unique constraint on (registrationId, participantId) if present
ALTER TABLE "RegistrationEvidence" DROP CONSTRAINT IF EXISTS "RegistrationEvidence_registrationId_participantId_key";
DROP INDEX IF EXISTS "RegistrationEvidence_registrationId_participantId_key";
