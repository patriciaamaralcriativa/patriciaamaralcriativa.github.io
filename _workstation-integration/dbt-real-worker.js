/* Pipeline isolado para amostras DBT previamente auditadas. Nenhum dado sai deste worker. */
'use strict';
importScripts('vendor/dicomParser.min.js','vendor/openjpegwasm_decode.js');
let dataset=null,metadata=null;
const moduleReady=OpenJPEGWASM({locateFile:name=>new URL('vendor/'+name,self.location.href).href,print:()=>{},printErr:()=>{}});
const sequence=(d,tag)=>d?.elements[tag]?.items?.[0]?.dataSet;
const number=(d,tag,fallback)=>{const s=d?.string(tag);if(s===undefined||s==='')return fallback;const n=Number(s.split('\\')[0]);if(!Number.isFinite(n))throw Error('Atributo numérico inválido: '+tag);return n};
function inspect(buffer,expected){
 if(buffer.byteLength>300*1024*1024)throw Error('Arquivo acima do limite de 300 MiB.');
 const d=dicomParser.parseDicom(new Uint8Array(buffer));
 const shared=sequence(d,'x52009229'),voi=sequence(shared,'x00289132'),rescale=sequence(shared,'x00289145'),anatomy=sequence(shared,'x00209071');
 const m={sopClass:d.string('x00080016'),syntax:d.string('x00020010'),modality:d.string('x00080060'),frames:number(d,'x00280008',1),rows:d.uint16('x00280010'),columns:d.uint16('x00280011'),bits:d.uint16('x00280100'),stored:d.uint16('x00280101'),highBit:d.uint16('x00280102'),signed:d.uint16('x00280103'),samples:d.uint16('x00280002'),photo:d.string('x00280004'),viewDeclared:d.string('x00185101')||'',lateralityDeclared:anatomy?.string('x00209072')||'',slope:number(rescale,'x00281053',1),intercept:number(rescale,'x00281052',0),center:number(voi,'x00281050',512),width:number(voi,'x00281051',512),voiFunction:voi?.string('x00281056')||'LINEAR',presentation:d.string('x20500020')||'IDENTITY',geometryValidated:false,spatialOrderValidated:false};
 if(m.sopClass!=='1.2.840.10008.5.1.4.1.1.13.1.3'||m.modality!=='MG')throw Error('Este módulo aceita somente objetos DBT MG auditados.');
 if(m.syntax!=='1.2.840.10008.1.2.4.90')throw Error('Transfer Syntax não suportada: exige JPEG 2000 Lossless.');
 if(m.samples!==1||m.photo!=='MONOCHROME2'||m.bits!==16||m.stored!==10||m.highBit!==9||m.signed!==0)throw Error('Representação de pixels fora do perfil auditado.');
 if(!Number.isSafeInteger(m.frames)||m.frames<1||m.frames>500||m.rows*m.columns>20000000)throw Error('Dimensões ou quantidade de quadros inválidas.');
 if(m.voiFunction!=='LINEAR'||m.presentation!=='IDENTITY'||m.width<1||m.slope!==1||m.intercept!==0)throw Error('Transformação de apresentação fora do perfil auditado.');
 const px=d.elements.x7fe00010;
 if(!px?.encapsulatedPixelData||px.fragments?.length!==m.frames||![0,m.frames].includes(px.basicOffsetTable?.length))throw Error('Encapsulamento não suportado: exige um fragmento por quadro e tabela de offsets vazia ou completa.');
 if(d.elements.x52009230?.items?.length!==m.frames||d.elements.x52009229?.items?.length!==1)throw Error('Grupos funcionais inconsistentes.');
 if(m.frames!==expected.frames||m.rows!==expected.rows||m.columns!==expected.columns)throw Error('A amostra diverge do manifesto auditado.');
 dataset=d;metadata=m;return m;
}
async function decode(index){
 const m=metadata;if(!m||!dataset)throw Error('Nenhum arquivo aberto.');if(!Number.isInteger(index)||index<0||index>=m.frames)throw Error('Índice de quadro fora da instância.');
 const stream=dicomParser.readEncapsulatedPixelDataFromFragments(dataset,dataset.elements.x7fe00010,index,1);
 if(stream[0]!==255||stream[1]!==79)throw Error('Codestream JPEG 2000 inválido.');
 const mod=await moduleReady,decoder=new mod.J2KDecoder();
 try{decoder.getEncodedBuffer(stream.length).set(stream);decoder.decode();if(!decoder.getIsReversible())throw Error('Codestream não reversível fora do perfil Lossless auditado.');const info=decoder.getFrameInfo();if(info.width!==m.columns||info.height!==m.rows||info.componentCount!==1||info.isSigned||info.bitsPerSample!==16)throw Error('Cabeçalho JPEG 2000 diverge dos atributos DICOM.');const raw=decoder.getDecodedBuffer();if(raw.byteLength!==m.rows*m.columns*2)throw Error('Quadro decodificado incompleto.');const pixels=new Uint16Array(raw.buffer,raw.byteOffset,raw.byteLength/2).slice();let min=65535,max=0;for(const v of pixels){if(v<min)min=v;if(v>max)max=v}if(max>=1024)throw Error('Valor de pixel excede os 10 bits auditados.');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels.buffer)),v=>v.toString(16).padStart(2,'0')).join('');return {index,pixels,min,max,sha256:digest,wasmHeapBytes:mod.HEAPU8.buffer.byteLength}}finally{decoder.delete()}
}
let serial=Promise.resolve();self.onmessage=({data})=>{serial=serial.then(async()=>{try{if(data.type==='open'){const info=inspect(data.buffer,data.expected);self.postMessage({id:data.id,metadata:info})}else if(data.type==='frame'){const r=await decode(data.index);self.postMessage({id:data.id,...r},[r.pixels.buffer])}else throw Error('Comando desconhecido.')}catch(error){self.postMessage({id:data.id,error:error.message})}})};
