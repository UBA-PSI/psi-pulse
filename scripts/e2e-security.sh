#!/usr/bin/env bash
# Prüft die Befunde A21–A27 aus dem Security-Review gegen die lokale Umgebung (docker-compose.dev.yml).
# Nur für localhost gedacht: legt Testkonten (@example.org) an und leert Mailpit.
# Werte stehen neben „(erwartet X)“; auf dem Stand vor den Fixes weichen sie ab.
set -uo pipefail
B=${PULSE_TEST_URL:-http://localhost:3000}; M=${PULSE_TEST_MAIL_URL:-http://localhost:8025}/api/v1
DB() { docker exec "${PULSE_TEST_DB:-database}" psql -U postgres -At -c "$1"; }
ok() { printf '  %-72s %s\n' "$1" "$2"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
J='content-type: application/json'; O="Origin: $B"
# Baut JSON aus einem Python-Ausdruck; eval nur für die festen Ausdrücke in diesem Skript
json() { python3 -c 'import json,sys; print(json.dumps(eval(sys.argv[1])))' "$1"; }
code_from_mail() { id=$(curl -s $M/messages | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages"][0]["ID"])'); curl -s $M/message/$id | python3 -c 'import sys,json,re; print(re.search(r"(\d{6})", json.load(sys.stdin)["Subject"]).group(1))'; }
# Konto über den Code-Login des Widgets; gibt das API-Token aus
new_user() {
    local rid c
    rid=$(curl -s -X POST $B/api/v1/auth/request -H "$J" -d "{\"email\":\"$1\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["requestId"])')
    c=$(code_from_mail)
    curl -s -X POST $B/api/v1/auth/verify -H "$J" -d "{\"requestId\":\"$rid\",\"code\":\"$c\",\"name\":\"Sec\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])'
}
# App-Sitzung direkt in der DB, spart eine zweite Mail an dieselbe Adresse (Rate-Limit)
new_session() {
    local sid="sec$RANDOM$RANDOM$RANDOM"
    DB "insert into \"Session\"(id,user_id,active_expires,idle_expires) select '$sid', id, (extract(epoch from now())*1000)::bigint + 3600000, (extract(epoch from now())*1000)::bigint + 7200000 from \"User\" where email='$1'" >/dev/null
    echo "auth_session=$sid"
}
qbody() { # Schlüssel, Seite, pageUrl (Python-Ausdruck), abweichende Felder (z. B. "states=…")
    local h; h=$(printf 'key:%s' "$1" | shasum -a 1 | cut -d' ' -f1)
    json "{**dict(key='$1', hash='$h', question='Frage $1?', answer='Antwort', groupName=None, pageName='$2', pageUrl=$3, remembered=True, states=None), **dict(${4:-})}"
}
purl() { DB "select url from \"Page\" p join \"User\" u on u.id=p.owner_id where u.email='$1' and p.name='$2'"; }

curl -s -X DELETE $M/messages >/dev/null
U="sec-$RANDOM@example.org"
T=$(new_user "$U")
COOKIE=$(new_session "$U")
UID_=$(DB "select id from \"User\" where email='$U'")

echo "A21 pageUrl nur http(s), App-CSP"
ok "POST mit javascript:-URL angenommen (erwartet 200)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody js1 'Seite JS' "'javascript:alert(document.domain)//'")")"
ok "gespeicherte URL (erwartet leer)" "[$(purl "$U" 'Seite JS')]"
code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody ok1 'Seite OK' "'https://example.org/kapitel-1'")" >/dev/null
ok "legitime URL gespeichert (erwartet https://example.org/kapitel-1)" "$(purl "$U" 'Seite OK')"
code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(json "dict(key='file1', hash='$(printf 'key:file1' | shasum -a 1 | cut -d' ' -f1)', question='F?', answer='A', groupName=None, pageName='Seite Datei', remembered=True, states=None)")" >/dev/null
ok "ohne pageUrl (file://) angelegt, URL leer (erwartet 1 [])" "$(DB "select count(*) from \"Question\" q join \"Page\" p on p.id=q.page_id where p.owner_id='$UID_' and p.name='Seite Datei'") [$(purl "$U" 'Seite Datei')]"
DB "update \"Page\" set url='javascript:alert(1)' where owner_id='$UID_' and name='Seite OK'" >/dev/null
ok "Altbestand javascript: wird nicht ausgegeben (erwartet [''])" "$(curl -s "$B/api/questions?archived=false&open=false" -H "Cookie: $COOKIE" | python3 -c 'import sys,json; print(sorted({q["pageUrl"] for q in json.load(sys.stdin) if q["pageName"]=="Seite OK"}))')"
CSP=$(curl -s -D - -o /dev/null $B/login | tr -d '\r' | grep -i '^content-security-policy:' | head -1)
ok "CSP auf /login mit script-src ohne unsafe-inline (erwartet ja)" "$(echo "$CSP" | grep -q "script-src 'self'" && ! echo "$CSP" | grep -o "script-src[^;]*" | grep -q unsafe-inline && echo ja || echo nein)"
ok "CSP auf /login mit frame-ancestors 'none' (erwartet ja)" "$(echo "$CSP" | grep -q "frame-ancestors 'none'" && echo ja || echo nein)"
ok "CSP auf der Widget-Demo (erwartet ja)" "$(curl -s -D - -o /dev/null $B/embed/v2/demo.html | grep -qi "^content-security-policy: default-src 'none'" && echo ja || echo nein)"

echo "A22 Mail-Adressen streng, normalisiert"
curl -s -X DELETE $M/messages >/dev/null
ok "Signup mit Adressliste (erwartet 400)" "$(code -X POST $B/api/signup -H "$J" -d '{"email":"liste1@example.org, liste2@example.org","name":"X","logQuestions":false}')"
ok "Code-Login mit a<opfer@…> (erwartet 400)" "$(code -X POST $B/api/v1/auth/request -H "$J" -d '{"email":"a<opfer@example.org>"}')"
ok "Code-Login mit zwei Adressen, Leerzeichen (erwartet 400)" "$(code -X POST $B/api/v1/auth/request -H "$J" -d '{"email":"a@example.org b@example.org"}')"
ok "Login mit Adressliste (erwartet 400)" "$(code -X POST $B/api/login -H "$J" -d "{\"email\":\"$U,opfer@example.org\"}")"
ok "Mails an opfer@/liste2@ (erwartet 0)" "$(( $(curl -s "$M/search?query=to:opfer@example.org" | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages_count"])') + $(curl -s "$M/search?query=to:liste2@example.org" | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages_count"])') ))"
V="Norm-$RANDOM@Example.org"; v=$(echo "$V" | tr 'A-Z' 'a-z')
ok "Signup mit Leerzeichen und Großbuchstaben (erwartet 302)" "$(code -X POST $B/api/signup -H "$J" -d "{\"email\":\"  $V \",\"name\":\"Norm\",\"logQuestions\":false}")"
ok "gleiche Adresse normalisiert, sofort danach (erwartet 429)" "$(code -X POST $B/api/signup -H "$J" -d "{\"email\":\"$v\",\"name\":\"Norm\",\"logQuestions\":false}")"
ok "Konto mit normalisierter Adresse (erwartet 1)" "$(DB "select count(*) from \"User\" where email='$v'")"
ok "Empfänger der Mail (erwartet $v)" "$(curl -s $M/messages | python3 -c 'import sys,json; m=json.load(sys.stdin)["messages"][0]; print(",".join(t["Address"] for t in (m.get("To") or [])+(m.get("Cc") or [])+(m.get("Bcc") or [])))')"
ok "Signup mit URL im Namen (erwartet 400)" "$(code -X POST $B/api/signup -H "$J" -d '{"email":"name-'$RANDOM'@example.org","name":"Ihr Konto ist gesperrt: https://evil.example","logQuestions":false}')"
ok "Signup mit Zeilenumbruch und <> im Namen (erwartet 400)" "$(code -X POST $B/api/signup -H "$J" -d '{"email":"name-'$RANDOM'@example.org","name":"Max\n<b>Klick</b>","logQuestions":false}')"
curl -s -X DELETE $M/messages >/dev/null
W="anrede-$RANDOM@example.org"
code -X POST $B/api/signup -H "$J" -d "{\"email\":\"$W\",\"name\":\"Mallory Beispiel\",\"logQuestions\":false}" >/dev/null
ok "Name in der Signup-Mail an unbestätigte Adresse (erwartet nein)" "$(curl -s $M/messages | python3 -c 'import sys,json; print(json.load(sys.stdin)["messages"][0]["Snippet"])' | grep -q Mallory && echo ja || echo nein)"

