-- Sprache für Mails an Studierende (Embed v2 setzt sie aus der Seitensprache)
ALTER TABLE "public"."User" ADD COLUMN "lang" TEXT NOT NULL DEFAULT 'de';
