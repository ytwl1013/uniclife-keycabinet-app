CREATE TYPE "public"."feedback_delivery_status" AS ENUM('sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "feedback_records" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"user_display_name" varchar(128) NOT NULL,
	"user_email" varchar(320) NOT NULL,
	"salutation" varchar(128) DEFAULT '' NOT NULL,
	"type" varchar(32) NOT NULL,
	"title" varchar(200) DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	"image_count" integer DEFAULT 0 NOT NULL,
	"status" "feedback_delivery_status" DEFAULT 'sending' NOT NULL,
	"failure_code" varchar(128),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_records_image_count_range" CHECK ("feedback_records"."image_count" >= 0 AND "feedback_records"."image_count" <= 5),
	CONSTRAINT "feedback_records_type_valid" CHECK ("feedback_records"."type" IN ('product', 'application'))
);
--> statement-breakpoint
ALTER TABLE "feedback_records" ADD CONSTRAINT "feedback_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "feedback_records_user_submitted_idx" ON "feedback_records" USING btree ("user_id","submitted_at");--> statement-breakpoint
CREATE INDEX "feedback_records_status_submitted_idx" ON "feedback_records" USING btree ("status","submitted_at");