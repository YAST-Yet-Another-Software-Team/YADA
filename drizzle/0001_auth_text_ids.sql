ALTER TABLE "courier_profiles" DROP CONSTRAINT "courier_profiles_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "delivery_requests" DROP CONSTRAINT "delivery_requests_business_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "delivery_requests" DROP CONSTRAINT "delivery_requests_assigned_courier_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "trip_events" DROP CONSTRAINT "trip_events_actor_id_users_id_fk";--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "id" TYPE text USING "id"::text;--> statement-breakpoint

ALTER TABLE "courier_profiles" ALTER COLUMN "user_id" TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "delivery_requests" ALTER COLUMN "business_id" TYPE text USING "business_id"::text;--> statement-breakpoint
ALTER TABLE "delivery_requests" ALTER COLUMN "assigned_courier_id" TYPE text USING "assigned_courier_id"::text;--> statement-breakpoint
ALTER TABLE "trip_events" ALTER COLUMN "actor_id" TYPE text USING "actor_id"::text;--> statement-breakpoint

CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "courier_profiles" ADD CONSTRAINT "courier_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_business_id_users_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_assigned_courier_id_users_id_fk" FOREIGN KEY ("assigned_courier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint