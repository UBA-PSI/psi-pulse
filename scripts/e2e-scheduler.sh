#!/usr/bin/env bash
# Scheduler-Prüfungen (A17 Zeitzone, A18 vernachlässigt, A19 Wochenauswahl) gegen die lokale Umgebung
# (docker-compose.dev.yml). Nur für localhost: legt Testkonten an und liest Mailpit.
# Zeit wird über Zeitstempel in der DB simuliert; jeder Schritt wartet einen Scheduler-Lauf (jede Minute) ab.
# A17 in der Oberfläche: scripts/e2e-settings-tz.cjs (Playwright), siehe unten.
set -uo pipefail
B=${PULSE_TEST_URL:-http://localhost:3000}; M=${PULSE_TEST_MAIL_URL:-http://localhost:8025}/api/v1
DB() { docker exec "${PULSE_TEST_DB:-database}" psql -U postgres -At -c "$1"; }
ok() { printf '  %-70s %s\n' "$1" "$2"; }
tick() { sleep 65; }
# Mails an eine Adresse (Mailpit)
mails_to() { curl -s "$M/messages?limit=1000" | python3 -c 'import sys,json; a=sys.argv[1]; print(sum(1 for m in json.load(sys.stdin)["messages"] if any(t["Address"]==a for t in m["To"])))' "$1"; }

# Stunde setzen; funktioniert auch mit dem alten Schema (Zeitstempel, deren UTC-Stunde zählte), damit das Skript
# den Fehler vor dem Fix nachweisen kann.
NEW_SCHEMA=$(DB "select count(*) from information_schema.columns where table_name='User' and column_name='preferred_reminder_hour'")
set_hours() { # uid reminderHour weeklyHour weekday
  if [ "$NEW_SCHEMA" = 1 ]; then
    DB "update \"User\" set preferred_reminder_hour=$2, preferred_weekly_hour=$3, preferred_weekly_email_delivery_day=$4 where id='$1'" >/dev/null
  else
    DB "update \"User\" set preferred_reminder_email_delivery_time=date_trunc('day', now() at time zone 'UTC') + interval '$2 hours', preferred_weekly_email_delivery_time=date_trunc('day', now() at time zone 'UTC') + interval '$3 hours', preferred_weekly_email_delivery_day=$4 where id='$1'" >/dev/null
  fi
}
# Konto (bestätigt, Mails zunächst aus) mit Seite und Gruppe; gibt die Id aus
mkuser() { # email
  local id="sch$RANDOM$RANDOM"
  if [ "$NEW_SCHEMA" = 1 ]; then
    DB "insert into \"User\"(id,email,name,verified,receive_emails,preferred_weekly_email_delivery_day,unsubscribe_emails_token,unsubscribe_weekly_emails_token) values ('$id','$1','Planer',true,false,3,md5(random()::text),md5(random()::text))" >/dev/null
  else
    DB "insert into \"User\"(id,email,name,verified,receive_emails,preferred_reminder_email_delivery_time,preferred_weekly_email_delivery_time,preferred_weekly_email_delivery_day,unsubscribe_emails_token,unsubscribe_weekly_emails_token) values ('$id','$1','Planer',true,false,now(),now(),3,md5(random()::text),md5(random()::text))" >/dev/null
  fi
  DB "insert into \"Page\"(id,name,url,owner_id) values (gen_random_uuid(),'Planerseite','','$id')" >/dev/null
  DB "insert into \"Group\"(id,name,page_id) select gen_random_uuid(),'no-group',id from \"Page\" where owner_id='$id'" >/dev/null
  echo "$id"
}
# Zustände mit festen Abständen (0 und 1 Tag)
DB "insert into \"QuestionState\"(id,\"offset\",label) values (gen_random_uuid(),0,'e2e-0'),(gen_random_uuid(),1,'e2e-1') on conflict (label,\"offset\") do nothing" >/dev/null
S0=$(DB "select id from \"QuestionState\" where label='e2e-0' and \"offset\"=0")
S1=$(DB "select id from \"QuestionState\" where label='e2e-1' and \"offset\"=1")
# Frage anlegen: uid text state(INITIAL|STATE_1) completedAt-SQL
mkq() {
  DB "with qp as (insert into \"QuestionProgress\"(id,initial_state_id,state_1_id,final_state_id,current_state,completed_at) values (gen_random_uuid(),'$S0','$S1','$S1','$3',$4) returning id)
      insert into \"Question\"(id,hash,text,answer,group_id,page_id,question_progress_id) select gen_random_uuid(),'h-$RANDOM$RANDOM','$2','A',g.id,p.id,qp.id from qp, \"Page\" p join \"Group\" g on g.page_id=p.id where p.owner_id='$1'" >/dev/null
}
active_of() { DB "select qp.active from \"Question\" q join \"QuestionProgress\" qp on qp.id=q.question_progress_id join \"Page\" p on p.id=q.page_id where p.owner_id='$1' and q.text='$2'"; }

BH=$(TZ=Europe/Berlin date +%-H); UH=$(TZ=UTC date +%-H); MIN=$(date +%-M); WD=$(TZ=Europe/Berlin date +%w)
echo "Jetzt: Berlin $BH Uhr, UTC $UH Uhr, Wochentag (Berlin) $WD, Schema neu: $NEW_SCHEMA"
if [ "$MIN" -ge 55 ]; then echo "  kurz vor der vollen Stunde: bitte in ein paar Minuten starten"; exit 1; fi

echo "A17 Uhrzeit in deutscher Zeit (Scheduler)"
if [ "$BH" -lt 1 ] || [ "$BH" -gt 22 ] || [ "$BH" = "$UH" ]; then
  echo "  übersprungen: braucht 1 <= Berliner Stunde <= 22 und Berlin != UTC"
else
  E1="tz-due-$RANDOM@example.org"; R1=$(mkuser "$E1")      # Erinnerung um BH-1 (Berlin): jetzt fällig
  E2="tz-later-$RANDOM@example.org"; R2=$(mkuser "$E2")    # Erinnerung um BH+1 (Berlin): noch nicht fällig
  E3="tz-weekly-$RANDOM@example.org"; R3=$(mkuser "$E3")   # Wochenauswahl heute um BH-1 (Berlin)
  mkq "$R1" "Fällig" INITIAL "now()"; mkq "$R2" "Fällig" INITIAL "now()"; mkq "$R3" "Nicht fällig" STATE_1 "now()"
  set_hours "$R1" $((BH-1)) 23 $(( (WD+1) % 7 )); set_hours "$R2" $((BH+1)) 23 $(( (WD+1) % 7 )); set_hours "$R3" 23 $((BH-1)) "$WD"
  DB "update \"User\" set receive_emails=true where id in ('$R1','$R2','$R3')" >/dev/null
  tick
  ok "Erinnerung, gewählt $((BH-1)) Uhr Berlin, jetzt $BH Uhr: Mails (erwartet 1)" "$(mails_to "$E1")"
  ok "Erinnerung, gewählt $((BH+1)) Uhr Berlin, jetzt $BH Uhr: Mails (erwartet 0)" "$(mails_to "$E2")"
  ok "Wochenauswahl heute $((BH-1)) Uhr Berlin: Mails (erwartet 1)" "$(mails_to "$E3")"
  if [ "$NEW_SCHEMA" = 1 ]; then
    ok "Vorgaben neuer Konten: Stunde Erinnerung/Woche, Tag (erwartet 14|16|3)" "$(DB "insert into \"User\"(id,email,name) values ('def$RANDOM','def-$RANDOM@example.org','Vorgabe') returning preferred_reminder_hour, preferred_weekly_hour, preferred_weekly_email_delivery_day" | head -1)"
    DB "delete from \"User\" where name='Vorgabe'" >/dev/null
  fi
