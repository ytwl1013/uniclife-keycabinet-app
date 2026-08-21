CREATE TYPE "public"."cabinet_status" AS ENUM('online', 'offline', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."key_status" AS ENUM('available', 'borrowed', 'lost', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."record_type" AS ENUM('borrow', 'return', 'inventory', 'force_open', 'exception');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer NOT NULL,
	"action" varchar(128) NOT NULL,
	"target_type" varchar(64) NOT NULL,
	"target_id" varchar(128) NOT NULL,
	"result" varchar(32) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cabinets" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"location" varchar(256),
	"status" "cabinet_status" DEFAULT 'offline' NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "cabinets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"cabinet_code" varchar(64) NOT NULL,
	"slot_code" varchar(64) NOT NULL,
	"status" "key_status" DEFAULT 'available' NOT NULL,
	CONSTRAINT "keys_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "record_type" NOT NULL,
	"actor_id" integer NOT NULL,
	"key_code" varchar(64),
	"cabinet_code" varchar(64),
	"success" boolean NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"employee_no" varchar(64) NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_employee_no_unique" UNIQUE("employee_no")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "keys_cabinet_slot_idx" ON "keys" USING btree ("cabinet_code","slot_code");--> statement-breakpoint
CREATE INDEX "users_employee_no_idx" ON "users" USING btree ("employee_no");