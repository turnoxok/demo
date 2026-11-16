/* tema.js — logo y colores de la marca para TODAS las páginas (sitio 3D, planes, galería, invitaciones, reservar, panel).
   Los colores originales (verde Planeta Niños) están escritos en cada página como var(--t-xxxxxx, respaldo). Acá se recalculan a partir del color de la marca
   girando el tono y conservando luminosidad: el contraste y la legibilidad no se pierden con ninguna marca.
   Fuentes de configuración, en orden: parámetros ?color= ?color2= ?logo= ?nombre= (vista rápida; ?tema=borrar vuelve al original) y lo guardado en este navegador. */
(function(){
var ORIG=/*ORIG*/["0e200b", "0e220b", "1e3a19", "223d1e", "23431d", "25a244", "274422", "2c5026", "2f5429", "305629", "325a2b", "355c2e", "356030", "386230", "406c38", "477a3d", "83b27c", "8be3ae", "b1c74d", "d4e48a", "dcea9a"]/*FIN*/,K='tuweeb-tema-v1',REF='406c38',R=document.documentElement,cfg=null,q={};
function ls(a,k,v){try{if(a==='g')return localStorage.getItem(k);if(a==='s')localStorage.setItem(k,v);else localStorage.removeItem(k)}catch(e){}return null}
function rgb(h){return[0,2,4].map(function(i){return parseInt(h.substr(i,2),16)})}
function toHsl(h){var c=rgb(h).map(function(v){return v/255}),M=Math.max.apply(0,c),m=Math.min.apply(0,c),l=(M+m)/2,s=0,H=0;if(M!==m){var d=M-m;s=l>.5?d/(2-M-m):d/(M+m);H=M===c[0]?(c[1]-c[2])/d+(c[1]<c[2]?6:0):M===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4;H*=60}return[H,s,l]}
function toHex(H,s,l){H=((H%360)+360)%360/360;function f(p,q2,t){t<0&&(t+=1);t>1&&(t-=1);return t<1/6?p+(q2-p)*6*t:t<.5?q2:t<2/3?p+(q2-p)*(2/3-t)*6:p}var r,g,b;if(!s)r=g=b=l;else{var q2=l<.5?l*(1+s):l+s-l*s,p=2*l-q2;r=f(p,q2,H+1/3);g=f(p,q2,H);b=f(p,q2,H-1/3)}return[r,g,b].map(function(v){return('0'+Math.round(v*255).toString(16)).slice(-2)}).join('')}
function limpio(c){c=String(c||'').trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(c))c=c.replace(/./g,'$&$&');return /^[0-9a-f]{6}$/i.test(c)?c.toLowerCase():''}
function logoOk(u){u=String(u||'').trim();return /^(https:\/\/|data:image\/(svg\+xml|png|jpeg|webp)|\.{0,2}\/[\w./-]+$)/i.test(u)?u:''}
try{new URLSearchParams(location.search).forEach(function(v,k){q[k]=v})}catch(e){}
if(q.tema==='borrar')ls('r',K);
try{cfg=JSON.parse(ls('g',K)||'null')}catch(e){}
if(q.color||q.color2||q.logo||q.nombre){cfg=cfg||{};if(q.color)cfg.color=limpio(q.color);if(q.color2)cfg.color2=limpio(q.color2);if(q.logo)cfg.logo=logoOk(q.logo);if(q.nombre)cfg.nombre=q.nombre.slice(0,60);ls('s',K,JSON.stringify(cfg))}
var mapa=null,T=window.TEMA={color:'',color2:'',logo:'',nombre:'',delta:0,aplicar:aplicar,guardar:guardar};
/* Para el 3D: recibe tono(0-360), saturación y luminosidad (0-1) de un color y devuelve el color de la marca, o null si no es de la familia verde original */
T.mapHsl=function(h,s,l){if(!mapa||!T.color)return null;h=((h%360)+360)%360;if(h<60||h>175||s<.15||l<.08||l>.97)return null;var r=mapa([h,s,l]);return[((r[0]%360)+360)%360,r[1],r[2]]};
/* Logo para el 3D: solo si es un SVG; el visor lo extruye. Se devuelve con su proporción para encajarlo en el lugar del logo original */
function svg3d(u){if(!/^data:image\/svg\+xml/i.test(u||''))return null;try{var p=u.split(','),x=p.slice(1).join(','),t=/;base64/i.test(p[0])?atob(x):decodeURIComponent(x),vb=/viewBox\s*=\s*["']([^"']+)["']/.exec(t),w,h;if(vb){var n=vb[1].trim().split(/[\s,]+/).map(Number);w=n[2];h=n[3]}else{w=parseFloat((/\swidth\s*=\s*["']?([\d.]+)/.exec(t)||[])[1]);h=parseFloat((/\sheight\s*=\s*["']?([\d.]+)/.exec(t)||[])[1])}return w>0&&h>0?{url:u+'#logo.svg',aspect:w/h}:null}catch(e){return null}}
function guardar(c){cfg=c||null;c?ls('s',K,JSON.stringify(c)):ls('r',K);aplicar()}
function aplicar(){
  var c=cfg||{},col=limpio(c.color),col2=limpio(c.color2);T.color=col;T.color2=col2;T.logo=logoOk(c.logo);T.logo3d=svg3d(T.logo);T.nombre=c.nombre||'';
  if(!col){T.delta=0;return}
  var ref=toHsl(REF),refA=toHsl('b1c74d'),b=toHsl(col),b2=col2?toHsl(col2):b,gris=b[1]<.12,dH=gris?0:b[0]-ref[0],
      ratio=gris?.06:Math.min(1.25,Math.max(.25,b[1]/ref[1])),ratioA=b2[1]<.12?.06:Math.min(1.4,Math.max(.3,b2[1]/refA[1]));
  T.delta=dH;T.tono=b[0];
  var st=R.style;
  /* fondos y tonos oscuros: el tono de la marca; destacados claros: el color de la marca (o el segundo color si lo hay) */
  mapa=function(x){var ac=x[2]>=.5;return ac?[b2[0],Math.min(1,x[1]*ratioA),x[2]]:[x[0]+dH,Math.min(1,Math.max(x[1]*ratio,gris?0:b[1]*.5*(1-x[2]))),x[2]]};
  ORIG.forEach(function(h){var n=toHex.apply(0,mapa(toHsl(h)));st.setProperty('--t-'+h,'#'+n);st.setProperty('--t-'+h+'-rgb',rgb(n).join(','))});
  var m=document.querySelector('meta[name=theme-color]');m&&m.setAttribute('content','#'+toHex(ref[0]+dH,Math.min(1,ref[1]*ratio),ref[2]));
}
function logos(){
  if(!T.logo)return;
  var st=document.createElement('style');st.textContent='.tw3d{content:url("'+T.logo.replace(/"/g,'%22')+'")!important}';document.head.appendChild(st);
  document.querySelectorAll('img[src*="planetaninos-logo"],img[src*="planetaninos-marciano"],img[src*="logo-slogan"]').forEach(function(i){i.src=T.logo;if(T.nombre)i.alt=T.nombre});
  var f=document.querySelector('link[rel~=icon]');if(f)f.href=T.logo;
  if(T.nombre){var t=document.title;if(/Planeta Ni/i.test(t))document.title=t.replace(/Planeta Ni[ñn]os/gi,T.nombre)}
}
var NOM=/Planeta Ni[ñn]os/gi;
function nombres(raiz){
  if(!T.nombre)return;var w=document.createTreeWalker(raiz,NodeFilter.SHOW_TEXT,null),n,lista=[];
  while(n=w.nextNode()){var p=n.parentNode&&n.parentNode.nodeName;if(p==='SCRIPT'||p==='STYLE')continue;NOM.lastIndex=0;if(NOM.test(n.nodeValue))lista.push(n)}
  lista.forEach(function(x){x.nodeValue=x.nodeValue.replace(NOM,T.nombre)});
  raiz.querySelectorAll&&raiz.querySelectorAll('[alt],[aria-label],[content]').forEach(function(e){['alt','aria-label','content'].forEach(function(a){var v=e.getAttribute(a);if(v&&/Planeta Ni[ñn]os/i.test(v))e.setAttribute(a,v.replace(NOM,T.nombre))})});
}
function textos(){
  if(!T.nombre)return;nombres(document.body);if(/Planeta Ni[ñn]os/i.test(document.title))document.title=document.title.replace(NOM,T.nombre);
  var pend=0;new MutationObserver(function(){if(pend)return;pend=setTimeout(function(){pend=0;nombres(document.body)},120)}).observe(document.body,{childList:true,subtree:true,characterData:true});
}
aplicar();
function listo(){logos();textos();if(T.logo){var pl=0;new MutationObserver(function(){if(pl)return;pl=setTimeout(function(){pl=0;document.querySelectorAll('img[src*="planetaninos-logo"],img[src*="planetaninos-marciano"],img[src*="logo-slogan"]').forEach(function(i){if(i.src!==T.logo)i.src=T.logo})},120)}).observe(document.body,{childList:true,subtree:true})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',listo);else listo();
})();
