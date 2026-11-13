'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),base='https://patriciaamaralcriativa.github.io/',out=path.join(root,'artifacts/file-library');fs.mkdirSync(out,{recursive:true});
const files=['biblioteca-arquivos.html','amaral-rad.html','sala-de-aulas.html','mamografia-digital-preview.html','tomossintese-mamaria-preview.html','dbt-validacao-real.html',...['store.js','host.js','page.js'].map(n=>'_workstation-integration/file-library-'+n),'_workstation-integration/file-library.css'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const results=[];for(const file of files){try{const r=await fetch(base+file+'?library-check='+Date.now());if(!r.ok)throw Error('HTTP '+r.status);const expected=hash(fs.readFileSync(path.join(root,file))),actual=hash(Buffer.from(await r.arrayBuffer()));if(actual!==expected)throw Error('Conteúdo diferente da versão testada');results.push({file,status:'passed',sha256:actual});}catch(e){results.push({file,status:'failed',error:e.message});}}
 fs.writeFileSync(path.join(out,'live-byte-verification.json'),JSON.stringify({at:new Date().toISOString(),base,results},null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status==='failed')){process.exitCode=1;return;}
 const r=spawnSync(process.execPath,[path.join(__dirname,'file-library-browser.cjs')],{stdio:'inherit',env:{...process.env,LIBRARY_PUBLIC_URL:base}});process.exitCode=r.status||0;
})().catch(e=>{console.error(e);process.exitCode=1;});