echo "A23 Größen- und Längengrenzen"
BIG=$(python3 -c "print('{\"question\":\"' + 'x'*300000 + '\"}')")
ok "Body mit 300 KB (erwartet 413)" "$(printf '%s' "$BIG" | code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" --data-binary @-)"
ok "Frage mit 6000 Zeichen (erwartet 400)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(json "dict(hash=__import__('hashlib').sha1(('q'*6000).encode()).hexdigest(), question='q'*6000, answer='A', groupName=None, pageName='Lang', pageUrl='', remembered=True, states=None)")")"
ok "Seitenname mit 500 Zeichen (erwartet 400)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody len1 "$(printf 'S%.0s' $(seq 500))" "''")")"
ST="dict(initialStateLabel='x'*500, initialStateOffset=0, state1Label='a', state1Offset=1, state2Label=None, state2Offset=None, state3Label=None, state3Offset=None, state4Label=None, state4Offset=None, finalStateLabel='b', finalStateOffset=2)"
NS=$(DB "select count(*) from \"QuestionState\" where length(label) >= 500")
ok "Zustands-Label mit 500 Zeichen (erwartet 400)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody len2 'Seite' "''" "states=$ST")")"
ok "dabei neu angelegte Zustände (erwartet 0)" "$(( $(DB "select count(*) from \"QuestionState\" where length(label) >= 500") - NS ))"

