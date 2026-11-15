import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
export function createGameClient(kind='player', options={}) {
 const db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:`radioquiz-${kind}-v1`,persistSession:true,autoRefreshToken:true,detectSessionInUrl:kind==='teacher',...options.auth}});
 async function rpc(op,p={}) {const {data,error}=await db.rpc('radioquiz_api',{op,p});if(error)throw new Error(error.message);return data;}
 async function ensurePlayer(){const {data:{session}}=await db.auth.getSession();if(!session){const {error}=await db.auth.signInAnonymously();if(error)throw new Error(error.message);}return rpc('identity');}
 function watch(room,onChange,onConnection=()=>{}) {
  let stopped=false,busy=false,again=false,channel;
  const sync=async()=>{if(stopped)return;if(busy){again=true;return;}busy=true;try{await onChange();}finally{busy=false;if(again){again=false;queueMicrotask(sync);}}};
  channel=db.channel(`radioquiz-room-${room}`).on('postgres_changes',{event:'*',schema:'public',table:'radioquiz_signals',filter:`room_id=eq.${room}`},()=>sync().catch(()=>{})).subscribe(status=>{onConnection(status);if(status==='SUBSCRIBED')sync().catch(()=>{});});
  // Reconcile authoritatively even when WebSocket messages are lost or the page resumes.
  const timer=setInterval(()=>{if(!globalThis.document||!document.hidden)sync().catch(()=>{});},kind==='teacher'?1200:3500);
  const resume=()=>sync().catch(()=>{});
  globalThis.addEventListener?.('online',resume);globalThis.document?.addEventListener('visibilitychange',resume);
  return {sync,stop(){stopped=true;clearInterval(timer);db.removeChannel(channel);globalThis.removeEventListener?.('online',resume);globalThis.document?.removeEventListener('visibilitychange',resume);}};
 }
 return {db,rpc,ensurePlayer,watch};
}
export function remainingSeconds(state,offset=0,now=Date.now()){return state?.phase==='question'?Math.max(0,Math.ceil((Date.parse(state.deadline)-now-offset)/1000)):0;}
