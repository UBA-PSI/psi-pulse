#!/usr/bin/env bash
# API-Prüfung für Embed v2 (Code-Login, key, Logout) gegen die lokale Umgebung.
set -uo pipefail
B=${PULSE_TEST_URL:-http://localhost:3000}/api/v1; M=${PULSE_TEST_MAIL_URL:-http://localhost:8025}/api/v1
DB() { docker exec "${PULSE_TEST_DB:-database}" psql -U postgres -At -c "$1"; }
ok() { printf '  %-60s %s\n' "$1" "$2"; }
post() { curl -s -w '\n%{http_code}' -X POST "$B$1" -H 'content-type: application/json' "${@:3}" -d "$2"; }
body() { sed '$d'; }; status() { tail -1; }
code_from_mail() { id=$(curl -s $M/messages | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages"][0]["ID"])'); curl -s $M/message/$id | python3 -c 'import sys,json,re; m=json.load(sys.stdin); print(re.search(r"(\d{6})", m["Subject"]).group(1))'; }

curl -s -X DELETE $M/messages >/dev/null
U="embed-$RANDOM@example.org"

echo "Code anfordern"
r=$(post /auth/request "{\"email\":\"$U\",\"lang\":\"de\"}"); ok "request 200" "$(echo "$r" | status)"
RID=$(echo "$r" | body | python3 -c 'import sys,json; print(json.load(sys.stdin)["requestId"])')
subj=$(curl -s $M/messages | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages"][0]["Subject"])'); ok "Mail-Betreff deutsch" "$subj"
ok "noch kein Konto angelegt (erwartet 0)" "$(DB "select count(*) from \"User\" where email='$U'")"
ok "Code nur als Hash gespeichert" "$(DB "select length(code_hash) from \"LoginCode\" where id='$RID'")"
CODE=$(code_from_mail)
PLAIN=$(printf '%s' "$CODE" | shasum -a 256 | cut -d' ' -f1)
[ "$(DB "select code_hash from \"LoginCode\" where id='$RID'")" != "$PLAIN" ] && ok "gespeichert als HMAC, nicht als SHA-256 des Codes" "OK" || ok "gespeichert als HMAC" "FEHLER"

echo "Falscher Code, dann richtiger"
WRONG=$(printf '%06d' $(( (10#$CODE + 1) % 1000000 )))
ok "falscher Code: 400" "$(post /auth/verify "{\"requestId\":\"$RID\",\"code\":\"$WRONG\"}" | status)"
ok "Fehlversuch gezählt (erwartet 1)" "$(DB "select attempts from \"LoginCode\" where id='$RID'")"
r=$(post /auth/verify "{\"requestId\":\"$RID\",\"code\":\"$CODE\",\"name\":\"Erika\",\"logQuestions\":false}")
ok "richtiger Code: 200" "$(echo "$r" | status)"
TOKEN=$(echo "$r" | body | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["token"])')
ok "Antwort newAccount/name" "$(echo "$r" | body | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["newAccount"], d["name"])')"
ok "Konto verifiziert, keine Statistik" "$(DB "select verified, log_questions from \"User\" where email='$U'")"
ok "Code verbraucht (erwartet 400)" "$(post /auth/verify "{\"requestId\":\"$RID\",\"code\":\"$CODE\"}" | status)"

echo "Fehlversuche begrenzt"
sleep 61
RID2=$(post /auth/request "{\"email\":\"$U\",\"lang\":\"en\"}" | body | python3 -c 'import sys,json; print(json.load(sys.stdin)["requestId"])')
ok "Mail-Betreff englisch" "$(curl -s $M/messages | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages"][0]["Subject"])' | cut -c1-24)"
C2=$(code_from_mail); W2=$(printf '%06d' $(( (10#$C2 + 1) % 1000000 )))
for i in 1 2 3 4 5; do post /auth/verify "{\"requestId\":\"$RID2\",\"code\":\"$W2\"}" >/dev/null; done
ok "nach 5 Fehlversuchen auch richtiger Code abgelehnt (400)" "$(post /auth/verify "{\"requestId\":\"$RID2\",\"code\":\"$C2\"}" | status)"

echo "Fragen mit key"
K="demo-key-$RANDOM"; H=$(printf 'key:%s' "$K" | shasum -a 1 | cut -d' ' -f1)
q="{\"key\":\"$K\",\"hash\":\"$H\",\"question\":\"Alte Fassung?\",\"answer\":\"A\",\"groupName\":null,\"pageName\":\"Embed\",\"pageUrl\":\"\",\"remembered\":true,\"states\":null}"
ok "POST mit key: 200" "$(post /questions "$q" -H "X-API-KEY: $TOKEN" | status)"
ok "POST gleicher key erneut (idempotent): kein 500" "$(post /questions "$q" -H "X-API-KEY: $TOKEN" | status)"
ok "Anzahl Fragen (erwartet 1)" "$(DB "select count(*) from \"Question\" where hash='$H'")"
BADH=$(printf 'falsch' | shasum -a 1 | cut -d' ' -f1)
ok "POST mit falschem Hash: 404" "$(post /questions "${q/$H/$BADH}" -H "X-API-KEY: $TOKEN" | status)"
DB "update \"QuestionProgress\" set completed_at = now() - interval '30 days' where id=(select question_progress_id from \"Question\" where hash='$H')" >/dev/null
ok "PUT mit neuem Text: 200" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $B/questions/$H -H "X-API-KEY: $TOKEN" -H 'content-type: application/json' -d '{"remembered":true,"pageName":"Embed","question":"Neue Fassung?","answer":"B"}')"
ok "Text aktualisiert" "$(DB "select text||' / '||answer from \"Question\" where hash='$H'")"

echo "CORS und Logout"
ok "CORS ohne Credentials" "$(curl -s -D - -o /dev/null -X OPTIONS $B/questions -H 'Origin: null' | grep -ic 'allow-credentials')"
ok "Logout 200" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/auth/logout -H "X-API-KEY: $TOKEN")"
ok "Token danach ungültig (401)" "$(curl -s -o /dev/null -w '%{http_code}' $B/questions -H "X-API-KEY: $TOKEN")"

echo "Aufräumen und Token-Rotation"
DB "insert into \"LoginCode\"(id,email,code_hash,expires_at) values (gen_random_uuid(),'alt@example.org','x',now()-interval '1 hour')" >/dev/null
DB "insert into \"ThirdPartySession\"(id,user_id,expires) select 'abgelaufen-$RANDOM', id, 1 from \"User\" limit 1" >/dev/null
sleep 65
ok "abgelaufene Login-Codes weg (erwartet 0)" "$(DB "select count(*) from \"LoginCode\" where email='alt@example.org'")"
ok "abgelaufene API-Tokens weg (erwartet 0)" "$(DB "select count(*) from \"ThirdPartySession\" where expires < extract(epoch from now())*1000")"
ok "Alt-Konten ohne neues Abmelde-Token (erwartet 0)" "$(DB "select count(*) from \"User\" where unsubscribe_emails_token !~ '^[0-9a-f]{32}$' and created_at < (select finished_at from _prisma_migrations where migration_name like '%rotate_mail_tokens')")"
