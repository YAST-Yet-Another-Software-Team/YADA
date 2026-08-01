-- Sign-up never created a courier's profile row — only the dev seed did. So any
-- courier who actually registered had a user record and nothing in
-- `courier_profiles`, and `POST /api/location` writes their live position with
-- an UPDATE against that table: no row, no rows updated, position silently
-- dropped on every fix.
--
-- The visible symptom was the two proximity gates. `courier_within_range` reads
-- the stored fix, finds none, and refuses — so confirming a pickup or a delivery
-- answered "No rider location yet" forever, for every real account.
--
-- Sign-up now writes the row. This backfills the accounts that predate it.
-- `vehicle_type` is NOT NULL and nobody is asked for it — YADA is a motor
-- courier service, so the answer is the same for everyone (see
-- `COURIER_VEHICLE_TYPE`).
--
-- Re-running this is harmless: the NOT IN clause means it only ever fills gaps.
INSERT INTO "courier_profiles" ("user_id", "vehicle_type")
SELECT "id", 'Motorbike'
FROM "users"
WHERE "role" = 'courier'
  AND "id" NOT IN (SELECT "user_id" FROM "courier_profiles");
