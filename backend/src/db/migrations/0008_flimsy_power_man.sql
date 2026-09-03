CREATE TABLE "product_sku_images" (
	"sku_id" varchar(128) PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"mime_type" varchar(32) NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_sku_images_mime_type_webp" CHECK ("product_sku_images"."mime_type" = 'image/webp'),
	CONSTRAINT "product_sku_images_byte_size_valid" CHECK ("product_sku_images"."byte_size" > 0 AND "product_sku_images"."byte_size" <= 716800),
	CONSTRAINT "product_sku_images_width_valid" CHECK ("product_sku_images"."width" > 0 AND "product_sku_images"."width" <= 1280),
	CONSTRAINT "product_sku_images_height_valid" CHECK ("product_sku_images"."height" > 0 AND "product_sku_images"."height" <= 1280)
);
--> statement-breakpoint
ALTER TABLE "product_skus" ADD COLUMN "image_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_skus" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_skus" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_sku_images" ADD CONSTRAINT "product_sku_images_sku_id_product_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."product_skus"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_skus" ADD CONSTRAINT "product_skus_image_version_nonnegative" CHECK ("product_skus"."image_version" >= 0);--> statement-breakpoint
ALTER TABLE "product_skus" ADD CONSTRAINT "product_skus_version_nonnegative" CHECK ("product_skus"."version" >= 0);