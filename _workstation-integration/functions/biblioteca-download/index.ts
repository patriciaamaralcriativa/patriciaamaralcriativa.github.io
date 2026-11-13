/* Every request is authenticated by Supabase Auth, then authorized under user RLS.
   The service key is used only for the already-authorized chunk, never returned. */
const bucket='workstation-biblioteca-v2';
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const allowed=origin==='https://patriciaamaralcriativa.github.io'||/^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
 const headers:Record<string,string>={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','Vary':'Origin, Authorization','X-Content-Type-Options':'nosniff'};
 if(allowed){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';headers['Access-Control-Allow-Methods']='GET, OPTIONS';}
 const error=(status:number,msg:string)=>new Response(JSON.stringify({message:msg}),{status,headers:{...headers,'Content-Type':'application/json'}});
 if(origin&&!allowed)return error(403,'Origem não autorizada.');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='GET')return error(405,'Método indisponível.');
 try{
  const auth=req.headers.get('authorization');if(!auth||!/^Bearer [^\s]+$/.test(auth))return error(401,'Entre com seu acesso autorizado.');
  const api=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userHeaders={apikey:anon,Authorization:auth};
  const user=await fetch(api+'/auth/v1/user',{headers:userHeaders,cache:'no-store'});if(!user.ok)return error(401,'Sessão inválida ou encerrada.');
  const q=new URL(req.url).searchParams,b=q.get('conjunto')||'',f=q.get('arquivo')||'',part=Number(q.get('parte'));
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if(!uuid.test(b)||!uuid.test(f)||!q.has('parte')||!Number.isInteger(part)||part<0||part>74)return error(400,'Solicitação de arquivo inválida.');
  const read=()=>fetch(api+'/rest/v1/workstation_biblioteca_v2?select=id,criada_por&id=eq.'+b,{headers:userHeaders,cache:'no-store'});
  const parent=await read();if(!parent.ok)return error(403,'Material indisponível para este acesso.');const sets=await parent.json();if(sets.length!==1)return error(403,'Material recolhido ou não autorizado.');
  const fileResponse=await fetch(api+'/rest/v1/workstation_biblioteca_arquivos_v2?select=id,tamanho,partes&biblioteca_id=eq.'+b+'&id=eq.'+f,{headers:userHeaders,cache:'no-store'});
  if(!fileResponse.ok)return error(403,'Arquivo não autorizado.');const files=await fileResponse.json();if(files.length!==1||part>=files[0].partes)return error(404,'Arquivo indisponível.');
  const object=sets[0].criada_por+'/'+b+'/'+f+'/'+String(part).padStart(5,'0')+'.bin';
  const response=await fetch(api+'/storage/v1/object/authenticated/'+bucket+'/'+object+'?private_read='+crypto.randomUUID(),{headers:{apikey:service,Authorization:'Bearer '+service,'Cache-Control':'no-cache'},cache:'no-store'});
  if(!response.ok)return error(404,'Parte do arquivo indisponível.');const blob=await response.blob();if(blob.size!==Math.min(4194304,files[0].tamanho-part*4194304))return error(409,'Arquivo incompleto.');
  // Recheck release and membership after fetching the chunk; do not return a stale response.
  const current=await read();if(!current.ok||(await current.json()).length!==1)return error(403,'Material recolhido ou acesso encerrado.');
  return new Response(blob,{headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="parte.bin"'}});
 }catch{return error(503,'Não foi possível receber o arquivo. Tente novamente.');}
});
