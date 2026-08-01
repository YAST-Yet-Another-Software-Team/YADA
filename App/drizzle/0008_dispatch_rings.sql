-- Ring-based dispatch (SRS 3.2): the clock a request's expanding search runs
-- on, and the memory that keeps a declined courier from being ringed again.
--
-- Existing 'requested' rows get their clock started at migration time, which
-- hands them one fresh 60-second window — harmless, and better than a NULL
-- column every reader must special-case.
ALTER TABLE "delivery_requests" ADD COLUMN "dispatch_started_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE "trip_declines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"courier_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_declines_once" UNIQUE("trip_id","courier_id")
);
--> statement-breakpoint
ALTER TABLE "trip_declines" ADD CONSTRAINT "trip_declines_trip_id_delivery_requests_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."delivery_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trip_declines" ADD CONSTRAINT "trip_declines_courier_id_users_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
