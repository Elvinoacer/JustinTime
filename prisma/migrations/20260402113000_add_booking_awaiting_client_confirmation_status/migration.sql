DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BookingStatus'
      AND e.enumlabel = 'AWAITING_CLIENT_CONFIRMATION'
  ) THEN
    ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_CLIENT_CONFIRMATION';
  END IF;
END
$$;
