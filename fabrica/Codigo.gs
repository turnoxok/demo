/**
 * Fábrica de demos de tuweeb.
 * Se publica una sola vez como "Aplicación web" (ejecutar como: yo · acceso: cualquiera).
 *  - POST {action:'demoCrear', ...}  -> crea la demo y manda los links por mail
 *  - GET  ?action=demo&id=XXXX       -> devuelve la configuración pública de esa demo
 * Cada demo es un archivo JSON en la carpeta "tuweeb-demos" de Drive.
 * Pedidos de "Mi web" (sitio, dominio, diseño 3D): un JSON por demo en "tuweeb-pedidos"; comprobantes en "tuweeb-comprobantes" (privados).
 *  - GET  ?action=pedido&id=X | ?action=dominio&q=nombre
 *  - POST {action:'pedidoGuardar'|'pedidoComprobante', id, ...}
 *  - POST {action:'adminLogin'|'admin...', token, ...}  -> panel del dueño (admin/)
 * Una función diaria (limpiar) borra las demos que pasaron los DIAS_VIDA.
 */
var SITIO = 'https://demo.tuweeb.com/';
var CARPETA = 'tuweeb-demos';
var DIAS_VIDA = 60;
var MAX_POR_DIA = 300;
var MAX_LOGO = 500000;

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function carpeta_() {
  var it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}
var RESERVADOS = ['crear','panel','reservar','assets','demo','bloques','herramientas','fabrica','planes','galeria','invitacion','editor','app','index','tuweeb','admin','www','api','login','demos','tema','weeb'];
/** Dirección legible a partir del nombre del negocio: "Parque Land" -> parqueland (y parqueland2 si ya existe). */
function idNuevo_(nombre, dir) {
  var base = String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  if (base.length < 3) base = (base + 'weeb').slice(0, 24);
  var id = base, n = 1;
  while (RESERVADOS.indexOf(id) >= 0 || dir.getFilesByName(id + '.json').hasNext()) { n++; id = base + n; }
  return id;
}
function hex_(v) { v = String(v || '').replace('#', '').toLowerCase(); return /^[0-9a-f]{6}$/.test(v) ? v : ''; }
function texto_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n); }

