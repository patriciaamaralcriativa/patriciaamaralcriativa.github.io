/* Biblioteca da turma: autenticação existente, RLS e bucket privado; sem URLs públicas. */
'use strict';
window.AmaralCloudLibrary=(()=>{
 const API='https://gmhktklyyqlxaomlpspr.supabase.co',KEY='sb_publishable_t9FTY7pLp2BswKsGN39Hsw_VT3vphgl',SESSION='patricia-sala-session-v1';
 const SETS='workstation_biblioteca_v2',FILES='workstation_biblioteca_arquivos_v2',BUCKET='workstation-biblioteca-v2',CHUNK=4194304;
 let identity=null,refreshing=null;
 const stored=()=>{try{return JSON.parse(sessionStorage.getItem(SESSION)||'null');}catch{return null;}};
 function assertUser(uid){if(stored()?.user?.id!==uid)throw Error('O acesso mudou. Entre novamente antes de continuar.');}
 async function call(route,{method='GET',body,raw=false,uid,signal}={}){
  let s=stored();if(uid)assertUser(uid);const headers={apikey:KEY};if(s?.access_token)headers.Authorization='Bearer '+s.access_token;
  if(raw)headers['Content-Type']='application/octet-stream';else headers['Content-Type']='application/json';
  if(method==='POST'||method==='PATCH'||method==='DELETE')headers.Prefer='return=representation';
  const r=await fetch(API+route,{method,headers,body:raw?body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal});
  if(uid)assertUser(uid);
  if(!r.ok){let msg;try{const e=await r.json();msg=e.message||e.msg||e.error_description||e.error;}catch{}if(r.status===401)throw Error('Sua sessão terminou. Entre novamente na sala ou na biblioteca.');throw Error(msg||'Operação recusada pelo armazenamento ('+r.status+').');}
  return raw&&method==='GET'?r.blob():r.status===204?null:r.json().catch(()=>null);
 }
 async function context(){
  let s=stored();if(!s?.access_token){identity=null;return null;}
  if(Number(s.expires_at||0)<Date.now()/1000+60){
   if(!refreshing)refreshing=(async()=>{const old=s.user.id,r=await call('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}});assertUser(old);r.expires_at=Date.now()/1000+r.expires_in;sessionStorage.setItem(SESSION,JSON.stringify(r));return r;})().finally(()=>refreshing=null);
   s=await refreshing;
  }
  const user=await call('/auth/v1/user',{uid:s.user.id});const rows=await call('/rest/v1/sala_membros?select=papel,ativo&user_id=eq.'+encodeURIComponent(user.id),{uid:user.id});
  if(!rows?.[0]?.ativo)throw Error('Este cadastro ainda não está autorizado pela professora.');
  identity={uid:user.id,teacher:rows[0].papel==='administradora'};return {...identity};
 }
 async function login(email,password){const s=await call('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});s.expires_at=Date.now()/1000+s.expires_in;sessionStorage.setItem(SESSION,JSON.stringify(s));identity=null;return context();}
 async function logout(){const s=stored();try{if(s?.access_token)await call('/auth/v1/logout',{method:'POST'});}finally{sessionStorage.removeItem(SESSION);identity=null;}}
 async function requireUser(teacher=false){const c=await context();if(!c)throw Error('Entre com o mesmo e-mail e senha da sala de aulas.');if(teacher&&!c.teacher)throw Error('Somente a professora pode enviar, liberar ou recolher arquivos.');return c;}
 const path=(b,f,i)=>b.criada_por+'/'+b.id+'/'+f.id+'/'+String(i).padStart(5,'0')+'.bin';
 const digest=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
 async function list(){const c=await requireUser();return call('/rest/v1/'+SETS+'?select=*&order=criado_em.desc&limit=1000',{uid:c.uid});}
 async function details(id){if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Identificador de conjunto inválido.');const c=await requireUser();const rows=await call('/rest/v1/'+SETS+'?id=eq.'+id+'&select=*',{uid:c.uid});if(!rows?.length)throw Error('Material recolhido ou não autorizado para este acesso.');const b=rows[0],files=await call('/rest/v1/'+FILES+'?biblioteca_id=eq.'+id+'&select=*&order=criado_em.asc,id.asc&limit=1000',{uid:c.uid});return{...b,files};}
 async function upload(data,files,onProgress=()=>{}){
  const c=await requireUser(true),m=window.AmaralFileLibrary.inspectMetadata(data),valid=await window.AmaralFileLibrary.inspectFiles(files);
  const total=valid.reduce((n,f)=>n+f.blob.size,0);const created=await call('/rest/v1/'+SETS,{method:'POST',uid:c.uid,body:{titulo:m.title,modalidade:m.modality,origem:m.source,licenca:m.license,revisado:m.reviewed,quantidade:valid.length,tamanho:total}});const b=created?.[0];if(!b)throw Error('Criação do rascunho não confirmada.');let done=0;
  try{
   for(const f of valid){
    const sha256=await digest(f.blob),r=await call('/rest/v1/'+FILES,{method:'POST',uid:c.uid,body:{biblioteca_id:b.id,nome:f.name,mime:f.type,tamanho:f.blob.size,sha256,partes:Math.ceil(f.blob.size/CHUNK)}}),meta=r?.[0];if(!meta)throw Error('Registro do arquivo não confirmado.');
    for(let i=0;i<meta.partes;i++){const part=f.blob.slice(i*CHUNK,Math.min((i+1)*CHUNK,f.blob.size),'application/octet-stream');await call('/storage/v1/object/'+BUCKET+'/'+path(b,meta,i),{method:'POST',uid:c.uid,raw:true,body:part});done+=part.size;onProgress(done,total);}
   }
  }catch(e){throw Error('O envio não foi concluído. O rascunho ficou oculto aos alunos e pode ser removido para tentar novamente. '+e.message);}
  return b;
 }
 async function publish(id,value){const c=await requireUser(true);const r=await call('/rest/v1/'+SETS+'?id=eq.'+id,{method:'PATCH',uid:c.uid,body:{publicado:!!value}});if(r?.length!==1)throw Error('A alteração de disponibilidade não foi confirmada.');return r[0];}
 async function remove(id){const c=await requireUser(true),b=await details(id);if(b.publicado)throw Error('Recolha o conjunto antes de remover.');if(b.criada_por!==c.uid)throw Error('Este rascunho pertence a outro responsável.');
  const prefixes=b.files.flatMap(f=>Array.from({length:f.partes},(_,i)=>path(b,f,i)));for(let i=0;i<prefixes.length;i+=100)await call('/storage/v1/object/'+BUCKET,{method:'DELETE',uid:c.uid,body:{prefixes:prefixes.slice(i,i+100)}});
  const deleted=await call('/rest/v1/'+SETS+'?id=eq.'+id,{method:'DELETE',uid:c.uid});if(deleted?.length!==1)throw Error('Remoção não confirmada. Atualize o acervo e confira se o conjunto foi recolhido.');
 }
 async function download(id,index=null,onProgress=()=>{}){
  const c=await requireUser(),b=await details(id),source=index===null?b.files:[b.files[index]];if(!source.length||source.some(f=>!f))throw Error('Arquivo não encontrado no conjunto.');
  const files=[];let done=0;const total=source.reduce((n,f)=>n+f.tamanho,0);
  for(const f of source){const parts=[];for(let i=0;i<f.partes;i++){const part=await call('/storage/v1/object/authenticated/'+BUCKET+'/'+path(b,f,i),{uid:c.uid,raw:true});if(part.size!==Math.min(CHUNK,f.tamanho-i*CHUNK))throw Error('Parte truncada: importação interrompida.');parts.push(part);done+=part.size;onProgress(done,total);}
   const file=new File(parts,f.nome,{type:f.mime});if(file.size!==f.tamanho||await digest(file)!==f.sha256)throw Error('Integridade SHA-256 divergente: arquivo bloqueado.');files.push(file);
  }
  await window.AmaralFileLibrary.inspectFiles(files);await details(id);assertUser(c.uid);return {entry:b,files};
 }
 return Object.freeze({context,login,logout,list,details,upload,publish,remove,download});
})();