echo "A24 5xx ohne interne Details"
R=$(curl -s -w '\n%{http_code}' -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody nul1 'Seite' "''" "groupName='a\\u0000b'")")
ok "Datenbankfehler (NUL-Byte): Status (erwartet 500)" "$(echo "$R" | tail -1)"
ok "Antwort ohne Prisma-/DB-Details (erwartet ja)" "$(echo "$R" | sed '$d' | grep -qiE 'prisma|invocation|postgres|0x00|byte sequence' && echo nein || echo ja)"
ok "Meldung (erwartet Server Error)" "$(echo "$R" | sed '$d' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("message"))' 2>/dev/null)"

echo "A25 abgelaufene API-Tokens"
X="exp$RANDOM$RANDOM$RANDOM"
DB "insert into \"ThirdPartySession\"(id,user_id,expires) values ('$X','$UID_',(extract(epoch from now())*1000)::bigint - 60000)" >/dev/null
ok "Token seit einer Minute abgelaufen (erwartet 401)" "$(code $B/api/v1/questions -H "X-API-KEY: $X")"
ok "gültiges Token (erwartet 200)" "$(code $B/api/v1/questions -H "X-API-KEY: $T")"

echo "A26 Mail-Links: einmal bewerten, Ablauf"
DB "update \"User\" set log_questions=true, research_pseudonym=gen_random_uuid()::text where id='$UID_'" >/dev/null
qid() { DB "select q.id from \"Question\" q join \"Page\" p on p.id=q.page_id where p.owner_id='$UID_' and q.hash='$(printf 'key:%s' "$1" | shasum -a 1 | cut -d' ' -f1)'"; }
for k in r1 r2 r3; do code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody $k 'Mail' "''")" >/dev/null; done
Q1=$(qid r1); Q2=$(qid r2); Q3=$(qid r3)
RT="rem$RANDOM$RANDOM"; OLD="old$RANDOM$RANDOM"
DB "insert into \"ReminderEmail\"(id,token,user_id,sent_at) values (gen_random_uuid(),'$RT','$UID_',now()), (gen_random_uuid(),'$OLD','$UID_',now()-interval '31 days')" >/dev/null
DB "update \"Question\" set reminder_email_id=(select id from \"ReminderEmail\" where token='$RT') where id in ('$Q1','$Q2')" >/dev/null
DB "update \"Question\" set reminder_email_id=(select id from \"ReminderEmail\" where token='$OLD') where id='$Q3'" >/dev/null
for q in $Q1 $Q2 $Q3; do DB "update \"QuestionProgress\" set reminder_token='t$RANDOM$RANDOM' where id=(select question_progress_id from \"Question\" where id='$q')" >/dev/null; done
tok() { DB "select reminder_token from \"QuestionProgress\" where id=(select question_progress_id from \"Question\" where id='$1')"; }
state() { DB "select current_state from \"QuestionProgress\" where id=(select question_progress_id from \"Question\" where id='$1')"; }
logs() { DB "select count(*) from \"QuestionLog\" l join \"User\" u on u.research_pseudonym=l.pseudonym where u.id='$UID_'"; }
put() { code -X PUT "$B/api/answer/$1?token=$2&tokenType=$3" -H "$J" -d '{"remembered":true}'; }
T2=$(tok $Q2); T3=$(tok $Q3)
S0=$(state $Q1); L0=$(logs)
a=$(put $Q1 $RT reminder); b=$(put $Q1 $RT reminder); c=$(put $Q1 $RT reminder)
ok "„Alle beantworten“: dreimal dieselbe Frage (erwartet 200 404 404)" "$a $b $c"
ok "Stand vorher/nachher (erwartet STATE_1/STATE_2)" "$S0/$(state $Q1)"
ok "neue QuestionLog-Einträge (erwartet 1)" "$(( $(logs) - L0 ))"
ok "Einzel-Link: zweimal (erwartet 200 404)" "$(put $Q2 $T2 question) $(put $Q2 $T2 question)"
ok "„Alle beantworten“ 31 Tage nach Versand, GET (erwartet 404)" "$(code $B/api/reminder/$OLD)"
ok "Einzel-Link 31 Tage nach Versand, GET (erwartet 404)" "$(code "$B/api/questions/$Q3?token=$T3")"
ok "Einzel-Link 31 Tage nach Versand, PUT (erwartet 404)" "$(put $Q3 $T3 question)"
WT="wk$RANDOM$RANDOM"
DB "insert into \"WeeklyEmail\"(id,token,user_id,sent_at) values (gen_random_uuid(),'$WT','$UID_',now())" >/dev/null
DB "update \"Question\" set weekly_email_id=(select id from \"WeeklyEmail\" where token='$WT') where id in ('$Q1','$Q3')" >/dev/null
L1=$(logs)
ok "Wochenauswahl: zweimal dieselbe Frage (erwartet 200 404)" "$(put $Q1 $WT weekly) $(put $Q1 $WT weekly)"
ok "neue QuestionLog-Einträge (erwartet 1)" "$(( $(logs) - L1 ))"
ok "Link zeigt noch die unbeantwortete Frage (erwartet 1)" "$(curl -s $B/api/weekly/$WT | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')"