fi

echo "A18 vernachlässigt erst nach mindestens zwei Tagen"
N=$(mkuser "neglect-$RANDOM@example.org")
mkq "$N" "neu-nicht-gewusst" INITIAL "now()"                            # Abstand 0, eben beantwortet
mkq "$N" "abstand0-36h" INITIAL "now() - interval '36 hours'"
mkq "$N" "abstand0-3d" INITIAL "now() - interval '3 days'"
mkq "$N" "abstand1-47h" STATE_1 "now() - interval '47 hours'"
mkq "$N" "abstand1-49h" STATE_1 "now() - interval '49 hours'"
tick
ok "Abstand 0, eben beantwortet: aktiv (erwartet t)" "$(active_of "$N" neu-nicht-gewusst)"
ok "Abstand 0, vor 36 Stunden: aktiv (erwartet t)" "$(active_of "$N" abstand0-36h)"
ok "Abstand 0, vor 3 Tagen: aktiv (erwartet f)" "$(active_of "$N" abstand0-3d)"
ok "Abstand 1 Tag, vor 47 Stunden: aktiv (erwartet t)" "$(active_of "$N" abstand1-47h)"
ok "Abstand 1 Tag, vor 49 Stunden: aktiv (erwartet f)" "$(active_of "$N" abstand1-49h)"

