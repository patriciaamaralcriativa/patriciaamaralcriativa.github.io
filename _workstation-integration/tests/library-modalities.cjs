'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root=require('path').resolve(__dirname,'../..');process.chdir(root);const script=fs.readFileSync('_workstation-integration/file-library-host.js','utf8').replace(/\}\)\(\);\s*$/,'window.testRequest=(r,p)=>{request=r;picker=p};})();');
const flush=async()=>{for(let n=0;n<30;n++)await Promise.resolve()};let passed=0;
function node(tag='div'){return {tag,children:[],value:'',dataset:{},style:{},attrs:{},disabled:false,events:{},before(){},append(...c){this.children.push(...c)},prepend(...c){this.children.unshift(...c)},replaceChildren(...c){this.children=c},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.events[k]=f},removeAttribute(){},dispatchEvent(e){this.changed=(this.changed||0)+1},querySelector(selector){return this.children.find(x=>x.className===selector.slice(1))||null}}}
function fixture(modality,dicom,count=1){return {modality,files:Array.from({length:count},(_,i)=>new File([new Uint8Array([i])],String(i)+(dicom?'.dcm':'.png'),{type:dicom?'application/dicom':'image/png'}))}}
async function hostTest(name,{modality,dicom,source='cloud',frame=false,path='/sala-de-aulas.html',target='file',count=1,expectTarget,expectCount,expectPage,disabled=false,reject=false}){
 const data=fixture(modality,dicom,count),elements={},delivered=[],downloads=[];let listener;
 class Iframe{};Object.defineProperty(Iframe.prototype,'srcdoc',{get(){return ''},set(){}});
 const iframe=new Iframe();iframe.contentWindow={postMessage:m=>delivered.push(m)};
 const location={origin:'https://example.test',pathname:path,href:''};const picker={contentWindow:{},removeAttribute(){}};
 const context={MutationObserver:class{observe(){}disconnect(){}},location,URL,URLSearchParams,Blob,File,Event,HTMLIFrameElement:Iframe,DataTransfer:class{constructor(){this.files=[];this.items={add:f=>this.files.push(f)}}},document:{currentScript:{src:'https://example.test/_workstation-integration/file-library-host.js'},getElementById(id){if(id==='app')return frame?iframe:null;if(id==='ws-frame')return null;const e=elements[id]??=node();e.multiple=['files','dicomSeriesFiles'].includes(id);return e},createElement:node,head:node(),body:node(),querySelector:()=>node(),readyState:'loading',addEventListener(){}},window:{addEventListener(n,f){listener=f},AmaralCloudLibrary:{async download(id,index){downloads.push(index);return {entry:{modalidade:modality},files:index===null?data.files:[data.files[index]]}}},AmaralFileLibrary:{async get(){return data},asFiles:e=>e.files}},console};
 vm.runInNewContext(script,context);if(expectTarget)(elements[expectTarget]??=node()).disabled=disabled;
 context.window.testRequest({token:'t',target,frame},picker);
 listener({source:picker.contentWindow,origin:location.origin,data:{type:'amaral-library-open-module',token:'t',modality,dicom,entryId:'abc-123',entrySource:source,index:0}});await flush();
 if(expectPage){assert.ok(location.href.startsWith('https://example.test/'+expectPage+'?'),name+': '+location.href);assert.equal(downloads.length,0)}
 else if(reject){assert.equal(delivered.length,0);assert.equal(downloads.length,0);assert.equal(location.href,'')}
 else if(frame){assert.equal(delivered.length,1,name);assert.equal(delivered[0].target,expectTarget,name);assert.equal(delivered[0].files.length,expectCount,name)}
 else{assert.equal(elements[expectTarget].changed,1,name);assert.equal(elements[expectTarget].files.length,expectCount,name)}
 if(!expectPage&&!reject&&source==='cloud')assert.equal(downloads[0],expectCount>1?null:0,name);
 console.log('PASS '+name);passed++;
}
async function pickerTest(local,modality,dicom,count){
 const elements={},sent=[],id='abc-123',data=fixture(modality,dicom,count),get=id=>elements[id]??=node();
 const localEntry={...data,id,title:'Teste',source:'Sintético',license:'Teste',createdAt:'2026-11-15',files:data.files.map(f=>({name:f.name,type:f.type,blob:f}))};
 const cloudEntry={id,modalidade:modality,titulo:'Teste',origem:'Sintético',licenca:'Teste',publicado:true,quantidade:count,tamanho:count};
 const window={AmaralFileLibrary:{modalities:{rx:'RX',ct:'CT',mg:'MG',dbt:'DBT'},list:async()=>[localEntry],size:()=>count},AmaralCloudLibrary:{context:async()=>({teacher:false}),list:async()=>[cloudEntry],details:async()=>({files:data.files.map(f=>({mime:f.type,nome:f.name}))})}};
 const context={window,document:{getElementById:get,createElement:node,querySelectorAll:()=>[]},location:{origin:'https://example.test',search:'?picker=1&token=t&modality=all&accept=images&multi=0'},URLSearchParams,parent:{postMessage:m=>sent.push(m)},setInterval(){},console};
 vm.runInNewContext(fs.readFileSync('_workstation-integration/file-library-'+(local?'page':'shared-page')+'.js','utf8'),context);await flush();
 const card=get(local?'entries':'cloudEntries').children[0],actions=card.children.find(c=>c.className==='actions');assert.ok(actions,'card '+modality);await actions.children[0].onclick();await flush();
 if(!local&&count>1){const list=card.children.find(c=>c.className==='cloud-file-list');assert.ok(list);list.children[0].children[0].value='0';await list.children[1].onclick();await flush()}
 assert.equal(sent.length,1);assert.equal(sent[0].modality,modality);assert.equal(sent[0].entrySource,local?'local':'cloud');assert.equal(sent[0].type,'amaral-library-open-module');
 console.log('PASS picker '+(local?'local':'cloud')+' '+modality+' '+count+' arquivo(s)');passed++;
}
(async()=>{
 for(const source of ['local','cloud']){
  await hostTest(source+' RX selecionado no campo de TC',{source,modality:'rx',dicom:false,frame:true,target:'dicomSeriesFiles',expectTarget:'file',expectCount:1});
  await hostTest(source+' TC completa selecionada no campo de RX',{source,modality:'ct',dicom:true,frame:true,target:'file',count:20,expectTarget:'dicomSeriesFiles',expectCount:20});
  for(const target of ['left','right'])await hostTest(source+' MG preserva '+target,{source,modality:'mg',dicom:false,path:'/mamografia-digital-preview.html',target,expectTarget:target,expectCount:1});
  await hostTest(source+' MG DICOM vai ao inspetor',{source,modality:'mg',dicom:true,path:'/mamografia-digital-preview.html',target:'right',expectTarget:'dicomFile',expectCount:1});
  await hostTest(source+' DBT PNG recebe toda a pilha',{source,modality:'dbt',dicom:false,path:'/tomossintese-mamaria-preview.html',count:29,expectTarget:'files',expectCount:29});
  await hostTest(source+' DBT DICOM recebe arquivo multiframe',{source,modality:'dbt',dicom:true,path:'/dbt-validacao-real.html',expectTarget:'realDicom',expectCount:1});
  await hostTest(source+' DBT sai de RX para leitor correto',{source,modality:'dbt',dicom:true,frame:true,expectPage:'dbt-validacao-real.html'});
  await hostTest(source+' MG sai de TC para leitor correto',{source,modality:'mg',dicom:false,frame:true,expectPage:'mamografia-digital-preview.html'});
  await hostTest(source+' RX sai de MG para workstation',{source,modality:'rx',dicom:false,path:'/mamografia-digital-preview.html',expectPage:source==='cloud'?'sala-de-aulas.html':'amaral-rad.html'});
  await hostTest(source+' RX DICOM abre no leitor radiográfico',{source,modality:'rx',dicom:true,frame:true,expectTarget:'file',expectCount:1});
  await hostTest(source+' TC PNG incompatível informa limite',{source,modality:'ct',dicom:false,frame:true,reject:true});
 }
 for(const local of [true,false])for(const [modality,dicom,count] of [['rx',false,1],['ct',true,20],['mg',false,1],['mg',true,1],['dbt',false,29],['dbt',true,1]])await pickerTest(local,modality,dicom,count);
 console.log('TOTAL: '+passed+' cenários de integração com arquivos sintéticos e serviços simulados.');
})().catch(e=>{console.error(e);process.exitCode=1});