echo "A27 PUT /api/account"
acct() { json "{**dict(name='Sec', preferredReminderDeliveryTime='14', preferredWeeklyDeliveryTime='16', preferredWeeklyDeliveryDay=3, receiveEmails=True, receiveWeeklyEmails=True, weeklyEmailsNumber=6, unsubscribeEmailsToken=None, unsubscribeWeeklyEmailsToken=None, logQuestions=True), **dict(${1:-})}"; }
TOK0=$(DB "select unsubscribe_emails_token from \"User\" where id='$UID_'")
ok "Speichern mit eigenem Abmelde-Token im Body (erwartet 200)" "$(code -X PUT $B/api/account -H "Cookie: $COOKIE" -H "$O" -H "$J" -d "$(acct "unsubscribeEmailsToken='gewaehlt', unsubscribeWeeklyEmailsToken='gewaehlt2'")")"
ok "Abmelde-Token unverändert, nicht aus dem Body (erwartet ja)" "$([ "$(DB "select unsubscribe_emails_token from \"User\" where id='$UID_'")" = "$TOK0" ] && echo ja || echo nein)"
ok "weeklyEmailsNumber 100000 (erwartet 400)" "$(code -X PUT $B/api/account -H "Cookie: $COOKIE" -H "$O" -H "$J" -d "$(acct "weeklyEmailsNumber=100000")")"
ok "Name mit 5000 Zeichen (erwartet 400)" "$(code -X PUT $B/api/account -H "Cookie: $COOKIE" -H "$O" -H "$J" -d "$(acct "name='n'*5000")")"
ok "Uhrzeit 99 (erwartet 400)" "$(code -X PUT $B/api/account -H "Cookie: $COOKIE" -H "$O" -H "$J" -d "$(acct "preferredReminderDeliveryTime='99'")")"
ok "Wochentag 9 (erwartet 400)" "$(code -X PUT $B/api/account -H "Cookie: $COOKIE" -H "$O" -H "$J" -d "$(acct "preferredWeeklyDeliveryDay=9")")"
ok "Wochenzahl als String aus dem Eingabefeld (erwartet 200)" "$(code -X PUT $B/api/account -H "Cookie: $COOKIE" -H "$O" -H "$J" -d "$(acct "weeklyEmailsNumber='8'")")"
ok "gespeicherte Wochenzahl, Name (erwartet 8|Sec)" "$(DB "select weekly_emails_number||'|'||name from \"User\" where id='$UID_'")"

# Ab hier Befunde aus dem Codex-Review (A29–A38), Teil Anmeldung und Einwilligung
echo "A34 Magic Link und Code genau einmal einlösbar"
ML="ml-$RANDOM@example.org"; MLID="ml$RANDOM$RANDOM"
DB "insert into \"User\"(id,email,name,verified,preferred_weekly_email_delivery_day) values ('$MLID','$ML','Link',true,3)" >/dev/null
new_link() { local t="ev$RANDOM$RANDOM$RANDOM"; DB "insert into \"EmailVerificationToken\"(id,expires,user_id) values ('$t',(extract(epoch from now())*1000)::bigint+${2:-3600000},'$1')" >/dev/null; echo "$t"; }
# Seit A29 meldet erst der Knopf auf der Bestätigungsseite an (POST mit Origin), nicht mehr das Öffnen des Links
redeem() { curl -s -o /dev/null -w '%{http_code}\n' -X POST "$B/api/email-verification/$1" -H "$O"; }
sessions() { DB "select count(*) from \"Session\" where user_id='$1'"; }
LT=$(new_link $MLID); S0=$(sessions $MLID)
for i in 1 2 3 4 5 6; do redeem "$LT" & done >/dev/null; wait
ok "Magic Link, sechs gleichzeitige Einlösungen: neue Sitzungen (erwartet 1)" "$(( $(sessions $MLID) - S0 ))"
LT=$(new_link $MLID -60000)
ok "abgelaufener Link (erwartet 400)" "$(redeem "$LT")"
ok "abgelaufener Link danach entfernt (erwartet 0)" "$(DB "select count(*) from \"EmailVerificationToken\" where id='$LT'")"
CL="code-$RANDOM@example.org"
curl -s -X DELETE $M/messages >/dev/null
RID=$(curl -s -X POST $B/api/v1/auth/request -H "$J" -d "{\"email\":\"$CL\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["requestId"])')
CC=$(code_from_mail)
R=$(for i in 1 2 3 4; do curl -s -o /dev/null -w '%{http_code}\n' -X POST $B/api/v1/auth/verify -H "$J" -d "{\"requestId\":\"$RID\",\"code\":\"$CC\"}" & done; wait)
ok "Code, vier gleichzeitige Einlösungen: Status (erwartet 1x 200, 3x 400)" "$(echo "$R" | sort | uniq -c | awk '{printf "%sx %s ", $1, $2}')"
ok "API-Tokens aus einem Code (erwartet 1)" "$(DB "select count(*) from \"ThirdPartySession\" t join \"User\" u on u.id=t.user_id where u.email='$CL'")"

