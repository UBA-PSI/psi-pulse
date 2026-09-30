#!/usr/bin/env bash
# Regression: Rückfall aus FINAL ohne STATE_4 und doppelte Pause nach dem Pausenende (lokale Umgebung,
# docker-compose.dev.yml). Wartet auf echte Scheduler-Läufe (bis zu drei Minuten). Leert Mailpit.
set -uo pipefail
B=${PULSE_TEST_URL:-http://localhost:3000}/api/v1; M=${PULSE_TEST_MAIL_URL:-http://localhost:8025}/api/v1
DB() { docker exec "${PULSE_TEST_DB:-database}" psql -U postgres -At -c "$1"; }
ok() { printf '  %-62s %s\n' "$1" "$2"; }
post() { curl -s -w '\n%{http_code}' -X POST "$B$1" -H 'content-type: application/json' "${@:3}" -d "$2"; }
body() { sed '$d'; }
mails_to() { curl -s "$M/search?query=to:$1" | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages_count"])'; }
subjects_to() { curl -s "$M/search?query=to:$1" | python3 -c 'import sys,json; print(" | ".join(m["Subject"] for m in reversed(json.load(sys.stdin)["messages"])))'; }
# wartet auf den nächsten Scheduler-Lauf, erkennbar an einer Bedingung in der DB
wait_for() { for _ in $(seq 1 90); do [ "$(DB "$1")" = "$2" ] && return 0; sleep 1; done; return 1; }

curl -s -X DELETE $M/messages >/dev/null
U="pause-$RANDOM@example.org"
RID=$(post /auth/request "{\"email\":\"$U\",\"lang\":\"de\"}" | body | python3 -c 'import sys,json; print(json.load(sys.stdin)["requestId"])')
for _ in $(seq 1 20); do [ "$(mails_to "$U")" -ge 1 ] && break; sleep 0.5; done   # Mail braucht einen Moment
CODE=$(curl -s "$M/search?query=to:$U" | python3 -c 'import sys,json,re; print(re.search(r"(\d{6})", json.load(sys.stdin)["messages"][0]["Subject"]).group(1))')
TOKEN=$(post /auth/verify "{\"requestId\":\"$RID\",\"code\":\"$CODE\"}" | body | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
curl -s -X DELETE $M/messages >/dev/null

echo "Rückfall aus FINAL"
q() { printf '{"key":"%s","hash":"%s","question":"Frage %s?","answer":"A","groupName":null,"pageName":"Stufen","pageUrl":"","remembered":true,"states":null}' "$1" "$2" "$1"; }
K1="ohne4-$RANDOM"; H1=$(printf 'key:%s' "$K1" | shasum -a 1 | cut -d' ' -f1)
K2="mit4-$RANDOM";  H2=$(printf 'key:%s' "$K2" | shasum -a 1 | cut -d' ' -f1)
post /questions "$(q "$K1" "$H1")" -H "X-API-KEY: $TOKEN" >/dev/null
post /questions "$(q "$K2" "$H2")" -H "X-API-KEY: $TOKEN" >/dev/null
P() { echo "(select question_progress_id from \"Question\" where hash='$1')"; }
# In FINAL, schon einmal vergessen, fällig; der ersten Frage fehlt STATE_4
DB "update \"QuestionProgress\" set current_state='FINAL', waiting_for_remembered=true, completed_at=now()-interval '30 days' where id in ($(P "$H1"), $(P "$H2"))" >/dev/null
DB "update \"QuestionProgress\" set state_4_id=null where id=$(P "$H1")" >/dev/null
put() { curl -s -o /dev/null -w '%{http_code}' -X PUT "$B/questions/$1" -H "X-API-KEY: $TOKEN" -H 'content-type: application/json' -d '{"remembered":false,"pageName":"Stufen"}'; }
ok "vergessen (ohne STATE_4): 200" "$(put "$H1")"
ok "ohne STATE_4: zurück auf STATE_3 (erwartet STATE_3)" "$(DB "select current_state from \"QuestionProgress\" where id=$(P "$H1")")"
ok "vergessen (mit STATE_4): 200" "$(put "$H2")"
ok "mit STATE_4: zurück auf STATE_4 (erwartet STATE_4)" "$(DB "select current_state from \"QuestionProgress\" where id=$(P "$H2")")"

echo "Pause wegen Remindern bei offener Wochenauswahl"
# Reminder seit 8 Tagen unbeantwortet, Wochenauswahl seit 3 Tagen offen; heute schon geprüft, damit nichts anderes rausgeht
DB "update \"User\" set oldest_reminder_sent=now()-interval '8 days', oldest_weekly_sent=now()-interval '3 days', weekly_streak=5,
    email_paused_until=null, last_reminder_check=now(), last_weekly_sent=now() where email='$U'" >/dev/null
if wait_for "select email_paused_until is not null from \"User\" where email='$U'" t; then ok "pausiert" "OK"; else ok "pausiert" "FEHLER"; fi
ok "beide Zähler zurückgesetzt (erwartet t|t)" "$(DB "select oldest_reminder_sent is null, oldest_weekly_sent is null from \"User\" where email='$U'")"
ok "Serie beendet wegen offener Auswahl (erwartet 0)" "$(DB "select weekly_streak from \"User\" where email='$U'")"
ok "genau eine Mail (Pause)" "$(mails_to "$U")"

echo "Pausenende"
# 14 Tage Pause nachstellen: Ende in die Vergangenheit, noch gesetzte Zähler altern mit (null bleibt null)
DB "update \"User\" set email_paused_until=now()-interval '1 minute',
    oldest_reminder_sent=oldest_reminder_sent-interval '14 days', oldest_weekly_sent=oldest_weekly_sent-interval '14 days'
    where email='$U'" >/dev/null
if wait_for "select email_paused_until is null from \"User\" where email='$U'" t; then ok "Pause beendet" "OK"; else ok "Pause beendet" "FEHLER"; fi
# Den folgenden Lauf abwarten: vorher pausierte das Konto hier sofort erneut
sleep 70
ok "nach dem nächsten Lauf nicht wieder pausiert (erwartet t)" "$(DB "select email_paused_until is null from \"User\" where email='$U'")"
ok "Mails insgesamt (erwartet 2: Pause, Pause vorbei)" "$(mails_to "$U")"
ok "Betreffzeilen" "$(subjects_to "$U")"
