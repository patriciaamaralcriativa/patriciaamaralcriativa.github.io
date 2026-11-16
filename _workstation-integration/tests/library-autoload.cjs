'use strict';
// Integration of the real host and viewer scripts. Storage, decoder and DOM are simulated.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'../..'),flush=async()=>{for(let i=0;i<70;i++)await Promise.resolve()};
async function scenario(source,ackInitially,delayManifest=false,failDownload=false){
 const elements={},events={},observers=new Map();let paints=0,downloads=0;
 function element(tag='div'){
  let disabled=false;const e={tag,value:100,checked:false,children:[],dataset:{},attrs:{},style:{setProperty(){}},listeners:{},append(...c){this.children.push(...c)},prepend(...c){this.children.unshift(...c)},before(n){this.beforeNode=n},setAttribute(k,v){this.attrs[k]=v},addEventListener(n,f){(this.listeners[n]??=[]).push(f)},dispatchEvent(e){for(const f of this.listeners[e.type]||[])f({target:this,...e});return true},getContext(){return {createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},putImageData(image){assert.ok(image.data.some(v=>v>0));paints++}}}};
  Object.defineProperty(e,'id',{set(v){elements[v]=e},get(){return Object.keys(elements).find(k=>elements[k]===e)}});Object.defineProperty(e,'disabled',{get:()=>disabled,set(v){disabled=v;for(const o of observers.get(e)||[])queueMicrotask(()=>o.callback())}});return e;
 }
 const get=id=>elements[id]??=element();get('ack').checked=ackInitially;get('realDicom').disabled=true;
 const file=new File([new Uint8Array([1,2])],'synthetic-multiframe.dcm',{type:'application/dicom'});
 let manifestResolve;const manifest=delayManifest?new Promise(r=>manifestResolve=r):Promise.resolve({renderEnabled:true,files:[{sha256:'01'}]});
 class MutationObserver{constructor(callback){this.callback=callback}observe(input){this.input=input;const list=observers.get(input)||[];list.push(this);observers.set(input,list)}disconnect(){if(this.input)observers.set(this.input,(observers.get(this.input)||[]).filter(o=>o!==this))}}
 class Worker{postMessage(m){queueMicrotask(()=>this.onmessage({data:m.type==='open'?{id:m.id,metadata:{frames:29,rows:1,columns:2,slope:1,intercept:0,center:128,width:256,modality:'MG'}}:{id:m.id,index:m.index,pixels:new Uint16Array([m.index,255]),min:m.index,max:255,sha256:'frame-'+m.index}}))}terminate(){}}
 const document={hidden:false,activeElement:null,readyState:'loading',currentScript:{src:'https://example.test/_workstation-integration/file-library-host.js'},head:element(),body:element(),getElementById(id){if(['app','ws-frame'].includes(id))return null;if(id==='ar-library-message')return elements[id]||null;return get(id)},querySelector:()=>element(),createElement:element,addEventListener(n,f){(events[n]??=[]).push(f)}};
 const window={addEventListener(n,f){(events[n]??=[]).push(f)},AmaralFileLibrary:{get:async()=>({modality:'dbt',files:[file]}),asFiles:e=>e.files},AmaralCloudLibrary:{details:async()=>({modalidade:'dbt',files:[{mime:'application/dicom'}]}),download:async()=>{downloads++;if(failDownload)throw Error('download indisponível');return {entry:{modalidade:'dbt'},files:[file]}}}};
 const context={window,document,location:{origin:'https://example.test',pathname:'/dbt-validacao-real.html',search:'?'+(source==='cloud'?'cloudEntry':'libraryEntry')+'=abc-123',href:''},URL,URLSearchParams,MutationObserver,Worker,Blob,File,Event,Uint8Array,Uint16Array,crypto:{subtle:{digest:async()=>new Uint8Array([1]).buffer}},fetch:async()=>({ok:true,json:()=>manifest}),DataTransfer:class{constructor(){this.files=[];this.items={add:f=>this.files.push(f)}}},setTimeout,clearTimeout,console};
 vm.createContext(context);
 for(const f of ['dbt-real-viewer.js','file-library-host.js'])vm.runInContext(fs.readFileSync(path.join(root,'_workstation-integration',f),'utf8'),context);
 for(const fn of events.DOMContentLoaded||[])fn();await flush();
 if(!ackInitially){assert.equal(paints,0,'não carrega sem confirmação');get('ack').checked=true;get('ack').dispatchEvent({type:'change'});await flush()}
 if(delayManifest){assert.equal(paints,0,'aguarda manifesto técnico');manifestResolve({renderEnabled:true,files:[{sha256:'01'}]});await flush()}
 if(failDownload){assert.equal(paints,0);assert.match(get('ar-library-message').textContent,/download indisponível/)}
 else{assert.equal(get('realCounter').textContent,'1 / 29');assert.equal(paints,1,'imagem pintada no canvas');assert.equal(get('realDicom').files.length,1);await window.AmaralDBTValidation.renderFrame(28);assert.equal(get('realCounter').textContent,'29 / 29');assert.equal(paints,2);if(source==='cloud')assert.equal(downloads,1,'não duplica download')}
 assert.equal(get('realViewport').beforeNode,get('ar-library-message'),'mensagem fica junto à imagem');
 console.log('PASS '+source+' ack='+ackInitially+' manifestoTardio='+delayManifest+' falhaDownload='+failDownload);
}
(async()=>{for(const source of ['local','cloud'])for(const ack of [false,true])await scenario(source,ack);await scenario('cloud',true,true);await scenario('cloud',true,false,true);console.log('6 cenários completos de seleção → confirmação → download simulado → renderer → canvas.');})().catch(e=>{console.error(e);process.exitCode=1});
