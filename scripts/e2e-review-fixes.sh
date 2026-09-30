#!/usr/bin/env bash
# Prüft die Fixes aus dem Code-Review gegen die lokale Umgebung.
set -uo pipefail
B=${PULSE_TEST_URL:-http://localhost:3000}/api/v1; M=${PULSE_TEST_MAIL_URL:-http://localhost:8025}/api/v1
DB() { docker exec "${PULSE_TEST_DB:-database}" psql -U postgres -At -c "$1"; }
ok() { printf '  %-66s %s\n' "$1" "$2"; }
code_from_mail() { id=$(curl -s $M/messages | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages"][0]["ID"])'); curl -s $M/message/$id | python3 -c 'import sys,json,re; print(re.search(r"(\d{6})", json.load(sys.stdin)["Subject"]).group(1))'; }
curl -s -X DELETE $M/messages >/dev/null

echo "1 Race beim Code-Login"
U="race-$RANDOM@example.org"
RID=$(curl -s -X POST $B/auth/request -H 'content-type: application/json' -d "{\"email\":\"$U\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["requestId"])')
CODE=$(code_from_mail)
# 200 falsche Codes gleichzeitig; danach muss auch der richtige abgelehnt werden (max. 5 Versuche)
for i in $(seq 1 200); do W=$(printf '%06d' $(( (10#$CODE + i) % 1000000 ))); curl -s -o /dev/null -X POST $B/auth/verify -H 'content-type: application/json' -d "{\"requestId\":\"$RID\",\"code\":\"$W\"}" & done; wait
ok "gezählte Versuche nach 200 parallelen Anfragen (erwartet 5)" "$(DB "select attempts from \"LoginCode\" where id='$RID'")"
ok "richtiger Code danach abgelehnt (erwartet 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/auth/verify -H 'content-type: application/json' -d "{\"requestId\":\"$RID\",\"code\":\"$CODE\"}")"

echo "   Doppelte Kontoanlage"
sleep 61
U2="dup-$RANDOM@example.org"
RID2=$(curl -s -X POST $B/auth/request -H 'content-type: application/json' -d "{\"email\":\"$U2\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["requestId"])')
C2=$(code_from_mail)
TOKEN=$(curl -s -X POST $B/auth/verify -H 'content-type: application/json' -d "{\"requestId\":\"$RID2\",\"code\":\"$C2\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
ok "Login ok, ein Konto (erwartet 1)" "$(DB "select count(*) from \"User\" where email='$U2'")"

echo "2 POST auf nicht fällige Frage schreibt nicht fort"
K="rev-$RANDOM"; H=$(printf 'key:%s' "$K" | shasum -a 1 | cut -d' ' -f1)
q="{\"key\":\"$K\",\"hash\":\"$H\",\"question\":\"F?\",\"answer\":\"A\",\"groupName\":null,\"pageName\":\"Seite A\",\"pageUrl\":\"\",\"remembered\":true,\"states\":null}"
curl -s -o /dev/null -X POST $B/questions -H "X-API-KEY: $TOKEN" -H 'content-type: application/json' -d "$q"
S1=$(DB "select qp.current_state from \"Question\" q join \"QuestionProgress\" qp on qp.id=q.question_progress_id where q.hash='$H'")
curl -s -o /dev/null -X POST $B/questions -H "X-API-KEY: $TOKEN" -H 'content-type: application/json' -d "$q"
S2=$(DB "select qp.current_state from \"Question\" q join \"QuestionProgress\" qp on qp.id=q.question_progress_id where q.hash='$H'")
ok "Zustand nach Anlage / nach zweitem POST (gleich erwartet)" "$S1 / $S2"

echo "4 v1-Markup mit Zeilenumbruch"
RAW=$'Was ist\n  k-Anonymität?'
HR=$(printf '%s' "$RAW" | shasum -a 1 | cut -d' ' -f1)
BODY=$(python3 -c 'import json,sys; print(json.dumps({"hash":sys.argv[1],"question":sys.argv[2],"answer":"A","groupName":None,"pageName":"Seite A","pageUrl":"","remembered":True,"states":None}))' "$HR" "$RAW")
ok "POST mit Rohtext (wie der Client jetzt sendet): 200" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/questions -H "X-API-KEY: $TOKEN" -H 'content-type: application/json' -d "$BODY")"

echo "5 Status je Seite"
ok "GET liefert pageName" "$(curl -s $B/questions -H "X-API-KEY: $TOKEN" | python3 -c 'import sys,json; print(sorted({q.get("pageName") for q in json.load(sys.stdin)}))')"

echo "7 Rate-Limit: viele Adressen hinter einer IP"
curl -s -X DELETE $M/messages >/dev/null
n429=0; for i in $(seq 1 30); do c=$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/auth/request -H 'content-type: application/json' -d "{\"email\":\"hs$i-$RANDOM@example.org\"}"); [ "$c" = 429 ] && n429=$((n429+1)); done
ok "30 Studierende, eine IP: abgelehnt (erwartet 0)" "$n429"