echo "A29 Magic Link: Öffnen meldet nicht an, Anmelden nur per POST von der eigenen Herkunft"
LT=$(new_link $MLID); S0=$(sessions $MLID)
H=$(curl -s -D - -o /dev/null "$B/api/email-verification/$LT" | tr -d '\r')
ok "Link öffnen: Status und Ziel (erwartet 302 /email-verification/<Token>)" "$(echo "$H" | head -1 | cut -d' ' -f2) $(echo "$H" | grep -i '^location:' | cut -d' ' -f2 | sed "s/$LT/<Token>/")"
ok "Link öffnen setzt Sitzungscookie (erwartet nein)" "$(echo "$H" | grep -qi '^set-cookie: auth_session=[a-z0-9]' && echo ja || echo nein)"
ok "Bestätigungsseite (erwartet 200)" "$(code "$B/email-verification/$LT")"
ok "Seite nennt maskierte Adresse (erwartet ${ML:0:1}***@example.org)" "$(curl -s "$B/email-verification/$LT" | grep -o "${ML:0:1}\*\*\*@example.org" | head -1)"
ok "Seite ohne ganze Adresse (erwartet ja)" "$(curl -s "$B/email-verification/$LT" | grep -q "$ML" && echo nein || echo ja)"
ok "Token nach dem Öffnen noch da (erwartet 1)" "$(DB "select count(*) from \"EmailVerificationToken\" where id='$LT'")"
ok "POST ohne Origin (erwartet 403)" "$(code -X POST "$B/api/email-verification/$LT")"
ok "POST von fremder Herkunft (erwartet 403)" "$(code -X POST "$B/api/email-verification/$LT" -H 'Origin: https://evil.example')"
ok "Token danach noch da, keine Sitzung (erwartet 1 0)" "$(DB "select count(*) from \"EmailVerificationToken\" where id='$LT'") $(( $(sessions $MLID) - S0 ))"
H=$(curl -s -D - -o /dev/null -X POST "$B/api/email-verification/$LT" -H "$O" | tr -d '\r')
ok "POST von der eigenen Herkunft (erwartet 200, Cookie ja)" "$(echo "$H" | head -1 | cut -d' ' -f2), Cookie $(echo "$H" | grep -qi '^set-cookie: auth_session=[a-z0-9]' && echo ja || echo nein)"
ok "zweiter POST (erwartet 400)" "$(redeem "$LT")"
ok "Seite danach: Link ungültig (erwartet ja)" "$(curl -s "$B/email-verification/$LT?lang=de" | grep -q 'abgelaufen oder wurde schon benutzt' && echo ja || echo nein)"

echo "A38 Sprache und Forschungsangebot nur mit gültigem Reminder-Link (30 Tage)"
# Konto, das nach dem Forschungsangebot gefragt würde: älter als 14 Tage, mindestens fünf Fragen, Sprache en
RU="research-sec-$RANDOM@example.org"; RUID="rs$RANDOM$RANDOM"
DB "insert into \"User\"(id,email,name,verified,lang,preferred_weekly_email_delivery_day,created_at,unsubscribe_emails_token,unsubscribe_weekly_emails_token) values ('$RUID','$RU','Forschung',true,'en',3,now()-interval '30 days',md5(random()::text),md5(random()::text))" >/dev/null
DB "insert into \"Page\"(id,name,url,owner_id) values (gen_random_uuid(),'Forschungsseite','','$RUID')" >/dev/null
DB "insert into \"Group\"(id,name,page_id) select gen_random_uuid(),'no-group',id from \"Page\" where owner_id='$RUID'" >/dev/null
QS=$(DB "select id from \"QuestionState\" limit 1")
for i in 1 2 3 4 5; do
  DB "with qp as (insert into \"QuestionProgress\"(id,initial_state_id,state_1_id,final_state_id,completed_at,reminder_token) values (gen_random_uuid(),'$QS','$QS','$QS',now()-interval '30 days','qt$i$RUID') returning id)
      insert into \"Question\"(id,hash,text,answer,group_id,page_id,question_progress_id) select gen_random_uuid(),'h$i-$RANDOM','Frage $i','A',g.id,p.id,qp.id from qp, \"Page\" p join \"Group\" g on g.page_id=p.id where p.owner_id='$RUID'" >/dev/null
