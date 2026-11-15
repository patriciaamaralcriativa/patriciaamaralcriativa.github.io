export const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function validate(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('Inclua pelo menos uma pergunta e uma resposta.');
 if(rows.length>24)throw Error('Use até 24 perguntas por atividade. Divida questionários maiores.');
 const seen=new Set();
 return rows.map((r,i)=>{const question=String(r.question??'').trim(),answer=String(r.answer??'').trim(),word=normalize(answer);
 if(!question||!answer)throw Error(`Complete a pergunta e a resposta da linha ${i+1}.`);
 if(question.length>500||answer.length>100)throw Error(`Texto muito longo na linha ${i+1}.`);
 if(word.length<2||word.length>24)throw Error(`A resposta da linha ${i+1} precisa ter de 2 a 24 letras ou números. Use um termo-chave.`);
 if(seen.has(word))throw Error(`Resposta repetida: ${answer}. Use termos diferentes.`);seen.add(word);return {question,answer,word};});
}
export function parse(text){
 let rows;
 if(text.trim().startsWith('[')||text.trim().startsWith('{')){let data;try{data=JSON.parse(text);}catch{throw Error('O JSON não está válido.');}rows=Array.isArray(data)?data:data.questions;
 if(!Array.isArray(rows))throw Error('O JSON deve conter uma lista de perguntas.');
 rows=rows.map(r=>({question:r.question??r.prompt??r.question_text,answer:r.answer??r.response??(Array.isArray(r.options)&&Number.isInteger(r.answer_index)?r.options[r.answer_index]:undefined)}));
 }else{rows=text.split(/\r?\n/).filter(s=>s.trim()).map((line,i)=>{const parts=line.split(/\t|\s*\|\s*/);if(parts.length!==2)throw Error(`Linha ${i+1}: use Pergunta | Resposta, uma por linha.`);return{question:parts[0],answer:parts[1]};});}
 return validate(rows);
}
const shuffle=(arr,rng)=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
export function generate(input,level='medio',rng=Math.random){
 const rows=validate(input),dirs=level==='facil'?[[0,1],[1,0]]:level==='dificil'?[[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]]:[[0,1],[1,0],[1,1],[1,-1]];
 const start=Math.max(10,...rows.map(r=>r.word.length),Math.ceil(Math.sqrt(rows.reduce((a,r)=>a+r.word.length,0)*1.65)));
 for(let n=start;n<=32;n++)for(let attempt=0;attempt<15;attempt++){
 const grid=Array.from({length:n},()=>Array(n).fill('')),placed=[];
 for(const r of [...rows].sort((a,b)=>b.word.length-a.word.length)){
 const candidates=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(const [dy,dx]of dirs){const endY=y+dy*(r.word.length-1),endX=x+dx*(r.word.length-1);if(endY<0||endY>=n||endX<0||endX>=n)continue;let ok=true;const cells=[];for(let i=0;i<r.word.length;i++){const yy=y+dy*i,xx=x+dx*i;if(grid[yy][xx]&&grid[yy][xx]!==r.word[i]){ok=false;break;}cells.push([yy,xx]);}if(ok)candidates.push(cells);}
 if(!candidates.length)break;const cells=shuffle(candidates,rng)[0];cells.forEach(([y,x],i)=>grid[y][x]=r.word[i]);placed.push({...r,cells});
 }if(placed.length===rows.length){for(const row of grid)for(let x=0;x<n;x++)if(!row[x])row[x]='ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(rng()*26)];return {grid,words:rows.map(r=>placed.find(p=>p.word===r.word)),level};}
 }throw Error('Não foi possível montar a grade. Reduza a quantidade de palavras.');
}
export function line(a,b){const dy=b[0]-a[0],dx=b[1]-a[1];if(dy&&dx&&Math.abs(dy)!==Math.abs(dx))return[];const len=Math.max(Math.abs(dy),Math.abs(dx));return Array.from({length:len+1},(_,i)=>[a[0]+Math.sign(dy)*i,a[1]+Math.sign(dx)*i]);}
export const matches=(cells,word)=>JSON.stringify(cells)===JSON.stringify(word.cells)||JSON.stringify([...cells].reverse())===JSON.stringify(word.cells);
