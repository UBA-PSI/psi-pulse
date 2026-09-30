#!/usr/bin/env bash
# End-to-End-Prüfung von Block 2 gegen die lokale Umgebung (docker-compose.dev.yml).
# Nur für localhost gedacht: legt Testkonten an und leert Mailpit.
set -uo pipefail
B=${PULSE_TEST_URL:-http://localhost:3000}; M=${PULSE_TEST_MAIL_URL:-http://localhost:8025}/api/v1
DB() { docker exec "${PULSE_TEST_DB:-database}" psql -U postgres -At -c "$1"; }
mails() { curl -s $M/messages | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages_count"])'; }
lastmail() { id=$(curl -s $M/messages | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages"][0]["ID"])'); curl -s $M/message/$id | python3 -c 'import sys,json; m=json.load(sys.stdin); print(m["Subject"]); print(m["HTML"])'; }
ok() { printf '  %-58s %s\n' "$1" "$2"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

curl -s -X DELETE $M/messages >/dev/null
U="e2e-$RANDOM@example.org"

echo "A11/A22 Name nicht als HTML oder Link in Mails"
# Seit A22 lehnt der Signup Namen mit <>, URLs oder Zeilenumbrüchen ab, und die Signup-Mail nennt keinen Namen
ok "Signup mit HTML im Namen: 400" "$(code -X POST $B/api/signup -H 'content-type: application/json' -d "{\"email\":\"$U\",\"name\":\"<a href=\\\"https://evil.example\\\">Klick</a>\",\"logQuestions\":false}")"
c=$(code -X POST $B/api/signup -H 'content-type: application/json' -d "{\"email\":\"$U\",\"name\":\"Tom & Jerry\",\"logQuestions\":false}")
html=$(lastmail)
ok "Signup 302" "$c"
echo "$html" | grep -q 'Jerry' && ok "Name nicht in der Signup-Mail" "FEHLER" || ok "Name nicht in der Signup-Mail" "OK"
echo "$html" | grep -q '<a href="https://evil.example' && ok "kein roher Link" "FEHLER" || ok "kein roher Link" "OK"

echo "A2 Rate-Limit"
c=$(code -X POST $B/api/signup -H 'content-type: application/json' -d "{\"email\":\"$U\",\"name\":\"x\",\"logQuestions\":false}")
ok "zweiter Signup derselben Adresse sofort: 429" "$c"

echo "A4 keine Enumeration"
n0=$(mails)
c1=$(code -X POST $B/api/login -H 'content-type: application/json' -d '{"email":"niemand@example.org"}')
ok "Login unbekannte Adresse: 302" "$c1"
[ "$(mails)" = "$n0" ] && ok "dabei keine Mail verschickt" "OK" || ok "dabei keine Mail verschickt" "FEHLER"

echo "A3 Secure-Cookie"
tok=$(lastmail | grep -o 'email-verification/[A-Za-z0-9]*' | head -1 | cut -d/ -f2)
# Seit A29 meldet erst der Knopf auf der Bestätigungsseite an (POST mit Origin)
hdr=$(curl -s -D - -o /dev/null -X POST "$B/api/email-verification/$tok" -H "Origin: $B")
cookie=$(echo "$hdr" | grep -i '^set-cookie: auth_session')
echo "$cookie" | grep -qi 'secure' && ok "auth_session mit Secure" "OK" || ok "auth_session mit Secure" "FEHLER: $cookie"
ok "Konto verifiziert" "$(DB "select verified from \"User\" where email='$U'")"

echo "A0 QuestionLog nur mit Einwilligung"
# API-Token direkt anlegen: der Code-Login (/api/v1/auth/*) ist in e2e-embed-api.sh geprüft, und eine
# zweite Mail an $U innerhalb einer Minute liefe ins Rate-Limit (A2).
api="e2e$RANDOM$RANDOM$RANDOM"
DB "insert into \"ThirdPartySession\"(id,user_id,expires) select '$api', id, (extract(epoch from now())*1000)::bigint + 3600000 from \"User\" where email='$U'" >/dev/null
q="Was ist ein Testfall?"; h=$(printf '%s' "$q" | shasum -a 1 | cut -d' ' -f1)
body="{\"question\":\"$q\",\"answer\":\"Einer\",\"hash\":\"$h\",\"groupName\":null,\"pageName\":\"E2E\",\"pageUrl\":\"http://localhost/e2e\",\"remembered\":true,\"states\":null}"
ok "Frage anlegen (/api/v1 POST)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $api" -H 'content-type: application/json' -d "$body")"
DB "update \"QuestionProgress\" set completed_at = now() - interval '30 days' where id in (select question_progress_id from \"Question\" q join \"Page\" p on p.id=q.page_id join \"User\" u on u.id=p.owner_id where u.email='$U')" >/dev/null
ok "Frage beantworten (/api/v1 PUT)" "$(code -X PUT $B/api/v1/questions/$h -H "X-API-KEY: $api" -H 'content-type: application/json' -d '{"remembered":true,"pageName":"E2E"}')"
ok "QuestionLog ohne Einwilligung (erwartet 0)" "$(DB "select count(*) from \"QuestionLog\" l join \"User\" u on u.research_pseudonym=l.pseudonym where u.email='$U'")"
DB "update \"User\" set log_questions=true, research_pseudonym=gen_random_uuid()::text where email='$U'" >/dev/null
DB "update \"QuestionProgress\" set completed_at = now() - interval '30 days' where id in (select question_progress_id from \"Question\" q join \"Page\" p on p.id=q.page_id join \"User\" u on u.id=p.owner_id where u.email='$U')" >/dev/null
ok "erneut beantworten mit Einwilligung" "$(code -X PUT $B/api/v1/questions/$h -H "X-API-KEY: $api" -H 'content-type: application/json' -d '{"remembered":true,"pageName":"E2E"}')"
ok "QuestionLog mit Einwilligung (erwartet 1)" "$(DB "select count(*) from \"QuestionLog\" l join \"User\" u on u.research_pseudonym=l.pseudonym where u.email='$U'")"

echo "A1b unbestätigte Konten nach 30 Tagen löschen"
V="e2e-alt-$RANDOM@example.org"
DB "insert into \"User\"(id,email,name,preferred_weekly_email_delivery_day,created_at) values ('e2e$RANDOM','$V','Alt',3, now()-interval '31 days')" >/dev/null
sleep 65
ok "altes unbestätigtes Konto weg (erwartet 0)" "$(DB "select count(*) from \"User\" where email='$V'")"
ok "bestätigtes Testkonto noch da (erwartet 1)" "$(DB "select count(*) from \"User\" where email='$U'")"