done
RNEW="rnew$RANDOM$RANDOM"; ROLD="rold$RANDOM$RANDOM"
DB "insert into \"ReminderEmail\"(id,token,user_id,sent_at) values (gen_random_uuid(),'$RNEW','$RUID',now()), (gen_random_uuid(),'$ROLD','$RUID',now()-interval '31 days')" >/dev/null
rq() { DB "select q.id from \"Question\" q join \"QuestionProgress\" qp on qp.id=q.question_progress_id where qp.reminder_token='qt$1$RUID'"; }
RQ1=$(rq 1); RQ2=$(rq 2)
DB "update \"Question\" set reminder_email_id=(select id from \"ReminderEmail\" where token='$ROLD') where id='$RQ1'" >/dev/null
DB "update \"Question\" set reminder_email_id=(select id from \"ReminderEmail\" where token='$RNEW') where id='$RQ2'" >/dev/null
ask() { curl -s "$B/api/research/offer?kind=reminder&token=$1" | python3 -c 'import sys,json; print(json.load(sys.stdin)["ask"])'; }
lang() { curl -s "$B/api/answer/lang?$1" | python3 -c 'import sys,json; print(json.load(sys.stdin)["lang"])'; }
ok "Angebot mit 31 Tage altem Reminder (erwartet False)" "$(ask $ROLD)"
ok "Angebot mit frischem Reminder (erwartet True)" "$(ask $RNEW)"
ok "Sprache mit 31 Tage altem Reminder (erwartet None)" "$(lang "kind=reminder&token=$ROLD")"
ok "Sprache mit frischem Reminder (erwartet en)" "$(lang "kind=reminder&token=$RNEW")"
ok "Sprache Einzel-Link, Mail 31 Tage alt (erwartet None)" "$(lang "kind=question&id=$RQ1&token=qt1$RUID")"
ok "Sprache Einzel-Link, Mail frisch (erwartet en)" "$(lang "kind=question&id=$RQ2&token=qt2$RUID")"

echo "A30 Forschungsangebot genau einmal, ältere Angebote verfallen mit jeder Entscheidung"
offer() { curl -s "$B/api/research/offer?kind=reminder&token=$RNEW" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("offer",""))'; }
decide() { code -X POST $B/api/research/decision -H "$J" -d "{\"offer\":\"$1\",\"consent\":$2}"; }
research() { DB "select log_questions||'|'||(research_pseudonym is not null)::text from \"User\" where id='$RUID'"; }
OA=$(offer); OB=$(offer)
ok "Nein mit Angebot A (erwartet 200)" "$(decide "$OA" false)"
ok "dasselbe Angebot A erneut, jetzt Ja (erwartet 400)" "$(decide "$OA" true)"
ok "zweites, vorher ausgestelltes Angebot B: Ja (erwartet 400)" "$(decide "$OB" true)"
ok "Konto protokolliert nicht (erwartet false|false)" "$(research)"
# Konto wieder unentschieden (wie ein neues Konto), Angebot holen, dann in den Einstellungen zustimmen
DB "update \"User\" set research_decided_at=null where id='$RUID'" >/dev/null
OC=$(offer); RCOOKIE=$(new_session "$RU")
ok "Einstellungen: Zustimmung (erwartet 200)" "$(code -X PUT $B/api/account -H "Cookie: $RCOOKIE" -H "$O" -H "$J" -d "$(acct "logQuestions=True")")"
ok "älteres Angebot C danach: Nein, würde Daten löschen (erwartet 400)" "$(decide "$OC" false)"
ok "Einwilligung und Pseudonym bleiben (erwartet true|true)" "$(research)"
DB "update \"User\" set research_decided_at=null, log_questions=false where id='$RUID'" >/dev/null
OD=$(offer)
R=$(for i in 1 2 3 4; do curl -s -o /dev/null -w '%{http_code}\n' -X POST $B/api/research/decision -H "$J" -d "{\"offer\":\"$OD\",\"consent\":true}" & done; wait)
ok "Angebot D, vier gleichzeitige Entscheidungen (erwartet 1x 200, 3x 400)" "$(echo "$R" | sort | uniq -c | awk '{printf "%sx %s ", $1, $2}')"
ok "manipuliertes Angebot, andere Version (erwartet 400)" "$(decide "$(echo "$OD" | python3 -c 'import sys; p=sys.stdin.read().strip().split("."); p[2]="2020-01"; print(".".join(p))')" true)"

echo "A37 Mail-Rate-Limit pro Postfach, auch mit Plus-Aliasen"
curl -s -X DELETE $M/messages >/dev/null
PA="plus-$RANDOM"
ok "Code-Login $PA+1@… (erwartet 200)" "$(code -X POST $B/api/v1/auth/request -H "$J" -d "{\"email\":\"$PA+1@example.org\"}")"
ok "sofort danach $PA+2@… (erwartet 429)" "$(code -X POST $B/api/v1/auth/request -H "$J" -d "{\"email\":\"$PA+2@example.org\"}")"
ok "sofort danach $PA@… ohne Alias (erwartet 429)" "$(code -X POST $B/api/v1/auth/request -H "$J" -d "{\"email\":\"$PA@example.org\"}")"
ok "Empfänger der Mail unverändert (erwartet $PA+1@example.org)" "$(curl -s $M/messages | python3 -c 'import sys,json; m=json.load(sys.stdin)["messages"]; print(",".join(t["Address"] for x in m for t in x.get("To") or []))')"
ok "andere Adresse gleicher Domain (erwartet 200)" "$(code -X POST $B/api/v1/auth/request -H "$J" -d "{\"email\":\"other-$RANDOM+1@example.org\"}")"

