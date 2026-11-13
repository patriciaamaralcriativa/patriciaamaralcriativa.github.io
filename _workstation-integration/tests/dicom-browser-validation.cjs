/* Execute da raiz do repositório com Playwright instalado.
 * DICOM_BROWSER_PATH opcional: caminho de um Chromium instalado.
 * Nenhum estudo ou serviço de produção é acessado.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const output=path.resolve(process.env.DICOM_EVIDENCE_DIR||path.join(root,'_workstation-integration/evidence/dicom-browser-run'));
fs.mkdirSync(output,{recursive:true});
const logs=[],requests=[],errors=[];
let browser,server;
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const record={executedAt:new Date().toISOString(),sourceCommit,realBrowser:false,status:'not-executed',logs,requests,errors};
(async()=>{
 try{
  const allowed=new Map([['/testes-dicom-sinteticos.html','text/html; charset=utf-8'],['/_workstation-integration/mamografia-dicom-inspector.js','text/javascript; charset=utf-8']]);
  server=http.createServer((req,res)=>{const mime=allowed.get(req.url);if(!mime){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime});res.end(fs.readFileSync(path.join(root,req.url.slice(1))))});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  browser=await chromium.launch({headless:true,chromiumSandbox:true,timeout:20000,...(process.env.DICOM_BROWSER_PATH?{executablePath:process.env.DICOM_BROWSER_PATH}:{})});
  record.browserVersion=browser.version();
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  page.on('console',m=>logs.push({type:m.type(),text:m.text(),location:m.location()}));
  page.on('pageerror',e=>errors.push(e.stack));
  page.on('requestfailed',r=>requests.push({url:r.url(),failure:r.failure()}));
  const response=await page.goto(`http://127.0.0.1:${server.address().port}/testes-dicom-sinteticos.html`,{waitUntil:'load',timeout:20000});
  record.httpStatus=response.status();
  await page.locator('#summary').filter({hasText:/passaram/}).waitFor();
  record.realBrowser=true;
  record.summary=await page.locator('#summary').innerText();
  const downloadPending=page.waitForEvent('download');
  await page.locator('#export-report').click();
  const download=await downloadPending;
  await download.saveAs(path.join(output,'browser-suite-results.json'));
  const report=JSON.parse(fs.readFileSync(path.join(output,'browser-suite-results.json'),'utf8'));
  record.userAgent=report.userAgent;
  record.counts=report.counts;record.canvasChecks=report.canvasChecks;
  await page.screenshot({path:path.join(output,'browser-suite.png'),fullPage:true});
  record.status=report.counts.executed===80&&report.counts.passed===80&&report.counts.failed===0&&report.counts.consistent&&report.canvasChecks.executed===4&&errors.length===0?'passed':'failed';
 }catch(error){record.status=record.realBrowser?'failed':'blocked';record.launchOrExecutionError=error.stack}
 finally{
  if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(output,'browser-execution.json'),JSON.stringify(record,null,2));
  console.log(JSON.stringify(record,null,2));if(record.status!=='passed')process.exitCode=1;
 }
})();
