import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedParticipants,answerCell} from '../public/dashboard-view.mjs';
import worker from '../src/worker.mjs';
import {LocalD1} from './d1-adapter.mjs';

const people=[{id:'a',name:'Zélia',score:2,progress_percent:100,answer_results:[true,false,null],answer_labels:['A','Resposta privada',null]},{id:'b',name:'Ana',score:8,progress_percent:40,answer_results:[false,null,null],answer_labels:['B',null,null]}];
test('ordena nomes, pontuação e conclusão; pseudônimos permanecem ligados ao mesmo aluno',()=>{
 const opts={names:true,order:'name_asc'};
 assert.deepEqual(orderedParticipants(people,opts).map(p=>p.id),['b','a']);
 assert.deepEqual(orderedParticipants(people,{...opts,order:'score_desc'}).map(p=>p.id),['b','a']);
 assert.deepEqual(orderedParticipants(people,{...opts,order:'score_asc'}).map(p=>p.id),['a','b']);
 assert.deepEqual(orderedParticipants(people,{...opts,order:'progress_desc'}).map(p=>p.id),['a','b']);
 assert.deepEqual(orderedParticipants(people,{...opts,order:'progress_asc'}).map(p=>p.id),['b','a']);
 const hidden=orderedParticipants(people,{names:false,order:'score_desc'});assert.equal(hidden[0].name,'Aluno 02');assert.equal(hidden[1].name,'Aluno 01');assert.equal(people[0].name,'Zélia');
});
test('controles de respostas e resultados não revelam texto ou correção ocultos nas células',()=>{
 for(const responses of [true,false])for(const results of [true,false]){
  const cell=answerCell(people[0],1,{responses,results});
  if(!responses)assert(!JSON.stringify(cell).includes('Resposta privada'));
  if(!results){assert.equal(cell.className,'answer-received');assert(!JSON.stringify(cell).includes('Incorreta'));assert(!JSON.stringify(cell).includes('✕'));}
 }
 assert.equal(answerCell(people[0],0,{responses:true,results:true}).text,'✓ A');
 assert.equal(answerCell(people[0],2,{responses:true,results:true}).status,'Não respondida');
});
test('API docente fornece letras, verdadeiro/falso e texto; API de aluno não recebe respostas da turma',async()=>{
 const origin='http://localhost:8787',env={DB:new LocalD1(),APP_ORIGIN:origin,AUTH_PEPPER:'ficticio-pepper-0000000000000000000000',SETUP_TOKEN:'ficticio-token-00000000000000000000000'};
 async function req(path,data,cookie){const r=await worker.fetch(new Request(origin+'/api/'+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined}),env);return{status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]};}
 const admin=(await req('setup',{token:env.SETUP_TOKEN,name:'Teste Projeção',email:'projecao@example.invalid',password:'Senha-ficticia-local-2026'})).cookie;
 const q=(await req('teacher/quizzes',{title:'Teste respostas',questions:[{type:'mc',prompt:'MC fictícia',choices:['Uma','Duas'],answer:1,points:1},{type:'tf',prompt:'VF fictícia',answer:false,points:1},{type:'short',prompt:'Texto fictício',answer:['Zero'],points:1}]},admin)).data;
 const room=(await req('teacher/rooms',{title:'Teste projeção'},admin)).data;
 const session=(await req('teacher/rooms/'+room.id+'/sessions',{quiz_id:q.id,mode:'self',open_now:true},admin)).data;
 const student=(await req('join',{code:room.code,name:'Aluno Fictício'})).cookie;
 for(const [i,answer]of [1,false,'Texto de teste'].entries())assert.equal((await req('student/answers',{question_id:q.questions[i].id,answer},student)).status,200);
 const dash=(await req('teacher/sessions/'+session.id,undefined,admin)).data;
 assert.deepEqual(dash.participants[0].answer_labels,['B','Falso','Texto de teste']);assert.deepEqual(dash.participants[0].answer_results,[true,true,false]);
 const state=(await req('student/state',undefined,student)).data;assert(!JSON.stringify(state).includes('Texto de teste'));assert(!('answer_labels' in state));assert.equal((await req('teacher/sessions/'+session.id,undefined,student)).status,401);
});
