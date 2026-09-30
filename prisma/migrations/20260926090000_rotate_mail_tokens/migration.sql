-- Abmelde-Tokens in Mail-Links wurden bis hierher mit Math.random() erzeugt (Befund A12).
-- Einmalig durch kryptografisch zufällige Werte ersetzen (gen_random_uuid nutzt den sicheren Zufallsgenerator).
-- Folge: Abmelde-Links in bereits verschickten Mails funktionieren nicht mehr; jede neue Mail enthält den neuen Link.
-- Reminder- und Weekly-Tokens laufen ohnehin nach 30 bzw. 7 Tagen aus und werden hier nicht angefasst.
UPDATE "public"."User" SET
    "unsubscribe_emails_token" = replace(gen_random_uuid()::text, '-', ''),
    "unsubscribe_weekly_emails_token" = replace(gen_random_uuid()::text, '-', '');
