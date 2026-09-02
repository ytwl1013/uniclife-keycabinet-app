CREATE TYPE "public"."feedback_conversation_status" AS ENUM('waiting_for_support', 'waiting_for_user', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."feedback_message_sender" AS ENUM('user', 'support');--> statement-breakpoint
CREATE TABLE "feedback_messages" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"feedback_id" varchar(128) NOT NULL,
	"sender" "feedback_message_sender" NOT NULL,
	"sender_user_id" varchar(128),
	"sender_display_name" varchar(128) NOT NULL,
	"content" text NOT NULL,
	"image_count" integer DEFAULT 0 NOT NULL,
	"status" "feedback_delivery_status" DEFAULT 'sending' NOT NULL,
	"failure_code" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "feedback_messages_content_length" CHECK (char_length("feedback_messages"."content") BETWEEN 1 AND 5000),
	CONSTRAINT "feedback_messages_image_count_range" CHECK ("feedback_messages"."image_count" >= 0 AND "feedback_messages"."image_count" <= 5),
	CONSTRAINT "feedback_messages_sender_user_valid" CHECK (("feedback_messages"."sender" = 'user' AND "feedback_messages"."sender_user_id" IS NOT NULL) OR ("feedback_messages"."sender" = 'support' AND "feedback_messages"."sender_user_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "feedback_records" ADD COLUMN "conversation_status" "feedback_conversation_status" DEFAULT 'waiting_for_support' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_records" ADD COLUMN "last_message_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_messages" ADD CONSTRAINT "feedback_messages_feedback_id_feedback_records_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback_records"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedback_messages" ADD CONSTRAINT "feedback_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
UPDATE "feedback_records"
SET "last_message_at" = "submitted_at";--> statement-breakpoint
INSERT INTO "feedback_messages" (
	"id",
	"feedback_id",
	"sender",
	"sender_user_id",
	"sender_display_name",
	"content",
	"image_count",
	"status",
	"failure_code",
	"created_at",
	"read_at"
)
SELECT
	'message-' || md5("id"),
	"id",
	'user',
	"user_id",
	"user_display_name",
	"content",
	"image_count",
	"status",
	"failure_code",
	"submitted_at",
	NULL
FROM "feedback_records";--> statement-breakpoint
CREATE INDEX "feedback_messages_feedback_created_idx" ON "feedback_messages" USING btree ("feedback_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_messages_unread_support_idx" ON "feedback_messages" USING btree ("feedback_id","created_at") WHERE "feedback_messages"."sender" = 'support' AND "feedback_messages"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "feedback_records_conversation_last_message_idx" ON "feedback_records" USING btree ("conversation_status","last_message_at");
