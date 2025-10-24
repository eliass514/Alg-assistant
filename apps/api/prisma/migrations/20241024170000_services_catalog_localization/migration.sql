-- Drop legacy translation columns in favor of localized tables
ALTER TABLE "service_categories"
  DROP COLUMN "name_translations",
  DROP COLUMN "description_translations",
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "metadata" JSONB;

ALTER TABLE "services"
  DROP COLUMN "name_translations",
  DROP COLUMN "description_translations",
  ADD COLUMN "metadata" JSONB;

-- Create localized metadata tables
CREATE TABLE "service_category_translations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_id" UUID NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_category_translations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "service_category_translations_category_locale_key"
  ON "service_category_translations" ("category_id", "locale");

CREATE TABLE "service_translations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_id" UUID NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT,
  "description" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_translations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_translations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "service_translations_service_locale_key"
  ON "service_translations" ("service_id", "locale");
