CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"business_name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_profiles_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint

ALTER TABLE "courier_profiles" DROP CONSTRAINT "courier_profiles_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "delivery_requests" DROP CONSTRAINT "delivery_requests_business_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "delivery_requests" DROP CONSTRAINT "delivery_requests_assigned_courier_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "trip_events" DROP CONSTRAINT "trip_events_actor_id_users_id_fk";--> statement-breakpoint

ALTER TABLE "courier_profiles" ALTER COLUMN "user_id" TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "delivery_requests" ALTER COLUMN "business_id" TYPE text USING "business_id"::text;--> statement-breakpoint
ALTER TABLE "delivery_requests" ALTER COLUMN "assigned_courier_id" TYPE text USING "assigned_courier_id"::text;--> statement-breakpoint
ALTER TABLE "trip_events" ALTER COLUMN "actor_id" TYPE text USING "actor_id"::text;--> statement-breakpoint

ALTER TABLE "courier_profiles" ADD CONSTRAINT "courier_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_business_id_users_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_assigned_courier_id_users_id_fk" FOREIGN KEY ("assigned_courier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint