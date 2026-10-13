ALTER TABLE public."CollectiveInvoice"
ADD COLUMN IF NOT EXISTS "eventId" TEXT;

CREATE INDEX IF NOT EXISTS "CollectiveInvoice_eventId_idx"
ON public."CollectiveInvoice" ("eventId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CollectiveInvoice_eventId_fkey'
      AND conrelid = 'public."CollectiveInvoice"'::regclass
  ) THEN
    ALTER TABLE public."CollectiveInvoice"
    ADD CONSTRAINT "CollectiveInvoice_eventId_fkey"
    FOREIGN KEY ("eventId")
    REFERENCES public."Event"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
