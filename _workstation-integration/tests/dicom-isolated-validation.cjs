const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'../..');
const output=process.env.DICOM_EVIDENCE_DIR||path.join(root,'_workstation-integration/evidence/dicom-isolated-run');
fs.mkdirSync(output,{recursive:true});
const rows=[],elements=new Map();
function el(){return {textContent:'',className:'',append(...v){rows.push(...v)},addEventListener(){},getContext(){return null}}}
for(const id of ['results','summary','export-report'])elements.set(id,el());
const document={getElementById:id=>elements.get(id),createElement:()=>el()};
const scope={document,TextEncoder,TextDecoder,ArrayBuffer,DataView,Uint8Array,Uint8ClampedArray,Float64Array,console};scope.window=scope;
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'_workstation-integration/mamografia-dicom-inspector.js'),'utf8'),scope);
const html=fs.readFileSync(path.join(root,'testes-dicom-sinteticos.html'),'utf8');
vm.runInContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n'),scope);
const results=rows.map(r=>({status:r.className==='ok'?'passou':'falhou',description:r.textContent}));
const report={executedAt:new Date().toISOString(),sourceCommit:require('child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),environment:'Node.js VM; DOM mínimo simulado; sem Canvas real',node:process.version,realBrowser:false,canvasChecks:{planned:4,executed:0,skipped:4},counts:{passed:results.filter(x=>x.status==='passou').length,failed:results.filter(x=>x.status==='falhou').length,executed:results.length},summary:elements.get('summary').textContent,results};
fs.writeFileSync(path.join(output,'isolated-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));

if(report.counts.failed||report.counts.executed!==76)process.exitCode=1;