echo "A28 Kontingente pro Konto (Fragen 5000, Seiten 500, Gruppen 2000)"
MAILPAGE=$(DB "select id from \"Page\" where owner_id='$UID_' and name='Mail'")
ngroups() { DB "select count(*) from \"Group\" g join \"Page\" p on p.id=g.page_id where p.owner_id='$UID_'"; }
G0=$(ngroups)
ok "bekannte Frage mit neuem Gruppennamen (erwartet 200)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody r1 'Mail' "''" "groupName='Neue Gruppe'")")"
ok "dabei angelegte Gruppen (erwartet 0)" "$(( $(ngroups) - G0 ))"
# Seiten bis zum Kontingent auffüllen
DB "insert into \"Page\"(id,name,url,owner_id) select gen_random_uuid(),'Quota-P'||g,'','$UID_' from generate_series(1, greatest(0, 500 - (select count(*) from \"Page\" where owner_id='$UID_'))) g" >/dev/null
ok "Seiten im Konto (erwartet 500)" "$(DB "select count(*) from \"Page\" where owner_id='$UID_'")"
ok "Frage auf neuer Seite (erwartet 403)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody q-p1 'Quota-neu' "''")")"
ok "Frage auf vorhandener Seite (erwartet 200)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody q-p2 'Mail' "''")")"
DB "delete from \"Question\" where page_id in (select id from \"Page\" where owner_id='$UID_' and name like 'Quota-%')" >/dev/null
DB "delete from \"Page\" where owner_id='$UID_' and name like 'Quota-%'" >/dev/null
# Gruppen bis zum Kontingent auffüllen
DB "insert into \"Group\"(id,name,page_id) select gen_random_uuid(),'Quota-G'||g,'$MAILPAGE' from generate_series(1, greatest(0, 2000 - $(ngroups))) g" >/dev/null
ok "Gruppen im Konto (erwartet 2000)" "$(ngroups)"
ok "Frage in neuer Gruppe (erwartet 403)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody q-g1 'Mail' "''" "groupName='Quota-G-neu'")")"
ok "Frage in vorhandener Gruppe (erwartet 200)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody q-g2 'Mail' "''")")"
DB "delete from \"Question\" where group_id in (select id from \"Group\" where page_id='$MAILPAGE' and name like 'Quota-G%')" >/dev/null
DB "delete from \"Group\" where page_id='$MAILPAGE' and (name like 'Quota-G%' or name='Neue Gruppe')" >/dev/null
# Fragen bis zum Kontingent auffüllen (inaktiv, damit der Scheduler sie nicht prüft)
NQ=$(DB "select count(*) from \"Question\" q join \"Page\" p on p.id=q.page_id where p.owner_id='$UID_'")
DB "with s as (select id from \"QuestionState\" order by id limit 1),
    qp as (insert into \"QuestionProgress\"(id,initial_state_id,state_1_id,final_state_id,active,active_since) select gen_random_uuid(),s.id,s.id,s.id,false,null from s, generate_series(1, greatest(0, 5000 - $NQ)) returning id)
    insert into \"Question\"(id,hash,text,answer,group_id,page_id,question_progress_id) select gen_random_uuid(),'quota-'||qp.id,'Q','A',g.id,'$MAILPAGE',qp.id from qp, \"Group\" g where g.page_id='$MAILPAGE' and g.name='no-group'" >/dev/null
ok "Fragen im Konto (erwartet 5000)" "$(DB "select count(*) from \"Question\" q join \"Page\" p on p.id=q.page_id where p.owner_id='$UID_'")"
ok "neue Frage über dem Kontingent (erwartet 403)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody q-q1 'Mail' "''")")"
ok "bekannte Frage weiter bewertbar (erwartet 200)" "$(code -X POST $B/api/v1/questions -H "X-API-KEY: $T" -H "$J" -d "$(qbody r1 'Mail' "''")")"
ok "Widget-Liste: Status, Anzahl (erwartet 200 5000)" "$(curl -s -w ' %{http_code}' $B/api/v1/questions -H "X-API-KEY: $T" | python3 -c 'import sys; b,c=sys.stdin.read().rsplit(" ",1); import json; print(c, len(json.loads(b)))')"
ok "App-Liste: Anzahl (erwartet 5000)" "$(curl -s "$B/api/questions" -H "Cookie: $COOKIE" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')"
DB "with d as (delete from \"Question\" where page_id='$MAILPAGE' and hash like 'quota-%' returning question_progress_id) delete from \"QuestionProgress\" where id in (select question_progress_id from d)" >/dev/null
DB "with d as (delete from \"Question\" q using \"Page\" p where p.id=q.page_id and p.owner_id='$UID_' and q.hash in ('$(printf 'key:q-q1' | shasum -a 1 | cut -d' ' -f1)','$(printf 'key:q-p1' | shasum -a 1 | cut -d' ' -f1)','$(printf 'key:q-g1' | shasum -a 1 | cut -d' ' -f1)') returning q.question_progress_id) delete from \"QuestionProgress\" where id in (select question_progress_id from d)" >/dev/null

