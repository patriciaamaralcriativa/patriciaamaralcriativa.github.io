// Transport integration test. Uses disposable anonymous Auth identities, never personal credentials.
// One fixture must be explicitly provisioned as teacher by an administrator, then removed after testing.
import {createGameClient} from '../game-client.js';
import assert from 'node:assert/strict';
import {createInterface} from 'node:readline';
const clients=[];
for(let i=0;i<4;i++){const c=createGameClient('live-test-'+i,{auth:{persistSession:false,autoRefreshToken:false}});const who=await c.ensurePlayer();clients.push({c,id:who.user_id});}
console.log(JSON.stringify({fixture_ids:clients.map(x=>x.id),waiting:'Provision first identity as temporary teacher, then send go'}));
const rl=createInterface({input:process.stdin,output:process.stdout,terminal:false});
const lines=rl[Symbol.asyncIterator]();await lines.next();
const host=clients[0].c, players=clients.slice(1).map(x=>x.c);
let passes=0;function check(value,label){assert.ok(value,label);console.log(`PASS ${++passes}: ${label}`)}
check((await host.rpc('identity')).teacher,'Real HTTP API recognizes provisioned fixture');
const questions=[{prompt:'Qual unidade expressa a dose absorvida?',options:['Gray (Gy)','Becquerel (Bq)','Hertz (Hz)','Segundo (s)'],answer_index:0,explanation:'O gray (Gy) corresponde a um joule por quilograma e expressa dose absorvida.',points:1000,time_limit_seconds:30},
{prompt:'A atividade de um radionuclídeo é expressa em qual unidade do SI?',options:['Volt (V)','Becquerel (Bq)','Gray (Gy)','Metro (m)'],answer_index:1,explanation:'Um becquerel equivale a uma transformação nuclear por segundo.',points:1000,time_limit_seconds:10},
{prompt:'Qual é o objetivo principal da colimação do feixe de raios X?',options:['Aumentar a área irradiada','Substituir o receptor de imagem','Limitar o campo ao necessário','Alterar o número atômico do paciente'],answer_index:2,explanation:'A colimação limita o campo à região necessária para o exame.',points:1000,time_limit_seconds:30}];
const saved=await host.rpc('save_quiz',{title:'Validação técnica temporária',subject:'Física das Radiações',questions});
const lib=await host.rpc('library');const quiz=lib.find(x=>x.id===saved.id);
check(quiz.questions.length===3,'Real HTTP quiz CRUD');
const setup={title:'Verificação simultânea — temporária',question_ids:quiz.questions.map(x=>x.id),wrong_penalty:100};
const room=await host.rpc('create_room',setup);check(/^\d{6}$/.test(room.pin),'Real PIN generation');
const rid=room.room_id;
for(let i=0;i<3;i++)await players[i].rpc('join',{pin:room.pin,team_name:'Dupla Teste '+(i+1),member_one:'Participante A',member_two:'Participante B'});
let s=await host.rpc('state',{room_id:rid});check(s.team_count===3,'Three distinct real Auth sessions join room');
const invalid=await players[0].rpc('join',{pin:'000000',team_name:'Inválida',member_one:'A',member_two:'B'}).then(()=>false,()=>true);check(invalid,'Invalid PIN rejected over HTTP');
let signals=0;
const channel=players[0].db.channel('radioquiz-live-test').on('postgres_changes',{event:'*',schema:'public',table:'radioquiz_signals',filter:`room_id=eq.${rid}`},()=>{signals++});
await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Realtime subscribe timed out')),15000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timeout);resolve();}else if(status==='CHANNEL_ERROR'){clearTimeout(timeout);reject(new Error('Realtime subscription failed'));}})});
await host.rpc('control',{room_id:rid,action:'next'});
const states=await Promise.all(players.map(p=>p.rpc('state',{room_id:rid})));
check(states.every(x=>x.phase==='question'&&x.position===1&&!('answer_index'in x.question)),'Same sanitized question delivered to three sessions');
const answered=await Promise.all(players.map((p,i)=>p.rpc('answer',{room_id:rid,position:1,selected_index:i})));
check(answered.every(x=>x.accepted),'Simultaneous answers accepted once per team');
const duplicates=await Promise.all([0,1,2].map(()=>players[0].rpc('answer',{room_id:rid,position:1,selected_index:0})));
check(duplicates.every(x=>!x.accepted),'Concurrent duplicate requests rejected');
s=await players[0].rpc('state',{room_id:rid});check(s.ranking.every(x=>x.score===0)&&!('awarded_points'in s.answer),'Scores and feedback withheld until reveal');
await host.rpc('control',{room_id:rid,action:'close'});
s=await host.rpc('state',{room_id:rid});check(s.answer_count===3&&s.ranking[0].score>=500&&s.ranking[1].score===-100,'Real server scoring and penalty');
const projection=await host.rpc('state',{room_id:rid,projection:true});check(!('ranking'in projection)&&!('teams'in projection),'Projection payload contains no ranking');
await new Promise(r=>setTimeout(r,400));check(signals>0,'Realtime WebSocket delivered server change');
await players[0].db.removeChannel(channel);
const {data:{session}}=await players[0].db.auth.getSession();
const reconnected=createGameClient('live-reconnect',{auth:{persistSession:false,autoRefreshToken:false}});
const result=await reconnected.db.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});if(result.error)throw result.error;
check((await reconnected.rpc('state',{room_id:rid})).answer!==null,'Fresh client resumes same session and stored answer');
await host.rpc('control',{room_id:rid,action:'next'});
console.log(JSON.stringify({waiting:'Deadline test: send expire after administrator moves this room deadline into the past',room_id:rid}));await lines.next();
check(!(await players[2].rpc('answer',{room_id:rid,position:2,selected_index:1})).accepted,'Late answer rejected over HTTP');
check((await players[1].rpc('state',{room_id:rid})).phase==='result','Timeout reconciles on server');
await host.rpc('control',{room_id:rid,action:'finish'});
check((await host.rpc('state',{room_id:rid})).answers.length===3,'Finished history retains all three answers');
// Open a separate lobby for manual browser UI checks. It remains disposable.
const uiroom=await host.rpc('create_room',{...setup,title:'Conferência da interface — temporária'});
console.log(JSON.stringify({http_checks_passed:passes,ui_room:uiroom,waiting:'Commands: start, close, next, finish, state, done'}));
for await(const command of lines){const cmd=command.trim();if(cmd==='done')break;if(['start','close','next','finish'].includes(cmd)){await host.rpc('control',{room_id:uiroom.room_id,action:cmd==='start'?'next':cmd});console.log('CONTROL '+cmd);}if(cmd==='state')console.log(JSON.stringify(await host.rpc('state',{room_id:uiroom.room_id})));}
rl.close();for(const {c}of clients)await c.db.removeAllChannels();await reconnected.db.removeAllChannels();console.log('Fixture process completed. Administrator must remove the listed temporary identities and their game records.');
