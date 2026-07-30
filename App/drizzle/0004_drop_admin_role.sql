-- YADA has two kinds of user: businesses that request deliveries, and couriers
-- that make them. The `admin` role was scope creep and is being removed.
--
-- Postgres has no ALTER TYPE ... DROP VALUE, so the enum is rebuilt. Any
-- account still holding the old role is demoted to `business` first, which is
-- also the column default.
UPDATE "users" SET "role" = 'business' WHERE "role" = 'admin';
--> statement-breakpoint
ALTER TYPE "public"."user_role" RENAME TO "user_role_old";
--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('business', 'courier');
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::text::"public"."user_role";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'business';
--> statement-breakpoint
DROP TYPE "public"."user_role_old";