echo "A31 Bewertung und Löschung/Widerruf der Forschungsdaten serialisiert"
# Bewertung anhalten, nachdem sie die Einwilligung gelesen hat: Zeile des Lernstands in psql sperren (4 s).
# Währenddessen löschen bzw. widerrufen; danach darf die Bewertung keinen Eintrag mehr anlegen.
H2=$(printf 'key:r2' | shasum -a 1 | cut -d' ' -f1)
QP2=$(DB "select question_progress_id from \"Question\" where id='$Q2'")
race() { # Aktion während der angehaltenen Bewertung
  docker exec "${PULSE_TEST_DB:-database}" psql -U postgres -q -c "begin; select 1 from \"QuestionProgress\" where id='$QP2' for update; select pg_sleep(4); commit;" >/dev/null &
  local lockpid=$!
  sleep 1
  curl -s -o /dev/null -X PUT "$B/api/v1/questions/$H2" -H "X-API-KEY: $T" -H "$J" -d '{"pageName":"Mail","remembered":true}' &
  local putpid=$!
  sleep 1
  "$@"
  wait $putpid $lockpid
}
PS="pseu-$RANDOM$RANDOM"
DB "update \"User\" set log_questions=true, research_pseudonym='$PS', research_consent_version='test' where id='$UID_'" >/dev/null
race code -X DELETE $B/api/account/statistics -H "Cookie: $COOKIE" -H "$O" >/dev/null
ok "Statistik gelöscht während Bewertung: Einträge unter altem Pseudonym (erwartet 0)" "$(DB "select count(*) from \"QuestionLog\" where pseudonym='$PS'")"
PS="pseu-$RANDOM$RANDOM"
DB "update \"User\" set log_questions=true, research_pseudonym='$PS', research_consent_version='test' where id='$UID_'" >/dev/null
race code -X PUT $B/api/account -H "Cookie: $COOKIE" -H "$O" -H "$J" -d "$(acct "logQuestions=False")" >/dev/null
ok "Widerruf während Bewertung: Einwilligung (erwartet f)" "$(DB "select log_questions from \"User\" where id='$UID_'")"
ok "Widerruf während Bewertung: neue Einträge danach (erwartet 0)" "$(DB "select count(*) from \"QuestionLog\" where pseudonym='$PS'")"
ok "Bewertung ohne Wettlauf, mit Einwilligung protokolliert (erwartet 1)" "$(DB "update \"User\" set log_questions=true where id='$UID_'" >/dev/null; code -X PUT "$B/api/v1/questions/$H2" -H "X-API-KEY: $T" -H "$J" -d '{"pageName":"Mail","remembered":true}' >/dev/null; DB "select count(*) from \"QuestionLog\" where pseudonym='$PS'")"
DB "delete from \"QuestionLog\" where pseudonym like 'pseu-%'" >/dev/null

echo "A35 Kontoexport vollständig, ohne Geheimnisse"
EXP=$(curl -s $B/api/account/export -H "Cookie: $COOKIE")
SECRETS=$(DB "select coalesce(unsubscribe_emails_token,'-')||' '||coalesce(unsubscribe_weekly_emails_token,'-') from \"User\" where id='$UID_'")
ok "Einstellungen, Einwilligung, Lernstand, Seiten-URL (erwartet ja ja ja ja)" "$(echo "$EXP" | python3 -c '
import sys,json
d=json.load(sys.stdin)
s=d.get("settings") or {}; r=d.get("research") or {}
qs=[q for p in d.get("pages",[]) for g in p.get("groups",[]) for q in g.get("questions",[])]
lp=[q.get("learning") or {} for q in qs]
print("ja" if {"preferred_reminder_hour","preferred_weekly_hour","preferred_weekly_day","weekly_emails_number","receive_emails","receive_weekly_emails","lang"} <= set(s) else "nein",
      "ja" if {"consent","consent_version","consent_at","decided_at"} <= set(r) else "nein",
      "ja" if qs and all({"stage","last_answered_at","next_due_at"} <= set(l) for l in lp) and all("archived" in q for q in qs) else "nein",
      "ja" if any(p.get("url") for p in d.get("pages",[])) else "nein")')"
ok "keine Tokens/Hashes im Export (erwartet ja)" "$(echo "$EXP" | python3 -c '
import sys,json
t=sys.stdin.read(); secrets=sys.argv[1].split()
def keys(o):
    if isinstance(o,dict):
        for k,v in o.items(): yield k; yield from keys(v)
    elif isinstance(o,list):
        for v in o: yield from keys(v)
# question_hash in den Forschungsdaten ist gespeicherter Inhalt (Frage-Kennung), kein Geheimnis
bad=[k for k in keys(json.loads(t)) if "token" in k.lower() or ("hash" in k.lower() and k != "question_hash")]
print("ja" if not bad and not any(s!="-" and s in t for s in secrets) else "nein "+",".join(bad))' "$SECRETS")"

echo "A36 CSP: nur die von Nuxt erzeugten Inline-Skripte"
if node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 23 ? 0 : 1)' 2>/dev/null; then
  node "$(dirname "$0")/csp-inline-scripts.test.mjs"
else
  echo "  übersprungen: braucht Node >= 23 (TypeScript ohne Übersetzer)"
fi
if [ -n "${PLAYWRIGHT_NODE_PATH:-}" ]; then
  NODE_PATH="$PLAYWRIGHT_NODE_PATH" node "$(dirname "$0")/e2e-csp.cjs"
else
  echo "  Browser übersprungen: PLAYWRIGHT_NODE_PATH auf ein node_modules mit playwright setzen"
fi
