CREATE TYPE "public"."user_role" AS ENUM('schulleitung', 'lehrperson');--> statement-breakpoint
CREATE TYPE "public"."learning_entry_type" AS ENUM('frage', 'schritt');--> statement-breakpoint
CREATE TYPE "public"."artefact_type" AS ENUM('text', 'bild', 'link');--> statement-breakpoint
CREATE TABLE "school_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kanton" varchar(2),
	"curriculum_adapter" varchar(50) DEFAULT 'lp21' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"pin_hash" text NOT NULL,
	"supabase_user_id" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"type" "learning_entry_type" NOT NULL,
	"text" text,
	"parent_id" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artefacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_entry_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"type" "artefact_type" NOT NULL,
	"url" text,
	"content" text,
	"file_size_bytes" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lp21_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_entry_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"lp21_code" text NOT NULL,
	"lp21_label" text,
	"suggested_by_ai" boolean DEFAULT true NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp,
	"confirmed_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ai_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_school_units_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_school_units_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_school_id_school_units_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_entries" ADD CONSTRAINT "learning_entries_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_entries" ADD CONSTRAINT "learning_entries_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_entries" ADD CONSTRAINT "learning_entries_school_id_school_units_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artefacts" ADD CONSTRAINT "artefacts_learning_entry_id_learning_entries_id_fk" FOREIGN KEY ("learning_entry_id") REFERENCES "public"."learning_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artefacts" ADD CONSTRAINT "artefacts_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artefacts" ADD CONSTRAINT "artefacts_school_id_school_units_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lp21_mappings" ADD CONSTRAINT "lp21_mappings_learning_entry_id_learning_entries_id_fk" FOREIGN KEY ("learning_entry_id") REFERENCES "public"."learning_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lp21_mappings" ADD CONSTRAINT "lp21_mappings_school_id_school_units_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_links" ADD CONSTRAINT "feedback_links_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_links" ADD CONSTRAINT "feedback_links_school_id_school_units_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit_log" ADD CONSTRAINT "ai_audit_log_school_id_school_units_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school_units"("id") ON DELETE no action ON UPDATE no action;