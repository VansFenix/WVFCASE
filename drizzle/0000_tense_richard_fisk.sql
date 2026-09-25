CREATE TABLE "wvf_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"item_id" text,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wvf_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"case_id" text NOT NULL,
	"status" text DEFAULT 'owned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wvf_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wvf_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Игрок' NOT NULL,
	"email" text,
	"password_hash" text,
	"coins" integer DEFAULT 5000 NOT NULL,
	"opened" integer DEFAULT 0 NOT NULL,
	"daily_at" timestamp with time zone,
	"promo_claimed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wvf_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "wvf_activity" ADD CONSTRAINT "wvf_activity_user_id_wvf_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."wvf_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wvf_inventory" ADD CONSTRAINT "wvf_inventory_user_id_wvf_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."wvf_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wvf_sessions" ADD CONSTRAINT "wvf_sessions_user_id_wvf_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."wvf_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wvf_activity_user_idx" ON "wvf_activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "wvf_inventory_owner_idx" ON "wvf_inventory" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "wvf_session_user_idx" ON "wvf_sessions" USING btree ("user_id");