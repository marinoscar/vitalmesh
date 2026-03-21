-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('android_health_connect', 'manual', 'api', 'lab_upload');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('idle', 'syncing', 'error');

-- AlterTable
ALTER TABLE "allowed_emails" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "audit_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "device_codes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "permissions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "storage_object_chunks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "storage_objects" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "system_settings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_identities" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_settings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_model" TEXT,
    "device_manufacturer" TEXT,
    "device_os" TEXT,
    "device_type" TEXT,
    "app_version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMPTZ,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_sources" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "package_name" TEXT,
    "display_name" TEXT,
    "device_id" UUID,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_sync_state" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "data_type" TEXT NOT NULL,
    "change_token" TEXT,
    "last_sync_at" TIMESTAMPTZ,
    "last_record_time" TIMESTAMPTZ,
    "records_synced" BIGINT NOT NULL DEFAULT 0,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'idle',
    "error_message" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "health_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_metrics" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT,
    "group_id" UUID,
    "tags" JSONB,
    "client_record_id" TEXT,
    "zone_offset" TEXT,
    "end_zone_offset" TEXT,
    "data_origin" TEXT,
    "recording_method" TEXT,
    "device_type" TEXT,
    "metadata" JSONB,
    "notes" TEXT,
    "device_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ,
    "updated_by_user_id" UUID,
    "update_source" TEXT,
    "update_comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_sleep_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "duration_ms" BIGINT,
    "title" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "client_record_id" TEXT,
    "zone_offset" TEXT,
    "end_zone_offset" TEXT,
    "data_origin" TEXT,
    "recording_method" TEXT,
    "metadata" JSONB,
    "device_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ,
    "updated_by_user_id" UUID,
    "update_source" TEXT,
    "update_comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_sleep_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_sleep_stages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "stage" TEXT NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_sleep_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_exercise_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "exercise_type" TEXT NOT NULL,
    "title" TEXT,
    "is_planned" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB NOT NULL,
    "source" TEXT,
    "client_record_id" TEXT,
    "zone_offset" TEXT,
    "end_zone_offset" TEXT,
    "data_origin" TEXT,
    "recording_method" TEXT,
    "metadata" JSONB,
    "notes" TEXT,
    "device_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ,
    "updated_by_user_id" UUID,
    "update_source" TEXT,
    "update_comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_exercise_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_nutrition" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "meal_type" TEXT,
    "name" TEXT,
    "nutrients" JSONB NOT NULL,
    "source" TEXT,
    "client_record_id" TEXT,
    "zone_offset" TEXT,
    "end_zone_offset" TEXT,
    "data_origin" TEXT,
    "recording_method" TEXT,
    "metadata" JSONB,
    "device_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ,
    "updated_by_user_id" UUID,
    "update_source" TEXT,
    "update_comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_cycle_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ,
    "event_type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "source" TEXT,
    "client_record_id" TEXT,
    "zone_offset" TEXT,
    "end_zone_offset" TEXT,
    "data_origin" TEXT,
    "recording_method" TEXT,
    "metadata" JSONB,
    "device_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ,
    "updated_by_user_id" UUID,
    "update_source" TEXT,
    "update_comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_cycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_lab_results" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "test_name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "range_low" DOUBLE PRECISION,
    "range_high" DOUBLE PRECISION,
    "status" TEXT,
    "panel_name" TEXT,
    "lab_name" TEXT,
    "ordering_provider" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "tags" JSONB,
    "device_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ,
    "updated_by_user_id" UUID,
    "update_source" TEXT,
    "update_comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_mood_scales" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scale_name" TEXT NOT NULL,
    "min_value" INTEGER NOT NULL,
    "max_value" INTEGER NOT NULL,
    "labels" JSONB NOT NULL,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "health_mood_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "health_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_session_records" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_session_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_record_attachments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "storage_object_id" UUID NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_record_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_record_comments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "comment_type" TEXT NOT NULL DEFAULT 'note',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "health_record_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_record_revisions" (
    "id" UUID NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "previous_data" JSONB NOT NULL,
    "changed_by_user_id" UUID,
    "change_source" TEXT NOT NULL,
    "change_comment" TEXT,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_record_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_name_device_model_key" ON "user_devices"("user_id", "device_name", "device_model");

-- CreateIndex
CREATE UNIQUE INDEX "health_data_sources_user_id_source_type_package_name_key" ON "health_data_sources"("user_id", "source_type", "package_name");

-- CreateIndex
CREATE UNIQUE INDEX "health_sync_state_user_id_device_id_data_type_key" ON "health_sync_state"("user_id", "device_id", "data_type");

