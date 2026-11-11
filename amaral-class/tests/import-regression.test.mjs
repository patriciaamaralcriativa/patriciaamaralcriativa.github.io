import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import worker from '../src/worker.mjs';
import {LocalD1} from './d1-adapter.mjs';
import {importQuestions} from '../src/validation.mjs';
const content=readFileSync(new URL('fixtures/densitometria-50.csv',import.meta.url),'utf8');
test('50 questões: validação sem escrita, persistência SQLite e consulta da professora',async()=>{
 const origin='http://localhost:8787',DB=new LocalD1(),env={DB,APP_ORIGIN:origin,AUTH_PEPPER:'test-pepper-00000000000000000000000000',SETUP_TOKEN:'test-setup-000000000000000000000000000',ASSETS:{fetch:()=>new Response('test')}};
 let cookie='';async function request(path,data){const r=await worker.fetch(new Request(origin+'/api/'+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]};}
 cookie=(await request('setup',{token:env.SETUP_TOKEN,email:'csv@example.invalid',name:'Teste CSV',password:'senha-ficticia-comprida-2026'})).cookie;
 const sample=importQuestions({format:'csv',content});assert.equal(sample.length,50);assert(sample.every(q=>['facil','media','dificil'].includes(q.difficulty)));
 const old=await request('teacher/quizzes',{title:'Preservar',questions:[sample[0]]});const before=DB.sqlite.prepare('SELECT * FROM quizzes WHERE id=?').get(old.data.id);
 const v=await request('teacher/import',{format:'csv',content,validate_only:true});assert.equal(v.status,200);assert.equal(v.data.count,50);assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM quizzes').get().n,1);
 const saved=await request('teacher/import',{format:'csv',content,title:'Densitometria Óssea — 50 questões',subject:'Densitometria Óssea'});assert.equal(saved.status,201);assert.equal(saved.data.questions.length,50);
 const fetched=await request('teacher/quizzes/'+saved.data.id);assert.equal(fetched.data.questions.length,50);assert.deepEqual(fetched.data.questions.map(q=>q.answer),sample.map(q=>q.answer));
 assert((await request('teacher/quizzes')).data.quizzes.some(q=>q.id===saved.data.id&&q.question_count===50));assert.deepEqual(DB.sqlite.prepare('SELECT * FROM quizzes WHERE id=?').get(old.data.id),before);
 assert.equal(importQuestions({format:'json',content:JSON.stringify(sample)}).length,50);
 assert.throws(()=>importQuestions({format:'csv',content:content.replace('facil','impossivel')}),/Linha 2/);
});
function formHarness(post){
 const nodes=[];function E(tag,attrs={},...children){const n={tag,attrs,children:children.flat(),disabled:false,textContent:'',setAttribute(){},classList:{toggle(){}},reportValidity(){return true;}};nodes.push(n);return n;}
 let refreshFails=false;const context={E,B:(label,fn)=>E('button',{onclick:fn},label),P:(s)=>Object.assign(E('p'),{textContent:s}),field:(...args)=>E('input',{name:args[1]}),vals:()=>({title:'Teste',subject:'Densitometria'}),post,openModal(){},modal:{close(){}},tell(){},teacherShell:async()=>{if(refreshFails)throw Error('lista indisponível');}};
 const code=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');vm.runInNewContext(code.slice(code.indexOf('function importForm()'),code.indexOf('\nfunction ',code.indexOf('function importForm()')+1))+'\nimportForm();',context);
 return {nodes,refreshFailure(){refreshFails=true;},file:nodes.find(n=>n.attrs.type==='file'),validate:nodes.find(n=>n.children.includes('Validar arquivo')),save:nodes.find(n=>n.children.includes('Importar e salvar')),form:nodes.find(n=>n.tag==='form'),status:nodes.find(n=>n.tag==='p')};
}
test('janela: erro visível, validação, cliques simultâneos e falha da atualização após salvar',async()=>{
 let release,calls=0;const h=formHarness(async(_path,data)=>{calls++;if(data.validate_only)return {valid:true,count:50};return new Promise(r=>release=()=>r({id:'saved',questions:Array(50).fill({})}));});
 assert(h.save.disabled);await h.file.attrs.onchange({target:{files:[{size:10,name:'teste.csv',text:async()=>content}]}});await h.validate.attrs.onclick();assert.match(h.status.textContent,/50 questões válidas/);assert(!h.save.disabled);
 h.refreshFailure();const pending=h.form.attrs.onsubmit({preventDefault(){}});await h.form.attrs.onsubmit({preventDefault(){}});assert.equal(calls,2);assert(h.save.disabled);release();await pending;assert.match(h.status.textContent,/foi salvo/);await h.form.attrs.onsubmit({preventDefault(){}});assert.equal(calls,2);
 const bad=formHarness(async()=>{throw Error('Linha 17: dificuldade inválida.');});await bad.file.attrs.onchange({target:{files:[{size:10,name:'teste.csv',text:async()=>content}]}});await bad.validate.attrs.onclick();assert.match(bad.status.textContent,/Linha 17/);assert(bad.save.disabled);
});
