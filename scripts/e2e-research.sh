#!/usr/bin/env bash
# Einwilligung zur Forschung (Antwortseiten aus Mails) gegen die lokale Umgebung.
set -uo pipefail
B=${PULSE_TEST_URL:-http://localhost:3000}
DB() { docker exec "${PULSE_TEST_DB:-database}" psql -U postgres -At -c "$1"; }
ok() { printf '  %-62s %s\n' "$1" "$2"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

U="research-$RANDOM@example.org"; UID_="r$RANDOM$RANDOM"
DB "insert into \"User\"(id,email,name,verified,preferred_weekly_email_delivery_day,created_at,unsubscribe_emails_token,unsubscribe_weekly_emails_token) values ('$UID_','$U','Forschung',true,3,now()-interval '30 days',md5(random()::text),md5(random()::text))" >/dev/null
DB "insert into \"Page\"(id,name,url,owner_id) values (gen_random_uuid(),'Forschungsseite','','$UID_')" >/dev/null
DB "insert into \"Group\"(id,name,page_id) select gen_random_uuid(),'no-group',id from \"Page\" where owner_id='$UID_'" >/dev/null
ST=$(DB "select id from \"QuestionState\" limit 1")
for i in 1 2 3 4 5; do
  DB "with qp as (insert into \"QuestionProgress\"(id,initial_state_id,state_1_id,final_state_id,completed_at) values (gen_random_uuid(),'$ST','$ST','$ST',now()-interval '30 days') returning id)
      insert into \"Question\"(id,hash,text,answer,group_id,page_id,question_progress_id) select gen_random_uuid(),'h$i-$RANDOM','Frage $i','A',g.id,p.id,qp.id from qp, \"Page\" p join \"Group\" g on g.page_id=p.id where p.owner_id='$UID_'" >/dev/null
done
TOK="rem$RANDOM$RANDOM"
DB "insert into \"ReminderEmail\"(id,token,user_id) values (gen_random_uuid(),'$TOK','$UID_')" >/dev/null

echo "Angebot"
ok "unbekanntes Token: ask=false" "$(curl -s "$B/api/research/offer?kind=reminder&token=gibtsnicht")"
R=$(curl -s "$B/api/research/offer?kind=reminder&token=$TOK")
ok "berechtigtes Konto: ask=true" "$(echo "$R" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["ask"], d.get("lang"))')"
OFFER=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["offer"])')
ok "manipuliertes Angebot: 400" "$(code -X POST $B/api/research/decision -H 'content-type: application/json' -d "{\"offer\":\"${OFFER}x\",\"consent\":true}")"

echo "Zustimmung"
ok "Ja: 200" "$(code -X POST $B/api/research/decision -H 'content-type: application/json' -d "{\"offer\":\"$OFFER\",\"consent\":true}")"
ok "Konto: Einwilligung, Pseudonym, Version" "$(DB "select log_questions, research_pseudonym is not null, research_consent_version from \"User\" where id='$UID_'")"
ok "danach nicht mehr gefragt: ask=false" "$(curl -s "$B/api/research/offer?kind=reminder&token=$TOK" | python3 -c 'import sys,json; print(json.load(sys.stdin)["ask"])')"

echo "Protokoll pseudonym"
QID=$(DB "select q.id from \"Question\" q join \"Page\" p on p.id=q.page_id where p.owner_id='$UID_' limit 1")
QT="qt$RANDOM"; DB "update \"QuestionProgress\" set reminder_token='$QT' where id=(select question_progress_id from \"Question\" where id='$QID')" >/dev/null
# wie der Scheduler: Frage-Token gehören zu einer Erinnerungsmail (seit A26 Voraussetzung, gilt 30 Tage ab Versand).
# Eine zweite, offene Frage hält die Mail am Leben; sie wird sonst nach der letzten Antwort gelöscht.
QID2=$(DB "select q.id from \"Question\" q join \"Page\" p on p.id=q.page_id where p.owner_id='$UID_' and q.id<>'$QID' limit 1")
DB "update \"QuestionProgress\" set reminder_token='qt2$RANDOM' where id=(select question_progress_id from \"Question\" where id='$QID2')" >/dev/null
DB "update \"Question\" set reminder_email_id=(select id from \"ReminderEmail\" where token='$TOK') where id in ('$QID','$QID2')" >/dev/null
ok "Frage aus Mail beantworten: 200" "$(code -X PUT "$B/api/answer/$QID?token=$QT&tokenType=question" -H 'content-type: application/json' -d '{"remembered":true}')"
P=$(DB "select research_pseudonym from \"User\" where id='$UID_'")
ok "Eintrag unter Pseudonym (erwartet 1)" "$(DB "select count(*) from \"QuestionLog\" where pseudonym='$P'")"
ok "Eintrag ohne Konto-/Frage-Id (Spalten fehlen)" "$(DB "select count(*) from information_schema.columns where table_name='QuestionLog' and column_name in ('user_id','question_id')")"

echo "Löschfrist und Nein"
DB "update \"QuestionLog\" set created_at=now()-interval '13 months' where pseudonym='$P'" >/dev/null
sleep 65
ok "Einträge älter als ein Jahr gelöscht (erwartet 0)" "$(DB "select count(*) from \"QuestionLog\" where pseudonym='$P'")"
DB "update \"User\" set research_decided_at=null where id='$UID_'" >/dev/null
DB "insert into \"QuestionLog\"(id,pseudonym,question_hash,page_name,question_state,question_type,remembered,consent_version) values (gen_random_uuid(),'$P','x','Forschungsseite','INITIAL','REMINDER',true,'v0')" >/dev/null
OFFER2=$(curl -s "$B/api/research/offer?kind=reminder&token=$TOK" | python3 -c 'import sys,json; print(json.load(sys.stdin)["offer"])')
ok "Nein: 200" "$(code -X POST $B/api/research/decision -H 'content-type: application/json' -d "{\"offer\":\"$OFFER2\",\"consent\":false}")"
ok "Nein löscht Einträge und trennt Pseudonym (0|t)" "$(DB "select (select count(*) from \"QuestionLog\" where pseudonym='$P')||'|'||(research_pseudonym is null)::text from \"User\" where id='$UID_'")"