echo "A19 Wochenauswahl ersetzt die vorige"
EW="weekly-$RANDOM@example.org"; W=$(mkuser "$EW")
for i in $(seq 1 10); do mkq "$W" "W$i" STATE_1 "now()"; done   # nicht fällig: keine Erinnerungen
DB "update \"Question\" set archived=true where page_id=(select id from \"Page\" where owner_id='$W') and text<>'W1'" >/dev/null
set_hours "$W" 23 0 "$WD"
DB "update \"User\" set weekly_emails_number=3, weekly_streak=5, receive_emails=true where id='$W'" >/dev/null
linked() { DB "select count(*), count(*) filter (where q.archived) from \"Question\" q join \"WeeklyEmail\" w on w.id=q.weekly_email_id where w.user_id='$W'" ; }
tick
ok "1. Woche, 3 gewünscht, 1 nicht archiviert: Fragen|archivierte (erwartet 1|0)" "$(linked)"
T1=$(DB "select token from \"WeeklyEmail\" where user_id='$W'")
# Nächste Woche, vorige Auswahl offen
DB "update \"Question\" set archived=false where page_id=(select id from \"Page\" where owner_id='$W')" >/dev/null
DB "update \"User\" set last_weekly_sent=last_weekly_sent - interval '7 days' where id='$W'" >/dev/null
tick
ok "2. Woche, 10 verfügbar: Fragen|archivierte (erwartet 3|0)" "$(linked)"
T2=$(DB "select token from \"WeeklyEmail\" where user_id='$W'")
ok "neuer Link, alter Link ungültig (erwartet neu|404)" "$([ "$T1" != "$T2" ] && echo neu || echo gleich)|$(curl -s -o /dev/null -w '%{http_code}' $B/api/weekly/$T1)"
ok "Serie nach offener Vorwoche (erwartet 0)" "$(DB "select weekly_streak from \"User\" where id='$W'")"
ok "Anzeige der Auswahl: Fragen (erwartet 3)" "$(curl -s $B/api/weekly/$T2 | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')"
ok "Auswahl abschließen: Serie (erwartet 1)" "$(curl -s -X PUT $B/api/weekly/$T2)"
DB "update \"User\" set last_weekly_sent=last_weekly_sent - interval '7 days' where id='$W'" >/dev/null
tick
ok "3. Woche nach abgeschlossener Vorwoche: Fragen|archivierte (erwartet 3|0)" "$(linked)"
ok "Serie bleibt (erwartet 1)" "$(DB "select weekly_streak from \"User\" where id='$W'")"
ok "Wochenmails insgesamt (erwartet 3)" "$(mails_to "$EW")"

