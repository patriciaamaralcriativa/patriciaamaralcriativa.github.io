'use strict';
(async()=>{
  const L=window.AmaralFileLibrary,$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const picker=params.get('picker')==='1',token=params.get('token'),accept=params.get('accept')||'all',multi=params.get('multi')==='1';
  let mode=L.modalities[params.get('modality')]?params.get('modality'):'all',entries=[],busy=false;
  const status=t=>{$('status').textContent=t;};
  const bytes=n=>n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
  function node(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  async function task(fn){if(busy)return;busy=true;document.querySelectorAll('form button,#importPackage,#exportAll').forEach(e=>e.disabled=true);try{await fn();}catch(e){status(e.message);}finally{busy=false;document.querySelectorAll('form button,#importPackage,#exportAll').forEach(e=>e.disabled=false);}}
  function compatible(entry){const d=entry.files[0]?.type==='application/dicom';return accept==='all'||(accept==='dicom'?d:!d);}
  function choose(entry,index){
    const f=entry.files[index],dicom=f.type==='application/dicom';
    if(picker){
      if(!compatible(entry))return status('O campo de destino não aceita este formato.');
      parent.postMessage({type:'amaral-library-pick',token,modality:entry.modality,files:multi?L.asFiles(entry):[L.asFiles(entry)[index]]},location.origin);
      return;
    }
    if(entry.modality==='rx'&&dicom)return status('O visualizador de Raio-X atual aceita PNG/JPEG. Este DICOM pode ser arquivado e baixado, mas sua abertura neste módulo está indisponível.');
    if(entry.modality==='ct'&&!dicom)return status('O módulo de séries de TC recebe DICOM. PNG/JPEG não contém uma série espacial validada; use a importação de imagens do visualizador geral para referências 2D.');
    const route=entry.modality==='mg'?'mamografia-digital-preview.html':entry.modality==='dbt'?(dicom?'dbt-validacao-real.html':'tomossintese-mamaria-preview.html'):'amaral-rad.html';
    location.href=route+'?libraryEntry='+encodeURIComponent(entry.id)+'&libraryFile='+index;
  }
  function render(){
    $('entries').replaceChildren();const q=$('search').value.toLocaleLowerCase('pt-BR');
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(mode===b.dataset.mode)));
    const visible=entries.filter(e=>(mode==='all'||e.modality===mode)&&(!picker||compatible(e))&&[e.title,e.source].join(' ').toLocaleLowerCase('pt-BR').includes(q));
    $('summary').textContent=visible.length+' conjunto(s) nesta seleção · '+entries.length+' no navegador · '+bytes(entries.reduce((n,e)=>n+L.size(e),0));
    if(!visible.length)$('entries').append(node('p','Nenhum arquivo nesta seleção. Guarde seus arquivos ou importe um pacote autorizado da professora.'));
    for(const entry of visible){
      const card=node('article','');card.className='entry';card.append(node('h2',entry.title),node('p',L.modalities[entry.modality]+' · '+entry.files.length+' arquivo(s) · '+bytes(L.size(entry))),node('p','Origem: '+entry.source),node('p','Permissão de uso: '+entry.license));
      const label=node('label','Arquivo do conjunto'),select=node('select','');select.setAttribute('aria-label','Arquivo de '+entry.title);
      entry.files.forEach((f,i)=>{const o=node('option',(i+1)+'. '+f.name);o.value=i;select.append(o);});label.append(select);card.append(label);
      const actions=node('div','');actions.className='actions';
      const open=node('button',picker?(multi?'Usar conjunto':'Usar arquivo selecionado'):'Abrir no visualizador');open.type='button';open.onclick=()=>choose(entry,Number(select.value));actions.append(open);
      if(!picker){
        const save=node('button','Baixar arquivo original');save.onclick=()=>{const f=entry.files[Number(select.value)];download(f.blob,f.name);};
        const pack=node('button','Exportar conjunto');pack.onclick=()=>task(async()=>{if(!confirm('Este pacote contém os arquivos originais. Confirma que a privacidade e a permissão de compartilhamento foram revisadas?'))return;download(await L.exportPackage([entry]),'amaral-rad-conjunto.arlib');status('Pacote gerado. Guarde uma cópia em local seguro.');});
        const del=node('button','Remover deste navegador');del.onclick=()=>task(async()=>{if(!confirm('Remover este conjunto apenas da biblioteca deste navegador? A cópia original não será alterada.'))return;await L.remove(entry.id);await refresh();status('Conjunto removido deste navegador.');});actions.append(save,pack,del);
      }
      card.append(actions);$('entries').append(card);
    }
  }
  async function refresh(){entries=await L.list();entries.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));render();}
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render();});$('search').oninput=render;
  $('addForm').onsubmit=e=>{e.preventDefault();task(async()=>{status('Conferindo e guardando arquivos…');const entry=await L.add({title:$('title').value,modality:$('modality').value,source:$('source').value,license:$('license').value,reviewed:$('reviewed').checked},Array.from($('files').files));$('addForm').reset();mode=entry.modality;await refresh();status('Conjunto salvo neste navegador. Exporte uma cópia: limpar os dados do site remove o acervo local.');});};
  $('exportAll').onclick=()=>task(async()=>{if(!confirm('Compartilhe apenas arquivos autorizados e sem identificação. Confirma que revisou todos os conjuntos?'))return;download(await L.exportPackage(entries),'amaral-rad-biblioteca.arlib');status('Pacote gerado. O download contém os arquivos originais.');});
  $('importPackage').onclick=()=>task(async()=>{const f=$('packageFile').files[0];if(!f)throw Error('Selecione um pacote .arlib.');status('Conferindo pacote…');const n=await L.importPackage(f,$('packageReview').checked);await refresh();$('packageFile').value='';$('packageReview').checked=false;status(n+' conjunto(s) importado(s). Os conjuntos anteriores foram preservados.');});
  if(picker){$('back').hidden=true;$('pickerNote').hidden=false;$('pickerNote').textContent='Escolha um arquivo compatível com o campo de importação aberto. A seleção não remove nem modifica os originais.';}
  if(L.modalities[mode])$('modality').value=mode;
  try{await refresh();}catch(e){status(e.message+' Em navegação privativa, o armazenamento pode estar indisponível ou ser apagado ao fechar.');}
})();