/** Deja solo un SVG inofensivo: sin scripts, sin eventos, sin enlaces externos. */
function limpiarSvg_(svg) {
  svg = String(svg || '');
  if (!/^<svg[\s>]/i.test(svg.replace(/^<\?xml[^>]*>\s*/i, ''))) return '';
  if (/<\s*(script|foreignObject|iframe|object|embed|audio|video)/i.test(svg)) return '';
  if (/\son[a-z]+\s*=/i.test(svg)) return '';
  if (/(href)\s*=\s*["']\s*(?!#|data:image\/)/i.test(svg)) return '';
  if (/javascript:/i.test(svg)) return '';
  return svg;
}
function logoValido_(logo) {
  logo = String(logo || '');
  if (logo.length > MAX_LOGO) return '';
  if (/^data:image\/png;base64,/.test(logo)) return /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+\/=]+$/.test(logo) ? logo : '';
  var m = /^data:image\/svg\+xml;utf8,(.*)$/.exec(logo);
  if (!m) return '';
  var svg; try { svg = decodeURIComponent(m[1]); } catch (e) { return ''; }
  return limpiarSvg_(svg) ? logo : '';
}
function planesValidos_(d) {
  if (!d || !Array.isArray(d.planes)) return null;
  var pl = d.planes.slice(0, 6).map(function (p) {
    if (!p || typeof p !== 'object') return null;
    p.nombre = texto_(p.nombre, 40); p.descripcion = texto_(p.descripcion, 300);
    p.precio = Math.max(0, Math.min(1e8, Number(p.precio) || 0)); p.sena = Math.max(0, Math.min(1e8, Number(p.sena) || 0));
    return p;
  }).filter(Boolean);
  return pl.length ? { planes: pl } : null;
}

function demoCrear_(b) {
  var email = texto_(b.email, 120).toLowerCase(), nombre = texto_(b.nombre, 60);
  if (nombre.length < 2) return { ok: false, mensaje: 'Falta el nombre de tu negocio.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return { ok: false, mensaje: 'Revisá tu mail.' };
  var color = hex_(b.color); if (!color) return { ok: false, mensaje: 'Color inválido.' };
  var logo = logoValido_(b.logo); if (!logo) return { ok: false, mensaje: 'No pudimos leer el logo. Probá con otro o pedinos ayuda por WhatsApp.' };

  var cache = CacheService.getScriptCache(), prop = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock();
  if (cache.get('m:' + email)) return { ok: false, mensaje: 'Ya creaste un weeb hace un momento. Esperá un minuto y probá de nuevo.' };
  lock.waitLock(20000);
  try {
    var hoy = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyyMMdd'), k = 'n' + hoy, n = Number(prop.getProperty(k) || 0);
    if (n >= MAX_POR_DIA) return { ok: false, mensaje: 'Hoy se llenó el cupo de demos. Probá mañana o escribinos por WhatsApp.' };
    prop.setProperty(k, String(n + 1));
    var dir = carpeta_(), id = idNuevo_(nombre, dir);
    var demo = { id: id, creada: new Date().toISOString(), nombre: nombre, email: email, whatsapp: String(b.whatsapp || '').replace(/\D/g, '').slice(0, 15), color: color, color2: hex_(b.color2), color3: hex_(b.color3), color4: hex_(b.color4), logo: logo };
    var l3 = logoValido_(b.logo3d); if (l3) demo.logo3d = l3;
    var datos = planesValidos_(b.datos); if (datos) demo.datos = datos;
    dir.createFile(id + '.json', JSON.stringify(demo), MimeType.PLAIN_TEXT);
    try { var ix = indice_().filter(function (x) { return x.id !== id; }); ix.push({ id: id, nombre: nombre, email: email, whatsapp: demo.whatsapp || '', creada: demo.creada }); indiceGuardar_(ix); } catch (e) {}
    cache.put('m:' + email, '1', 45);
  } finally { lock.releaseLock(); }

  var sitio = SITIO + '?d=' + id, panel = SITIO + 'panel/?d=' + id;
  try {
    MailApp.sendEmail({ to: email, name: 'tuweeb', subject: 'Tu weeb de ' + nombre + ' está listo',
      body: 'Hola!\n\nTu weeb ya está andando:\n\nTu sitio: ' + sitio + '\nTu panel: ' + panel + '\n\nUsuario del panel: ' + email + '\nClave inicial: demo1234 (la cambiás en el panel, en Seguridad).\n\nSi te gustó, desde el panel en "Mi web" elegís el dominio y lo activamos.\n\ntuweeb' });
  } catch (e) {}
  try {
    var dueno = Session.getEffectiveUser().getEmail();
    if (dueno) MailApp.sendEmail({ to: dueno, subject: 'Nueva demo: ' + nombre, body: nombre + '\n' + email + '\nWhatsApp: ' + (demo.whatsapp || '-') + '\n' + sitio });
  } catch (e) {}
  return { ok: true, data: { id: id, whatsapp: demo.whatsapp } };
}

function demoLeer_(id) {
  id = String(id || '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(id)) return { ok: false, mensaje: 'Demo inexistente.' };
  var it = carpeta_().getFilesByName(id + '.json');
  if (!it.hasNext()) return { ok: false, mensaje: 'Esta demo ya no existe.' };
  var d = JSON.parse(it.next().getBlob().getDataAsString());
  return { ok: true, data: { nombre: d.nombre, email: d.email, whatsapp: d.whatsapp, color: d.color, color2: d.color2, color3: d.color3 || '', color4: d.color4 || '', logo: d.logo, logo3d: d.logo3d || '', datos: d.datos || null } };
}


/* ───────────── Mi web: pedidos y pagos de las demos ───────────── */
var CARP_PEDIDOS = 'tuweeb-pedidos', CARP_COMP = 'tuweeb-comprobantes', DOMINIO_BASE = 'salondefiestas.com', MP_LINK = 'https://link.mercadopago.com.ar/x23';
var ADMIN_SAL = '3c92d13582a6210b', ADMIN_HASH = '9c5b526a2d31eff182a9086648d2a6088a6ad5420504125209ce2bfbe57b7b92';
/** Lo que se vende. total = precio; sena = lo que se paga para arrancar; modo: sena (saldo contra entrega) · anual (todo junto) · entrega (sin seña) */
var PRODUCTOS = {
  sitio:  { nombre: 'Activar mi sitio web (sin dominio propio)', total: 380000, sena: 180000, modo: 'sena', detalle: 'Se activa en ' + DOMINIO_BASE + ' con tu nombre. Seña y saldo contra entrega. Entrega en 24 a 48 hs.' },
  dominio:{ nombre: 'Dominio propio, mails personalizados y certificado SSL', total: 43000, sena: 43000, modo: 'anual', detalle: 'Pago anual, se abona todo junto.' },
  diseno: { nombre: 'Diseño 3D 100% personalizado', total: 299000, sena: 0, modo: 'entrega', detalle: 'Se abona contra entrega, sin seña.' }
};
function carp_(n) { var it = DriveApp.getFoldersByName(n); return it.hasNext() ? it.next() : DriveApp.createFolder(n); }
function sha_(t) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t).map(function (b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join(''); }
function idOk_(id) { id = String(id || '').toLowerCase(); return /^[a-z0-9][a-z0-9-]{2,29}$/.test(id) ? id : ''; }
function demoRaw_(id) { var it = carpeta_().getFilesByName(id + '.json'); return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null; }
function pedLeer_(id) { var it = carp_(CARP_PEDIDOS).getFilesByName(id + '.json'); return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null; }
function pedGuardar_(p) {
  p.actualizado = new Date().toISOString();
  var d = carp_(CARP_PEDIDOS), it = d.getFilesByName(p.id + '.json');
  if (it.hasNext()) it.next().setContent(JSON.stringify(p)); else d.createFile(p.id + '.json', JSON.stringify(p), MimeType.PLAIN_TEXT);
}
function transferCfg_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('transfer') || '{}'); } catch (e) { return {}; } }
function slug_(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); }
/** Cuánto va pagado, cuánto falta y qué se sugiere pagar ahora, por producto. */
function calcItem_(ped, k) {
  var pr = PRODUCTOS[k], it = ped.items[k], conf = 0, rev = 0;
  (ped.pagos || []).forEach(function (g) { if (g.k !== k) return; if (g.estado === 'confirmado') conf += g.monto; else if (g.estado === 'revision') rev += g.monto; });
  var entregado = it.estado === 'entregado', falta = Math.max(0, pr.total - conf), sug = 0;
  if (pr.modo === 'anual') sug = Math.max(0, falta - rev);
  else if (pr.modo === 'sena') sug = entregado ? Math.max(0, falta - rev) : Math.max(0, pr.sena - conf - rev);
  else sug = entregado ? Math.max(0, falta - rev) : 0;
  return { k: k, nombre: pr.nombre, detalle: pr.detalle, modo: pr.modo, total: pr.total, sena: pr.sena, estado: it.estado || 'pedido', url: it.url || '', nota: it.nota || '', confirmado: conf, revision: rev, falta: falta, sugerido: sug, creado: it.creado };
}
function pedPublico_(id, ped, demo) {
  ped = ped || { id: id, items: {}, pagos: [] };
  var items = Object.keys(ped.items).map(function (k) { return calcItem_(ped, k); });
  var t = transferCfg_();
  return { id: id, items: items, subdominio: ped.subdominio || slug_(demo && demo.nombre), dominio: ped.dominio || '', base: DOMINIO_BASE,
    pagos: (ped.pagos || []).map(function (g) { return { id: g.id, k: g.k, fecha: g.fecha, monto: g.monto, estado: g.estado, nota: g.nota || '', archivo: g.nombreArchivo || '' }; }),
    transferencia: { alias: t.alias || '', titular: t.titular || '', banco: t.banco || '', cbu: t.cbu || '', nota: t.nota || '', mp: t.mp === undefined ? MP_LINK : t.mp }, catalogo: PRODUCTOS };
}
function avisoDueno_(asunto, cuerpo) { try { var d = Session.getEffectiveUser().getEmail(); if (d) MailApp.sendEmail({ to: d, subject: asunto, body: cuerpo + '\n\nAdmin: ' + SITIO + 'admin/' }); } catch (e) {} }