echo "A32 keine Wiederaufnahme-Mail nach „Keine Mails mehr“"
paused() { DB "select coalesce(email_paused_until::text,'leer') from \"User\" where id='$1'"; }
nulllink() { curl -s "$M/search?query=to:$1" | python3 -c 'import sys,json,urllib.request; ids=[m["ID"] for m in json.load(sys.stdin)["messages"]]; print(sum("/unsubscribe/emails/null" in urllib.request.urlopen(sys.argv[1]+"/message/"+i).read().decode() for i in ids))' "$M"; }
EP1="unsub-paused-$RANDOM@example.org"; P1=$(mkuser "$EP1")     # abgemeldet, Pause abgelaufen
EP3="paused-$RANDOM@example.org"; P3=$(mkuser "$EP3")           # Kontrolle: Mails an, Pause abgelaufen
DB "update \"User\" set receive_emails=false, unsubscribe_emails_token=null, email_paused_until=now()-interval '1 minute' where id='$P1'" >/dev/null
DB "update \"User\" set receive_emails=true, email_paused_until=now()-interval '1 minute' where id='$P3'" >/dev/null
tick
ok "Pause abgelaufen, abgemeldet: Mails (erwartet 0)" "$(mails_to "$EP1")"
ok "Pause abgelaufen, abgemeldet: Pause beendet (erwartet leer)" "$(paused "$P1")"
ok "Pause abgelaufen, abgemeldet: Mails mit Abmeldelink /null (erwartet 0)" "$(nulllink "$EP1")"
ok "Kontrolle, Mails an: Mails, Pause (erwartet 1 leer)" "$(mails_to "$EP3") $(paused "$P3")"
# Antwort während der Pause (Einzel-Link aus einer Erinnerung)
answer_link() { # uid → Frage mit gültigem Einzel-Token; gibt "id token" aus
  local rt="rem$RANDOM$RANDOM" qt="q$RANDOM$RANDOM"
  mkq "$1" "Pause-$qt" INITIAL "now() - interval '2 days'"
  DB "insert into \"ReminderEmail\"(id,token,user_id) values (gen_random_uuid(),'$rt','$1')" >/dev/null
  DB "update \"Question\" set reminder_email_id=(select id from \"ReminderEmail\" where token='$rt') where text='Pause-$qt'" >/dev/null
  DB "update \"QuestionProgress\" set reminder_token='$qt' where id=(select question_progress_id from \"Question\" where text='Pause-$qt')" >/dev/null
  echo "$(DB "select id from \"Question\" where text='Pause-$qt'") $qt"
}
EP2="unsub-answer-$RANDOM@example.org"; P2=$(mkuser "$EP2")
EP4="answer-$RANDOM@example.org"; P4=$(mkuser "$EP4")
DB "update \"User\" set receive_emails=false, unsubscribe_emails_token=null, email_paused_until=now()+interval '3 days' where id='$P2'" >/dev/null
DB "update \"User\" set receive_emails=true, email_paused_until=now()+interval '3 days', preferred_reminder_hour=23 where id='$P4'" >/dev/null
read -r QA TA <<<"$(answer_link "$P2")"; read -r QB TB <<<"$(answer_link "$P4")"
ok "Antwort in der Pause, abgemeldet: Status (erwartet 200)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$B/api/answer/$QA?token=$TA&tokenType=question" -H 'content-type: application/json' -d '{"remembered":true}')"
sleep 2
ok "Antwort in der Pause, abgemeldet: Mails, Pause (erwartet 0 leer)" "$(mails_to "$EP2") $(paused "$P2")"
ok "Kontrolle, Mails an: Status (erwartet 200)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$B/api/answer/$QB?token=$TB&tokenType=question" -H 'content-type: application/json' -d '{"remembered":true}')"
sleep 2
ok "Kontrolle, Mails an: Mails, Pause (erwartet 1 leer)" "$(mails_to "$EP4") $(paused "$P4")"
DB "update \"User\" set receive_emails=false where id in ('$P3','$P4')" >/dev/null

echo "A33 Versandfehler eines Kontos blockiert andere nicht"
# Leere Adresse: nodemailer bricht mit „No recipients defined“ ab (Mailpit nimmt sonst jede Adresse an)
DB "delete from \"User\" where email=''" >/dev/null
X=$(mkuser "")
DB "update \"User\" set receive_emails=true, email_paused_until=now()-interval '1 minute' where id='$X'" >/dev/null
EG="after-failure-$RANDOM@example.org"; G=$(mkuser "$EG")
mkq "$G" "Nach dem Fehler fällig" INITIAL "now() - interval '1 day'"
set_hours "$G" 0 23 $(( (WD+1) % 7 ))
DB "update \"User\" set receive_emails=true where id='$G'" >/dev/null
SINCE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
tick
ok "Konto mit Versandfehler: Pause beendet (erwartet leer)" "$(paused "$X")"
ok "anderes Konto im selben Lauf: Erinnerung (erwartet 1)" "$(mails_to "$EG")"
ok "Fehler protokolliert, ohne Adresse/Id (erwartet ja nein)" "$(docker logs "${PULSE_TEST_APP:-web}" --since "$SINCE" 2>&1 | grep -q '\[emailScheduler\]' && echo ja || echo nein) $(docker logs "${PULSE_TEST_APP:-web}" --since "$SINCE" 2>&1 | grep -qF "$X" && echo ja || echo nein)"
tick
ok "nächster Lauf: Fehler nicht wiederholt (erwartet nein)" "$(docker logs "${PULSE_TEST_APP:-web}" --since "$(date -u -v-60S +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '-60 sec' +%Y-%m-%dT%H:%M:%SZ)" 2>&1 | grep -q '\[emailScheduler\]' && echo ja || echo nein)"
DB "delete from \"User\" where id='$X'" >/dev/null

# Testkonten bekommen danach keine Mails mehr (Mailpit bleibt für andere Tests übersichtlich)
DB "update \"User\" set receive_emails=false where name='Planer'" >/dev/null

echo "A17 Oberfläche (Playwright)"
if [ -n "${PLAYWRIGHT_NODE_PATH:-}" ]; then
  NODE_PATH="$PLAYWRIGHT_NODE_PATH" node "$(dirname "$0")/e2e-settings-tz.cjs"
else
  echo "  übersprungen: PLAYWRIGHT_NODE_PATH auf ein node_modules mit playwright setzen"
fi
