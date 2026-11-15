import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';
import {Scene,PerspectiveCamera,WebGLRenderer,Group,Mesh,MeshStandardMaterial,SphereGeometry,BoxGeometry,ConeGeometry,TorusGeometry,AmbientLight,DirectionalLight,Color,SRGBColorSpace} from 'three';
export function mountMascot3D(element,look,{motion=true}={}){
 let renderer,svgRenderer=false;
 try{renderer=new WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{renderer=new SVGRenderer();renderer.setQuality('low');renderer.setPrecision(2);svgRenderer=true;}
 renderer.outputColorSpace=SRGBColorSpace;renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));
 renderer.domElement.classList.add('mascot-scene');renderer.domElement.setAttribute('aria-hidden','true');element.appendChild(renderer.domElement);element.classList.add('has-webgl');
 const scene=new Scene(),camera=new PerspectiveCamera(35,1,.1,100);camera.position.set(0,1.1,6);camera.lookAt(0,.3,0);
 scene.add(new AmbientLight(0xffffff,svgRenderer ? 0.7 : 2));const key=new DirectionalLight(0xffffff,svgRenderer?1.2:4);key.position.set(-3,5,5);scene.add(key);const rim=new DirectionalLight(0x20efff,svgRenderer ? 0.65 : 3);rim.position.set(4,2,-2);scene.add(rim);
 const colors={violet:'#8b48f5',cyan:'#1dc9df',pink:'#f43c9a',lime:'#a3d82e',orange:'#ff9a31',blue:'#477cf7'};
 const mat=new MeshStandardMaterial({color:new Color(colors[look.color]||colors.violet),metalness:.25,roughness:.24});const white=new MeshStandardMaterial({color:0xf4f9ff,metalness:.12,roughness:.26});const dark=new MeshStandardMaterial({color:0x101b48,metalness:.25,roughness:.2});const cyan=new MeshStandardMaterial({color:0x66f5ff,emissive:0x18aabb,emissiveIntensity:.5,roughness:.2});const gold=new MeshStandardMaterial({color:0xffd446,metalness:.55,roughness:.22});
 const sphere=(r,w,h)=>new SphereGeometry(r,svgRenderer?Math.max(8,Math.round(w/2)):w,svgRenderer?Math.max(6,Math.round(h/2)):h);
 const group=new Group();scene.add(group);const mesh=(geometry,material,x,y,z,sx=1,sy=1,sz=1,parent=group)=>{const m=new Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;};
 mesh(sphere(.65,28,20),mat,0,-.25,0,1,.95,.8);
 const head=mesh(sphere(.85,32,24),look.kind==='astro'?white:mat,0,.78,0,1,look.kind==='comet'?1.05:.9,.85);
 const visor=mesh(sphere(.75,28,20),dark,0,.82,.43,1,.55,.45);
 const eyes=[];for(const x of[-.27,.27])eyes.push(mesh(sphere(.13,16,12),cyan,x,.92,.77,1,1.15,.42));
 const mouth=mesh(new TorusGeometry(.18,.026,8,24,Math.PI),cyan,0,.73,.79);mouth.rotation.z=Math.PI;
 const arms=[];for(const side of[-1,1]){const arm=new Group();arm.position.set(side*.65,-.14,0);group.add(arm);mesh(sphere(.2,16,12),mat,side*.18,-.2,0,1,1.6,1,arm);mesh(sphere(.19,16,12),white,side*.23,-.43,.06,1,1,1,arm);arms.push(arm);mesh(sphere(.22,16,12),white,side*.32,-.86,.11,1.15,.6,1.5);}
 mesh(sphere(.21,16,12),gold,0,-.24,.52,1,1,.35);
 if(look.kind==='robot'){mesh(new ConeGeometry(.05,.32,12),white,0,1.61,0);mesh(sphere(.13,16,12),cyan,0,1.84,0);}
 if(look.kind==='cat'){for(const side of[-1,1]){const ear=mesh(new ConeGeometry(.23,.5,3),mat,side*.54,1.5,0);ear.rotation.z=-side*.23;mesh(new ConeGeometry(.13,.3,3),gold,side*.54,1.52,.11);}}
 if(look.kind==='comet'){for(const side of[-1,0,1]){const ray=mesh(new ConeGeometry(.16,.5,8),gold,side*.34,1.6,0);ray.rotation.z=-side*.35;}}
 if(look.kind==='astro'){const halo=mesh(new TorusGeometry(.88,.07,12,48),cyan,0,.78,0);halo.rotation.x=.15;mesh(new BoxGeometry(.3,.2,.17),white,-.94,.7,0);mesh(new BoxGeometry(.3,.2,.17),white,.94,.7,0);}
 if(look.accessory==='glasses'){for(const x of[-.27,.27])mesh(new TorusGeometry(.21,.035,10,28),gold,x,.94,.83);mesh(new BoxGeometry(.15,.04,.04),gold,0,.95,.84);}
 if(look.accessory==='headphones'){const band=mesh(new TorusGeometry(.91,.08,10,40,Math.PI),gold,0,.89,0);for(const side of[-1,1])mesh(sphere(.23,16,12),gold,side*.88,.76,0,.65,1.2,1);}
 if(look.accessory==='crown'){mesh(new BoxGeometry(.68,.12,.42),gold,0,1.54,0);for(const side of[-1,0,1])mesh(new ConeGeometry(.15,.32,4),gold,side*.25,1.74,0);}
 const pedestal=mesh(new TorusGeometry(1.02,.045,12,64),cyan,0,-1.03,0);pedestal.rotation.x=Math.PI/2;
 let running=true,frame=0,last=0,tilt=0,target=0;
 const resize=()=>{const w=Math.max(element.clientWidth,200),h=Math.max(element.clientHeight,230);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();const observer=new ResizeObserver(resize);observer.observe(element);
 const move=e=>{const r=element.getBoundingClientRect();target=((e.clientX-r.left)/r.width-.5)*.6;};element.addEventListener('pointermove',move);const reset=()=>target=0;element.addEventListener('pointerleave',reset);
 function draw(t){if(!running)return;frame=requestAnimationFrame(draw);if(t-last<(svgRenderer?100:33)||document.hidden)return;last=t;const animate=motion&&!document.documentElement.classList.contains('motion-off');const clock=t/1000;tilt+=(target-tilt)*.08;group.rotation.y=animate?Math.sin(clock*.7)*.18+tilt:0;group.position.y=animate?Math.sin(clock*1.8)*.09:0;const mood=element.dataset.mood;group.rotation.z=animate&&mood==='correct'?Math.sin(clock*5)*.09:animate&&mood==='wrong'?Math.sin(clock*8)*.04:0;arms[1].rotation.z=animate?-.3-Math.sin(clock*2)*.2:-.2;arms[0].rotation.z=.2;for(const e of eyes)e.scale.y=animate&&Math.sin(clock*1.2)>.995?.15:1.15;renderer.render(scene,camera);if(svgRenderer)renderer.domElement.style.backgroundColor='transparent';}frame=requestAnimationFrame(draw);
 return()=>{running=false;cancelAnimationFrame(frame);observer.disconnect();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',reset);scene.traverse(obj=>{obj.geometry?.dispose()});for(const material of[mat,white,dark,cyan,gold])material.dispose();renderer.dispose?.();renderer.forceContextLoss?.();renderer.domElement.remove();element.classList.remove('has-webgl');};
}
