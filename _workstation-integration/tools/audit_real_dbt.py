"""Auditoria privada: arquivos de entrada nunca são gravados no repositório.
OpenJPEG/Pillow comparado ao decodificador JPEG2000 nativo do FFmpeg, quadro a quadro.
"""
import argparse,hashlib,io,json,subprocess,time,resource
from pathlib import Path
import numpy as np
import pydicom
from pydicom.encaps import generate_frames,generate_fragments,parse_basic_offsets
from PIL import Image,ImageDraw

def sha(b):return hashlib.sha256(b).hexdigest()
def run(inputs,output):
 output.mkdir(parents=True,exist_ok=True);start=time.time();results=[]
 for path in sorted(inputs.glob('*.dcm')):
  began=time.time();d=pydicom.dcmread(path);name=path.name.replace('(1)','');n=int(d.NumberOfFrames);h,w=int(d.Rows),int(d.Columns)
  shared=d.SharedFunctionalGroupsSequence[0];anatomy=shared.FrameAnatomySequence[0];voi=shared.FrameVOILUTSequence[0];transform=shared.PixelValueTransformationSequence[0];pm=shared.PixelMeasuresSequence[0]
  positions=[list(map(float,x.PlanePositionSequence[0].ImagePositionPatient)) for x in d.PerFrameFunctionalGroupsSequence];orientations=[list(map(float,x.PlaneOrientationSequence[0].ImageOrientationPatient)) for x in d.PerFrameFunctionalGroupsSequence]
  r={'file':name,'bytes':path.stat().st_size,'sha256':sha(path.read_bytes()),'sopClass':str(d.SOPClassUID),'sopInstance':str(d.SOPInstanceUID),'study':str(d.StudyInstanceUID),'series':str(d.SeriesInstanceUID),'transferSyntax':str(d.file_meta.TransferSyntaxUID),'modality':str(d.Modality),'frames':n,'rows':h,'columns':w,'bitsAllocated':int(d.BitsAllocated),'bitsStored':int(d.BitsStored),'highBit':int(d.HighBit),'pixelRepresentation':int(d.PixelRepresentation),'photometric':str(d.PhotometricInterpretation),'viewDeclared':str(d.get('ViewPosition','')),'viewCodes':[{'code':str(x.CodeValue),'scheme':str(x.CodingSchemeDesignator),'meaning':str(x.CodeMeaning)} for x in d.get('ViewCodeSequence',[])],'lateralityDeclared':str(anatomy.get('FrameLaterality','')),'pixelSpacing':list(map(float,pm.get('PixelSpacing',[]))),'sliceThicknessDeclared':str(pm.get('SliceThickness','')),'slope':float(transform.RescaleSlope),'intercept':float(transform.RescaleIntercept),'windowCenter':float(voi.WindowCenter),'windowWidth':float(voi.WindowWidth),'voiFunction':str(voi.get('VOILUTFunction','LINEAR')),'positions':positions,'orientations':orientations,'geometryValidated':False,'spatialOrderValidated':False,'uniquePositions':len(set(map(tuple,positions))),'privacy':{'identityRemovedDeclared':str(d.get('PatientIdentityRemoved','')),'burnedInAnnotationDeclared':str(d.get('BurnedInAnnotation','')),'pseudonymPattern':str(d.get('PatientID','')).startswith('DBT-P') and str(d.get('PatientName',''))==str(d.get('PatientID','')),'birthDatePresent':bool(d.get('PatientBirthDate')),'accessionPresent':bool(d.get('AccessionNumber')),'privateTags':sum(x.tag.is_private for x in d.iterall()),'anonymizationCertified':False},'frameResults':[],'errors':[]}
  try:
   stream=io.BytesIO(d.PixelData);offsets=parse_basic_offsets(stream);fragments=list(generate_fragments(stream));r['encapsulation']={'botEntries':len(offsets),'fragments':len(fragments),'fragmentBytes':sum(len(x) for x in fragments),'startsSOC':all(x.startswith(b'\xff\x4f') for x in fragments),'endsEOC':all(x.rstrip(b'\0').endswith(b'\xff\xd9') for x in fragments)}
  except Exception as e:r['errors'].append('encapsulation: '+str(e))
  sample_indices={0,n//2,n-1};samples=[]
  for index,codestream in enumerate(generate_frames(d.PixelData,number_of_frames=n)):
   image=Image.open(io.BytesIO(codestream));a=np.asarray(image);assert a.shape==(h,w) and a.dtype==np.uint16
   p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-threads','1','-c:v','jpeg2000','-f','j2k_pipe','-i','pipe:0','-frames:v','1','-f','rawvideo','-pix_fmt','gray16le','pipe:1'],input=codestream[:-1] if codestream.endswith(b'\xff\xd9\0') else codestream,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=60)
   assert p.returncode==0 and not p.stderr,p.stderr.decode()[:300]
   assert len(p.stdout)==h*w*2,'dimensão decodificada incorreta'
   b=np.frombuffer(p.stdout,dtype='<u2').reshape(h,w);equal=np.array_equal(a,b);assert equal,'divergência entre decodificadores'
   assert int(a.max())<2**r['bitsStored']
   fr={'index':index,'sha256':sha(a.astype('<u2',copy=False).tobytes()),'min':int(a.min()),'max':int(a.max()),'independentMatch':bool(equal)};r['frameResults'].append(fr)
   if index in sample_indices:
    center,width=r['windowCenter'],r['windowWidth'];v=a.astype(np.float64)*r['slope']+r['intercept'];gray=np.clip(np.floor(((v-(center-.5))/(width-1)+.5)*255+.5),0,255).astype('uint8');im=Image.fromarray(gray);im.thumbnail((512,700));samples.append((index,im));im.save(output/(name+'-frame-'+str(index)+'.png'))
   if index%20==0:print(name,index,'/',n,flush=True)
  assert len(r['frameResults'])==n
  r['decodedFrames']=len(r['frameResults']);r['decodeStatus']='passed';r['independentDecoder']='FFmpeg native jpeg2000 (not libopenjpeg)';r['seconds']=round(time.time()-began,2)
  montage=Image.new('RGB',(len(samples)*530,750),'#ffffff');draw=ImageDraw.Draw(montage)
  for j,(index,im) in enumerate(samples):montage.paste(im,(j*530,30));draw.text((j*530+5,5),name[:8]+' | frame '+str(index+1)+' | ORIENTACAO NAO CONFIRMADA',fill='black')
  montage.save(output/(name+'-contact.png'))
  results.append(r);(output/'real-audit-private.json').write_text(json.dumps({'files':results,'seconds':round(time.time()-start,2),'peakRssMiB':round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1)},ensure_ascii=False,indent=2))
  print(name,'COMPLETE',n,flush=True)
 return results
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('inputs',type=Path);p.add_argument('output',type=Path);a=p.parse_args();run(a.inputs,a.output)
