#!/usr/bin/env python3
"""Build the Workstation T app as one HTML resource for sala_recursos."""
from __future__ import annotations
import argparse, base64, json, re
from pathlib import Path

LOCAL_API_BLOCK = re.compile(r"<script>\s*const API='http://127\.0\.0\.1:8082';.*?</script>", re.S)
SCRIPT_SRC = re.compile(r'<script\s+src=["\']([^"\']+)["\']\s*>\s*</script>', re.I)

PANEL_SCRIPT = r'''<script id="workstation-supabase-bridge">
let adminVerified = false;
const pendingWorkstationRequests = new Map();
function workstationControl(action) {
  return new Promise((resolve, reject) => {
    const id = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    const timer = setTimeout(() => { pendingWorkstationRequests.delete(id); reject(new Error('A sala não respondeu à solicitação.')); }, 8000);
    pendingWorkstationRequests.set(id, {resolve, reject, timer});
    parent.postMessage({type:'patricia-workstation-control', action, requestId:id}, '*');
  });
}
window.addEventListener('message', event => {
  if (event.source !== window.parent || event.data?.type !== 'patricia-workstation-control-result') return;
  const pending = pendingWorkstationRequests.get(event.data.requestId);
  if (!pending) return;
  clearTimeout(pending.timer); pendingWorkstationRequests.delete(event.data.requestId);
  if (event.data.ok) pending.resolve(event.data.result);
  else pending.reject(new Error(event.data.error || 'Operação não autorizada.'));
});
function applyWorkstationClassState(state) {
  window.__PATRICIA_WORKSTATION_STATUS__ = state;
  const status = document.getElementById('pstatus');
  if (status) status.textContent = state.active ? 'Aula ativa — alunos entram com o acesso da Sala de Aulas.' : 'Aula encerrada.';
  if (window.__patriciaSetClassState) window.__patriciaSetClassState(state);
}
function openProf(){document.getElementById('prof').style.display='flex';}
function closeProf(){document.getElementById('prof').style.display='none';}
async function plogin(){
  try {
    const state = await workstationControl('status');
    if (!state.is_admin) { alert('Entre na Sala de Aulas com a conta da professora.'); return; }
    adminVerified = true;
    document.getElementById('plog').style.display='none';
    document.getElementById('pact').style.display='block';
    applyWorkstationClassState(state);
  } catch (error) { alert(error.message); }
}
async function pstart(){
  try { if (!adminVerified) await plogin(); if (!adminVerified) return; applyWorkstationClassState(await workstationControl('start')); }
  catch (error) { alert(error.message); }
}
async function pend(){
  try { if (!adminVerified) await plogin(); if (!adminVerified) return; applyWorkstationClassState(await workstationControl('end')); }
  catch (error) { alert(error.message); }
}
</script>'''

