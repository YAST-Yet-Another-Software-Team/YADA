-- What is in the parcel, and what it is worth.
--
-- A delivery record that cannot say what was sent is not an audit record: when
-- a handover is disputed, "88 Elm St, 2:41 PM" answers where and when and
-- nothing about what. The business now names the order and states its value
-- before the request can be raised, so every trip carries both.
--
-- The price is the *order's* value in cedis, not a delivery fee — YADA does not
-- price the ride. `numeric(10, 2)` rather than a float, because money that is
-- ever compared or summed must not be stored as a binary fraction.
--
-- Both columns are NOT NULL, which is the whole point, so this arrives in three
-- steps: add them nullable, fill what is already there, then close them. The
-- placeholder marks rows that predate the requirement rather than inventing an
-- order for them — every one of these is test data.
ALTER TABLE "delivery_requests" ADD COLUMN "order_name" text;
--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD COLUMN "order_price" numeric(10, 2);
--> statement-breakpoint

UPDATE "delivery_requests"
SET "order_name" = 'Unrecorded order'
WHERE "order_name" IS NULL;
--> statement-breakpoint

UPDATE "delivery_requests"
SET "order_price" = 0
WHERE "order_price" IS NULL;
--> statement-breakpoint

ALTER TABLE "delivery_requests" ALTER COLUMN "order_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "delivery_requests" ALTER COLUMN "order_price" SET NOT NULL;
