-- Forschungsdaten pseudonymisieren (Einwilligung zur Forschung, Löschung nach einem Jahr).
-- Bisherige Einwilligungen galten „zur Verbesserung von Pulse“, nicht der Forschung: Die Einträge werden als
-- Altbestand (consent_version 'v0') pseudonymisiert, log_questions für alle zurückgesetzt, alle werden neu gefragt.

ALTER TABLE "public"."User"
    ADD COLUMN "research_pseudonym" TEXT,
    ADD COLUMN "research_decided_at" TIMESTAMP(3),
    ADD COLUMN "research_consent_at" TIMESTAMP(3),
    ADD COLUMN "research_consent_version" TEXT;
CREATE UNIQUE INDEX "User_research_pseudonym_key" ON "public"."User"("research_pseudonym");

-- Pseudonym für Konten mit vorhandenen Einträgen
UPDATE "public"."User" u SET "research_pseudonym" = gen_random_uuid()::text
WHERE EXISTS (SELECT 1 FROM "public"."QuestionLog" l WHERE l."user_id" = u."id");

ALTER TABLE "public"."QuestionLog"
    ADD COLUMN "pseudonym" TEXT,
    ADD COLUMN "question_hash" TEXT,
    ADD COLUMN "page_name" TEXT,
    ADD COLUMN "group_name" TEXT,
    ADD COLUMN "consent_version" TEXT;

UPDATE "public"."QuestionLog" l SET
    "pseudonym" = u."research_pseudonym",
    "question_hash" = q."hash",
    "page_name" = p."name",
    "group_name" = NULLIF(g."name", 'no-group'),
    "consent_version" = 'v0'
FROM "public"."User" u, "public"."Question" q, "public"."Page" p, "public"."Group" g
WHERE l."user_id" = u."id" AND l."question_id" = q."id" AND q."page_id" = p."id" AND q."group_id" = g."id";

-- Einträge ohne Zuordnung (sollte es nicht geben) nicht übernehmen
DELETE FROM "public"."QuestionLog" WHERE "pseudonym" IS NULL OR "question_hash" IS NULL;

ALTER TABLE "public"."QuestionLog" DROP CONSTRAINT IF EXISTS "QuestionLog_question_id_fkey";
ALTER TABLE "public"."QuestionLog" DROP CONSTRAINT IF EXISTS "QuestionLog_user_id_fkey";
ALTER TABLE "public"."QuestionLog" DROP COLUMN "question_id", DROP COLUMN "user_id";
ALTER TABLE "public"."QuestionLog"
    ALTER COLUMN "pseudonym" SET NOT NULL,
    ALTER COLUMN "question_hash" SET NOT NULL,
    ALTER COLUMN "page_name" SET NOT NULL,
    ALTER COLUMN "consent_version" SET NOT NULL;
CREATE INDEX "QuestionLog_pseudonym_idx" ON "public"."QuestionLog"("pseudonym");

UPDATE "public"."User" SET "log_questions" = false;
