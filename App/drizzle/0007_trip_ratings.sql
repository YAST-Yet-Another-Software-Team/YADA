-- Business→courier ratings, one per trip per rater (SRS 2.2.1.5, 3.4).
--
-- The table is direction-agnostic (rater → rated) so the courier→business half
-- of SRS 3.4 lands as rows in the same table, not a second one. The CHECK lives
-- here as well as in the API because the API is not the only thing that will
-- ever write a row.
CREATE TABLE "trip_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"rater_id" text NOT NULL,
	"rated_id" text NOT NULL,
	"stars" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_ratings_once_per_rater" UNIQUE("trip_id","rater_id"),
	CONSTRAINT "trip_ratings_stars_range" CHECK ("stars" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "trip_ratings" ADD CONSTRAINT "trip_ratings_trip_id_delivery_requests_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."delivery_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trip_ratings" ADD CONSTRAINT "trip_ratings_rater_id_users_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trip_ratings" ADD CONSTRAINT "trip_ratings_rated_id_users_id_fk" FOREIGN KEY ("rated_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- The cached average on courier_profiles needs its weight: an average without a
-- count can't be smoothed against the cold-start prior in the matching rubric.
ALTER TABLE "courier_profiles" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;
