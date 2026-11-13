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
const decoder=new TextDecoder("ascii"),out={transferSyntaxUID:null,metadata:{},warnings:[],pixelDataPresent:false,pixelDataOffset:null,pixelDataLength:null,functionalGroupsPresent:false,imageType:"unknown",frameSummary:null,geometryAttributes:{imagePositionPatient:null,imageOrientationPatient:null,spacingBetweenSlices:null,sliceThickness:null},functionalGroupSummary:{sharedPresent:false,perFramePresent:false,sharedLength:null,perFrameLength:null,sharedItems:null,perFrameItems:null,sharedStructureValidated:false,perFrameStructureValidated:false,sharedItemHeaders:[],perFrameItemHeaders:[],parsed:false}};
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
function inspectItemTopLevelTags(start,end,explicit){
const tags=[];let p=start,steps=0;
while(p<end&&steps++<1000){
if(p+8>end)return {valid:false,tags:[]};
const group=d.getUint16(p,true),elementNumber=d.getUint16(p+2,true);
if(group===0xfffe)return {valid:false,tags:[]};
let head=8,len,vr=null;
if(explicit){
vr=String.fromCharCode(bytes[p+4],bytes[p+5]);
if(!/^[A-Z]{2}$/.test(vr))return {valid:false,tags:[]};
if(LONG.has(vr)){head=12;if(p+head>end)return {valid:false,tags:[]};len=d.getUint32(p+8,true);}
else len=d.getUint16(p+6,true);
}else len=d.getUint32(p+4,true);
if(len===0xffffffff||len>end-p-head)return {valid:false,tags:[]};
tags.push({group,element:elementNumber,vr,byteLength:len});
p+=head+len;
}
return {valid:p===end,tags:p===end?tags:[]};
}
function inspectNestedSequenceHeaders(start,end,explicit){
const result={validated:false,itemCount:null,items:[]};
let p=start,count=0;
while(p<end&&count<500){
if(p+8>end)return result;
const group=d.getUint16(p,true),el=d.getUint16(p+2,true),len=d.getUint32(p+4,true);
if(group!==0xfffe||el!==0xe000||len===0xffffffff||len>end-p-8)return result;
const itemStart=p+8,itemEnd=itemStart+len;
const inner=inspectItemTopLevelTags(itemStart,itemEnd,explicit);
if(!inner.valid)return result;
result.items.push({byteLength:len,topLevelTags:inner.tags,geometry:inspectNestedGeometry(itemStart,itemEnd,explicit)});
count++;p=itemEnd;
}
if(p===end){result.validated=true;result.itemCount=count;}
else result.items=[];
return result;
}
function inspectNestedGeometry(start,end,explicit){
const result={validated:false,imagePositionPatient:null,imageOrientationPatient:null};
let p=start,steps=0;
while(p<end&&steps++<100){
if(p+8>end)return result;
const group=d.getUint16(p,true),el=d.getUint16(p+2,true);
if(group===0xfffe)return result;
let len,head=8,vr=null;
if(explicit){
vr=String.fromCharCode(bytes[p+4],bytes[p+5]);
if(!/^[A-Z]{2}$/.test(vr))return result;
if(LONG.has(vr)){head=12;if(p+head>end)return result;len=d.getUint32(p+8,true);}
else len=d.getUint16(p+6,true);
}else len=d.getUint32(p+4,true);
if(len===0xffffffff||len>end-p-head)return result;
const key=group===0x0020&&el===0x0032?"imagePositionPatient":group===0x0020&&el===0x0037?"imageOrientationPatient":null;
if(key){
if(explicit&&vr!=="DS")return result;
const tokens=decoder.decode(bytes.subarray(p+head,p+head+len)).replace(/[\0\s]+$/g,"").split("\\").map(x=>x.trim());
const values=tokens.map(Number),expected=key==="imagePositionPatient"?3:6;
if(tokens.length!==expected||tokens.some(x=>x==="")||!values.every(Number.isFinite))return result;
result[key]=values;
}
p+=head+len;
}
result.validated=p===end;
return result;
}
function inspectFunctionalItemHeaders(e,explicit){
const result={itemCount:0,structureValidated:false,items:[]};let p=e.start;
while(p<e.next&&result.itemCount<500){
if(p+8>e.next)return result;
const group=d.getUint16(p,true),el=d.getUint16(p+2,true),len=d.getUint32(p+4,true);
if(group!==0xfffe||el!==0xe000||len===0xffffffff||len>e.next-p-8)return result;
const start=p+8,end=start+len;
const content=inspectItemTopLevelTags(start,end,explicit);const nestedSequences=content.valid?content.tags.filter(t=>t.vr==="SQ").map(t=>{let q=start;while(q<end){const inner=element(q,explicit);if(!inner||inner.next>end)break;if(inner.group===t.group&&inner.element===t.element)return {group:t.group,element:t.element,...inspectNestedSequenceHeaders(inner.start,inner.next,explicit)};q=inner.next;}return {group:t.group,element:t.element,validated:false,itemCount:null,items:[]};}):[];
result.items.push({byteLength:len,empty:len===0,topLevelTags:content.tags,topLevelTagsValidated:content.valid,nestedSequences});
result.itemCount++;p=end;
}
result.structureValidated=p===e.next;
if(!result.structureValidated)result.itemCount=null;
return result;
}
function summarizeFunctionalSequence(e){
const end=e.next;let p=e.start,items=0,valid=true;
while(p<end){
if(p+8>end){valid=false;break;}
const g=d.getUint16(p,true),el=d.getUint16(p+2,true),len=d.getUint32(p+4,true);
if(g!==0xfffe||el!==0xe000||len===0xffffffff||len>end-p-8){valid=false;break;}
p+=8+len;items++;
if(items>500){valid=false;break;}
}
return {itemCount:valid&&p===end?items:null,structureValidated:valid&&p===end};
}
let count=0;
while(pos<bytes.length&&count++<10000){
const group=d.getUint16(pos,true);const meta=group===0x0002;
const explicit=meta||syntax!=="1.2.840.10008.1.2";
const e=element(pos,explicit);if(!e)break;
if(e.group===0x5200&&(e.element===0x9229||e.element===0x9230)){out.functionalGroupsPresent=true;const shared=e.element===0x9229;out.functionalGroupSummary[shared?"sharedPresent":"perFramePresent"]=true;out.functionalGroupSummary[shared?"sharedLength":"perFrameLength"]=e.length;const structure=summarizeFunctionalSequence(e);const headers=inspectFunctionalItemHeaders(e,explicit);out.functionalGroupSummary[shared?"sharedItemHeaders":"perFrameItemHeaders"]=headers.structureValidated?headers.items:[];out.functionalGroupSummary[shared?"sharedItems":"perFrameItems"]=structure.itemCount;out.functionalGroupSummary[shared?"sharedStructureValidated":"perFrameStructureValidated"]=structure.structureValidated;if(!structure.structureValidated)out.warnings.push("Estrutura de itens da sequência funcional não validada.");out.warnings.push("Sequências funcionais multiframe identificadas; conteúdo por frame não interpretado.");}
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
if(raw!=null){const tokens=String(raw).split("\\").map(x=>x.trim());const values=tokens.map(Number);
const expected=key==="imagePositionPatient"?3:key==="imageOrientationPatient"?6:1;
if(values.length===expected&&tokens.every(x=>x!=="")&&values.every(Number.isFinite))out.geometryAttributes[key]=values;
else out.warnings.push("Atributo geométrico inválido ou não interpretável: "+key);
}}
if(out.imageType==="breast-tomosynthesis"){
const declared=out.metadata.numberOfFrames==null?null:Number(out.metadata.numberOfFrames);
const valid=Number.isSafeInteger(declared)&&declared>0&&declared<=500;
out.frameSummary={declaredFrames:valid?declared:null,frameCountValidated:valid,geometryValidated:false,frameOrderValidated:false};
if(!valid)out.warnings.push("Número de frames DBT ausente, inválido ou acima do limite didático.");
if(out.functionalGroupSummary.perFramePresent){
const fg=out.functionalGroupSummary;
out.frameSummary.perFrameItemCount=fg.perFrameItems;
out.frameSummary.perFrameCountMatchesDeclared=fg.perFrameStructureValidated&&valid?fg.perFrameItems===declared:null;
if(out.frameSummary.perFrameCountMatchesDeclared===false)out.warnings.push("Quantidade de itens Per-frame Functional Groups difere do Number of Frames.");
if(!fg.perFrameStructureValidated)out.warnings.push("Não foi possível conferir quantidade de itens por frame: estrutura não validada.");
}
if(out.functionalGroupSummary.sharedPresent){
const fg=out.functionalGroupSummary;
out.frameSummary.sharedItemCountValid=fg.sharedStructureValidated?fg.sharedItems===1:null;
if(out.frameSummary.sharedItemCountValid===false)out.warnings.push("Shared Functional Groups Sequence deve conter exatamente um item.");
}

const perFrameHeaders=out.functionalGroupSummary.perFrameItemHeaders;
out.frameSummary.frameGeometryObservations=perFrameHeaders.map((header,index)=>{
const observations=[];
for(const sequence of header.nestedSequences||[]){
if(sequence.group!==0x0020||![0x9113,0x9116].includes(sequence.element)||!sequence.validated)continue;
for(const item of sequence.items||[]){
if(!item.geometry?.validated)continue;
if(sequence.element===0x9113&&item.geometry.imagePositionPatient)observations.push({attribute:"imagePositionPatient",values:item.geometry.imagePositionPatient});
if(sequence.element===0x9116&&item.geometry.imageOrientationPatient)observations.push({attribute:"imageOrientationPatient",values:item.geometry.imageOrientationPatient});
}
}
return {frameIndex:index,observations,geometryValidated:false};
});
if(out.frameSummary.frameGeometryObservations.some(x=>x.observations.length>0))out.warnings.push("Coordenadas associadas aos índices de frame apenas para inspeção; ordem espacial e reconstrução não validadas.");
const sharedHeaders=out.functionalGroupSummary.sharedItemHeaders;
const sharedGeometryObservations=[];
if(sharedHeaders.length===1){
for(const sequence of sharedHeaders[0].nestedSequences||[]){
if(sequence.group!==0x0020||![0x9113,0x9116].includes(sequence.element)||!sequence.validated)continue;
for(const item of sequence.items||[]){
if(!item.geometry?.validated)continue;
if(sequence.element===0x9113&&item.geometry.imagePositionPatient)sharedGeometryObservations.push({attribute:"imagePositionPatient",values:item.geometry.imagePositionPatient});
if(sequence.element===0x9116&&item.geometry.imageOrientationPatient)sharedGeometryObservations.push({attribute:"imageOrientationPatient",values:item.geometry.imageOrientationPatient});
}
}
}
out.frameSummary.sharedGeometryObservations=sharedGeometryObservations;
out.frameSummary.effectiveGeometryObservations=out.frameSummary.frameGeometryObservations.map(frame=>{
const resolved=[];
for(const attribute of ["imagePositionPatient","imageOrientationPatient"]){
const own=frame.observations.filter(x=>x.attribute===attribute);
const shared=sharedGeometryObservations.filter(x=>x.attribute===attribute);
if(own.length===1)resolved.push({attribute,values:own[0].values,source:"per-frame"});
else if(own.length===0&&shared.length===1)resolved.push({attribute,values:shared[0].values,source:"shared"});
}
return {frameIndex:frame.frameIndex,observations:resolved,geometryValidated:false};
});
if(sharedGeometryObservations.length)out.warnings.push("Geometria compartilhada combinada apenas para inspeção preliminar; geometria e ordem espacial não validadas.");
const geometryConflicts=[];
const epsilon=1e-6;
for(const frame of out.frameSummary.frameGeometryObservations){
for(const attribute of ["imagePositionPatient","imageOrientationPatient"]){
const own=frame.observations.filter(o=>o.attribute===attribute);
const shared=sharedGeometryObservations.filter(o=>o.attribute===attribute);
if(own.length===1&&shared.length===1){
const differing=own[0].values.length!==shared[0].values.length||own[0].values.some((v,j)=>Math.abs(v-shared[0].values[j])>epsilon);
if(differing)geometryConflicts.push({frameIndex:frame.frameIndex,attribute,kind:"shared-per-frame-difference"});
}
}
}
out.frameSummary.geometryConflicts=geometryConflicts;
out.frameSummary.orientationConsistency={
framesWithOrientation:out.frameSummary.effectiveGeometryObservations.filter(frame=>frame.observations.some(o=>o.attribute==="imageOrientationPatient")).length,
allObservedOrientationsEqual:(()=>{
const orientations=out.frameSummary.effectiveGeometryObservations.map(frame=>frame.observations.find(o=>o.attribute==="imageOrientationPatient")?.values).filter(Boolean);
return orientations.length>0&&orientations.every(values=>values.length===orientations[0].length&&values.every((v,j)=>Math.abs(v-orientations[0][j])<=epsilon));
})(),
geometryValidated:false
};
if(geometryConflicts.length)out.warnings.push("Diferenças entre geometria compartilhada e por frame identificadas; avaliar atributos e semântica antes de concluir conflito.");
function checkOrientationVectors(values){
if(!Array.isArray(values)||values.length!==6||!values.every(Number.isFinite))return {valid:false,reason:"invalid-components"};
const a=values.slice(0,3),b=values.slice(3,6);
const norm=v=>Math.hypot(...v);
const na=norm(a),nb=norm(b),dot=a.reduce((sum,v,i)=>sum+v*b[i],0);
const tolerance=1e-4;
return {valid:Math.abs(na-1)<=tolerance&&Math.abs(nb-1)<=tolerance&&Math.abs(dot)<=tolerance,
rowNorm:na,columnNorm:nb,dotProduct:dot,tolerance};
}
out.frameSummary.orientationVectorChecks=out.frameSummary.effectiveGeometryObservations.map(frame=>{
const orientation=frame.observations.find(o=>o.attribute==="imageOrientationPatient");
return {frameIndex:frame.frameIndex,present:!!orientation,...(orientation?checkOrientationVectors(orientation.values):{valid:false,reason:"not-observed"})};
});
if(out.frameSummary.orientationVectorChecks.some(x=>x.present&&!x.valid))out.warnings.push("Vetores de orientação observados não satisfazem os critérios matemáticos preliminares de normalização e ortogonalidade.");
out.frameSummary.planeNormalObservations=out.frameSummary.effectiveGeometryObservations.map((frame,index)=>{
const position=frame.observations.find(o=>o.attribute==="imagePositionPatient")?.values;
const orientation=frame.observations.find(o=>o.attribute==="imageOrientationPatient")?.values;
const validOrientation=out.frameSummary.orientationVectorChecks[index]?.valid===true;
if(!position||!validOrientation)return {frameIndex:frame.frameIndex,computed:false,reason:!position?"position-not-observed":"orientation-not-validated"};
const a=orientation.slice(0,3),b=orientation.slice(3,6);
const normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const signedProjection=position.reduce((sum,v,j)=>sum+v*normal[j],0);
return {frameIndex:frame.frameIndex,computed:true,normal,signedProjection,spatialOrderValidated:false};
});
out.frameSummary.planeNormalConsistency={
computedFrames:out.frameSummary.planeNormalObservations.filter(o=>o.computed).length,
allNormalsParallel:(()=>{
const normals=out.frameSummary.planeNormalObservations.filter(o=>o.computed).map(o=>o.normal);
if(!normals.length)return null;
const reference=normals[0],epsilon=1e-4;
return normals.every(n=>Math.abs(Math.abs(n.reduce((sum,v,j)=>sum+v*reference[j],0))-1)<=epsilon);
})(),
spatialOrderValidated:false
};
if(out.frameSummary.planeNormalConsistency.allNormalsParallel===false)out.warnings.push("Normais dos planos observados não são paralelas; interpretação espacial requer revisão.");



const observations=out.frameSummary.frameGeometryObservations;
const positionCounts=observations.map(f=>f.observations.filter(o=>o.attribute==="imagePositionPatient").length);
const orientationCounts=observations.map(f=>f.observations.filter(o=>o.attribute==="imageOrientationPatient").length);
out.frameSummary.geometryConsistency={
framesInspected:observations.length,
framesMissingPosition:positionCounts.filter(n=>n===0).length,
framesMissingOrientation:orientationCounts.filter(n=>n===0).length,
framesWithDuplicatePosition:positionCounts.filter(n=>n>1).length,
framesWithDuplicateOrientation:orientationCounts.filter(n=>n>1).length,
allFramesHaveUniquePosition:observations.length>0&&positionCounts.every(n=>n===1),
allFramesHaveUniqueOrientation:observations.length>0&&orientationCounts.every(n=>n===1),
spatialOrderValidated:false
};
if(positionCounts.some(n=>n>1)||orientationCounts.some(n=>n>1))out.warnings.push("Atributos geométricos duplicados em pelo menos um frame; verificar origem DICOM.");
if(observations.length>0&&(positionCounts.some(n=>n===0)||orientationCounts.some(n=>n===0)))out.warnings.push("Posição ou orientação ausente na inspeção preliminar de um ou mais frames; atributos compartilhados ainda não consolidados.");

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