function pedidoGet_(id) {
  id = idOk_(id); if (!id) return { ok: false, mensaje: 'Demo inexistente.' };
  var demo = demoRaw_(id); if (!demo) return { ok: false, mensaje: 'Esta demo ya no existe.' };
  return { ok: true, data: pedPublico_(id, pedLeer_(id), demo) };
}
function pedidoGuardar_(b) {
  var id = idOk_(b.id), demo = id && demoRaw_(id); if (!demo) return { ok: false, mensaje: 'Esta demo ya no existe.' };
  var pedir = (Array.isArray(b.items) ? b.items : []).filter(function (k) { return PRODUCTOS[k]; });
  if (!pedir.length) return { ok: false, mensaje: 'Elegí al menos una opción.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var ped = pedLeer_(id) || { id: id, nombre: demo.nombre, email: demo.email, whatsapp: demo.whatsapp || '', creado: new Date().toISOString(), items: {}, pagos: [] }, nuevos = [];
    ped.nombre = demo.nombre; ped.email = demo.email; ped.whatsapp = demo.whatsapp || '';
    pedir.forEach(function (k) { if (!ped.items[k]) { ped.items[k] = { estado: 'pedido', creado: new Date().toISOString() }; nuevos.push(PRODUCTOS[k].nombre); } });
    var sub = slug_(b.subdominio || demo.nombre); if (sub.length >= 3) ped.subdominio = sub;
    if (pedir.indexOf('dominio') >= 0) {
      var dm = String(b.dominio || '').toLowerCase().trim();
      if (!/^[a-z0-9-]{2,60}(\.[a-z0-9-]{2,20}){1,2}$/.test(dm)) return { ok: false, mensaje: 'Buscá y elegí el dominio que querés.' };
      ped.dominio = dm;
    }
    pedGuardar_(ped);
    if (nuevos.length) avisoDueno_('Nuevo pedido: ' + demo.nombre, demo.nombre + ' (' + demo.email + ', WhatsApp ' + (demo.whatsapp || '-') + ')\nPidió: ' + nuevos.join(', ') + '\nSubdominio: ' + (ped.subdominio || '-') + '\nDominio: ' + (ped.dominio || '-'));
    return { ok: true, data: pedPublico_(id, ped, demo) };
  } finally { lock.releaseLock(); }
}
var COMP_TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
function pedidoComprobante_(b) {
  var id = idOk_(b.id), demo = id && demoRaw_(id); if (!demo) return { ok: false, mensaje: 'Esta demo ya no existe.' };
  var k = String(b.k || ''); if (!PRODUCTOS[k]) return { ok: false, mensaje: 'Producto inválido.' };
  var tipo = String(b.tipo || '').toLowerCase(), ext = COMP_TIPOS[tipo]; if (!ext && b.sinArchivo !== true) return { ok: false, mensaje: 'Subí una foto (JPG, PNG) o un PDF.' };
  var monto = Math.round(Number(b.monto) || 0); if (monto < 1 || monto > 50000000) return { ok: false, mensaje: 'Escribí el monto que transferiste.' };
  var sinArch = b.sinArchivo === true, b64 = String(b.datos || '').replace(/^data:[^,]*,/, '').replace(/\s/g, ''); if (!sinArch && !b64) return { ok: false, mensaje: 'El archivo llegó vacío.' };
  if (b64.length * 0.75 > 4 * 1024 * 1024) return { ok: false, mensaje: 'El archivo pesa demasiado (máximo 4 MB).' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var ped = pedLeer_(id); if (!ped || !ped.items[k]) return { ok: false, mensaje: 'Primero elegí esta opción.' };
    if ((ped.pagos || []).filter(function (g) { return g.estado === 'revision'; }).length >= 8) return { ok: false, mensaje: 'Ya tenés varios comprobantes en revisión. Esperá a que los confirmemos.' };
    var pid = 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), nombre = texto_(b.nombre || '', 80).replace(/[\\\/:*?"<>|]/g, '_').replace(/\.[A-Za-z0-9]+$/, '') || 'comprobante';
    var f = sinArch ? null : carp_(CARP_COMP).createFile(Utilities.newBlob(Utilities.base64Decode(b64), tipo, id + '_' + pid + '.' + ext));
    ped.pagos = ped.pagos || []; ped.pagos.push({ id: pid, k: k, fecha: new Date().toISOString(), monto: monto, estado: 'revision', archivo: f ? f.getId() : '', tipo: sinArch ? '' : tipo, nombreArchivo: f ? nombre + '.' + ext : '', nota: '' });
    pedGuardar_(ped);
    avisoDueno_('Comprobante recibido: ' + demo.nombre, demo.nombre + ' (' + demo.email + ')\n' + PRODUCTOS[k].nombre + '\nMonto: $' + monto);
    return { ok: true, data: pedPublico_(id, ped, demo) };
  } finally { lock.releaseLock(); }
}
/** ¿Está libre ese dominio? Se consulta el registro público (RDAP): 404 = libre, 200 = ocupado. */
function dominioBuscar_(q) {
  var t = String(q || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9-]{2,60}(\.[a-z0-9-]{2,20}){0,2}$/.test(t)) return { ok: false, mensaje: 'Escribí un nombre sin espacios, por ejemplo minegocio o minegocio.com.ar' };
  var lista = t.indexOf('.') > 0 ? [t] : ['.com', '.com.ar', '.net', '.ar'].map(function (x) { return t + x; });
  var res = lista.map(function (d) {
    var estado = 'desconocido';
    try {
      var url = /\.com$/.test(d) ? 'https://rdap.verisign.com/com/v1/domain/' + d : /\.net$/.test(d) ? 'https://rdap.verisign.com/net/v1/domain/' + d : /\.ar$/.test(d) ? 'https://rdap.nic.ar/domain/' + d : 'https://rdap.org/domain/' + d;
      var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true }), c = r.getResponseCode();
      estado = c === 404 ? 'libre' : c === 200 ? 'ocupado' : 'desconocido';
    } catch (e) {}
    return { dominio: d, estado: estado };
  });
  return { ok: true, data: res };
}

