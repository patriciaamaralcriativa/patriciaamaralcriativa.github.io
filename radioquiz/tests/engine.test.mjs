import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite({extensions:{pgcrypto}});
let passed=0;
const check=(ok,label)=>{assert.ok(ok,label);console.log(`PASS ${++passed}: ${label}`)};
const teacher='10000000-0000-0000-0000-000000000001';
const students=[1,2,3,4].map(n=>`20000000-0000-0000-0000-${String(n).padStart(12,'0')}`);
await db.exec(`create role anon;create role authenticated;create schema auth;create schema extensions;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const file of ['202611140001_radioquiz_schema.sql','202611140002_radioquiz_engine.sql','202611150003_radioquiz_mascots.sql']){
 await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
}
check(true,'All three migrations execute against PostgreSQL (PGlite)');
await db.query('insert into auth.users values($1,$2,now(),false)',[teacher,'teacher@example.invalid']);
await db.query('insert into radioquiz_private.teachers values($1)',['teacher@example.invalid']);
for(const id of students)await db.query('insert into auth.users(id,is_anonymous)values($1,true)',[id]);
async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role authenticated')}
async function api(op,p={}){return (await db.query('select public.radioquiz_api($1,$2::jsonb) data',[op,JSON.stringify(p)])).rows[0].data}
async function denied(fn,label){await assert.rejects(fn);check(true,label)}
await as(teacher);check((await api('identity')).teacher,'Confirmed teacher is authorized');
const questions=[{prompt:'Qual grandeza é medida em gray?',options:['Dose absorvida','Atividade','Frequência','Tempo'],answer_index:0,explanation:'O gray mede dose absorvida.',points:1000,time_limit_seconds:30},
{prompt:'Qual unidade mede atividade radioativa?',options:['Gray','Becquerel','Volt','Metro'],answer_index:1,explanation:'O becquerel representa uma transformação por segundo.',points:1000,time_limit_seconds:30}];
const quiz=await api('save_quiz',{title:'Validação técnica',subject:'Física das Radiações',questions});
let library=await api('library');check(library[0].questions.length===2,'Quiz and four-option questions persist');
const ids=library[0].questions.map(x=>x.id);
const room=await api('create_room',{title:'Teste de integração',question_ids:ids,wrong_penalty:100});
check(/^\d{6}$/.test(room.pin),'Six-digit PIN generated');
await as(students[0]);await denied(()=>api('library'),'Student cannot access the quiz library or answer keys');
await denied(()=>db.query('select * from public.radioquiz_questions'),'Direct question-table reads denied');
await denied(()=>api('join',{pin:'000000',team_name:'Inválida',member_one:'A',member_two:'B'}),'Unknown PIN rejected');
const teams=[];
for(let i=0;i<3;i++){await as(students[i]);teams.push(await api('join',{pin:room.pin,team_name:`Dupla ${i+1}`,member_one:`Aluno ${i*2+1}`,member_two:`Aluno ${i*2+2}`}))}
check(teams.length===3,'Three independent authenticated teams join');
await as(students[0]);await api('set_mascot',{room_id:room.room_id,look:{kind:'cat',color:'pink',accessory:'glasses'}});
check((await api('state',{room_id:room.room_id})).ranking.find(t=>t.id===teams[0].team_id).mascot.color==='pink','A team saves and retrieves its own mascot');
await denied(()=>api('set_mascot',{room_id:room.room_id,look:{kind:'<script>',color:'pink',accessory:'none'}}),'Arbitrary mascot values rejected on server');
await as(teacher);check((await api('state',{room_id:room.room_id})).teams.find(t=>t.id===teams[0].team_id).mascot.kind==='cat','Teacher sees the mascot stored by the team');
await denied(()=>api('set_mascot',{room_id:room.room_id,look:{kind:'cat',color:'pink',accessory:'none'}}),'Teacher cannot impersonate a team to set its mascot');
await as(students[3]);await denied(()=>api('set_mascot',{room_id:room.room_id,look:{kind:'cat',color:'pink',accessory:'none'}}),'Nonmember cannot change a room mascot');
await as(students[3]);await denied(()=>api('join',{pin:room.pin,team_name:'  DUPLA 1 ',member_one:'A',member_two:'B'}),'Case-insensitive duplicate team name rejected');
await denied(()=>api('state',{room_id:room.room_id}),'Known room UUID does not grant a nonmember access');
check((await db.query('select * from public.radioquiz_signals')).rows.length===0,'Nonmembers cannot read Realtime room signals');
await as(students[0]);await denied(()=>api('control',{room_id:room.room_id,action:'next'}),'Student cannot start or control a room');
await as(teacher);await api('control',{room_id:room.room_id,action:'next'});
await as(students[3]);await denied(()=>api('join',{pin:room.pin,team_name:'Nova dupla',member_one:'A',member_two:'B'}),'New entry rejected after competition starts');
for(const id of students.slice(0,3)){await as(id);const s=await api('state',{room_id:room.room_id});check(s.position===1&&s.phase==='question'&&!('answer_index'in s.question),'Synchronized question has no correct answer in student payload')}
await as(students[0]);await denied(()=>api('answer',{room_id:room.room_id,position:0,selected_index:0}),'Stale question submission rejected');
check((await api('answer',{room_id:room.room_id,position:1,selected_index:0})).accepted,'Correct answer accepted');
check(!(await api('answer',{room_id:room.room_id,position:1,selected_index:1})).accepted,'Duplicate answer rejected');
let s=await api('state',{room_id:room.room_id});check(!('is_correct'in s.answer)&&!('awarded_points'in s.answer)&&s.ranking.every(t=>t.score===0),'Answer feedback and points hidden until question closes');
await as(students[1]);check((await api('answer',{room_id:room.room_id,position:1,selected_index:2})).accepted,'Incorrect answer recorded');
await as(students[0]);await denied(()=>db.query('update public.radioquiz_teams set score=999999'),'Client cannot forge score');
await as(teacher);await api('control',{room_id:room.room_id,action:'close'});
s=await api('state',{room_id:room.room_id});check(s.ranking[0].score>=500&&s.ranking.find(x=>x.id===teams[1].team_id).score===-100,'Server scoring includes speed and configured penalty');
const projected=await api('state',{room_id:room.room_id,projection:true});check(!('ranking'in projected)&&!('teams'in projected)&&projected.question.answer_index===0,'Projection contains revealed answer but no ranking or student identities');
await api('control',{room_id:room.room_id,action:'next'});
await as(students[2]);await denied(()=>api('state',{room_id:'10000000-0000-0000-0000-999999999999'}),'Unknown room rejected');
await as(teacher);await api('block',{room_id:room.room_id,team_id:teams[2].team_id,blocked:true});
await as(students[2]);await denied(()=>api('state',{room_id:room.room_id}),'Blocked team denied access');
// Advance database deadline rather than sleeping or trusting a browser clock.
await db.exec('reset role');await db.query("update public.radioquiz_rooms set deadline=clock_timestamp()-interval '1 second' where id=$1",[room.room_id]);
await as(students[0]);check(!(await api('answer',{room_id:room.room_id,position:2,selected_index:1})).accepted,'Late answer rejected using server deadline');
s=await api('state',{room_id:room.room_id});check(s.phase==='result','Expired question automatically transitions to result');
await as(teacher);await api('control',{room_id:room.room_id,action:'next'});
s=await api('state',{room_id:room.room_id});check(s.phase==='finished'&&s.answers.length===2,'Competition finishes with persistent answer history');
check((await api('history')).length===1,'Teacher can retrieve past room');
await denied(()=>api('delete_quiz',{id:quiz.id}),'Used quiz protected to preserve room history');
const edited=await api('save_quiz',{id:quiz.id,title:'Validação revisada',subject:'Física das Radiações',questions:[{...questions[0],prompt:'Pergunta revisada para outra aula'}]});
check(edited.id!==quiz.id,'Editing a used questionnaire creates a new version');
check((await api('state',{room_id:room.room_id})).question.prompt===questions[1].prompt,'Historical room retains original question snapshot after quiz edit');
await as(students[0]);check((await api('state',{room_id:room.room_id})).phase==='finished','Existing session reconnects and retrieves authoritative final state');
await as(students[3]);await denied(()=>api('join',{pin:room.pin,team_name:'Fim',member_one:'A',member_two:'B'}),'Finished room rejects new team');
await denied(()=>db.query('select * from radioquiz_private.teachers'),'Teacher allowlist is inaccessible to students');
await db.exec('reset role');
const rls=await db.query("select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','radioquiz_private') and c.relkind='r' and not c.relrowsecurity");
check(rls.rows.length===0,'Every application table has RLS enabled');
await as('');await denied(()=>api('identity'),'Unauthenticated calls rejected');
console.log(`\n${passed} local PostgreSQL checks passed. Supabase Auth, Realtime, HTTP and physical devices remain untested.`);
await db.close();
