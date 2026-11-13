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
[tag(0x0028,0x0101),"bitsStored"],[tag(0x0028,0x0103),"pixelRepresentation"]
]);
const SHORT=new Set(["US","SS","UL","SL"]);const LONG=new Set(["OB","OD","OF","OL","OV","OW","SQ","UC","UR","UT","UN","SV","UV"]);
function inspect(buffer){
if(!(buffer instanceof ArrayBuffer))throw Error("É necessário um ArrayBuffer.");
const d=new DataView(buffer), bytes=new Uint8Array(buffer);
if(bytes.length<132||String.fromCharCode(...bytes.slice(128,132))!=="DICM")throw Error("Arquivo sem preâmbulo DICOM Part 10; não é possível validar este formato.");
const decoder=new TextDecoder("ascii"),out={transferSyntaxUID:null,metadata:{},warnings:[],pixelDataPresent:false,pixelDataOffset:null};
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
if(e.group===0x7fe0&&e.element===0x0010){out.pixelDataPresent=true;out.pixelDataOffset=pos;break;}
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
global.AmaralMamografiaDicom={inspect};
})(typeof window!=="undefined"?window:globalThis);
