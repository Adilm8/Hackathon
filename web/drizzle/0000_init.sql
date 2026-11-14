CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"plan" text NOT NULL,
	"event_id" text,
	"stripe_session_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "entitlements_plan_check" CHECK ("entitlements"."plan" in ('event', 'year', 'month'))
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"restore_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "families_kind_check" CHECK ("families"."kind" in ('real', 'sample'))
);
--> statement-breakpoint
CREATE TABLE "family_state" (
	"family_id" uuid PRIMARY KEY NOT NULL,
	"doc" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"family_id" uuid,
	"route" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"latency_ms" integer NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_state" ADD CONSTRAINT "family_state_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entitlements_family_id" ON "entitlements" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "families_restore_hash" ON "families" USING btree ("restore_hash");--> statement-breakpoint
CREATE INDEX "families_last_seen_at" ON "families" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "llm_calls_created_at" ON "llm_calls" USING btree ("created_at");