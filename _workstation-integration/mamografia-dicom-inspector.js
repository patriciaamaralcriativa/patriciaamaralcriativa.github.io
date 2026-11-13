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
[tag(0x0028,0x0101),"bitsStored"],[tag(0x0028,0x1050),"windowCenter"],[tag(0x0028,0x1051),"windowWidth"],[tag(0x0028,0x0030),"pixelSpacing"],[tag(0x0018,0x1164),"imagerPixelSpacing"],[tag(0x0028,0x0103),"pixelRepresentation"]
]);
const SHORT=new Set(["US","SS","UL","SL"]);const LONG=new Set(["OB","OD","OF","OL","OV","OW","SQ","UC","UR","UT","UN","SV","UV"]);
function inspect(buffer){
if(!(buffer instanceof ArrayBuffer))throw Error("É necessário um ArrayBuffer.");
const d=new DataView(buffer), bytes=new Uint8Array(buffer);
if(bytes.length<132||String.fromCharCode(...bytes.slice(128,132))!=="DICM")throw Error("Arquivo sem preâmbulo DICOM Part 10; não é possível validar este formato.");
const decoder=new TextDecoder("ascii"),out={transferSyntaxUID:null,metadata:{},warnings:[],pixelDataPresent:false,pixelDataOffset:null,pixelDataLength:null};
let pos=132,syntax="1.2.840.10008.1.2.1";
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
if(length===0xffffffff)throw Error("Sequência de comprimento indefinido: inspeção interrompida com segurança.");
if(length>bytes.length-p-head)throw Error("Comprimento de elemento DICOM excede o arquivo.");
return {group,element,vr,length,start:p+head,next:p+head+length};
}
let count=0;
while(pos<bytes.length&&count++<10000){
const group=d.getUint16(pos,true);const meta=group===0x0002;
const explicit=meta||syntax!=="1.2.840.10008.1.2";
const e=element(pos,explicit);if(!e)break;
if(e.group===0x7fe0&&e.element===0x0010){out.pixelDataPresent=true;out.pixelDataOffset=e.start;out.pixelDataLength=e.length;break;}
if(meta&&e.element===0x0010){
syntax=decoder.decode(bytes.subarray(e.start,e.next)).replace(/[\0\s]+$/g,"");
out.transferSyntaxUID=syntax;
if(!["1.2.840.10008.1.2","1.2.840.10008.1.2.1"].includes(syntax)){
out.warnings.push("Transfer Syntax não suportada pelo inspetor preliminar: "+syntax);
break;
}}
const key=TARGET.get(tag(e.group,e.element));
if(key){
let value;
if((e.vr==="US"||(!explicit&&["rows","columns","bitsAllocated","bitsStored","pixelRepresentation"].includes(key)))&&e.length===2)value=d.getUint16(e.start,true);
else if(e.vr==="SS"&&e.length===2)value=d.getInt16(e.start,true);
else if((e.vr==="UL"||e.vr==="SL")&&e.length===4)value=e.vr==="SL"?d.getInt32(e.start,true):d.getUint32(e.start,true);
else value=decoder.decode(bytes.subarray(e.start,e.next)).replace(/[\0\s]+$/g,"");
out.metadata[key]=value;
}
pos=e.next;
}
if(count>=10000)out.warnings.push("Limite de elementos atingido; leitura parcial.");
if(out.metadata.modality&&out.metadata.modality!=="MG")out.warnings.push("Modalidade declarada não é MG: "+out.metadata.modality);
if(!out.metadata.modality)out.warnings.push("Modalidade não identificada; não classificar como mamografia.");
if(!out.pixelDataPresent)out.warnings.push("Pixel Data não confirmado. A inspeção não demonstra capacidade de renderização.");
if(out.pixelDataPresent)out.warnings.push("Pixel Data localizado, mas não decodificado; não há garantia de exibição fiel.");
return out;
}
function renderGrayscale(buffer,info,canvas,opts={}){
const m=info.metadata||{},ts=info.transferSyntaxUID;
if(!info.pixelDataPresent||info.pixelDataOffset==null)throw Error("Pixel Data ausente.");
if(!["1.2.840.10008.1.2","1.2.840.10008.1.2.1"].includes(ts))throw Error("Transfer Syntax não suportada para renderização.");
const rows=Number(m.rows),cols=Number(m.columns),bits=Number(m.bitsAllocated),stored=Number(m.bitsStored),rep=Number(m.pixelRepresentation||0),frames=Number(m.numberOfFrames||1);
if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows*cols>20000000)throw Error("Dimensões inválidas ou grandes demais.");
if(![8,16].includes(bits)||stored<1||stored>bits||![0,1].includes(rep))throw Error("Representação de pixels não suportada.");
if(!["MONOCHROME1","MONOCHROME2"].includes(m.photometricInterpretation))throw Error("Apenas imagens monocromáticas são suportadas.");
if(!Number.isInteger(frames)||frames<1||frames>500)throw Error("Quantidade de frames inválida ou acima do limite didático (500).");
const frameIndex=opts.frameIndex===undefined?0:opts.frameIndex;
if(!Number.isInteger(frameIndex)||frameIndex<0||frameIndex>=frames)throw Error("Índice do frame fora da série.");
if(m.bitsStored==null||m.bitsAllocated==null||m.pixelRepresentation==null)throw Error("Metadados de representação dos pixels incompletos.");
const bpp=bits/8,n=rows*cols,bytes=n*bpp,offset=info.pixelDataOffset;
if(bytes*frames>info.pixelDataLength||offset+bytes*frames>buffer.byteLength)throw Error("Pixel Data multiframe incompleto.");
const dv=new DataView(buffer,offset+bytes*frameIndex,bytes),pixels=new Float64Array(n);
const mask=(2**stored)-1,sign=2**(stored-1);
let min=Infinity,max=-Infinity;
for(let i=0;i<n;i++){let raw=bits===8?dv.getUint8(i):dv.getUint16(i*2,true);raw&=mask;if(rep&&raw>=sign)raw-=2**stored;pixels[i]=raw;if(raw<min)min=raw;if(raw>max)max=raw;}
const dicomCenter=Number(String(m.windowCenter||"").split("\\")[0]);
const dicomWidth=Number(String(m.windowWidth||"").split("\\")[0]);
const center=Number.isFinite(opts.center)?opts.center:(m.windowCenter!=null&&Number.isFinite(dicomCenter)?dicomCenter:(min+max)/2);
const width=Number.isFinite(opts.width)&&opts.width>0?opts.width:(m.windowWidth!=null&&Number.isFinite(dicomWidth)&&dicomWidth>0?dicomWidth:Math.max(1,max-min));
const low=center-width/2,ctx=canvas.getContext("2d",{willReadFrequently:false});
if(!ctx)throw Error("Canvas indisponível.");
canvas.width=cols;canvas.height=rows;
const image=ctx.createImageData(cols,rows),invert=m.photometricInterpretation==="MONOCHROME1";
for(let i=0;i<n;i++){let gray=Math.max(0,Math.min(255,Math.round((pixels[i]-low)/width*255)));if(invert)gray=255-gray;const p=i*4;image.data[p]=image.data[p+1]=image.data[p+2]=gray;image.data[p+3]=255;}
ctx.putImageData(image,0,0);
return {rows,columns:cols,frameIndex,frameCount:frames,min,max,center,width,photometricInterpretation:m.photometricInterpretation,notice:"Prévia educacional: escala automática; não aplica Modality LUT, VOI LUT, Presentation LUT ou calibração diagnóstica."};
}
global.AmaralMamografiaDicom={inspect,renderGrayscale};
})(typeof window!=="undefined"?window:globalThis);
