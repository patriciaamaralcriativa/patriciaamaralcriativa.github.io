/* Extensão isolada: as funções e os leitores existentes continuam responsáveis pela renderização. */
'use strict';
(()=>{
  const origin=location.origin,base=new URL('../',document.currentScript.src),frame=document.getElementById('app')||document.getElementById('ws-frame');
  let dialog,picker,request=null,pendingFrame=null,pendingCloud=null,frameGeneration=0,pendingInputCleanup=null;
  const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  const sheet=make('style');sheet.textContent='.ar-library-button{font:inherit;min-height:44px;padding:8px 12px;margin:6px;border:1px solid #71bacb;border-radius:6px;background:#163c54;color:#fff;cursor:pointer}.ar-library-dialog{width:min(1100px,96vw);height:92vh;padding:8px;border:1px solid #71bacb;background:#081526;color:#fff;max-width:96vw;max-height:96vh}.ar-library-dialog::backdrop{background:#000b}.ar-library-dialog iframe{width:100%;height:calc(100% - 54px);border:0}.ar-library-dialog button{min-height:44px;margin-bottom:6px}.ar-library-message{padding:12px;background:#153c53;color:#fff;border:1px solid #71bacb}';document.head.append(sheet);
  function close(){if(dialog?.open)dialog.close();request=null;picker?.removeAttribute('src');}
  function show(options){
    close();let uid=null;try{uid=JSON.parse(sessionStorage.getItem('patricia-sala-session-v1')||'null')?.user?.id||null;}catch{}request={...options,uid,token:crypto.randomUUID()};
    if(!dialog){dialog=make('dialog');dialog.className='ar-library-dialog';dialog.setAttribute('aria-label','Escolher na Biblioteca de arquivos');const end=make('button','Voltar ao visualizador');end.type='button';end.onclick=close;picker=make('iframe');picker.title='Biblioteca de arquivos';dialog.append(end,picker);dialog.addEventListener('cancel',close);document.body.append(dialog);}
    const u=new URL('biblioteca-arquivos.html',base);u.search=new URLSearchParams({picker:'1',token:request.token,modality:options.modality||'all',accept:options.accept||'all',multi:options.multi?'1':'0'});picker.src=u.href;dialog.showModal();
  }
  function notify(text){
    let p=document.getElementById('ar-library-message');
    if(!p){p=make('p');p.id='ar-library-message';p.className='ar-library-message';p.setAttribute('role','status');
      const viewport=document.getElementById('realViewport');
      const reading=document.querySelector('.pinned-reading');
      if(reading)reading.prepend(p);else if(viewport)viewport.before(p);else (document.querySelector('main')||document.body).prepend(p);
    }
    p.textContent=text;return p;
  }
  function offerSelection(input,load){
    if(!input)throw Error('O campo de carregamento deste leitor não foi encontrado.');
    pendingInputCleanup?.();
    let started=false,observer;
    const p=notify(input.disabled?'Material selecionado. Confirme o aviso ao lado para carregar a imagem.':'Carregando o material selecionado…');
    const retry=make('button','Carregar material selecionado');retry.className='ar-library-button';retry.type='button';p.append(' ',retry);
    const start=async()=>{
      if(started)return;
      if(input.disabled){retry.textContent='Confirme o aviso para carregar';return;}
      started=true;observer?.disconnect();retry.disabled=true;
      try{await load();retry.hidden=true;}catch(error){started=false;const message=notify('Não foi possível carregar a imagem: '+error.message);retry.disabled=false;retry.textContent='Tentar carregar novamente';message.append(' ',retry);}
    };
    retry.onclick=start;
    observer=new MutationObserver(()=>{if(!input.disabled)void start()});observer.observe(input,{attributes:true,attributeFilter:['disabled']});
    pendingInputCleanup=()=>{started=true;observer.disconnect()};
    void start();
  }
  function apply(input,files){
    if(!input||input.disabled)throw Error('Leia e confirme os avisos do leitor antes de usar o arquivo da biblioteca.');
    if(!files?.length||files.some(f=>!(f instanceof Blob)))throw Error('Seleção de arquivos inválida.');
    const dt=new DataTransfer();for(const f of(input.multiple?files:files.slice(0,1)))dt.items.add(new File([f],f.name,{type:f.type}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    notify('Material recebido da biblioteca. Confira a imagem e o resultado do leitor.');
  }
  function deliver(options,files,modality){
    if(options.frame){frame.contentWindow.postMessage({type:'amaral-library-files',target:options.target,files,modality},'*');return;}
    apply(document.getElementById(options.target),files);
  }
  window.addEventListener('message',e=>{
    if(frame&&e.source===frame.contentWindow&&e.origin==='null'){
      if(e.data?.type==='amaral-library-open'&&['file','dicomSeriesFiles'].includes(e.data.target))show({frame:true,target:e.data.target,modality:e.data.target==='file'?'rx':'ct',accept:e.data.target==='file'?'images':'dicom',multi:e.data.target!=='file'});
      if(e.data?.type==='amaral-library-ready'&&pendingCloud){const p=pendingCloud;pendingCloud=null;loadCloudFrame(p).catch(err=>notify(err.message));}
      if(e.data?.type==='amaral-library-ready'&&pendingFrame){const p=pendingFrame;pendingFrame=null;deliver(p,p.files,p.modality);}
      return;
    }
    if(request&&e.source===picker?.contentWindow&&e.origin===origin&&e.data?.type==='amaral-library-auth-changed'){
      if(e.data.uid!==request.uid){close();location.reload();}return;
    }
    if(request&&e.source===picker?.contentWindow&&e.origin===origin&&e.data?.type==='amaral-library-open-module'&&e.data.token===request.token){
      const {modality,dicom,entryId,entrySource,index}=e.data;
      if(!['rx','ct','mg','dbt'].includes(modality)||!['local','cloud'].includes(entrySource)||typeof entryId!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(entryId)||!Number.isInteger(index)||index<0||typeof dicom!=='boolean')return;
      if(modality==='ct'&&!dicom){notify('O leitor de tomografia exige uma série DICOM.');return;}
      const page=modality==='mg'?'mamografia-digital-preview.html':modality==='dbt'?(dicom?'dbt-validacao-real.html':'tomossintese-mamaria-preview.html'):(entrySource==='cloud'?'sala-de-aulas.html':'amaral-rad.html');
      const sameReader=frame&&['rx','ct'].includes(modality)||!frame&&location.pathname.endsWith(page);
      const target=modality==='rx'?'file':modality==='ct'?'dicomSeriesFiles':modality==='mg'?(dicom?'dicomFile':['left','right'].includes(request.target)?request.target:'left'):dicom?'realDicom':'files';
      const options={frame:!!frame,target},input=!frame&&document.getElementById(target);
      if(sameReader&&(frame||input)){
        close();
        const load=()=>receiveSelection({entryId,entrySource,index,modality,dicom,options});
        if(frame)load().catch(err=>notify(err.message));else offerSelection(input,load);
        return;
      }
      const url=new URL(page,base);url.searchParams.set(entrySource==='cloud'?'cloudEntry':'libraryEntry',entryId);url.searchParams.set(entrySource==='cloud'?'cloudFile':'libraryFile',index);
      close();location.href=url.href;return;
    }
    if(!request||e.source!==picker?.contentWindow||e.origin!==origin||e.data?.type!=='amaral-library-pick'||e.data.token!==request.token)return;
    const r=request,files=e.data.files,modality=e.data.modality;if(!Array.isArray(files)||!files.length||files.length>1000)return;
    if(!r.frame||!['rx','ct'].includes(modality)){notify('Atualize a biblioteca e escolha o conjunto novamente.');return;}
    const dicom=files.every(f=>f.type==='application/dicom');
    if(modality==='ct'&&!dicom){notify('Formato incompatível com a modalidade selecionada.');return;}
    close();deliver({...r,target:modality==='ct'?'dicomSeriesFiles':'file'},modality==='rx'?files.slice(0,1):files,modality);
  });
  async function receiveSelection({entryId,entrySource,index,modality,dicom,options}){
    notify('Carregando o material selecionado na biblioteca…');
    const generation=frameGeneration,whole=modality==='ct'||modality==='dbt'&&!dicom;
    let files;
    if(entrySource==='cloud'){
      const result=await window.AmaralCloudLibrary.download(entryId,whole?null:index,(n,total)=>notify('Recebendo imagem da biblioteca: '+Math.round(n/total*100)+'%…'));
      if(result.entry.modalidade!==modality)throw Error('A modalidade do conjunto mudou. Escolha novamente.');
      files=result.files;
    }else{
      const entry=await window.AmaralFileLibrary.get(entryId);
      if(!entry||entry.modality!==modality)throw Error('Conjunto não encontrado nesta modalidade.');
      const all=window.AmaralFileLibrary.asFiles(entry);files=whole?all:[all[index]];
    }
    if(generation!==frameGeneration)throw Error('O visualizador mudou. Escolha o conjunto novamente.');
    if(!files.length||files.some(f=>!(f instanceof Blob)||(f.type==='application/dicom')!==dicom))throw Error('Formato incompatível no conjunto.');
    deliver(options,files,modality);
    if(options.frame)notify('Material recebido no visualizador de '+(modality==='ct'?'tomografia':'Raio-X')+'. Confira o resultado do leitor.');
  }
  // Acrescenta um adaptador ao documento da Workstation sem modificar seus scripts.
  function frameExtension(){
    const init=()=>{
      if(document.getElementById('ar-files-tab'))return;
      const nav=document.getElementById('mainNav');if(!nav)return;
      function open(target){parent.postMessage({type:'amaral-library-open',target},'*');}
      function button(text,target,id){const b=document.createElement('button');b.type='button';b.textContent=text;if(id)b.id=id;b.onclick=()=>open(target);b.style.minHeight='44px';return b;}
      nav.append(button('Biblioteca de arquivos','file','ar-files-tab'));
      // O carregador radiográfico original lê apenas PNG/JPEG. Interceptar DICOM
      // antes dele evita apresentar o arquivo como uma imagem raster inválida.
      const rx=document.getElementById('file');
      if(rx){
        rx.accept='image/png,image/jpeg,.dcm,application/dicom';
        const status=document.createElement('p');status.id='ar-rx-status';status.setAttribute('role','status');rx.after(status);
        const focusImage=()=>requestAnimationFrame(()=>{const toggle=document.getElementById('ar-focus-toggle');if(toggle&&toggle.getAttribute('aria-pressed')!=='true')toggle.click();});
        let generation=0;
        rx.addEventListener('change',async event=>{
          const current=++generation,file=rx.files?.[0];
          if(!file)return;
          if(file.type!=='application/dicom'&&!/\.dcm$/i.test(file.name)){status.textContent='';focusImage();return;}
          event.stopImmediatePropagation();status.textContent='Abrindo radiografia DICOM…';
          try{
            if(file.size>150*1024*1024)throw Error('Arquivo maior que 150 MB.');
            const buffer=await file.arrayBuffer();if(current!==generation)return;
            const parser=new DicomParser(),tags=parser.parse(buffer);
            const val=(key,fallback)=>tags[key]?.value??fallback;
            const syntax=String(val('(0002,0010)','')).replace(/\0/g,'').trim();
            if(!['1.2.840.10008.1.2','1.2.840.10008.1.2.1'].includes(syntax))throw Error('DICOM comprimido ou sintaxe não suportada neste leitor.');
            if(!['CR','DX','RF','XA'].includes(String(val('(0008,0060)','')).trim()))throw Error('Este arquivo não é uma radiografia compatível. Escolha o módulo da modalidade.');
            if(Number(val('(0028,0008)',1))!==1||Number(val('(0028,0002)',1))!==1)throw Error('Este leitor requer uma imagem monocromática de quadro único.');
            const bits=Number(val('(0028,0101)',16)),high=Number(val('(0028,0102)',bits-1));
            if(high!==bits-1||bits<1||bits>16)throw Error('Representação de pixels não suportada.');
            const rows=Number(val('(0028,0010)')),cols=Number(val('(0028,0011)')),allocated=Number(val('(0028,0100)')),signed=Number(val('(0028,0103)')),photo=String(val('(0028,0004)','')).trim(),pixel=tags['(7fe0,0010)'];
            if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows*cols>20000000||![8,16].includes(allocated)||bits>allocated||![0,1].includes(signed)||!['MONOCHROME1','MONOCHROME2'].includes(photo))throw Error('Dimensões ou representação monocromática não suportadas.');
            const count=rows*cols,bpp=allocated/8;
            if(!pixel||pixel.length<count*bpp||pixel.offset+count*bpp>buffer.byteLength)throw Error('Dados de pixels incompletos.');
            const slope=Number(val('(0028,1053)',1)),intercept=Number(val('(0028,1052)',0));
            if(!Number.isFinite(slope)||slope===0||!Number.isFinite(intercept))throw Error('Transformação dos pixels inválida.');
            const pixels=new DataView(buffer,pixel.offset,count*bpp),values=new Float32Array(count),mask=2**bits-1,sign=2**(bits-1);let min=Infinity,max=-Infinity;
            for(let i=0;i<count;i++){let value=(allocated===8?pixels.getUint8(i):pixels.getUint16(i*2,true))&mask;if(signed&&value>=sign)value-=2**bits;value=value*slope+intercept;values[i]=value;min=Math.min(min,value);max=Math.max(max,value);}
            let center=Number(String(val('(0028,1050)','')).split('\\')[0]),width=Number(String(val('(0028,1051)','')).split('\\')[0]);
            if(!Number.isFinite(center)||!Number.isFinite(width)||width<1){center=(min+max)/2;width=Math.max(1,max-min);}
            const canvas=document.createElement('canvas');canvas.width=cols;canvas.height=rows;const context=canvas.getContext('2d'),image=context.createImageData(cols,rows);
            for(let i=0;i<count;i++){let gray=width<=1?(values[i]<=center-0.5?0:255):Math.max(0,Math.min(255,Math.round(((values[i]-(center-0.5))/(width-1)+0.5)*255)));if(photo==='MONOCHROME1')gray=255-gray;const p=i*4;image.data[p]=image.data[p+1]=image.data[p+2]=gray;image.data[p+3]=255;}
            context.putImageData(image,0,0);
            if(current!==generation)return;
            abrirImagem(canvas.toDataURL('image/png'));
            focusImage();
            status.textContent='Radiografia DICOM aberta: '+canvas.width+' × '+canvas.height+'. Brilho, contraste, zoom e demais ferramentas disponíveis. Prévia educacional.';
          }catch(error){if(current===generation)status.textContent='Não foi possível abrir a radiografia: '+error.message;}
        },true);
      }
      for(const id of ['file','dicomSeriesFiles']){const input=document.getElementById(id);if(input)input.before(button('Escolher na Biblioteca de arquivos',id));}
      const ct=document.getElementById('tab-tomografia'),base=document.getElementById('dicomLocalCanvas'),mpr=document.getElementById('dicomMprPanel'),volume=document.getElementById('dicom3dCanvas');
      if(ct&&base&&mpr&&volume){
        const root=document.createElement('div'),reading=document.createElement('aside'),view=document.createElement('div'),tabs=document.createElement('div');
        root.className='ar-ct-workspace';reading.className='ar-ct-reading';reading.setAttribute('aria-label','Controles da tomografia — rolagem independente');view.className='ar-ct-image';tabs.className='ar-ct-views';
        const axial=document.createElement('div'),planes=document.createElement('div'),three=document.createElement('div');axial.className=planes.className=three.className='ar-ct-screen';
        const wrap=base.parentElement.querySelector('#tCtOverlay')?base.parentElement:base;
        axial.append(wrap);const placeholder=document.getElementById('dicomLocalPlaceholder');if(placeholder)axial.prepend(placeholder);
        const grid=mpr.querySelector('canvas')?.parentElement?.parentElement?.parentElement;if(grid){grid.classList.add('ar-ct-mpr-grid');planes.append(grid);}
        three.append(volume);
        const screens=[axial,planes,three],buttons=[];
        function select(index){screens.forEach((s,i)=>s.hidden=i!==index);buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}
        ['Corte DICOM','Três planos (MPR)','Volume 3D'].forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>select(i);buttons.push(b);tabs.append(b);});
        for(const child of [...ct.children])if(child.tagName!=='H2')reading.append(child);
        view.append(tabs,...screens);root.append(reading,view);ct.append(root);select(0);
        const focus=()=>requestAnimationFrame(()=>root.scrollIntoView({block:'start'}));
        document.getElementById('dicomMprBuild')?.addEventListener('click',()=>{select(1);focus();},true);
        document.getElementById('dicom3dBuild')?.addEventListener('click',()=>{select(2);focus();},true);
        document.getElementById('dicomSeriesFiles')?.addEventListener('change',()=>{select(0);focus();});
        const css=document.createElement('style');css.textContent=`
          .ar-ct-workspace{display:grid;grid-template-columns:minmax(250px,30%) minmax(0,1fr);gap:14px;height:calc(100dvh - 18px);min-height:280px;position:sticky;top:8px;overflow:hidden}
          .ar-ct-reading{min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;padding-right:8px}
          .ar-ct-image{display:flex;flex-direction:column;min-height:0;min-width:0;background:#05080e;border:1px solid #334c68;border-radius:8px;padding:10px;overflow:hidden}
          .ar-ct-views{display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;margin-bottom:8px}.ar-ct-views [aria-pressed=true]{background:#136b9d}
          .ar-ct-screen{flex:1;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center;overflow:hidden}.ar-ct-screen[hidden]{display:none}
          .ar-ct-screen>div:has(#dicomLocalCanvas){max-width:100%;max-height:100%;display:flex!important;align-items:center;justify-content:center}
          .ar-ct-screen #dicomLocalCanvas{max-width:100%!important;max-height:calc(100dvh - 120px)!important;object-fit:contain;width:auto;height:auto}
          .ar-ct-mpr-grid{width:100%;height:100%;min-height:0!important;align-items:center}.ar-ct-mpr-grid>div{min-width:0;min-height:0}.ar-ct-mpr-grid>div>div{min-height:0!important}.ar-ct-mpr-grid canvas{max-height:calc(100dvh - 180px)!important;object-fit:contain}
          .ar-ct-screen #dicom3dCanvas{width:100%!important;height:100%!important;object-fit:contain}
          @media(max-width:700px){.ar-ct-workspace{grid-template-columns:1fr;grid-template-rows:48% minmax(0,1fr)}.ar-ct-image{grid-row:1}.ar-ct-reading{grid-row:2}.ar-ct-screen #dicomLocalCanvas{max-height:calc(45dvh - 60px)!important}.ar-ct-mpr-grid canvas{max-height:calc(45dvh - 100px)!important}}
        `;document.head.append(css);
      }
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
    Object.defineProperty(frame,'srcdoc',{configurable:true,get(){return descriptor.get.call(this);},set(value){close();frameGeneration++;if(!value)pendingCloud=null;const content=String(value);descriptor.set.call(this,content&&content.includes('dicomSeriesFiles')?content+'<script data-amaral-file-library>('+frameExtension.toString()+')();<\/script>':content);}});
  }
  function setup(){
    document.getElementById('realClear')?.addEventListener('click',()=>{pendingInputCleanup?.();pendingInputCleanup=null;notify('Seleção da biblioteca removida. Escolha um conjunto para abrir outra imagem.');});
    if(!frame){
      const dbt=location.pathname.endsWith('dbt-validacao-real.html'),mg=location.pathname.endsWith('mamografia-digital-preview.html');
      const ids=dbt?['realDicom']:mg?['left','right','dicomFile']:['files','dicomFile'];
      for(const id of ids){const input=document.getElementById(id);if(!input)continue;const b=make('button','Escolher na Biblioteca');b.type='button';b.className='ar-library-button';b.dataset.libraryTarget=id;b.onclick=()=>show({target:id,modality:mg?'mg':'dbt',accept:/dicom/i.test(id)?'dicom':'images',multi:input.multiple});input.before(b);}
    }
    openEntry().catch(e=>notify(e.message));openCloudEntry().catch(e=>notify(e.message));
  }
  async function loadCloudFrame(p){
    const generation=frameGeneration,result=await window.AmaralCloudLibrary.download(p.id,p.modality==='ct'?null:p.index,(n,total)=>notify('Recebendo arquivo da turma: '+Math.round(n/total*100)+'%'));
    if(generation!==frameGeneration)throw Error('A Workstation foi fechada. Selecione o arquivo novamente.');
    if(!['rx','ct'].includes(result.entry.modalidade))throw Error('Modalidade incompatível com este visualizador.');
    deliver({frame:true,target:p.modality==='ct'?'dicomSeriesFiles':'file'},result.files,p.modality);notify('Arquivo da turma recebido. Confira os avisos do leitor.');
  }
  async function openCloudEntry(){
    const q=new URLSearchParams(location.search),id=q.get('cloudEntry');if(!id)return;const index=Number(q.get('cloudFile')||0);
    if(!Number.isInteger(index)||index<0)throw Error('Índice de arquivo inválido.');
    const entry=await window.AmaralCloudLibrary.details(id);if(!entry.files[index])throw Error('Arquivo não encontrado.');const dicom=entry.files[index].mime==='application/dicom';
    if(frame){
      if(!['rx','ct'].includes(entry.modalidade)||(entry.modalidade==='ct'&&!dicom))throw Error('Formato incompatível com este visualizador.');
      pendingCloud={id,index,modality:entry.modalidade};const p=notify('Material da turma selecionado. Abra a Workstation para carregá-lo; as permissões e o estado da aula continuam valendo.');
      const button=document.getElementById('ws-open');if(button){const go=make('button','Abrir Workstation com o arquivo');go.className='ar-library-button';go.onclick=()=>button.click();p.append(' ',go);}
      frame.contentWindow.postMessage({type:'amaral-library-ping'},'*');return;
    }
    const mg=location.pathname.endsWith('mamografia-digital-preview.html'),real=location.pathname.endsWith('dbt-validacao-real.html');
    if((mg&&entry.modalidade!=='mg')||(!mg&&entry.modalidade!=='dbt'))throw Error('Modalidade incompatível com este módulo.');
    const target=real?'realDicom':dicom?'dicomFile':mg?'left':'files',input=document.getElementById(target);
    offerSelection(input,()=>receiveSelection({entryId:id,entrySource:'cloud',index,modality:entry.modalidade,dicom,options:{target}}));
  }
  async function openEntry(){
    const q=new URLSearchParams(location.search),id=q.get('libraryEntry');if(!id)return;
    const entry=await window.AmaralFileLibrary.get(id);if(!entry)throw Error('Este conjunto não está salvo na biblioteca deste navegador. Importe o pacote da professora neste dispositivo.');
    const files=window.AmaralFileLibrary.asFiles(entry),dicom=files[0].type==='application/dicom',index=Number(q.get('libraryFile')||0);
    if(!Number.isInteger(index)||index<0||index>=files.length)throw Error('Arquivo da biblioteca não encontrado.');
    if(frame){
      if(entry.modality!=='rx'&&entry.modality!=='ct')throw Error('Abra este conjunto no módulo de mamografia ou tomossíntese.');
      if(entry.modality==='ct'&&!dicom)throw Error('O formato deste conjunto não é suportado no destino.');
      const p={frame:true,target:entry.modality==='ct'?'dicomSeriesFiles':'file',modality:entry.modality,files:entry.modality==='ct'?files:[files[index]]};
      // A biblioteca pode terminar de ler depois que o iframe já inicializou.
      pendingFrame=p;frame.contentWindow.postMessage({type:'amaral-library-ping'},'*');return;
    }
    const mg=location.pathname.endsWith('mamografia-digital-preview.html'),real=location.pathname.endsWith('dbt-validacao-real.html');
    if((mg&&entry.modality!=='mg')||(!mg&&entry.modality!=='dbt'))throw Error('Modalidade incompatível com este módulo.');
    const target=real?'realDicom':dicom?'dicomFile':mg?'left':'files',input=document.getElementById(target);
    offerSelection(input,()=>receiveSelection({entryId:id,entrySource:'local',index,modality:entry.modality,dicom,options:{target}}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
