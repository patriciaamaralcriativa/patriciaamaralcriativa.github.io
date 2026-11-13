export function orderedParticipants(participants,options){
 const list=participants.map((p,i)=>({...p,name:options.names?p.name:'Aluno '+String(i+1).padStart(2,'0')}));
 const [key,direction]=options.order.split('_'),sign=direction==='desc'?-1:1;
 const original=new Map(list.map((p,i)=>[p.id,i]));
 return list.sort((a,b)=>{
  let difference=key==='name'?a.name.localeCompare(b.name,'pt-BR',{numeric:true,sensitivity:'base'}):key==='score'?a.score-b.score:a.progress_percent-b.progress_percent;
  return difference*sign||original.get(a.id)-original.get(b.id);
 });
}

export function answerCell(participant,index,options){
 const result=participant.answer_results[index],answered=result!==null&&result!==undefined;
 const status=!answered?'Não respondida':options.results?(result?'Correta':'Incorreta'):'Respondida';
 const className=!answered?'answer-pending':options.results?(result?'answer-correct':'answer-incorrect'):'answer-received';
 const response=answered&&options.responses?participant.answer_labels?.[index]??'Recebida':null;
 const marker=!answered?'—':options.results?(result?'✓':'✕'):'●';
 return{status,className,text:response===null?marker:(options.results?marker+' ':'')+response,description:status+(response===null?'':' · Resposta: '+response)};
}
