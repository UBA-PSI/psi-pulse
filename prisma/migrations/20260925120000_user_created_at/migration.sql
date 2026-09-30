-- Anlagezeitpunkt, damit nicht bestätigte Konten nach 30 Tagen gelöscht werden können.
-- Bestehende Konten erhalten den Zeitpunkt der Migration.
ALTER TABLE "public"."User" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
