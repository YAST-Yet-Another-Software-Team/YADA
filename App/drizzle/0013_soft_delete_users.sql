-- Closing an account, without erasing the deliveries it was party to.
--
-- A hard `DELETE FROM users` is not available to us: `delivery_requests`
-- cascades on `business_id`, so a business closing its account would take every
-- delivery it ever raised with it — and with those, the *courier's* completed
-- trip history and the `trip_ratings` hanging off them. One person leaving
-- would silently rewrite another person's record.
--
-- So the row survives and is marked instead. The name stays, because a trip
-- that cannot say who sent it is not an audit record; everything that makes the
-- account usable — credentials, sessions, contact details — is removed by
-- `deleteOwnAccount`, which is what makes this a deletion rather than a flag.
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
-- Partial, because the only question ever asked of this column is "is it null".
CREATE INDEX "users_deleted_at_idx" ON "users" ("deleted_at") WHERE "deleted_at" IS NOT NULL;
