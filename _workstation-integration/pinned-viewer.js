/* Keep the acquisition on screen; scroll only the reading/controls pane. */
(()=>{'use strict';
 function init(){
  const root=document.querySelector('.grid,.layout,.dbt-layout');
  if(!root||root.classList.contains('pinned-workspace'))return;
  const reading=root.querySelector(':scope > aside'),column=reading?.nextElementSibling;
  const image=column?.firstElementChild;
  if(!reading||!image||!image.querySelector('.screens,#viewport,#realViewport'))return;
  // Move nodes, keeping existing inputs, listeners, canvases and image URLs.
  for(const node of [...column.children])if(node!==image)reading.append(node);
  const details=image.querySelector(':scope > details');
  if(details){const card=document.createElement('section');card.className='dbt-card';card.append(details);reading.append(card);}
  for(let node=root.nextElementSibling;node;){const next=node.nextElementSibling;reading.append(node);node=next;}
  column.replaceWith(image);
  reading.classList.add('pinned-reading');reading.tabIndex=0;
  reading.setAttribute('role','region');reading.setAttribute('aria-label','Controles e textos — rolagem independente');
  image.classList.add('pinned-image');root.classList.add('pinned-workspace');
  let broughtIntoView=false;
  const reveal=()=>{
   const active=image.querySelector('img')||[...image.querySelectorAll('canvas')].find(c=>c.width>1&&c.height>1);
   if(active&&!broughtIntoView){broughtIntoView=true;root.scrollIntoView({block:'start',behavior:'instant'});}
  };
  new MutationObserver(reveal).observe(image,{childList:true,subtree:true,attributes:true,attributeFilter:['src','width','height']});
  reveal();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
