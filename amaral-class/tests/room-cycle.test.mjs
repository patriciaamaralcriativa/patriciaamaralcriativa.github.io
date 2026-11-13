import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {LocalD1} from './d1-adapter.mjs';

test('mesma sala recebe sessões de turmas diferentes sem misturar respostas nem perder relatórios',async()=>{
 const origin='http://localhost:8787',env={DB:new LocalD1(),APP_ORIGIN:origin,AUTH_PEPPER:'ficticio-pepper-0000000000000000000000',SETUP_TOKEN:'ficticio-token-00000000000000000000000'};
 async function req(path,data,cookie){const r=await worker.fetch(new Request(origin+'/api/'+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined}),env);const type=r.headers.get('Content-Type');return{status:r.status,data:type.includes('json')?await r.json():await r.text(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]};}
 const admin=(await req('setup',{token:env.SETUP_TOKEN,name:'Teste Ciclo',email:'ciclo@example.invalid',password:'Senha-ficticia-local-2026'})).cookie;
 const q=(await req('teacher/quizzes',{title:'Biblioteca permanente',questions:[{type:'mc',prompt:'Fictícia: 1+1?',choices:['2','3'],answer:0,points:1}]},admin)).data;
 const room=(await req('teacher/rooms',{title:'Sala permanente'},admin)).data;
 const first=(await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:q.id,mode:'self',group_name:'Turma A'},admin)).data;
 assert.equal((await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:q.id,mode:'self'},admin)).status,409);
 assert.equal((await req('join',{code:room.code,name:'Aluno Bloqueado'})).status,404);
 await req('teacher/sessions/'+first.id+'/control',{action:'start'},admin);
 const student=(await req('join',{code:room.code,name:'Aluno Fictício'})).cookie;

 await req('student/answers',{question_id:q.questions[0].id,answer:0},student);
 await req('teacher/sessions/'+first.id+'/control',{action:'end'},admin);
 let rooms=(await req('teacher/rooms',undefined,admin)).data.rooms;
 assert.equal(rooms[0].session_id,null);assert.equal(rooms[0].open,1);assert.equal(rooms[0].code,room.code);
 const second=(await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:q.id,mode:'self',group_name:'Turma B'},admin)).data;
 assert.notEqual(second.id,first.id);
 const dash=(await req('teacher/sessions/'+second.id,undefined,admin)).data;assert.equal(dash.participants.length,0);assert.equal(dash.session.group_name,'Turma B');
 assert.equal((await req('student/state',undefined,student)).data.session.id,first.id);
 const old=(await req('teacher/sessions/'+first.id,undefined,admin)).data;assert.equal(old.participants[0].score,1);assert.equal(old.session.group_name,'Turma A');
 const report=(await req('teacher/sessions/'+first.id+'/report',undefined,admin)).data;assert(report.includes('Turma A'));assert(report.includes('Aluno Fictício'));assert(!report.includes('Turma B'));
 assert.equal((await req('teacher/quizzes/'+q.id,undefined,admin)).data.questions.length,1);
 await req('teacher/sessions/'+second.id+'/control',{action:'end'},admin);await req('teacher/rooms/'+room.id+'/close',{},admin);
 assert.equal((await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:q.id,mode:'self'},admin)).status,409);
 assert.equal((await req('teacher/rooms/'+room.id+'/reopen',{},student)).status,401);
 await req('teacher/rooms/'+room.id+'/reopen',{},admin);rooms=(await req('teacher/rooms',undefined,admin)).data.rooms;assert.equal(rooms[0].code,room.code);assert.equal(rooms[0].open,1);
 assert.equal((await req('teacher/sessions',undefined,admin)).data.sessions.length,2);
});
