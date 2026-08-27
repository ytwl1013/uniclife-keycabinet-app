ALTER TYPE "public"."cabinet_event_type" ADD VALUE 'cabinet_initialized' BEFORE 'cabinet_renamed';--> statement-breakpoint
ALTER TYPE "public"."cabinet_event_type" ADD VALUE 'member_joined' BEFORE 'cabinet_renamed';--> statement-breakpoint
CREATE TABLE "cabinet_join_invitations" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"cabinet_id" varchar(128) NOT NULL,
	"created_by" varchar(128) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_by" varchar(128),
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cabinet_join_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "product_qrs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"code" varchar(256) NOT NULL,
	"sku_id" varchar(128) NOT NULL,
	"status" "qr_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_qrs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "cabinet_join_invitations" ADD CONSTRAINT "cabinet_join_invitations_cabinet_id_cabinets_id_fk" FOREIGN KEY ("cabinet_id") REFERENCES "public"."cabinets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cabinet_join_invitations" ADD CONSTRAINT "cabinet_join_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cabinet_join_invitations" ADD CONSTRAINT "cabinet_join_invitations_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_qrs" ADD CONSTRAINT "product_qrs_sku_id_product_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_skus"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "cabinet_join_invitations_cabinet_created_idx" ON "cabinet_join_invitations" USING btree ("cabinet_id","created_at");--> statement-breakpoint
CREATE INDEX "cabinet_join_invitations_expires_at_idx" ON "cabinet_join_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_qrs_sku_id_unique" ON "product_qrs" USING btree ("sku_id");
--> statement-breakpoint
INSERT INTO "product_qrs" ("id", "code", "sku_id", "status")
SELECT
	'product-qr-bg5163-bk',
	'uniclife://cabinet/v1/init/BG5163-BK/uniclife-bg5163-bk-2026',
	"id",
	'active'
FROM "product_skus"
WHERE "sku" = 'BG5163-BK'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_qrs" ("id", "code", "sku_id", "status")
SELECT
	'product-qr-bg0680-bk',
	'uniclife://cabinet/v1/init/BG0680-BK/uniclife-bg0680-bk-2026',
	"id",
	'active'
FROM "product_skus"
WHERE "sku" = 'BG0680-BK'
ON CONFLICT DO NOTHING;
