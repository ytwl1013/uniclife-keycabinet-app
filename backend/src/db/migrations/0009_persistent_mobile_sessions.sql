ALTER TABLE "sessions" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
UPDATE "sessions"
SET "expires_at" = NULL
WHERE "revoked_at" IS NULL AND "expires_at" > now();
