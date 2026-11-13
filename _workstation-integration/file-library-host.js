/* Extensão isolada: as funções e os leitores existentes continuam responsáveis pela renderização. */
'use strict';
(()=>{
  const origin=location.origin,base=new URL('../',document.currentScript.src),frame=document.getElementById('app')||document.getElementById('ws-frame');
  let dialog,picker,request=null,pendingFrame=null;
  const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  const sheet=make('style');sheet.textContent='.ar-library-button{font:inherit;min-height:44px;padding:8px 12px;margin:6px;border:1px solid #71bacb;border-radius:6px;background:#163c54;color:#fff;cursor:pointer}.ar-library-dialog{width:min(1100px,96vw);height:92vh;padding:8px;border:1px solid #71bacb;background:#081526;color:#fff;max-width:96vw;max-height:96vh}.ar-library-dialog::backdrop{background:#000b}.ar-library-dialog iframe{width:100%;height:calc(100% - 54px);border:0}.ar-library-dialog button{min-height:44px;margin-bottom:6px}.ar-library-message{padding:12px;background:#153c53;color:#fff;border:1px solid #71bacb}';document.head.append(sheet);
  function close(){if(dialog?.open)dialog.close();request=null;picker?.removeAttribute('src');}
  function show(options){
    close();request={...options,token:crypto.randomUUID()};
    if(!dialog){dialog=make('dialog');dialog.className='ar-library-dialog';dialog.setAttribute('aria-label','Escolher na Biblioteca de arquivos');const end=make('button','Voltar ao visualizador');end.type='button';end.onclick=close;picker=make('iframe');picker.title='Biblioteca de arquivos';dialog.append(end,picker);dialog.addEventListener('cancel',close);document.body.append(dialog);}
    const u=new URL('biblioteca-arquivos.html',base);u.search=new URLSearchParams({picker:'1',token:request.token,modality:options.modality||'all',accept:options.accept||'all',multi:options.multi?'1':'0'});picker.src=u.href;dialog.showModal();
  }
  function notify(text){let p=document.getElementById('ar-library-message');if(!p){p=make('p');p.id='ar-library-message';p.className='ar-library-message';p.setAttribute('role','status');(document.querySelector('main')||document.body).prepend(p);}p.textContent=text;return p;}
  function apply(input,files){
    if(!input||input.disabled)throw Error('Leia e confirme os avisos do leitor antes de usar o arquivo da biblioteca.');
    if(!files?.length||files.some(f=>!(f instanceof Blob)))throw Error('Seleção de arquivos inválida.');
    const dt=new DataTransfer();for(const f of(input.multiple?files:files.slice(0,1)))dt.items.add(new File([f],f.name,{type:f.type}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    notify('Arquivo(s) recebido(s) da biblioteca. Confira o resultado e os avisos do próprio leitor. O arquivamento não comprova validação DICOM.');
  }
  function deliver(options,files,modality){
    if(options.frame){frame.contentWindow.postMessage({type:'amaral-library-files',target:options.target,files,modality},'*');return;}
    try{apply(document.getElementById(options.target),files);}catch(e){notify(e.message);}
  }
  window.addEventListener('message',e=>{
    if(frame&&e.source===frame.contentWindow&&e.origin==='null'){
      if(e.data?.type==='amaral-library-open'&&['file','dicomSeriesFiles'].includes(e.data.target))show({frame:true,target:e.data.target,modality:e.data.target==='file'?'rx':'ct',accept:e.data.target==='file'?'images':'dicom',multi:e.data.target!=='file'});
      if(e.data?.type==='amaral-library-ready'&&pendingFrame){const p=pendingFrame;pendingFrame=null;deliver(p,p.files,p.modality);}
      return;
    }
    if(!request||e.source!==picker?.contentWindow||e.origin!==origin||e.data?.type!=='amaral-library-pick'||e.data.token!==request.token)return;
    const r=request,files=e.data.files,modality=e.data.modality;if(!Array.isArray(files)||!files.length||files.length>1000)return;
    close();deliver(r,files,modality);
  });
  // Acrescenta um adaptador ao documento da Workstation sem modificar seus scripts.
  function frameExtension(){
    const init=()=>{
      if(document.getElementById('ar-files-tab'))return;
      const nav=document.getElementById('mainNav');if(!nav)return;
      function open(target){parent.postMessage({type:'amaral-library-open',target},'*');}
      function button(text,target,id){const b=document.createElement('button');b.type='button';b.textContent=text;if(id)b.id=id;b.onclick=()=>open(target);b.style.minHeight='44px';return b;}
      nav.append(button('Biblioteca de arquivos','file','ar-files-tab'));
      for(const id of ['file','dicomSeriesFiles']){const input=document.getElementById(id);if(input)input.before(button('Escolher na Biblioteca de arquivos',id));}
      window.addEventListener('message',e=>{
        if(e.source===parent&&e.data?.type==='amaral-library-ping'){parent.postMessage({type:'amaral-library-ready'},'*');return;}
        if(e.source!==parent||e.data?.type!=='amaral-library-files'||!['file','dicomSeriesFiles'].includes(e.data.target))return;
        const input=document.getElementById(e.data.target),files=e.data.files;
        if(!input||!Array.isArray(files)||!files.length||files.some(f=>!(f instanceof Blob)))return;
        if(typeof showTab==='function')showTab(e.data.target==='file'?'visualizador':'tomografia');
        const dt=new DataTransfer();for(const f of(input.multiple?files:files.slice(0,1)))dt.items.add(new File([f],f.name,{type:f.type}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
        // O input de Raio-X usa o manipulador onchange já aprovado.
      });
      parent.postMessage({type:'amaral-library-ready'},'*');
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  }
  if(frame){
    const descriptor=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'srcdoc');
    Object.defineProperty(frame,'srcdoc',{configurable:true,get(){return descriptor.get.call(this);},set(value){close();const content=String(value);descriptor.set.call(this,content&&content.includes('dicomSeriesFiles')?content+'<script data-amaral-file-library>('+frameExtension.toString()+')();<\/script>':content);}});
  }
  function setup(){
    if(!frame){
      const dbt=location.pathname.endsWith('dbt-validacao-real.html'),mg=location.pathname.endsWith('mamografia-digital-preview.html');
      const ids=dbt?['realDicom']:mg?['left','right','dicomFile']:['files','dicomFile'];
      for(const id of ids){const input=document.getElementById(id);if(!input)continue;const b=make('button','Escolher na Biblioteca');b.type='button';b.className='ar-library-button';b.dataset.libraryTarget=id;b.onclick=()=>show({target:id,modality:mg?'mg':'dbt',accept:/dicom/i.test(id)?'dicom':'images',multi:input.multiple});input.before(b);}
    }
    openEntry().catch(e=>notify(e.message));
  }
  async function openEntry(){
    const q=new URLSearchParams(location.search),id=q.get('libraryEntry');if(!id)return;
    const entry=await window.AmaralFileLibrary.get(id);if(!entry)throw Error('Este conjunto não está salvo na biblioteca deste navegador. Importe o pacote da professora neste dispositivo.');
    const files=window.AmaralFileLibrary.asFiles(entry),dicom=files[0].type==='application/dicom',index=Number(q.get('libraryFile')||0);
    if(!Number.isInteger(index)||index<0||index>=files.length)throw Error('Arquivo da biblioteca não encontrado.');
    if(frame){
      if(entry.modality!=='rx'&&entry.modality!=='ct')throw Error('Abra este conjunto no módulo de mamografia ou tomossíntese.');
      if((entry.modality==='rx'&&dicom)||(entry.modality==='ct'&&!dicom))throw Error('O formato deste conjunto não é suportado no destino.');
      const p={frame:true,target:entry.modality==='ct'?'dicomSeriesFiles':'file',modality:entry.modality,files:entry.modality==='ct'?files:[files[index]]};
      // A biblioteca pode terminar de ler depois que o iframe já inicializou.
      pendingFrame=p;frame.contentWindow.postMessage({type:'amaral-library-ping'},'*');return;
    }
    const mg=location.pathname.endsWith('mamografia-digital-preview.html'),real=location.pathname.endsWith('dbt-validacao-real.html');
    if((mg&&entry.modality!=='mg')||(!mg&&entry.modality!=='dbt'))throw Error('Modalidade incompatível com este módulo.');
    const target=real?'realDicom':dicom?'dicomFile':mg?'left':'files',input=document.getElementById(target);
    const selected=input?.multiple?files:[files[index]],p=notify('Conjunto encontrado na biblioteca. Leia os avisos e clique em Usar arquivo.');
    const use=make('button','Usar arquivo da biblioteca');use.className='ar-library-button';use.onclick=()=>deliver({target},selected,entry.modality);p.append(' ',use);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
