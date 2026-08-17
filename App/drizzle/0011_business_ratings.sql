-- The courier→business half of SRS 3.4.
--
-- No new table: `trip_ratings` was built direction-agnostic (rater → rated) for
-- exactly this, and the `trip_ratings_once_per_rater` unique constraint already
-- keys on (trip_id, rater_id) rather than on the trip alone — so both parties
-- can rate the same delivery once each, and neither can rate it twice.
--
-- All this migration adds is the cached aggregate on the receiving side,
-- mirroring what `0007_trip_ratings` put on courier_profiles.
ALTER TABLE "business_profiles" ADD COLUMN "rating" numeric(3, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Backfill from any rows that already exist. Normally none do at this point,
-- but the column is derived data and a derived column that disagrees with its
-- source on day one never gets trusted again.
UPDATE "business_profiles" AS bp
SET
	"rating" = COALESCE(agg.average, 0)::numeric(3, 2),
	"rating_count" = COALESCE(agg.total, 0)
FROM (
	SELECT "rated_id", AVG("stars") AS average, COUNT(*) AS total
	FROM "trip_ratings"
	GROUP BY "rated_id"
) AS agg
WHERE bp."user_id" = agg."rated_id";
