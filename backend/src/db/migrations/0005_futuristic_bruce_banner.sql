WITH earliest_active_membership AS (
  SELECT DISTINCT ON ("cabinet_id") "id"
  FROM "cabinet_memberships"
  WHERE "active" = true
  ORDER BY "cabinet_id", "joined_at", "id"
)
UPDATE "cabinet_memberships"
SET "role" = 'super_admin'
WHERE "id" IN (SELECT "id" FROM earliest_active_membership);--> statement-breakpoint
CREATE UNIQUE INDEX "cabinet_memberships_active_super_admin_unique" ON "cabinet_memberships" USING btree ("cabinet_id") WHERE "cabinet_memberships"."active" = true AND "cabinet_memberships"."role" = 'super_admin';
