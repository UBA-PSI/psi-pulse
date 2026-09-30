-- A17: bevorzugte Uhrzeiten als volle Stunde in deutscher Zeit (Europe/Berlin) statt als Zeitstempel.
--
-- Bisher lag in beiden Spalten ein Zeitstempel (TIMESTAMP(3), UTC), dessen Stunde der Scheduler in der Zeitzone
-- des Containers verglich. Der Container setzt kein TZ, lief also in UTC. Gespeichert wurde immer die Zahl,
-- die in der Auswahlliste stand (Vorgaben bei der Anmeldung: 14 und 16; Einstellungen: die gewählte Stunde),
-- als UTC-Stunde. Die UTC-Stunde des Zeitstempels ist also genau die Zahl, die Studierende gewählt haben.
-- Diese Zahl bleibt erhalten und bedeutet ab jetzt deutsche Zeit: 14 heißt 14 Uhr in Berlin, nicht mehr
-- 15/16 Uhr (bisher UTC). Es gehen keine Daten verloren, Minuten waren immer 0.
ALTER TABLE "public"."User"
    ALTER COLUMN "preferred_reminder_email_delivery_time" SET DATA TYPE INTEGER
        USING EXTRACT(HOUR FROM "preferred_reminder_email_delivery_time")::INTEGER,
    ALTER COLUMN "preferred_weekly_email_delivery_time" SET DATA TYPE INTEGER
        USING EXTRACT(HOUR FROM "preferred_weekly_email_delivery_time")::INTEGER;

ALTER TABLE "public"."User" RENAME COLUMN "preferred_reminder_email_delivery_time" TO "preferred_reminder_hour";
ALTER TABLE "public"."User" RENAME COLUMN "preferred_weekly_email_delivery_time" TO "preferred_weekly_hour";

ALTER TABLE "public"."User"
    ALTER COLUMN "preferred_reminder_hour" SET DEFAULT 14,
    ALTER COLUMN "preferred_weekly_hour" SET DEFAULT 16,
    ALTER COLUMN "preferred_weekly_email_delivery_day" SET DEFAULT 3;