/* ───────────── panel del dueño ───────────── */
function adminLogin_(b) {
  var cache = CacheService.getScriptCache(), k = 'afail', n = Number(cache.get(k) || 0);
  if (n >= 6) return { ok: false, mensaje: 'Demasiados intentos. Esperá 15 minutos.' };
  var guardada = PropertiesService.getScriptProperties().getProperty('adminHash') || '', sal = ADMIN_SAL, h = ADMIN_HASH;
  if (guardada.indexOf('$') > 0) { sal = guardada.split('$')[0]; h = guardada.split('$')[1]; }
  if (sha_(sal + String(b.clave || '')) !== h) { cache.put(k, String(n + 1), 900); Utilities.sleep(800); return { ok: false, mensaje: 'Clave incorrecta.' }; }
  var tk = Utilities.getUuid() + Utilities.getUuid().slice(0, 8); cache.put('adm:' + tk, '1', 21600);
  return { ok: true, data: { token: tk } };
}
function adminOk_(b) { return b && b.token && CacheService.getScriptCache().get('adm:' + String(b.token)) === '1'; }
function indice_() {
  var d = carpeta_(), it = d.getFilesByName('_indice.json');
  if (it.hasNext()) { try { return JSON.parse(it.next().getBlob().getDataAsString()); } catch (e) {} }
  var out = [], fs = d.getFiles();
  while (fs.hasNext()) { var f = fs.next(), n = f.getName(); if (!/^[a-z0-9-]+\.json$/.test(n)) continue; try { var x = JSON.parse(f.getBlob().getDataAsString()); out.push({ id: x.id, nombre: x.nombre, email: x.email, whatsapp: x.whatsapp || '', creada: x.creada }); } catch (e) {} }
  indiceGuardar_(out); return out;
}
function indiceGuardar_(l) {
  var d = carpeta_(), it = d.getFilesByName('_indice.json');
  if (it.hasNext()) it.next().setContent(JSON.stringify(l)); else d.createFile('_indice.json', JSON.stringify(l), MimeType.PLAIN_TEXT);
}
function resumenPed_(p) {
  var items = Object.keys(p.items || {}).map(function (k) { return calcItem_(p, k); }), conf = 0, rev = 0, tot = 0;
  items.forEach(function (i) { conf += i.confirmado; rev += i.revision; tot += i.total; });
  return { items: items.map(function (i) { return { k: i.k, estado: i.estado }; }), total: tot, pagado: conf, revision: rev };
}
function admin_(b) {
  var a = String(b.action || '');
  if (a === 'adminDemos') {
    var peds = {}, fs = carp_(CARP_PEDIDOS).getFiles();
    while (fs.hasNext()) { var f = fs.next(); try { var p = JSON.parse(f.getBlob().getDataAsString()); peds[p.id] = resumenPed_(p); } catch (e) {} }
    var lista = indice_().slice().sort(function (x, y) { return String(y.creada) < String(x.creada) ? -1 : 1; }).map(function (d) { d.pedido = peds[d.id] || null; return d; });
    return { ok: true, data: { demos: lista, transferencia: (function () { var t = transferCfg_(); if (t.mp === undefined) t.mp = MP_LINK; return t; })() } };
  }
  var id = idOk_(b.id);
  if (a === 'adminPedido') {
    var demo = id && demoRaw_(id); if (!demo) return { ok: false, mensaje: 'Demo inexistente.' };
    var ped = pedLeer_(id), pub = pedPublico_(id, ped, demo);
    return { ok: true, data: { demo: { id: id, nombre: demo.nombre, email: demo.email, whatsapp: demo.whatsapp || '', creada: demo.creada, color: demo.color }, pedido: pub, pagos: (ped && ped.pagos) || [] } };
  }
  if (a === 'adminPago') {
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var p2 = pedLeer_(id); if (!p2) return { ok: false, mensaje: 'Sin pedido.' };
      var g = (p2.pagos || []).filter(function (x) { return x.id === b.pagoId; })[0]; if (!g) return { ok: false, mensaje: 'Pago inexistente.' };
      if (['confirmado', 'rechazado', 'revision'].indexOf(b.estado) < 0) return { ok: false, mensaje: 'Estado inválido.' };
      g.estado = b.estado; g.nota = texto_(b.nota, 200); if (b.monto != null && Number(b.monto) > 0) g.monto = Math.round(Number(b.monto));
      pedGuardar_(p2);
      if (b.estado !== 'revision') { try { MailApp.sendEmail({ to: p2.email, name: 'tuweeb', subject: b.estado === 'confirmado' ? 'Confirmamos tu pago' : 'No pudimos confirmar tu pago', body: 'Hola!\n\n' + (b.estado === 'confirmado' ? 'Confirmamos tu pago de $' + g.monto + ' (' + PRODUCTOS[g.k].nombre + ').' : 'No pudimos confirmar tu comprobante de $' + g.monto + '. ' + (g.nota || 'Escribinos por WhatsApp y lo vemos.')) + '\n\nMirá el estado en tu panel: ' + SITIO + 'panel/?d=' + id }); } catch (e) {} }
      return { ok: true, data: pedPublico_(id, p2, demoRaw_(id)) };
    } finally { lock.releaseLock(); }
  }
  if (a === 'adminPagoManual') {
    var lk = LockService.getScriptLock(); lk.waitLock(20000);
    try {
      var p3 = pedLeer_(id); if (!p3 || !p3.items[b.k]) return { ok: false, mensaje: 'Sin ese producto en el pedido.' };
      var m = Math.round(Number(b.monto) || 0); if (m < 1) return { ok: false, mensaje: 'Monto inválido.' };
      p3.pagos.push({ id: 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), k: b.k, fecha: new Date().toISOString(), monto: m, estado: 'confirmado', archivo: '', tipo: '', nombreArchivo: '', nota: texto_(b.nota, 200) || 'Cargado por tuweeb' });
      pedGuardar_(p3); return { ok: true, data: pedPublico_(id, p3, demoRaw_(id)) };
    } finally { lk.releaseLock(); }
  }
  if (a === 'adminItem') {
    var lk2 = LockService.getScriptLock(); lk2.waitLock(20000);
    try {
      var p4 = pedLeer_(id); if (!p4 || !p4.items[b.k]) return { ok: false, mensaje: 'Sin ese producto en el pedido.' };
      var it4 = p4.items[b.k]; if (['pedido', 'entregado'].indexOf(b.estado) >= 0) it4.estado = b.estado;
      if (b.url != null) { var u = String(b.url).trim(); it4.url = /^https:\/\/[^\s<>"]{3,200}$/.test(u) ? u : ''; }
      if (b.nota != null) it4.nota = texto_(b.nota, 200);
      pedGuardar_(p4); return { ok: true, data: pedPublico_(id, p4, demoRaw_(id)) };
    } finally { lk2.releaseLock(); }
  }
  if (a === 'adminComprobante') {
    var p5 = pedLeer_(id), g5 = p5 && (p5.pagos || []).filter(function (x) { return x.id === b.pagoId; })[0]; if (!g5 || !g5.archivo) return { ok: false, mensaje: 'Sin archivo.' };
    var bl = DriveApp.getFileById(g5.archivo).getBlob();
    return { ok: true, data: { tipo: g5.tipo, nombre: g5.nombreArchivo, datos: Utilities.base64Encode(bl.getBytes()) } };
  }
  if (a === 'adminConfig') {
    var mp = String(b.mp || '').trim(), c = { alias: texto_(b.alias, 60), titular: texto_(b.titular, 80), banco: texto_(b.banco, 60), cbu: texto_(b.cbu, 40), nota: texto_(b.nota, 200), mp: /^https:\/\/[^\s<>"]{8,200}$/.test(mp) ? mp : '' };
    PropertiesService.getScriptProperties().setProperty('transfer', JSON.stringify(c)); return { ok: true, data: c };
  }
  if (a === 'adminBorrarDemo') {
    var it = id && carpeta_().getFilesByName(id + '.json'); if (!it || !it.hasNext()) return { ok: false, mensaje: 'Demo inexistente.' };
    it.next().setTrashed(true); indiceGuardar_(indice_().filter(function (x) { return x.id !== id; })); return { ok: true, data: true };
  }
  if (a === 'adminCambiarClave') {
    var nv = String(b.nueva || ''); if (nv.length < 10) return { ok: false, mensaje: 'La clave nueva debe tener al menos 10 caracteres.' };
    var sal = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    PropertiesService.getScriptProperties().setProperty('adminHash', sal + '$' + sha_(sal + nv)); return { ok: true, data: true };
  }
  return { ok: false, mensaje: 'Acción desconocida.' };
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (b.action === 'demoCrear') return json_(demoCrear_(b));
    if (b.action === 'pedidoGuardar') return json_(pedidoGuardar_(b));
    if (b.action === 'pedidoComprobante') return json_(pedidoComprobante_(b));
    if (b.action === 'adminLogin') return json_(adminLogin_(b));
    if (/^admin/.test(String(b.action))) return json_(adminOk_(b) ? admin_(b) : { ok: false, mensaje: 'Sesión vencida. Volvé a entrar.', sesion: true });
    return json_({ ok: false, mensaje: 'Acción desconocida.' });
  } catch (x) { return json_({ ok: false, mensaje: 'No pudimos crear tu weeb. Probá de nuevo.' }); }
}
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'demo') return json_(demoLeer_(p.id));
    if (p.action === 'pedido') return json_(pedidoGet_(p.id));
    if (p.action === 'dominio') return json_(dominioBuscar_(p.q));
    return json_({ ok: true, data: 'fabrica tuweeb' });
  } catch (x) { return json_({ ok: false, mensaje: 'Error.' }); }
}

/** Se programa una vez (diaria): borra demos viejas. */
function limpiar() {
  var corte = new Date().getTime() - DIAS_VIDA * 86400000, it = carpeta_().getFiles();
  var borrados = false; while (it.hasNext()) { var f = it.next(); if (/^_/.test(f.getName())) continue; if (f.getDateCreated().getTime() < corte && !pedLeer_(f.getName().replace(/\.json$/, ''))) { f.setTrashed(true); borrados = true; } }
  if (borrados) { var vivos = []; var it2 = carpeta_().getFiles(); while (it2.hasNext()) { var g = it2.next(); if (/^_/.test(g.getName())) continue; try { var x = JSON.parse(g.getBlob().getDataAsString()); vivos.push({ id: x.id, nombre: x.nombre, email: x.email, whatsapp: x.whatsapp || '', creada: x.creada }); } catch (e) {} } indiceGuardar_(vivos); }
}
function programarLimpieza() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'limpiar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('limpiar').timeBased().everyDays(1).atHour(4).create();
}
if (typeof module !== 'undefined') module.exports = { doPost: doPost, doGet: doGet, limpiarSvg_: limpiarSvg_, logoValido_: logoValido_ };
