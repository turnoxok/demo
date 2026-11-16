/* tema.js — logo, nombre y colores de la marca para TODAS las páginas (sitio 3D, planes, galería, invitaciones, reservar, panel).
   Los colores originales (verde Planeta Niños) están escritos en cada página como var(--t-xxxxxx, respaldo). Acá se recalculan a partir del color de la marca
   girando el tono y conservando luminosidad: el contraste y la legibilidad no se pierden con ninguna marca.
   Fuentes de la marca, en orden: demo (?d=código, ver abajo), parámetros ?color= ?color2= ?logo= ?nombre= (vista rápida; ?tema=borrar vuelve al original) y lo guardado en este navegador.
   DEMOS: ?d=<código> trae la marca, el mail y los planes de esa demo desde la fábrica de tuweeb, la guarda en el navegador y, en reservar y panel, activa el backend de demo (demo/backend.js). */
(function(){
var ORIG=/*ORIG*/["0e200b","0e220b","183214","1e3a19","223d1e","23431d","25a244","274422","2c5026","2f5429","305629","325a2b","355c2e","356030","386230","3f8a28","406c38","477a3d","5b7a52","6ee7c9","7cc23a","83b27c","8be3ae","b1c74d","d4e48a","dcea9a"]/*FIN*/,K='tuweeb-tema-v1',DK='tuweeb-demo-id-v1',CK='tuweeb-demo-cfg-v1:',REF='406c38',R=document.documentElement,cfg=null,q={};
var FABRICA=/*FABRICA*/"https://script.google.com/macros/s/AKfycbyTcTreVN0lQHTxzxbIEGoyF7g7UCDmAZekwLk_10tdAQSR3SbHWt-_bg1wr3ueZ9VK/exec"/*FIN*/;
var SCRIPT=document.currentScript&&document.currentScript.src||'',RAIZ=SCRIPT?new URL('.',SCRIPT).pathname:'/';
function ls(a,k,v){try{if(a==='g')return localStorage.getItem(k);if(a==='s')localStorage.setItem(k,v);else localStorage.removeItem(k)}catch(e){}return null}
function rgb(h){return[0,2,4].map(function(i){return parseInt(h.substr(i,2),16)})}
function toHsl(h){var c=rgb(h).map(function(v){return v/255}),M=Math.max.apply(0,c),m=Math.min.apply(0,c),l=(M+m)/2,s=0,H=0;if(M!==m){var d=M-m;s=l>.5?d/(2-M-m):d/(M+m);H=M===c[0]?(c[1]-c[2])/d+(c[1]<c[2]?6:0):M===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4;H*=60}return[H,s,l]}
function toHex(H,s,l){H=((H%360)+360)%360/360;function f(p,q2,t){t<0&&(t+=1);t>1&&(t-=1);return t<1/6?p+(q2-p)*6*t:t<.5?q2:t<2/3?p+(q2-p)*(2/3-t)*6:p}var r,g,b;if(!s)r=g=b=l;else{var q2=l<.5?l*(1+s):l+s-l*s,p=2*l-q2;r=f(p,q2,H+1/3);g=f(p,q2,H);b=f(p,q2,H-1/3)}return[r,g,b].map(function(v){return('0'+Math.round(v*255).toString(16)).slice(-2)}).join('')}
function limpio(c){c=String(c||'').trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(c))c=c.replace(/./g,'$&$&');return /^[0-9a-f]{6}$/i.test(c)?c.toLowerCase():''}
function logoOk(u){u=String(u||'').trim();return /^(https:\/\/|data:image\/(svg\+xml|png|jpeg|webp)|\.{0,2}\/[\w./-]+$)/i.test(u)?u:''}
try{new URLSearchParams(location.search).forEach(function(v,k){q[k]=v})}catch(e){}
if(q.tema==='borrar'){ls('r',K);ls('r',DK)}
try{cfg=JSON.parse(ls('g',K)||'null')}catch(e){}
if(q.color||q.color2||q.logo||q.nombre){cfg=cfg||{};if(q.color)cfg.color=limpio(q.color);if(q.color2)cfg.color2=limpio(q.color2);if(q.logo)cfg.logo=logoOk(q.logo);if(q.nombre)cfg.nombre=q.nombre.slice(0,60);ls('s',K,JSON.stringify(cfg))}
var mapa=null,T=window.TEMA={color:'',color2:'',logo:'',nombre:'',delta:0,demo:null,raiz:RAIZ,aplicar:aplicar,guardar:guardar,listo:Promise.resolve()};

/* ── DEMOS ── */
var enRaiz=location.pathname.replace(/index\.html$/,'')===RAIZ;
function idDemo(){var d=String(q.d||'').toLowerCase();if(/^[a-z0-9][a-z0-9-]{2,29}$/.test(d)){ls('s',DK,JSON.stringify({id:d,t:Date.now()}));return d}
  var g=null;try{g=JSON.parse(ls('g',DK)||'null')}catch(e){}
  if(!g||!/^[a-z0-9][a-z0-9-]{2,29}$/.test(g.id||''))return '';
  /* el sitio principal sin ?d= solo recuerda la demo un rato (para "Volver al sitio"); reservar, panel y las demás páginas, 90 días */
  var vida=enRaiz?6*3600e3:90*864e5;if(Date.now()-(g.t||0)>vida){ls('r',DK);return ''}
  if(enRaiz)ls('s',DK,JSON.stringify({id:g.id,t:Date.now()}));return g.id}
function aDemo(d){return{color:d.color||'',color2:d.color2||'',color3:d.color3||'',color4:d.color4||'',logo:d.logo||'',logo3d:d.logo3d||'',nombre:d.nombre||''}}
function conDemo(d){T.demo=d;cfg=aDemo(d)}
var id=q.tema==='borrar'?'':idDemo();
T.demoId=id;
if(id){
  /* en una demo nunca se ve el logo de Planeta Niños: queda oculto hasta que se cambia por el de la marca */
  var hs=document.createElement('style');hs.textContent='img[src*="planetaninos"]:not([data-t]),img[src*="logo-slogan"]:not([data-t]){visibility:hidden!important}';document.head.appendChild(hs);
  var cacheada=null;try{cacheada=JSON.parse(ls('g',CK+id)||'null')}catch(e){}
  var pedir=function(){return FABRICA?fetch(FABRICA+'?action=demo&id='+id).then(function(r){return r.json()}).then(function(j){if(!j||!j.ok||!j.data)throw 0;j.data.id=id;ls('s',CK+id,JSON.stringify(j.data));return j.data}):Promise.reject()};
  if(cacheada){cacheada.id=id;conDemo(cacheada);pedir().catch(function(){})}
  else{
    /* primera vez en este dispositivo: la página espera (hasta 5 s) la marca de la demo para no mostrar la de otro negocio */
    var st=document.createElement('style');st.id='tema-espera';st.textContent='html.tema-espera body{visibility:hidden}';document.head.appendChild(st);R.classList.add('tema-espera');
    /* mientras tanto: ni logo ni nombre de otro negocio; pantalla neutra de tuweeb y pestaña neutra */
    try{document.title='tuweeb · preparando tu weeb';var fv=document.querySelector('link[rel~=icon]');if(fv){fv.type='image/svg+xml';fv.href=RAIZ+'reservar/tuweeb-icono.svg'}
      var sp=document.createElement('div');sp.id='tema-splash';sp.setAttribute('role','status');sp.style.cssText='position:fixed;inset:0;z-index:2147483000;display:grid;place-content:center;justify-items:center;gap:14px;background:linear-gradient(#2b1c44,#1a1026);color:#fbf9ff;font:600 15px Montserrat,system-ui,sans-serif;visibility:visible';
      sp.innerHTML='<img src="'+RAIZ+'reservar/tuweeb-icono.svg" alt="" width="84" height="84" style="animation:tsp 1.4s ease-in-out infinite"><span>Preparando tu weeb…</span><style>@keyframes tsp{50%{transform:scale(1.08);opacity:.75}}@media(prefers-reduced-motion:reduce){#tema-splash img{animation:none!important}}</style>';
      (document.body||R).appendChild(sp);
      if(!document.body)document.addEventListener('DOMContentLoaded',function(){if(!sp.parentNode)document.body.appendChild(sp)})}catch(e){}
    T.listo=new Promise(function(ok){var fin=function(){R.classList.remove('tema-espera');var sp=document.getElementById('tema-splash');if(sp)sp.remove();ok()};var tm=null;var mal=function(){clearTimeout(tm);var sp=document.getElementById('tema-splash');if(sp){sp.innerHTML='<img src="'+RAIZ+'reservar/tuweeb-icono.svg" alt="" width="64" height="64"><span style="text-align:center;max-width:280px">No pudimos abrir esta demo. Revisá tu conexión o que el link esté completo.</span><button type="button" style="all:unset;cursor:pointer;background:#e8693a;color:#fff;padding:12px 22px;border-radius:999px;font-weight:700" onclick="location.reload()">Reintentar</button>'}else fin()};
      tm=setTimeout(mal,20000);
      pedir().then(function(d){clearTimeout(tm);conDemo(d);aplicar();if(/^tuweeb · preparando/.test(document.title))document.title=(T.nombre||'tuweeb')+' · demo';if(window.__temaListo)window.__temaListo();fin()},function(){mal()})});
  }
  /* cinta de demo: en el sitio, planes, galería e invitaciones siempre se ve que es una demo y cómo entrar al panel */
  if(!/\/(reservar|panel|crear)\//.test(location.pathname)&&window.top===window.self){
    var cinta=function(){try{if(sessionStorage.getItem('tuweeb-cinta-x'))return}catch(e){}
      var c=document.createElement('div');c.id='tema-cinta';c.style.cssText='position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:4px;padding:4px 6px 4px 14px;border-radius:999px;background:rgba(20,12,32,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fbf9ff;font:600 12px/1 Montserrat,system-ui,sans-serif;white-space:nowrap;max-width:calc(100vw - 16px)';
      var nom=(T.nombre||'tu weeb').replace(/[<>&]/g,'');
      c.innerHTML='<span style="overflow:hidden;text-overflow:ellipsis;max-width:42vw">Demo · '+nom+'</span><a href="'+RAIZ+'panel/?d='+id+'" style="color:#fff;background:#e8693a;border-radius:999px;padding:8px 12px;text-decoration:none;font-weight:700">Mi panel</a><button type="button" aria-label="Cerrar" style="all:unset;cursor:pointer;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;font-size:16px;opacity:.7">×</button>';
      c.querySelector('button').onclick=function(){c.remove();try{sessionStorage.setItem('tuweeb-cinta-x','1')}catch(e){}};document.body.appendChild(c)};
    T.listo.then(function(){if(document.body)cinta();else document.addEventListener('DOMContentLoaded',cinta)});
  }
  if(/\/(reservar|panel)\//.test(location.pathname)){document.write('<script src="'+RAIZ+'demo/backend.js?v=3"><\/script>')}
}

/* ── colores ── */
function guardar(c){cfg=c||null;c?ls('s',K,JSON.stringify(c)):ls('r',K);aplicar()}
T.mapHsl=function(h,s,l){if(!mapa||!T.color)return null;h=((h%360)+360)%360;if(h<60||h>175||s<.15||l<.08||l>.97)return null;var r=mapa([h,s,l]);return[((r[0]%360)+360)%360,r[1],r[2]]};
var FAM=null;
T.famHsl=function(h,s,l){if(!FAM)return null;h=((h%360)+360)%360;if(s<.5||l<.12||l>.95)return null;if(h>=60&&h<=175)return null;if(h>=8&&h<=42&&s<.66)return null;var f=h>=175&&h<270?FAM[2]:h>=270&&h<345?FAM[3]:(h>=345||h<25)?FAM[1]:FAM[0];if(f[1]<.12)return[f[0],f[1],Math.min(.95,Math.max(.12,l+(f[2]-.5)*.3))];return[f[0],Math.min(1,Math.max(.35,f[1]*(.55+.45*s))),Math.min(.95,Math.max(.14,l+(f[2]-.5)*.35))]};
T.colorear=function(c,url){if(!mapa||!c||!c.getHSL||/#logo[.]svg/.test(url||''))return c;var q={h:0,s:0,l:0};c.getHSL(q,'srgb');var r=T.mapHsl(q.h*360,q.s,q.l)||T.famHsl(q.h*360,q.s,q.l);if(r)c.setHSL(r[0]/360,r[1],r[2],'srgb');return c};
T.hex=function(x){var h=limpio(x);if(!h||!mapa)return x;var o=toHsl(h),r=T.mapHsl(o[0],o[1],o[2]);return r?'#'+toHex(r[0],r[1],r[2]):x};
/* Logo para el 3D: solo si es un SVG; el visor lo extruye. Se devuelve con su proporción para encajarlo en el lugar del logo original */
function svg3d(u){if(!/^data:image\/svg\+xml/i.test(u||''))return null;try{var p=u.split(','),x=p.slice(1).join(','),t=/;base64/i.test(p[0])?atob(x):decodeURIComponent(x),vb=/viewBox\s*=\s*["']([^"']+)["']/.exec(t),w,h;if(vb){var n=vb[1].trim().split(/[\s,]+/).map(Number);w=n[2];h=n[3]}else{w=parseFloat((/\swidth\s*=\s*["']?([\d.]+)/.exec(t)||[])[1]);h=parseFloat((/\sheight\s*=\s*["']?([\d.]+)/.exec(t)||[])[1])}return w>0&&h>0?{url:u+'#logo.svg',aspect:w/h}:null}catch(e){return null}}
/* El visor 3D llama a esto con su lista de objetos cuando la marca ya está lista: cambia el logo y lo encaja en el lugar del original */
T.aplicarLoader=function(L){if(!L||!T.demo&&!T.nombre&&!cfg)return;var u=T.logo;if(!/^data:image\/svg\+xml/i.test(u||''))return;try{var p=u.split(','),x=p.slice(1).join(','),t=/;base64/i.test(p[0])?atob(x):decodeURIComponent(x);L.svg=t;var o=toHsl(T.color||'3F8A28');L.lineColor='#'+toHex(o[0],o[1],Math.min(o[2],.42));L.background='#ffffff'}catch(e){}};
T.aplicarObjetos=function(OBJ){if(!T.logo3d||!OBJ)return;OBJ.forEach(function(o){if(o&&/logo-slogan[.]svg/.test(o.url||'')){o.url=T.logo3d.url;var m=Math.min(5.014/T.logo3d.aspect,2.2);(o.keyframes||[]).forEach(function(k){k.scale=k.scale*m})}})};
function aplicar(){
  var c=cfg||{},col=limpio(c.color),col2=limpio(c.color2);T.color=col;T.color2=col2;T.logo=logoOk(c.logo);T.logo3d=svg3d(logoOk(c.logo3d)||T.logo);T.nombre=c.nombre||'';
  if(col&&col2&&toHsl(col)[1]<.12&&toHsl(col2)[1]>=.12){var tmp=col;col=col2;col2=tmp;T.color=col;T.color2=col2}
  if(!col){T.delta=0;return}
  var ref=toHsl(REF),refA=toHsl('b1c74d'),b=toHsl(col),b2=col2?toHsl(col2):b,gris=b[1]<.12,dH=gris?0:b[0]-ref[0],
      ratio=gris?.06:Math.min(1.25,Math.max(.25,b[1]/ref[1])),ratioA=b2[1]<.12?.06:Math.min(1.4,Math.max(.3,b2[1]/refA[1]));
  T.delta=dH;T.tono=b[0];
  (function(){var h1=b,h2=col2?toHsl(col2):null,h3=limpio(c.color3)?toHsl(limpio(c.color3)):null,h4=limpio(c.color4)?toHsl(limpio(c.color4)):null;
    function sh(x,dh,dl){return[(x[0]+dh+360)%360,x[1],Math.min(.85,Math.max(.25,x[2]+dl))]}
    var f2=h2||sh(h1,38,.04),f3=h3||sh(h1,-32,.08),f4=h4||sh(h2||h1,32,-.04);
    FAM=[h1,f2,f3,f4]})();
  var st=R.style;
  /* fondos y tonos oscuros: el tono de la marca; destacados claros: el color de la marca (o el segundo color si lo hay) */
  mapa=function(x){var ac=x[2]>=.5;return ac?[b2[0],Math.min(1,x[1]*ratioA),x[2]]:[x[0]+dH,Math.min(1,Math.max(x[1]*ratio,gris?0:b[1]*.5*(1-x[2]))),x[2]]};
  ORIG.forEach(function(h){var n=toHex.apply(0,mapa(toHsl(h)));st.setProperty('--t-'+h,'#'+n);st.setProperty('--t-'+h+'-rgb',rgb(n).join(','))});
  var m=document.querySelector('meta[name=theme-color]');m&&m.setAttribute('content','#'+toHex(ref[0]+dH,Math.min(1,ref[1]*ratio),ref[2]));
}
var NOM=/Planeta Ni[ñn]os/gi;
function logos(){
  if(!T.logo)return;
  var st=document.createElement('style');st.textContent='.tw3d{content:url("'+T.logo.replace(/"/g,'%22')+'")!important}';document.head.appendChild(st);
  document.querySelectorAll('img[src*="planetaninos-logo"],img[src*="planetaninos-marciano"],img[src*="logo-slogan"]').forEach(function(i){i.src=T.logo;i.setAttribute('data-t','1');if(T.nombre)i.alt=T.nombre});
  var f=document.querySelector('link[rel~=icon]');if(f)f.href=T.logo;
}
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
/* dentro de una demo, los enlaces del sitio llevan el código: así "Volver al sitio" y los botones no pierden la marca */
function enlaces(){
  if(!T.demo)return;
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||a.target==='_blank'||a.hasAttribute('download'))return;
    try{var u=new URL(a.href,location.href);if(u.origin===location.origin&&!u.searchParams.has('d')&&!/^(#|mailto:|tel:)/.test(a.getAttribute('href'))){u.searchParams.set('d',T.demo.id);a.href=u.href}}catch(x){}},true);
  /* el panel instalado como app abre la demo directamente */
  if(/\/panel\//.test(location.pathname)){var m=document.querySelector('link[rel=manifest]');if(m)fetch(m.href).then(function(r){return r.json()}).then(function(j){j.start_url='./?d='+T.demo.id;j.name='Panel '+(T.nombre||'demo');j.short_name=(T.nombre||'Panel').slice(0,12);m.href=URL.createObjectURL(new Blob([JSON.stringify(j)],{type:'application/manifest+json'}))}).catch(function(){})}
}
function listo(){logos();textos();enlaces();if(T.logo){var pl=0;new MutationObserver(function(){if(pl)return;pl=setTimeout(function(){pl=0;document.querySelectorAll('img[src*="planetaninos-logo"],img[src*="planetaninos-marciano"],img[src*="logo-slogan"]').forEach(function(i){if(i.src!==T.logo)i.src=T.logo;i.setAttribute('data-t','1')})},120)}).observe(document.body,{childList:true,subtree:true})}}
aplicar();
/* si la marca de la demo llega tarde (primera visita), se aplica apenas llega */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){T.listo.then(function(){if(!T.__ok){T.__ok=1;listo()}})});else T.listo.then(function(){if(!T.__ok){T.__ok=1;listo()}});
})();
