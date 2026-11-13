import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {LocalD1} from './d1-adapter.mjs';

test('entrada só com atividade aberta; abertura libera a primeira questão e finalização bloqueia novas entradas',async()=>{
 const origin='http://localhost:8787',env={DB:new LocalD1(),APP_ORIGIN:origin,AUTH_PEPPER:'ficticio-pepper-0000000000000000000000',SETUP_TOKEN:'ficticio-token-00000000000000000000000'};
 async function req(path,data,cookie){const r=await worker.fetch(new Request(origin+'/api/'+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined}),env);return{status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]};}
 const admin=(await req('setup',{token:env.SETUP_TOKEN,name:'Teste Abertura',email:'abertura@example.invalid',password:'Senha-ficticia-local-2026'})).cookie;
 const quiz=(await req('teacher/quizzes',{title:'Teste abertura',questions:[{type:'mc',prompt:'Fictícia: 1+1?',choices:['2','3'],answer:0,points:1}]},admin)).data;
 const room=(await req('teacher/rooms',{title:'Sala permanente'},admin)).data;
 const join=()=>req('join',{code:room.code,name:'Aluno Teste'});
 assert.equal((await join()).status,404);
 const draft=(await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:quiz.id,mode:'self'},admin)).data;
 assert.equal((await join()).status,404);
 assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM participants').get().n,0);
 await req('teacher/sessions/'+draft.id+'/control',{action:'end'},admin);
 const active=(await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:quiz.id,mode:'self',open_now:true},admin)).data;
 const dashboard=(await req('teacher/sessions/'+active.id,undefined,admin)).data;
 assert.equal(dashboard.session.state,'running');assert(dashboard.session.started_at);
 const joined=await join();assert.equal(joined.status,201);
 const state=(await req('student/state',undefined,joined.cookie)).data;
 assert.equal(state.question.id,quiz.questions[0].id);assert.equal(state.session.state,'running');
 assert.equal((await req('student/answers',{question_id:state.question.id,answer:0},joined.cookie)).status,200);
 await req('teacher/sessions/'+active.id+'/control',{action:'pause'},admin);assert.equal((await join()).status,404);
 await req('teacher/sessions/'+active.id+'/control',{action:'resume'},admin);
 await req('teacher/sessions/'+active.id+'/control',{action:'end'},admin);
 assert.equal((await join()).status,404);
 const next=(await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:quiz.id,mode:'self',open_now:true},admin)).data;
 assert.notEqual(next.id,active.id);assert.equal((await join()).status,201);
 assert.equal((await req('teacher/sessions/'+active.id,undefined,admin)).data.participants[0].score,1);
});
