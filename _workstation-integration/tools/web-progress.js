(function(){
'use strict';
let ready=false;
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(_){return fallback;}};
const completed=read('wrp_progress',{});
function saveNotice(text){let el=document.getElementById('workstation-save-status');if(!el){el=document.createElement('p');el.id='workstation-save-status';el.setAttribute('role','status');document.getElementById('tab-biblioteca').prepend(el);}el.textContent=text;}
window.addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='patricia-workstation-save-result')return;if(e.data.ok)saveNotice('Progresso salvo na sua conta.');else{window.__PATRICIA_SYNC_FAILED__=true;saveNotice('Não foi possível salvar. Reabra a Workstation pela sala.');window.__patriciaSetClassState?.({active:false,is_admin:false});}});
const originalShow=mostrarCaso;
mostrarCaso=function(c){originalShow(c);const ci=casosImportados.indexOf(c);document.querySelectorAll('#casoDetalhe li').forEach((li,i)=>{const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.dataset.progressKey=ci+':'+i;box.checked=completed[box.dataset.progressKey]===true;box.onchange=()=>{if(box.checked)completed[box.dataset.progressKey]=true;else delete completed[box.dataset.progressKey];saveNotice('Salvando progresso…');localStorage.setItem('wrp_progress',JSON.stringify(completed));};label.append(box,document.createTextNode(' Concluída'));li.append(label);});};
const originalPatients=atualizarPacientes,originalWL=upwl;
atualizarPacientes=function(){originalPatients();if(ready)localStorage.setItem('wrp_didactic_patients',JSON.stringify(pacientesDidaticos));};
upwl=function(){originalWL();if(ready)localStorage.setItem('wrp_didactic_worklist',JSON.stringify(wl));};
function boot(){pacientesDidaticos=read('wrp_didactic_patients',[]);wl=read('wrp_didactic_worklist',[]);if(!Array.isArray(pacientesDidaticos))pacientesDidaticos=[];if(!Array.isArray(wl))wl=[];atualizarPacientes();upwl();ready=true;
 const pact=document.getElementById('pact'),button=document.createElement('button'),summary=document.createElement('div');button.textContent='Acompanhar progresso';button.type='button';button.onclick=async()=>{try{const rows=await workstationControl('summary');summary.replaceChildren();for(const row of rows){const p=document.createElement('p');p.textContent=(row.nome||'Aluno')+' · '+(row.turma||'')+' · '+row.tarefas_concluidas+'/324 tarefas concluídas';summary.append(p);}if(!rows.length)summary.textContent='Nenhum progresso salvo ainda.';}catch(e){summary.textContent=e.message;}};pact.append(button,summary);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();