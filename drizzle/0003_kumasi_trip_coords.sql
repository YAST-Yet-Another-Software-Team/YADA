-- Kumasi maps: trip coordinates + courier last-seen location
ALTER TABLE "courier_profiles" ADD COLUMN IF NOT EXISTS "last_location_at" timestamp with time zone;

ALTER TABLE "delivery_requests" ADD COLUMN IF NOT EXISTS "pickup_latitude" numeric(10, 6);
ALTER TABLE "delivery_requests" ADD COLUMN IF NOT EXISTS "pickup_longitude" numeric(10, 6);
ALTER TABLE "delivery_requests" ADD COLUMN IF NOT EXISTS "dropoff_latitude" numeric(10, 6);
ALTER TABLE "delivery_requests" ADD COLUMN IF NOT EXISTS "dropoff_longitude" numeric(10, 6);
ALTER TABLE "delivery_requests" ADD COLUMN IF NOT EXISTS "pickup_place_id" text;
ALTER TABLE "delivery_requests" ADD COLUMN IF NOT EXISTS "dropoff_place_id" text;