-- CreateIndex
CREATE INDEX "health_metrics_user_id_metric_timestamp_idx" ON "health_metrics"("user_id", "metric", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "health_metrics_user_id_timestamp_idx" ON "health_metrics"("user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "health_metrics_user_id_group_id_idx" ON "health_metrics"("user_id", "group_id");

-- CreateIndex
CREATE INDEX "health_metrics_user_id_data_origin_idx" ON "health_metrics"("user_id", "data_origin");

-- CreateIndex
CREATE UNIQUE INDEX "health_metrics_user_id_client_record_id_key" ON "health_metrics"("user_id", "client_record_id");

-- CreateIndex
CREATE INDEX "health_sleep_sessions_user_id_start_time_idx" ON "health_sleep_sessions"("user_id", "start_time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "health_sleep_sessions_user_id_client_record_id_key" ON "health_sleep_sessions"("user_id", "client_record_id");

-- CreateIndex
CREATE INDEX "health_sleep_stages_session_id_idx" ON "health_sleep_stages"("session_id");

-- CreateIndex
CREATE INDEX "health_exercise_sessions_user_id_exercise_type_start_time_idx" ON "health_exercise_sessions"("user_id", "exercise_type", "start_time" DESC);

-- CreateIndex
CREATE INDEX "health_exercise_sessions_user_id_start_time_idx" ON "health_exercise_sessions"("user_id", "start_time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "health_exercise_sessions_user_id_client_record_id_key" ON "health_exercise_sessions"("user_id", "client_record_id");

-- CreateIndex
CREATE INDEX "health_nutrition_user_id_meal_type_start_time_idx" ON "health_nutrition"("user_id", "meal_type", "start_time" DESC);

-- CreateIndex
CREATE INDEX "health_nutrition_user_id_start_time_idx" ON "health_nutrition"("user_id", "start_time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "health_nutrition_user_id_client_record_id_key" ON "health_nutrition"("user_id", "client_record_id");

-- CreateIndex
CREATE INDEX "health_cycle_events_user_id_event_type_timestamp_idx" ON "health_cycle_events"("user_id", "event_type", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "health_cycle_events_user_id_client_record_id_key" ON "health_cycle_events"("user_id", "client_record_id");

-- CreateIndex
CREATE INDEX "health_lab_results_user_id_test_name_timestamp_idx" ON "health_lab_results"("user_id", "test_name", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "health_lab_results_user_id_panel_name_timestamp_idx" ON "health_lab_results"("user_id", "panel_name", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "health_lab_results_user_id_timestamp_idx" ON "health_lab_results"("user_id", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "health_mood_scales_user_id_scale_name_key" ON "health_mood_scales"("user_id", "scale_name");

-- CreateIndex
CREATE INDEX "health_sessions_user_id_status_idx" ON "health_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "health_sessions_user_id_start_date_idx" ON "health_sessions"("user_id", "start_date" DESC);

-- CreateIndex
CREATE INDEX "health_session_records_session_id_idx" ON "health_session_records"("session_id");

-- CreateIndex
CREATE INDEX "health_session_records_table_name_record_id_idx" ON "health_session_records"("table_name", "record_id");

-- CreateIndex
CREATE UNIQUE INDEX "health_session_records_session_id_table_name_record_id_key" ON "health_session_records"("session_id", "table_name", "record_id");

-- CreateIndex
CREATE INDEX "health_record_attachments_table_name_record_id_idx" ON "health_record_attachments"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "health_record_attachments_user_id_idx" ON "health_record_attachments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "health_record_attachments_table_name_record_id_storage_obje_key" ON "health_record_attachments"("table_name", "record_id", "storage_object_id");

-- CreateIndex
CREATE INDEX "health_record_comments_table_name_record_id_created_at_idx" ON "health_record_comments"("table_name", "record_id", "created_at");

-- CreateIndex
CREATE INDEX "health_record_comments_user_id_idx" ON "health_record_comments"("user_id");

-- CreateIndex
CREATE INDEX "health_record_revisions_table_name_record_id_version_idx" ON "health_record_revisions"("table_name", "record_id", "version");

-- CreateIndex
CREATE INDEX "health_record_revisions_changed_by_user_id_changed_at_idx" ON "health_record_revisions"("changed_by_user_id", "changed_at" DESC);

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_sources" ADD CONSTRAINT "health_data_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_sources" ADD CONSTRAINT "health_data_sources_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sync_state" ADD CONSTRAINT "health_sync_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sync_state" ADD CONSTRAINT "health_sync_state_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sleep_sessions" ADD CONSTRAINT "health_sleep_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sleep_sessions" ADD CONSTRAINT "health_sleep_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sleep_sessions" ADD CONSTRAINT "health_sleep_sessions_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sleep_stages" ADD CONSTRAINT "health_sleep_stages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "health_sleep_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_exercise_sessions" ADD CONSTRAINT "health_exercise_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_exercise_sessions" ADD CONSTRAINT "health_exercise_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_exercise_sessions" ADD CONSTRAINT "health_exercise_sessions_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_nutrition" ADD CONSTRAINT "health_nutrition_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_nutrition" ADD CONSTRAINT "health_nutrition_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_nutrition" ADD CONSTRAINT "health_nutrition_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_cycle_events" ADD CONSTRAINT "health_cycle_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_cycle_events" ADD CONSTRAINT "health_cycle_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_cycle_events" ADD CONSTRAINT "health_cycle_events_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_lab_results" ADD CONSTRAINT "health_lab_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_lab_results" ADD CONSTRAINT "health_lab_results_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_lab_results" ADD CONSTRAINT "health_lab_results_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_mood_scales" ADD CONSTRAINT "health_mood_scales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sessions" ADD CONSTRAINT "health_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_session_records" ADD CONSTRAINT "health_session_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "health_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_record_attachments" ADD CONSTRAINT "health_record_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_record_attachments" ADD CONSTRAINT "health_record_attachments_storage_object_id_fkey" FOREIGN KEY ("storage_object_id") REFERENCES "storage_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_record_comments" ADD CONSTRAINT "health_record_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_record_revisions" ADD CONSTRAINT "health_record_revisions_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
