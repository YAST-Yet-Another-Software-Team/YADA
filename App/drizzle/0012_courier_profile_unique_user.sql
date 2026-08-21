-- One courier, one profile row.
--
-- `courier_profiles.user_id` has carried a foreign key since 0000 but never a
-- unique constraint, so nothing at the database level stopped a courier ending
-- up with two rows — and `saveCourierProfile` reached for one with a SELECT
-- followed by an INSERT, which is a race that produces exactly that under a
-- retried sign-up or a double-submitted settings form.
--
-- Duplicates are not a cosmetic problem. Every read of a courier's profile
-- (`getCourierProfile`, `getCourierRating`, and the dispatcher's own
-- `ringingRequestRows`) is a LIMIT 1 with no ORDER BY, so which row answers is
-- whichever Postgres happens to return: a rider could be online in one row and
-- offline in another, and their position and rating could be read off a row
-- that no write has touched in weeks.
--
-- Deduplicate first, then constrain. The survivor is the row carrying the most
-- ratings — those are the ones that cost something to rebuild — with the most
-- recently updated row breaking ties, and the id as a last resort so the choice
-- is deterministic rather than dependent on physical order. Nothing references
-- `courier_profiles.id`, so deleting the losers orphans nothing.
DELETE FROM "courier_profiles"
WHERE "id" IN (
	SELECT "id"
	FROM (
		SELECT
			"id",
			ROW_NUMBER() OVER (
				PARTITION BY "user_id"
				ORDER BY "rating_count" DESC, "updated_at" DESC, "id"
			) AS rn
		FROM "courier_profiles"
	) AS ranked
	WHERE ranked.rn > 1
);--> statement-breakpoint
ALTER TABLE "courier_profiles" ADD CONSTRAINT "courier_profiles_user_id_unique" UNIQUE("user_id");
