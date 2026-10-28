// Run only against staging, with an existing active student's real Auth session.
// No passwords or administrative keys. An obsolete revision must never be saved.
'use strict';
const assert=require('node:assert/strict');
async function main(){
 const url=process.env.WORKSTATION_TEST_URL;
 assert.equal(url,'https://hvvilnlsenbbhdlvxnzg.supabase.co','Staging only');
 const key=process.env.WORKSTATION_TEST_KEY,token=process.env.WORKSTATION_TEST_TOKEN;
 assert(key&&token,'Provide public API key and existing student access token');
 async function rpc(name,body={}){
  const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  return {status:response.status,data:await response.json()};
 }
 const state=await rpc('workstation_aula_status');assert.equal(state.status,200);assert.equal(state.data.is_admin,false);assert.equal(state.data.active,true,'Teacher must open the staging class first');
 const before=await rpc('workstation_progresso_load');assert.equal(before.status,200);
 const started=Date.now();
 const conflict=await rpc('workstation_progresso_save',{p_dados:before.data.data,p_revisao:before.data.revision-1,p_iniciada_em:before.data.started_at});
 assert.equal(conflict.status,409);assert.equal(conflict.data.code,'PT409');
 const after=await rpc('workstation_progresso_load');assert.equal(after.status,200);assert.deepEqual(after.data,before.data);
 console.log(JSON.stringify({passed:true,http:409,code:'PT409',elapsed_ms:Date.now()-started,progress_unchanged:true}));
}
main().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
