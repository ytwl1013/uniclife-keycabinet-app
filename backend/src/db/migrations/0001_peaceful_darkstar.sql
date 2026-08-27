ALTER TABLE "users" ADD COLUMN "login_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_guide_prompted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users" SET "home_guide_prompted_at" = now() WHERE "home_guide_prompted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_login_count_nonnegative" CHECK ("users"."login_count" >= 0);
