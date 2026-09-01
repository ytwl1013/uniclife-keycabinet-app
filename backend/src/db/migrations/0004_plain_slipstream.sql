ALTER TYPE "public"."cabinet_event_type" ADD VALUE 'super_admin_transferred' BEFORE 'member_removed';--> statement-breakpoint
ALTER TYPE "public"."membership_role" RENAME TO "membership_role_old";--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('super_admin', 'admin');--> statement-breakpoint
ALTER TABLE "cabinet_memberships" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cabinet_memberships" ALTER COLUMN "role" TYPE "public"."membership_role" USING "role"::text::"public"."membership_role";--> statement-breakpoint
ALTER TABLE "cabinet_memberships" ALTER COLUMN "role" SET DEFAULT 'admin';--> statement-breakpoint
DROP TYPE "public"."membership_role_old";
