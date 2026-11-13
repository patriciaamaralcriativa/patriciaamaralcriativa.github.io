'use strict';
(async()=>{
 const C=window.AmaralCloudLibrary,L=window.AmaralFileLibrary,$=id=>document.getElementById(id),q=new URLSearchParams(location.search);
 const picker=q.get('picker')==='1',accept=q.get('accept')||'all',multi=q.get('multi')==='1';let mode=L.modalities[q.get('modality')]?q.get('modality'):'all',rows=[],who=null,busy=false;
 const note=t=>{$('cloudStatus').textContent=t;},node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 const size=n=>(n/1048576).toFixed(1)+' MB';
 async function run(fn){if(busy)return;busy=true;$('cloudUploadButton').disabled=true;try{await fn();}catch(e){note(e.message);}finally{busy=false;$('cloudUploadButton').disabled=false;}}
 async function refresh(quiet=false){try{who=await C.context();$('cloudLogin').hidden=!!who;$('cloudTeacher').hidden=!who?.teacher;$('cloudLogout').hidden=!who;$('cloudRefresh').hidden=!who;rows=who?await C.list():[];render();if(!quiet)note(!who?'Entre com o mesmo acesso da sala de aulas para consultar os arquivos liberados.':who.teacher?'Acesso da professora. Envie arquivos revisados e libere os conjuntos para a turma.':'Aqui estão os materiais liberados pela professora.');if(who)$('back').href='sala-de-aulas.html';}catch(e){rows=[];who=null;render();$('cloudTeacher').hidden=true;$('cloudLogin').hidden=false;note(e.message);}}
 function render(){
  $('cloudEntries').replaceChildren();const search=$('search').value.toLocaleLowerCase('pt-BR');const filtered=rows.filter(b=>(mode==='all'||b.modalidade===mode)&&[b.titulo,b.origem].join(' ').toLocaleLowerCase('pt-BR').includes(search));
  $('cloudCount').textContent=who?filtered.length+' conjunto(s) da turma nesta seleção':'';
  if(who&&!filtered.length)$('cloudEntries').append(node('p','Nenhum material liberado nesta seleção.'+(who.teacher?' Use Enviar arquivos para adicionar o primeiro conjunto.':'')));
  for(const b of filtered){const card=node('article','');card.className='entry cloud-entry';card.dataset.id=b.id;
   card.append(node('h3',b.titulo),node('p',L.modalities[b.modalidade]+' · '+b.quantidade+' arquivo(s) · '+size(b.tamanho)),node('p',b.publicado?'Liberado para a turma':'Rascunho — oculto aos alunos'),node('p','Origem: '+b.origem),node('p','Permissão: '+b.licenca));
   const actions=node('div','');actions.className='actions';const open=node('button',picker?'Escolher este conjunto':'Escolher arquivo / abrir');open.type='button';open.onclick=()=>run(async()=>{const d=await C.details(b.id),dicom=d.files[0]?.mime==='application/dicom';if(picker&&((accept==='dicom'&&!dicom)||(accept==='images'&&dicom)))throw Error('Este formato não é aceito pelo campo de importação atual.');
    let fileList=card.querySelector('.cloud-file-list');if(fileList){fileList.remove();return;}
    fileList=node('div','');fileList.className='cloud-file-list';const label=node('label','Arquivo do conjunto'),select=node('select','');select.setAttribute('aria-label','Arquivo de '+b.titulo);d.files.forEach((f,i)=>{const o=node('option',(i+1)+'. '+f.nome);o.value=i;select.append(o);});label.append(select);fileList.append(label);
    const use=node('button',picker?(multi?'Usar conjunto':'Usar arquivo selecionado'):'Abrir no visualizador');use.onclick=()=>run(async()=>{
      const index=Number(select.value);
      if(picker){const result=await C.download(b.id,multi?null:index,(n,total)=>note('Recebendo arquivo da turma: '+Math.round(n/total*100)+'%'));parent.postMessage({type:'amaral-library-pick',token:q.get('token'),modality:b.modalidade,files:result.files},location.origin);return;}
      if(b.modalidade==='rx'&&dicom)throw Error('O leitor de Raio-X atual aceita PNG/JPEG. Este DICOM não é renderizado nesse módulo.');
      if(b.modalidade==='ct'&&!dicom)throw Error('O leitor de séries de TC exige DICOM; PNG/JPEG não comprova geometria de volume.');
      const route=b.modalidade==='mg'?'mamografia-digital-preview.html':b.modalidade==='dbt'?(dicom?'dbt-validacao-real.html':'tomossintese-mamaria-preview.html'):'sala-de-aulas.html';location.href=route+'?cloudEntry='+encodeURIComponent(b.id)+'&cloudFile='+index;
    });fileList.append(use);card.append(fileList);
   });actions.append(open);
   if(who?.teacher){const toggle=node('button',b.publicado?'Recolher da turma':'Liberar para a turma');toggle.onclick=()=>run(async()=>{if(!b.publicado&&!confirm('Confirma a revisão de privacidade e a permissão para disponibilizar este material aos alunos autorizados?'))return;await C.publish(b.id,!b.publicado);await refresh(true);note(b.publicado?'Conjunto recolhido: novos acessos dos alunos estão bloqueados. Cópias já recebidas não podem ser recolhidas à distância.':'Conjunto liberado. Os alunos autorizados já podem escolhê-lo na biblioteca.');});actions.append(toggle);
    if(!b.publicado){const del=node('button','Remover rascunho');del.onclick=()=>run(async()=>{if(!confirm('Remover este rascunho e seus arquivos do acervo da turma? Os arquivos originais do seu computador serão preservados.'))return;await C.remove(b.id);await refresh(true);note('Rascunho removido do acervo compartilhado.');});actions.append(del);}
   }
   card.append(actions);$('cloudEntries').append(card);
  }
 }
 $('cloudLogin').onsubmit=e=>{e.preventDefault();run(async()=>{note('Conferindo seu acesso…');await C.login($('cloudEmail').value.trim(),$('cloudPassword').value);$('cloudPassword').value='';await refresh();});};
 $('cloudLogout').onclick=()=>run(async()=>{await C.logout();await refresh();});$('cloudRefresh').onclick=()=>run(()=>refresh());
 $('cloudUploadForm').onsubmit=e=>{e.preventDefault();run(async()=>{note('Conferindo arquivos…');await C.upload({title:$('cloudTitle').value,modality:$('cloudModality').value,source:$('cloudSource').value,license:$('cloudLicense').value,reviewed:$('cloudReviewed').checked},Array.from($('cloudFiles').files),(n,total)=>note('Enviando ao acervo privado: '+Math.round(n/total*100)+'%'));$('cloudUploadForm').reset();await refresh(true);note('Envio concluído em rascunho. Confira o conjunto e clique em Liberar para a turma.');});};
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();}));$('search').addEventListener('input',render);
 if(L.modalities[mode])$('cloudModality').value=mode;
 await refresh();setInterval(()=>{if(!document.hidden&&!busy&&who)refresh(true);},30000);
})();
