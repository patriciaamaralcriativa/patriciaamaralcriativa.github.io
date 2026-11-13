/* AMARAL RAD — inspeção preliminar de metadados DICOM.
 * Não decodifica pixels, não anonimiza e não é ferramenta diagnóstica.
 * Arquivos permanecem no navegador. Suporte inicial: DICOM Part 10, transfer syntax
 * Explicit VR Little Endian ou Implicit VR Little Endian, metadados não encapsulados.
 */
(function(global){
"use strict";
const tag=(g,e)=>((g<<16)|e)>>>0;
const TARGET=new Map([
[tag(0x0008,0x0060),"modality"],[tag(0x0008,0x0016),"sopClassUID"],
[tag(0x0020,0x0062),"imageLaterality"],[tag(0x0020,0x0060),"laterality"],
[tag(0x0018,0x5101),"viewPosition"],[tag(0x0028,0x0010),"rows"],
[tag(0x0028,0x0011),"columns"],[tag(0x0028,0x0008),"numberOfFrames"],
[tag(0x0028,0x0004),"photometricInterpretation"],[tag(0x0028,0x0100),"bitsAllocated"],
[tag(0x0028,0x0101),"bitsStored"],[tag(0x0028,0x1050),"windowCenter"],[tag(0x0028,0x1051),"windowWidth"],[tag(0x0028,0x0030),"pixelSpacing"],[tag(0x0018,0x1164),"imagerPixelSpacing"],[tag(0x0028,0x0103),"pixelRepresentation"],[tag(0x0028,0x0002),"samplesPerPixel"],[tag(0x0028,0x0102),"highBit"],[tag(0x0028,0x0006),"planarConfiguration"],[tag(0x0020,0x0032),"imagePositionPatient"],[tag(0x0020,0x0037),"imageOrientationPatient"],[tag(0x0018,0x0088),"spacingBetweenSlices"],[tag(0x0018,0x0050),"sliceThickness"]
]);
const SHORT=new Set(["US","SS","UL","SL"]);const LONG=new Set(["OB","OD","OF","OL","OV","OW","SQ","UC","UR","UT","UN","SV","UV"]);
function inspect(buffer){
if(!(buffer instanceof ArrayBuffer))throw Error("É necessário um ArrayBuffer.");
const d=new DataView(buffer), bytes=new Uint8Array(buffer);
if(bytes.length<132||String.fromCharCode(...bytes.slice(128,132))!=="DICM")throw Error("Arquivo sem preâmbulo DICOM Part 10; não é possível validar este formato.");
const decoder=new TextDecoder("ascii"),out={transferSyntaxUID:null,metadata:{},warnings:[],pixelDataPresent:false,pixelDataOffset:null,pixelDataLength:null,functionalGroupsPresent:false,imageType:"unknown",frameSummary:null,geometryAttributes:{imagePositionPatient:null,imageOrientationPatient:null,spacingBetweenSlices:null,sliceThickness:null}};
let pos=132,syntax="1.2.840.10008.1.2.1",sawSyntax=false;
function element(p,explicit){
if(p+8>bytes.length)return null;
const group=d.getUint16(p,true),element=d.getUint16(p+2,true);
let vr=null,length,head=8;
if(explicit){
vr=String.fromCharCode(bytes[p+4],bytes[p+5]);
if(!/^[A-Z]{2}$/.test(vr))throw Error("VR DICOM inválido na posição "+p);
if(LONG.has(vr)){if(p+12>bytes.length)return null;length=d.getUint32(p+8,true);head=12;}
else length=d.getUint16(p+6,true);
}else length=d.getUint32(p+4,true);
if(length===0xffffffff)throw Error("Elemento de comprimento indefinido: leitura interrompida com segurança.");
if(length>bytes.length-p-head)throw Error("Comprimento de elemento DICOM excede o arquivo.");
return {group,element,vr,length,start:p+head,next:p+head+length};
}
let count=0;
while(pos<bytes.length&&count++<10000){
const group=d.getUint16(pos,true);const meta=group===0x0002;
const explicit=meta||syntax!=="1.2.840.10008.1.2";
const e=element(pos,explicit);if(!e)break;
if(e.group===0x5200&&(e.element===0x9229||e.element===0x9230)){out.functionalGroupsPresent=true;out.warnings.push("Sequências funcionais multiframe identificadas; conteúdo por frame não interpretado.");}
if(e.group===0x7fe0&&e.element===0x0010){out.pixelDataPresent=true;out.pixelDataOffset=e.start;out.pixelDataLength=e.length;break;}
if(meta&&e.element===0x0010){
syntax=decoder.decode(bytes.subarray(e.start,e.next)).replace(/[\0\s]+$/g,"");
out.transferSyntaxUID=syntax;sawSyntax=true;
if(!["1.2.840.10008.1.2","1.2.840.10008.1.2.1"].includes(syntax)){
out.warnings.push("Transfer Syntax não suportada pelo inspetor preliminar: "+syntax);
break;
}}
const key=TARGET.get(tag(e.group,e.element));
if(key){
let value;
if((e.vr==="US"||(!explicit&&["rows","columns","bitsAllocated","bitsStored","pixelRepresentation","samplesPerPixel","highBit","planarConfiguration"].includes(key)))&&e.length===2)value=d.getUint16(e.start,true);
else if(e.vr==="SS"&&e.length===2)value=d.getInt16(e.start,true);
else if((e.vr==="UL"||e.vr==="SL")&&e.length===4)value=e.vr==="SL"?d.getInt32(e.start,true):d.getUint32(e.start,true);
else value=decoder.decode(bytes.subarray(e.start,e.next)).replace(/[\0\s]+$/g,"");
out.metadata[key]=value;
}
pos=e.next;
}
if(out.metadata.sopClassUID==="1.2.840.10008.5.1.4.1.1.13.1.3"){out.imageType="breast-tomosynthesis";out.warnings.push("SOP Class de tomossíntese mamária identificada; reconstrução, ordem dos cortes e geometria ainda não validadas.");}else if(["1.2.840.10008.5.1.4.1.1.1.2","1.2.840.10008.5.1.4.1.1.1.2.1"].includes(out.metadata.sopClassUID)){out.imageType="digital-mammography";}
for(const key of Object.keys(out.geometryAttributes)){
const raw=out.metadata[key];
if(raw!=null){const values=String(raw).split("\\").map(x=>Number(x.trim()));
const expected=key==="imagePositionPatient"?3:key==="imageOrientationPatient"?6:1;
if(values.length===expected&&values.every(Number.isFinite))out.geometryAttributes[key]=values;
else out.warnings.push("Atributo geométrico inválido ou não interpretável: "+key);
}}
if(out.imageType==="breast-tomosynthesis"){
const declared=out.metadata.numberOfFrames==null?null:Number(out.metadata.numberOfFrames);
const valid=Number.isSafeInteger(declared)&&declared>0&&declared<=500;
out.frameSummary={declaredFrames:valid?declared:null,frameCountValidated:valid,geometryValidated:false,frameOrderValidated:false};
if(!valid)out.warnings.push("Número de frames DBT ausente, inválido ou acima do limite didático.");
out.warnings.push("Ordem dos cortes e geometria DBT não inferidas a partir do índice dos frames.");
}
if(!sawSyntax)out.warnings.push("Transfer Syntax UID não encontrada no cabeçalho Part 10; renderização bloqueada.");
if(count>=10000)out.warnings.push("Limite de elementos atingido; leitura parcial.");
if(out.metadata.modality&&out.metadata.modality!=="MG")out.warnings.push("Modalidade declarada não é MG: "+out.metadata.modality);
if(!out.metadata.modality)out.warnings.push("Modalidade não identificada; não classificar como mamografia.");
if(!out.pixelDataPresent)out.warnings.push("Pixel Data não confirmado. A inspeção não demonstra capacidade de renderização.");
if(out.pixelDataPresent)out.warnings.push("Pixel Data localizado, mas não decodificado; não há garantia de exibição fiel.");
return out;
}
function renderGrayscale(buffer,info,canvas,opts={}){
const m=info.metadata||{},ts=info.transferSyntaxUID;
if(!ts)throw Error("Transfer Syntax UID ausente; não é seguro interpretar pixels.");
if(info.imageType==="breast-tomosynthesis")throw Error("Tomossíntese DICOM identificada: renderização bloqueada até validar atributos e geometria dos frames.");
if(info.functionalGroupsPresent)throw Error("Sequências funcionais multiframe presentes: renderização bloqueada até interpretar os atributos por frame.");
if(!info.pixelDataPresent||info.pixelDataOffset==null)throw Error("Pixel Data ausente.");
if(!["1.2.840.10008.1.2","1.2.840.10008.1.2.1"].includes(ts))throw Error("Transfer Syntax não suportada para renderização.");
const rows=Number(m.rows),cols=Number(m.columns),bits=Number(m.bitsAllocated),stored=Number(m.bitsStored),rep=Number(m.pixelRepresentation),frames=m.numberOfFrames==null?1:Number(m.numberOfFrames);
if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows*cols>20000000)throw Error("Dimensões inválidas ou grandes demais.");
if(![8,16].includes(bits)||!Number.isInteger(stored)||stored<1||stored>bits||![0,1].includes(rep))throw Error("Representação de pixels não suportada.");
if(Number(m.samplesPerPixel)!==1)throw Error("Apenas Samples per Pixel = 1 é suportado.");
if(m.highBit==null||Number(m.highBit)!==stored-1)throw Error("High Bit não suportado: exige Bits Stored - 1.");
if(!["MONOCHROME1","MONOCHROME2"].includes(m.photometricInterpretation))throw Error("Apenas imagens monocromáticas são suportadas.");
if(!Number.isInteger(frames)||frames<1||frames>500)throw Error("Quantidade de frames inválida ou acima do limite didático (500).");
const frameIndex=opts.frameIndex===undefined?0:opts.frameIndex;
if(!Number.isInteger(frameIndex)||frameIndex<0||frameIndex>=frames)throw Error("Índice do frame fora da série.");
if(m.bitsStored==null||m.bitsAllocated==null||m.pixelRepresentation==null||m.samplesPerPixel==null||m.highBit==null)throw Error("Metadados de representação dos pixels incompletos.");
const bpp=bits/8,n=rows*cols,bytes=n*bpp,offset=info.pixelDataOffset;
if(!Number.isSafeInteger(bytes*frames)||bytes*frames>300*1024*1024)throw Error("Pixel Data acima do limite experimental.");
if(bytes*frames>info.pixelDataLength||offset+bytes*frames>buffer.byteLength)throw Error("Pixel Data multiframe incompleto.");
const dv=new DataView(buffer,offset+bytes*frameIndex,bytes),pixels=new Float64Array(n);
const mask=(2**stored)-1,sign=2**(stored-1);
let min=Infinity,max=-Infinity;
for(let i=0;i<n;i++){let raw=bits===8?dv.getUint8(i):dv.getUint16(i*2,true);raw&=mask;if(rep&&raw>=sign)raw-=2**stored;pixels[i]=raw;if(raw<min)min=raw;if(raw>max)max=raw;}
const dicomCenter=Number(String(m.windowCenter||"").split("\\")[0]);
const dicomWidth=Number(String(m.windowWidth||"").split("\\")[0]);
const center=Number.isFinite(opts.center)?opts.center:(m.windowCenter!=null&&Number.isFinite(dicomCenter)?dicomCenter:(min+max)/2);
const width=Number.isFinite(opts.width)&&opts.width>0?opts.width:(m.windowWidth!=null&&Number.isFinite(dicomWidth)&&dicomWidth>0?dicomWidth:Math.max(1,max-min));
const ctx=canvas.getContext("2d",{willReadFrequently:false});
if(!ctx)throw Error("Canvas indisponível.");
canvas.width=cols;canvas.height=rows;
const image=ctx.createImageData(cols,rows),invert=m.photometricInterpretation==="MONOCHROME1";
for(let i=0;i<n;i++){let gray;if(width<=1){gray=pixels[i]<=center-0.5?0:255}else{const normalized=(pixels[i]-(center-0.5))/(width-1)+0.5;gray=Math.max(0,Math.min(255,Math.round(normalized*255)))}if(invert)gray=255-gray;const p=i*4;image.data[p]=image.data[p+1]=image.data[p+2]=gray;image.data[p+3]=255;}
ctx.putImageData(image,0,0);
return {rows,columns:cols,frameIndex,frameCount:frames,min,max,center,width,photometricInterpretation:m.photometricInterpretation,notice:"Prévia educacional: janela linear DICOM (quando disponível), sem Modality LUT, VOI LUT por sequência, Presentation LUT ou calibração diagnóstica."};
}
global.AmaralMamografiaDicom={inspect,renderGrayscale};
})(typeof window!=="undefined"?window:globalThis);
