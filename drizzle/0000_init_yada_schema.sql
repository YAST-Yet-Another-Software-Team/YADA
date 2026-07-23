CREATE TYPE "public"."trip_status" AS ENUM('requested', 'accepted', 'courier_arriving', 'arrived', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('business', 'courier', 'admin');--> statement-breakpoint
CREATE TABLE "courier_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_type" text NOT NULL,
	"rating" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"current_latitude" numeric(10, 6),
	"current_longitude" numeric(10, 6),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"assigned_courier_id" uuid,
	"status" "trip_status" DEFAULT 'requested' NOT NULL,
	"pickup_address" text NOT NULL,
	"dropoff_address" text NOT NULL,
	"notes" text,
	"estimated_distance_km" numeric(8, 2),
	"estimated_duration_minutes" numeric(8, 2),
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"actor_id" uuid,
	"event_type" text NOT NULL,
	"payload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone_number" text,
	"role" "user_role" DEFAULT 'business' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
ALTER TABLE "courier_profiles" ADD CONSTRAINT "courier_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_business_id_users_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_assigned_courier_id_users_id_fk" FOREIGN KEY ("assigned_courier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_trip_id_delivery_requests_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."delivery_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;