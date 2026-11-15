// In-process UI tests with simulated Auth/API. These complement, not replace, live transport/browser tests.
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=(await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*\n/gm,'');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
let count=0;const check=(ok,label)=>{assert.ok(ok,label);console.log(`PASS ${++count}: ${label}`)};
const q=(id,position)=>({id,position,prompt:'Pergunta de teste '+id,options:['A','B','C','D'],answer_index:0,explanation:'Explicação técnica.',time_limit_seconds:30,points:1000,topic:'',image_url:null});
let library=[{id:'quiz1',title:'Banco um',subject:'Física',questions:[q('q1',1),q('q2',2)]},{id:'quiz2',title:'Banco dois',subject:'Proteção',questions:[q('q3',1)]}];
let current={room_id:'room1',title:'Sala de teste',phase:'lobby',position:0,total:2,team_count:1,answer_count:0,server_now:new Date().toISOString(),question:null,teams:[{id:'t1',team_name:'Dupla isolada',member_one:'Nome privado A',member_two:'Nome privado B',blocked:false}],ranking:[{id:'t1',team_name:'Dupla isolada',score:0,rank:1}]};
const calls=[];let stops=0,watchCallback;
const clone=x=>structuredClone(x);
const fake={db:{auth:{getSession:async()=>({data:{session:{user:{id:'teacher-fixture'}}}}),signOut:async()=>{}}},watch(_room,fn){watchCallback=fn;return{stop(){stops++}}},rpc:async(op,p={})=>{calls.push({op,p:clone(p)});if(op==='identity')return{teacher:true};if(op==='library')return clone(library);if(op==='create_room'){current={...current,phase:'lobby',position:0,total:p.question_ids.length,question:null};return{room_id:'room1',pin:'342123'}}if(op==='state')return clone(current);if(op==='control'){if(p.action==='next'){current.position++;current.phase='question';current.question={...q('q1',current.position)};delete current.question.answer_index;delete current.question.explanation;current.deadline=new Date(Date.now()+30000).toISOString();}if(p.action==='close'){current.phase='result';current.question={...q('q1',current.position)};}if(p.action==='finish'){current.phase='finished';current.answers=[];}return{ok:true}}if(op==='save_quiz'){library.push({...clone(p),id:'newquiz'});return{id:'newquiz'}}if(op==='history')return[{id:'room1',title:'Sala de teste',phase:'finished',current_position:current.position,created_at:new Date().toISOString()}];if(op==='block'){current.teams[0].blocked=p.blocked;return{ok:true}}throw Error('Unexpected operation: '+op);}};
function environment(url,client){const dom=new JSDOM(html,{url,runScripts:'outside-only'});const w=dom.window;w.structuredClone=structuredClone;w.__client=client;w.experience={card:()=>'',mini:()=>'',badge:()=>'',initExperience:()=>{},reactToState:()=>{}};w.eval('var createGameClient=()=>window.__client;var remainingSeconds=(s)=>s?.phase==="question"?10:0;');w.confirm=()=>true;w.setInterval=()=>0;w.clearInterval=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.eval(source);return w;}
const tick=()=>new Promise(r=>setTimeout(r,0));
async function until(fn,label){for(let i=0;i<100;i++){if(fn())return;await tick()}throw Error('Timed out: '+label)}
const w=environment('https://radioquiz.example.invalid/?view=teacher',fake),d=w.document;
await until(()=>d.querySelector('#createRoom'),'teacher preparation');
check(d.querySelector('#createRoom').disabled,'Cannot create a room without selected questions');
const boxes=d.querySelectorAll('[data-question]');for(const idx of[0,2]){boxes[idx].checked=true;boxes[idx].dispatchEvent(new w.Event('change',{bubbles:true}));}
check(d.querySelector('#selectedTitles').textContent==='Banco um + Banco dois','Preparation identifies both selected question banks');
check(d.querySelector('#selectedCount').textContent.startsWith('2 perguntas'),'Selection count includes individual questions from different banks');
d.querySelector('#roomTime').value='45';d.querySelector('#roomPoints').value='500';d.querySelector('#penalty').value='100';d.querySelector('#createRoom').click();
await until(()=>d.querySelector('#nextQuestion'),'room lobby');
const creation=calls.find(x=>x.op==='create_room');check(JSON.stringify(creation.p.question_ids)==='["q1","q3"]'&&creation.p.time_limit_seconds===45&&creation.p.points===500&&creation.p.wrong_penalty===100,'Selected IDs, time, points and penalty are sent correctly');
check(d.querySelector('.pin').textContent==='342123','Server PIN appears in host lobby');
check(d.querySelector('a[target=_blank]').getAttribute('href')==='?view=projector&room=room1','Host opens the matching projector room');
d.querySelector('#nextQuestion').click();await until(()=>d.querySelector('#closeQuestion'),'question');
check(d.querySelectorAll('[data-answer]').length===4&&[...d.querySelectorAll('[data-answer]')].every(b=>b.disabled),'Teacher displays four options without student answer controls');
check(!d.querySelector('.correct'),'Question does not reveal correct option before close');
d.querySelector('#closeQuestion').click();await until(()=>d.querySelector('.correct'),'result');check(d.querySelector('.correct').textContent.includes('A'),'Correct option revealed after teacher closes question');
d.querySelector('[data-block]').click();await until(()=>calls.some(x=>x.op==='block'),'block');await tick();check(calls.find(x=>x.op==='block').p.blocked===true,'Host blocking sends an explicit team and room');
d.querySelector('#finishRoom').click();await until(()=>d.querySelector('#exportResults'),'finish');check(d.querySelector('#restartRoom'),'Finished room offers preserved-source restart');
d.querySelector('#newGame').click();await until(()=>d.querySelector('#libraryTab'),'prepare again');d.querySelector('#libraryTab').click();await until(()=>d.querySelector('#newQuiz'),'library');
check(stops>0,'Leaving a room stops its synchronization watcher');await watchCallback();check(d.querySelector('#newQuiz'),'Stale synchronization cannot replace the library screen');
d.querySelector('#newQuiz').click();await until(()=>d.querySelector('#quizForm'),'editor');
function input(selector,value){const e=d.querySelector(selector);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));}
input('[name=title]','Novo questionário');input('[name=subject]','Radiologia');input('[data-field=prompt]','Enunciado com <img src=x onerror=alert(1)> seguro');for(let i=0;i<4;i++)input(`[data-option="${i}"]`,'Alternativa '+i);input('[data-field=answer_index]','2');input('[data-field=explanation]','Explicação revisada');
d.querySelector('#addQuestion').click();check(d.querySelectorAll('.question-block').length===2&&!calls.some(x=>x.op==='save_quiz'),'Add question does not accidentally submit quiz form');d.querySelector('[data-remove="1"]').click();check(d.querySelectorAll('.question-block').length===1,'Removing a draft question preserves the remaining question');
d.querySelector('#quizForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>d.querySelector('#newQuiz'),'saved library');const saved=calls.find(x=>x.op==='save_quiz');check(saved.p.questions[0].answer_index===2&&saved.p.questions[0].options.length===4,'Editor sends four options, selected key and explanation');
d.querySelector('#prepareTab').click();await until(()=>d.querySelector('#quizSelection'),'prepare edited content');check(!d.querySelector('#quizSelection img')&&d.querySelector('#quizSelection').textContent.includes('<img src=x'),'Question content is rendered as text, not injected markup');
w.close();
const projection=environment('https://radioquiz.example.invalid/?view=projector&room=room1',fake);await until(()=>projection.document.querySelector('.question-title'),'projection');check(!projection.document.body.textContent.includes('Dupla isolada')&&!projection.document.body.textContent.includes('Nome privado A')&&!projection.document.body.textContent.includes('Classificação'),'Projector never renders names or ranking even when extra data is supplied');check(calls.findLast(x=>x.op==='state').p.projection===true,'Projector asks server for projection-only state');projection.close();
let otp;
const guest={db:{auth:{getSession:async()=>({data:{session:null}}),signInWithOtp:async p=>{otp=p;return{data:{},error:null}}}}};
const login=environment('https://radioquiz.example.invalid/?view=teacher',guest);await until(()=>login.document.querySelector('#loginForm'),'login');check(login.document.querySelector('#passwordArea').hidden,'Teacher can request access without a password');login.document.querySelector('[name=email]').value='teacher@example.invalid';login.document.querySelector('#loginForm').dispatchEvent(new login.Event('submit',{bubbles:true,cancelable:true}));await until(()=>otp,'email link request');check(otp.email==='teacher@example.invalid'&&otp.options.emailRedirectTo==='https://radioquiz.example.invalid/?view=teacher','Email link uses only the requested address and exact teacher return URL');await until(()=>!login.document.querySelector('#authMessage').hidden,'email confirmation message');check(!login.document.querySelector('#authMessage').hidden,'UI confirms that user should check the email inbox');login.close();
console.log(`\n${count} simulated UI checks passed. No live teacher credential or mail delivery was tested here.`);
