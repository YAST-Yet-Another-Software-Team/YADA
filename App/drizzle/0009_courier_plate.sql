-- The plate on the bike that arrives.
--
-- Every YADA courier rides a motorbike, so `vehicle_type` is the same string on
-- every row and tells a waiting business nothing. The plate is what a counter
-- can actually check against the trip on their screen when a rider pulls up.
--
-- Nullable rather than backfilled: nobody has one on file yet, and inventing a
-- plate would be worse than showing none.
ALTER TABLE "courier_profiles" ADD COLUMN "plate_number" text;
