/* Biblioteca local independente: não lê perfis, progresso ou bibliotecas privadas. */
'use strict';
window.AmaralFileLibrary = (() => {
  const modalities = Object.freeze({rx:'Raio-X',ct:'Tomografia',mg:'Mamografia',dbt:'Tomossíntese'});
  const MAX = 1024 * 1024 * 1024, FILE_MAX = 300 * 1024 * 1024;
  const magic = new TextEncoder().encode('ARLIB1\n');
  let connection;
  function db() {
    if (!connection) connection = new Promise((resolve,reject) => {
      const r=indexedDB.open('amaral-rad-arquivos-v1',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('entries',{keyPath:'id'});
      r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};
      r.onerror=()=>{connection=null;reject(Error('O navegador não permitiu abrir a biblioteca local.'));};
      r.onblocked=()=>reject(Error('Feche outras abas da biblioteca e tente novamente.'));
    });
    return connection;
  }
  async function transaction(mode,fn) {
    const d=await db();return new Promise((resolve,reject)=>{
      const t=d.transaction('entries',mode);let value;const req=fn(t.objectStore('entries'));
      if(req)req.onsuccess=()=>{value=req.result;};
      t.oncomplete=()=>resolve(value);t.onabort=t.onerror=()=>reject(Error(t.error?.name==='QuotaExceededError'?'Espaço insuficiente no navegador. Exporte um backup antes de remover arquivos.':'Não foi possível salvar ou ler a biblioteca.'));
    });
  }
  const list=()=>transaction('readonly',s=>s.getAll());
  const get=id=>transaction('readonly',s=>s.get(id));
  const remove=id=>transaction('readwrite',s=>s.delete(id));
  function clean(value,max=240){return String(value||'').trim().slice(0,max);}
  function metadata(x) {
    if(!modalities[x.modality])throw Error('Modalidade indisponível. Ressonância ainda não tem módulo.');
    const v={title:clean(x.title,100),modality:x.modality,source:clean(x.source,300),license:clean(x.license,200),reviewed:x.reviewed===true};
    if(!v.title||!v.source||!v.license||!v.reviewed)throw Error('Informe título, origem, permissão de uso e confirme a revisão de privacidade.');
    return v;
  }
  async function format(file) {
    const b=new Uint8Array(await file.slice(0,132).arrayBuffer());
    if(/\.png$/i.test(file.name)&&[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n))return'image/png';
    if(/\.jpe?g$/i.test(file.name)&&b[0]===255&&b[1]===216&&b[2]===255)return'image/jpeg';
    if(/\.dcm$/i.test(file.name)&&String.fromCharCode(...b.slice(128,132))==='DICM')return'application/dicom';
    throw Error('Arquivo sem assinatura PNG, JPEG ou DICOM com preâmbulo suportada: '+clean(file.name,100));
  }
  async function checkedFiles(files) {
    if(!files?.length||files.length>1000)throw Error('Escolha de 1 a 1.000 arquivos por conjunto.');
    let total=0;const result=[];let dicom=null;
    for(const f of files){
      if(!f.size||f.size>FILE_MAX)throw Error('Cada arquivo deve ter entre 1 byte e 300 MB.');
      total+=f.size;if(total>MAX)throw Error('O conjunto excede 1 GB. Divida em conjuntos menores.');
      const type=await format(f),isDicom=type==='application/dicom';
      if(dicom!==null&&dicom!==isDicom)throw Error('Guarde imagens PNG/JPEG e objetos DICOM em conjuntos separados.');
      dicom=isDicom;
      result.push({name:clean(f.name,180),type,blob:f.slice(0,f.size,type)});
    }
    return result;
  }
  async function add(data,files) {
    const m=metadata(data),valid=await checkedFiles(files);
    const entry={...m,id:crypto.randomUUID(),createdAt:new Date().toISOString(),files:valid};
    await transaction('readwrite',s=>s.add(entry));return entry;
  }
  const asFiles=entry=>entry.files.map(f=>new File([f.blob],f.name,{type:f.type}));
  const size=entry=>entry.files.reduce((n,f)=>n+f.blob.size,0);
  async function exportPackage(entries) {
    if(!entries.length)throw Error('A biblioteca está vazia.');
    const manifest={version:1,entries:[]},parts=[];let total=0;
    for(const entry of entries){
      const m={...metadata(entry),files:[]};
      for(const f of entry.files){total+=f.blob.size;if(total>MAX)throw Error('Exporte conjuntos menores: limite de 1 GB por pacote.');m.files.push({name:f.name,type:f.type,size:f.blob.size});parts.push(f.blob);}
      manifest.entries.push(m);
    }
    const header=new TextEncoder().encode(JSON.stringify(manifest));if(header.length>1048576)throw Error('Catálogo muito grande para um pacote.');
    const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,header.length,true);
    return new Blob([magic,length,header,...parts],{type:'application/octet-stream'});
  }
  async function importPackage(file,confirmed) {
    if(!confirmed)throw Error('Confirme a revisão de privacidade antes de importar um pacote.');
    if(file.size>MAX+1048587||file.size<12)throw Error('Tamanho de pacote inválido.');
    const prefix=new Uint8Array(await file.slice(0,11).arrayBuffer());
    if(!magic.every((n,i)=>prefix[i]===n))throw Error('Este arquivo não é um pacote ARLIB versão 1.');
    const len=new DataView(prefix.buffer).getUint32(7,true);if(!len||len>1048576||len+11>file.size)throw Error('Cabeçalho de pacote inválido.');
    let manifest;try{manifest=JSON.parse(await file.slice(11,11+len).text());}catch{throw Error('Catálogo do pacote inválido.');}
    if(manifest.version!==1||!Array.isArray(manifest.entries)||!manifest.entries.length||manifest.entries.length>1000)throw Error('Versão ou quantidade de conjuntos inválida.');
    const pending=[];let offset=11+len,count=0;
    // Valida tudo antes de escrever; nenhuma importação parcial em caso de corrupção.
    for(const item of manifest.entries){
      const m=metadata(item),files=[];
      if(!Array.isArray(item.files))throw Error('Lista de arquivos inválida.');
      for(const f of item.files){
        if(++count>1000||!Number.isSafeInteger(f.size)||f.size<1||f.size>FILE_MAX||offset+f.size>file.size)throw Error('Pacote truncado ou com tamanho inválido.');
        files.push(new File([file.slice(offset,offset+f.size)],clean(f.name,180)));offset+=f.size;
      }
      pending.push({...m,id:crypto.randomUUID(),createdAt:new Date().toISOString(),files:await checkedFiles(files)});
    }
    if(offset!==file.size)throw Error('O pacote contém dados excedentes.');
    await transaction('readwrite',s=>{for(const item of pending)s.add(item);});return pending.length;
  }
  return Object.freeze({modalities,list,get,remove,add,asFiles,size,exportPackage,importPackage});
})();
