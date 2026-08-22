CREATE TYPE "public"."audit_result" AS ENUM('success', 'failure');--> statement-breakpoint
CREATE TYPE "public"."cabinet_event_type" AS ENUM('cabinet_bound', 'cabinet_renamed', 'member_removed', 'key_added', 'key_updated', 'key_deleted', 'checkout', 'return', 'keys_deleted');--> statement-breakpoint
CREATE TYPE "public"."cabinet_status" AS ENUM('online', 'offline', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."consent_kind" AS ENUM('terms', 'privacy');--> statement-breakpoint
CREATE TYPE "public"."key_status" AS ENUM('available', 'borrowed');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('active', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('admin');--> statement-breakpoint
CREATE TYPE "public"."qr_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"actor_id" varchar(128),
	"action" varchar(128) NOT NULL,
	"target_type" varchar(64) NOT NULL,
	"target_id" varchar(128) NOT NULL,
	"result" "audit_result" NOT NULL,
	"reason_code" varchar(128),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cabinet_events" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"cabinet_id" varchar(128) NOT NULL,
	"key_id" varchar(128),
	"actor_id" varchar(128) NOT NULL,
	"type" "cabinet_event_type" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversible" boolean DEFAULT false NOT NULL,
	"related_loan_id" varchar(128),
	"summary_data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cabinet_memberships" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"cabinet_id" varchar(128) NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"role" "membership_role" DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cabinet_qrs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"code" varchar(256) NOT NULL,
	"sku_id" varchar(128) NOT NULL,
	"device_uuid" varchar(36) NOT NULL,
	"status" "qr_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cabinet_qrs_code_unique" UNIQUE("code"),
	CONSTRAINT "cabinet_qrs_device_uuid_unique" UNIQUE("device_uuid")
);
--> statement-breakpoint
CREATE TABLE "cabinets" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"sku_id" varchar(128) NOT NULL,
	"device_uuid" varchar(36) NOT NULL,
	"name" varchar(128) NOT NULL,
	"location" varchar(256) DEFAULT '' NOT NULL,
	"time_zone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"status" "cabinet_status" DEFAULT 'offline' NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cabinets_device_uuid_unique" UNIQUE("device_uuid"),
	CONSTRAINT "cabinets_version_nonnegative" CHECK ("cabinets"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"kind" "consent_kind" NOT NULL,
	"granted" boolean NOT NULL,
	"policy_version" varchar(64) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"actor_id" varchar(128) NOT NULL,
	"operation" varchar(128) NOT NULL,
	"request_id" varchar(128) NOT NULL,
	"status_code" integer NOT NULL,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_records_actor_id_operation_request_id_pk" PRIMARY KEY("actor_id","operation","request_id")
);
--> statement-breakpoint
CREATE TABLE "key_slots" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"cabinet_id" varchar(128) NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "key_slots_position_positive" CHECK ("key_slots"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "keys" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"cabinet_id" varchar(128) NOT NULL,
	"slot_id" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "key_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"cabinet_id" varchar(128) NOT NULL,
	"key_id" varchar(128) NOT NULL,
	"borrower_name" varchar(128) NOT NULL,
	"borrower_contact" varchar(320),
	"checked_out_at" timestamp with time zone NOT NULL,
	"expected_return_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"operator_id" varchar(128) NOT NULL,
	"return_operator_id" varchar(128),
	"checkout_event_id" varchar(128) NOT NULL,
	"return_event_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_expected_return_after_checkout" CHECK ("loans"."expected_return_at" IS NULL OR "loans"."expected_return_at" > "loans"."checked_out_at")
);
--> statement-breakpoint
CREATE TABLE "password_reset_challenges" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"reset_token_hash" varchar(64),
	"reset_token_expires_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_attempts_nonnegative" CHECK ("password_reset_challenges"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_skus" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"sku" varchar(64) NOT NULL,
	"model" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"color" varchar(64) NOT NULL,
	"capacity" integer NOT NULL,
	"description" text NOT NULL,
	"manual_url" text NOT NULL,
	"image_asset" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_skus_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_skus_capacity_positive" CHECK ("product_skus"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"avatar_uri" text,
	"locale" varchar(16) DEFAULT 'en-US' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cabinet_events" ADD CONSTRAINT "cabinet_events_cabinet_id_cabinets_id_fk" FOREIGN KEY ("cabinet_id") REFERENCES "public"."cabinets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cabinet_events" ADD CONSTRAINT "cabinet_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cabinet_memberships" ADD CONSTRAINT "cabinet_memberships_cabinet_id_cabinets_id_fk" FOREIGN KEY ("cabinet_id") REFERENCES "public"."cabinets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cabinet_memberships" ADD CONSTRAINT "cabinet_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cabinet_qrs" ADD CONSTRAINT "cabinet_qrs_sku_id_product_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_skus"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cabinets" ADD CONSTRAINT "cabinets_sku_id_product_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_skus"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "key_slots" ADD CONSTRAINT "key_slots_cabinet_id_cabinets_id_fk" FOREIGN KEY ("cabinet_id") REFERENCES "public"."cabinets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "keys" ADD CONSTRAINT "keys_cabinet_id_cabinets_id_fk" FOREIGN KEY ("cabinet_id") REFERENCES "public"."cabinets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "keys" ADD CONSTRAINT "keys_slot_id_key_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."key_slots"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_cabinet_id_cabinets_id_fk" FOREIGN KEY ("cabinet_id") REFERENCES "public"."cabinets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_return_operator_id_users_id_fk" FOREIGN KEY ("return_operator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "password_reset_challenges" ADD CONSTRAINT "password_reset_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_target_created_idx" ON "audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "cabinet_events_cabinet_occurred_idx" ON "cabinet_events" USING btree ("cabinet_id","occurred_at");--> statement-breakpoint
CREATE INDEX "cabinet_events_key_occurred_idx" ON "cabinet_events" USING btree ("key_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cabinet_memberships_cabinet_user_unique" ON "cabinet_memberships" USING btree ("cabinet_id","user_id");--> statement-breakpoint
CREATE INDEX "cabinet_memberships_user_active_idx" ON "cabinet_memberships" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "cabinet_qrs_sku_id_idx" ON "cabinet_qrs" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "cabinets_sku_id_idx" ON "cabinets" USING btree ("sku_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consents_user_kind_policy_unique" ON "consents" USING btree ("user_id","kind","policy_version");--> statement-breakpoint
CREATE INDEX "idempotency_expires_at_idx" ON "idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "key_slots_cabinet_position_unique" ON "key_slots" USING btree ("cabinet_id","position");--> statement-breakpoint
CREATE INDEX "key_slots_cabinet_id_idx" ON "key_slots" USING btree ("cabinet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "keys_slot_id_unique" ON "keys" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "keys_cabinet_status_idx" ON "keys" USING btree ("cabinet_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "loans_one_active_per_key_unique" ON "loans" USING btree ("key_id") WHERE "loans"."status" = 'active';--> statement-breakpoint
CREATE INDEX "loans_cabinet_checked_out_idx" ON "loans" USING btree ("cabinet_id","checked_out_at");--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_reset_challenges" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_token_hash_unique" ON "password_reset_challenges" USING btree ("reset_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));