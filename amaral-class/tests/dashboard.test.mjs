import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {LocalD1} from './d1-adapter.mjs';

test('painel separa conclusão e nota, ordena acertos por questão e preserva respostas privadas',async()=>{
 const origin='http://localhost:8787',env={DB:new LocalD1(),APP_ORIGIN:origin,AUTH_PEPPER:'ficticio-pepper-0000000000000000000000',SETUP_TOKEN:'ficticio-token-00000000000000000000000'};
 async function req(path,data,cookie){const r=await worker.fetch(new Request(origin+'/api/'+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined}),env);return{status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]};}
 const admin=(await req('setup',{token:env.SETUP_TOKEN,name:'Teste Painel',email:'painel@example.invalid',password:'Senha-ficticia-local-2026'})).cookie;
 const questions=Array.from({length:5},(_,i)=>({type:'mc',prompt:'Fictícia '+i,choices:['Sim','Não'],answer:0,points:i===0?6:1}));
 const quiz=(await req('teacher/quizzes',{title:'Teste painel',questions},admin)).data;
 const room=(await req('teacher/rooms',{title:'Teste painel'},admin)).data;
 const session=(await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:quiz.id,mode:'self'},admin)).data;
 await req('teacher/sessions/'+session.id+'/control',{action:'start'},admin);
 const a=(await req('join',{code:room.code,name:'Aluno Alfa'})).cookie,b=(await req('join',{code:room.code,name:'Aluno Beta'})).cookie;

 for(let i=0;i<2;i++)assert.equal((await req('student/answers',{question_id:quiz.questions[i].id,answer:i===0?0:1},a)).status,200);
 let dash=(await req('teacher/sessions/'+session.id,undefined,admin)).data;
 let alfa=dash.participants.find(p=>p.name==='Aluno Alfa'),beta=dash.participants.find(p=>p.name==='Aluno Beta');
 assert.equal(alfa.progress_percent,40);assert.equal(alfa.percent,60);assert.equal(alfa.remaining,3);assert.deepEqual(alfa.answer_results,[true,false,null,null,null]);assert.equal(alfa.correct,1);assert.equal(alfa.errors,1);
 assert.equal(beta.progress_percent,0);assert.deepEqual(beta.answer_results,[null,null,null,null,null]);
 for(let i=2;i<5;i++)await req('student/answers',{question_id:quiz.questions[i].id,answer:1},a);
 dash=(await req('teacher/sessions/'+session.id,undefined,admin)).data;alfa=dash.participants.find(p=>p.name==='Aluno Alfa');assert.equal(alfa.progress_percent,100);assert.equal(alfa.remaining,0);assert.equal(alfa.percent,60);assert(alfa.completed_at);
 const state=(await req('student/state',undefined,b)).data;assert(!('participants' in state));assert(!('answer_results' in state));assert(!('answer' in state.question));
 assert.equal((await req('teacher/sessions/'+session.id,undefined,b)).status,401);
});