GUARD_SCRIPT = r'''<script id="workstation-class-guard">
(function(){
  'use strict';
  let locked = true, admin = false, overlay = null, lastState = null;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  function showLock(text) {
    locked = true;
    if (!overlay || !overlay.isConnected) {
      overlay = document.createElement('div'); overlay.id = 'patricia-workstation-session-lock';
      overlay.setAttribute('role','status');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#07111df2;color:#fff;font:600 20px Arial;text-align:center;';
      document.body.appendChild(overlay);
    }
    overlay.textContent = text;
  }
  function apply(state) {
    if (window.__PATRICIA_SYNC_FAILED__) { showLock('Falha ao salvar. Reabra a Workstation pela Sala de Aulas.'); return; }
    lastState = state || {};
    admin = state?.is_admin === true;
    if (admin || state?.active === true) { locked = false; if (overlay) overlay.remove(); overlay = null; }
    else showLock('A aula foi encerrada ou seu acesso não está ativo. Entre em contato com a professora.');
    window.__patriciaSetClassState = apply;
    window.__PATRICIA_WORKSTATION_STATUS__ = state;
  }
  async function status() {
    try { apply(await workstationControl('status')); }
    catch (error) { showLock('Não foi possível validar a sessão. Reconecte-se pela Sala de Aulas.'); }
  }
  function start() {
    showLock('Validando seu acesso à Workstation…');
    status();
    setInterval(status, 15000);
    document.addEventListener('keydown', event => { if (locked) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
</script>'''

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    source=args.source.resolve(); output=args.output.resolve()
    html_path=source/'index.html'
    html=html_path.read_text(encoding='utf-8-sig')
    # Remove the source's Google Fonts link so the web resource needs no remote assets.
    html=re.sub(r'''<link\b(?=[^>]*href=["']https://fonts\.googleapis\.com/)[^>]*>''', '', html, flags=re.I)
    cases=json.loads((source/'casos_importados.json').read_text(encoding='utf-8-sig'))
    task_count=sum(len(case.get('tarefas',[])) for case in cases)
    if len(cases)!=63 or task_count!=324: raise SystemExit(f'Expected 63 cases/324 tasks, got {len(cases)}/{task_count}')
    html,napi=LOCAL_API_BLOCK.subn(PANEL_SCRIPT,html,count=1)
    if napi!=1: raise SystemExit(f'Expected one local API panel block, replaced {napi}')
    panel_old='<input type="password" id="ppass" placeholder="Senha">\n                <button onclick="plogin()">Entrar</button>'
    panel_new='<p>Use a conta autenticada da Sala de Aulas. A autorização do painel é verificada no servidor.</p>\n                <button onclick="plogin()">Verificar acesso da professora</button>'
    if panel_old not in html: raise SystemExit('Teacher password UI source block not found')
    html=html.replace(panel_old,panel_new,1)
    # Check original UI/navigation and no local service endpoint survives.
    html=html.replace('</head>',GUARD_SCRIPT+'\n</head>',1)
    embedded_json=base64.b64encode(json.dumps(cases,ensure_ascii=False,separators=(',',':')).encode('utf-8')).decode('ascii')
    inline_script = '<script>window.__PATRICIA_CASES_DATA__=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(document.getElementById("patricia-cases-base64").textContent.trim()),c=>c.charCodeAt(0))));</script>'
    def replace_script(match):
        rel=match.group(1)
        candidate=(source/rel).resolve()
        if source not in candidate.parents or not candidate.is_file(): raise SystemExit(f'Invalid/missing script asset: {rel}')
        content=candidate.read_text(encoding='utf-8-sig')
        if rel.replace('\\','/')=='js/casos_importados_loader.js':
            prefix="fetch('casos_importados.json').then(r=>{if(!r.ok) throw Error('Dados indisponíveis'); return r.json();}).then(d=>"
            if prefix not in content: raise SystemExit('Case-loader fetch signature changed')
            content=content.replace(prefix,'Promise.resolve(window.__PATRICIA_CASES_DATA__).then(d=>',1)
        content=re.sub(r'</script',r'<\\/script',content,flags=re.I)
        data_tag=''
        if rel.replace('\\','/')=='js/casos_importados_loader.js':
            data_tag=f'<script id="patricia-cases-base64" type="application/octet-stream">{embedded_json}</script>{inline_script}'
        return data_tag+'<script>\n'+content+'\n</script>'
    html,n=SCRIPT_SRC.subn(replace_script,html)
    if n<1: raise SystemExit('No local scripts were inlined')
    progress_script=(Path(__file__).parent/'web-progress.js').read_text(encoding='utf-8')
    html=html.replace('</body>', '<script>'+progress_script+'</script>\n</body>', 1)
    html=html.replace('</body>',f'<!-- Web bundle preserves {len(cases)} cases / {task_count} tasks. -->\n</body>',1)
    if re.search(r'<script[^>]+src=',html,re.I): raise SystemExit('External script reference remains')
    if 'fetch(\'casos_importados.json\')' in html: raise SystemExit('External case JSON fetch remains')
    if '127.0.0.1:8082' in html: raise SystemExit('Local backend reference remains')
    if 'https://' in html: raise SystemExit('External https reference remains')
    output.parent.mkdir(parents=True,exist_ok=True); output.write_text(html,encoding='utf-8')
    print(json.dumps({'output':str(output),'cases':len(cases),'tasks':task_count,'inlinedScripts':n,'bytes':output.stat().st_size,'localApiRefs':html.count('127.0.0.1:8082'),'scriptSrcRefs':len(re.findall(r'<script[^>]+src=',html,re.I))},ensure_ascii=False))
if __name__=='__main__': main()

