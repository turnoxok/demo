/**
 * Fábrica de demos de tuweeb.
 * Se publica una sola vez como "Aplicación web" (ejecutar como: yo · acceso: cualquiera).
 *  - POST {action:'demoCrear', ...}  -> crea la demo y manda los links por mail
 *  - GET  ?action=demo&id=XXXX       -> devuelve la configuración pública de esa demo
 * Cada demo es un archivo JSON en la carpeta "tuweeb-demos" de Drive.
 * Pedidos de "Mi web" (logo animado, marca 3D, salón 3D y dominio): un JSON por demo en "tuweeb-pedidos"; comprobantes en "tuweeb-comprobantes" (privados).
 *  - GET  ?action=pedido&id=X | ?action=dominio&q=nombre
 *  - POST {action:'pedidoGuardar'|'pedidoComprobante', id, ...}
 *  - POST {action:'adminLogin'|'admin...', token, ...}  -> panel del dueño (admin/)
 * Una función diaria (limpiar) borra las demos que pasaron los DIAS_VIDA.
 */
var SITIO = 'https://demo.tuweeb.com/';
var CARPETA = 'tuweeb-demos';
var DIAS_VIDA = 7;
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
    if (b.salon) { try { crmVincular_(b.salon, id, demo.creada); } catch (e) {} }
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
  return { ok: true, data: { nombre: d.nombre, email: d.email, whatsapp: d.whatsapp, color: d.color, color2: d.color2, color3: d.color3 || '', color4: d.color4 || '', logo: d.logo, logo3d: d.logo3d || '', datos: d.datos || null, creada: d.creada || '', conPedido: !!pedLeer_(id) } };
}


/* ───────────── Mi web: pedidos y pagos de las demos ───────────── */
var CARP_PEDIDOS = 'tuweeb-pedidos', CARP_COMP = 'tuweeb-comprobantes', DOMINIO_BASE = 'salondefiestas.com', MP_LINK = 'https://link.mercadopago.com.ar/x23';
var ADMIN_SAL = '3c92d13582a6210b', ADMIN_HASH = '9c5b526a2d31eff182a9086648d2a6088a6ad5420504125209ce2bfbe57b7b92';
/** Lo que se vende. total = precio; sena = lo que se paga para arrancar; modo: sena (saldo contra entrega) · anual (todo junto) · entrega (sin seña) */
var PRODUCTOS = {
  logo:   { nombre: 'Tu logo animado', total: 149000, sena: 74500, modo: 'sena', plan: true, detalle: 'Seña para arrancar y saldo contra entrega. Entrega en 24 a 48 hs.' },
  marca:  { nombre: 'Tu marca en 3D', total: 380000, sena: 190000, modo: 'sena', plan: true, detalle: 'Seña para arrancar y saldo contra entrega.' },
  salon:  { nombre: 'Tu salón en 3D', total: 720000, sena: 360000, modo: 'sena', plan: true, detalle: 'Seña para arrancar y saldo contra entrega.' },
  dominio:{ nombre: 'Dominio con otra terminación (primer año)', total: 43000, sena: 43000, modo: 'anual', detalle: 'El .com del primer año va incluido en el plan. Otras terminaciones: $43.000 por año, se abona junto con la seña.' }
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
  return { id: id, items: items, dominio: ped.dominio || '',
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
  var plan = (Array.isArray(b.items) ? b.items : []).filter(function (k) { return PRODUCTOS[k] && PRODUCTOS[k].plan; })[0];
  var dm = String(b.dominio || '').toLowerCase().trim();
  if (dm && !/^[a-z0-9-]{2,60}(\.[a-z0-9-]{2,20}){1,2}$/.test(dm)) return { ok: false, mensaje: 'El dominio elegido no es válido. Buscalo de nuevo.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var ped = pedLeer_(id) || { id: id, nombre: demo.nombre, email: demo.email, whatsapp: demo.whatsapp || '', creado: new Date().toISOString(), items: {}, pagos: [] }, nuevos = [];
    var tienePlan = Object.keys(ped.items).some(function (k) { return PRODUCTOS[k] && PRODUCTOS[k].plan; });
    if (!plan && !tienePlan) return { ok: false, mensaje: 'Elegí un plan.' };
    ped.nombre = demo.nombre; ped.email = demo.email; ped.whatsapp = demo.whatsapp || '';
    if (plan && !tienePlan) { ped.items[plan] = { estado: 'pedido', creado: new Date().toISOString() }; nuevos.push(PRODUCTOS[plan].nombre); }
    if (dm) {
      ped.dominio = dm;
      if (/\.com$/.test(dm)) { if (ped.items.dominio && !(ped.pagos || []).some(function (g) { return g.k === 'dominio'; })) delete ped.items.dominio; }
      else if (!ped.items.dominio) { ped.items.dominio = { estado: 'pedido', creado: new Date().toISOString() }; nuevos.push(PRODUCTOS.dominio.nombre); }
    }
    pedGuardar_(ped);
    if (nuevos.length) avisoDueno_('Nuevo pedido: ' + demo.nombre, demo.nombre + ' (' + demo.email + ', WhatsApp ' + (demo.whatsapp || '-') + ')\nPidió: ' + nuevos.join(', ') + '\nDominio: ' + (ped.dominio || '(todavía no lo eligió)'));
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
  if (/^admin(Salon|Nota|Cobro)/.test(a)) return crmAdmin_(b);
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
    it.next().setTrashed(true);
    var pf = carp_(CARP_PEDIDOS).getFilesByName(id + '.json'); while (pf.hasNext()) pf.next().setTrashed(true);   // pedido y pagos de esa demo
    var cf = carp_(CARP_COMP).getFiles(); while (cf.hasNext()) { var cx = cf.next(); if (cx.getName().indexOf(id + '_') === 0) cx.setTrashed(true); }   // comprobantes
    indiceGuardar_(indice_().filter(function (x) { return x.id !== id; })); return { ok: true, data: true };
  }
  if (a === 'adminCambiarClave') {
    var nv = String(b.nueva || ''); if (nv.length < 10) return { ok: false, mensaje: 'La clave nueva debe tener al menos 10 caracteres.' };
    var sal = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    PropertiesService.getScriptProperties().setProperty('adminHash', sal + '$' + sha_(sal + nv)); return { ok: true, data: true };
  }
  return { ok: false, mensaje: 'Acción desconocida.' };
}

/** Baja un logo de la lista de salones (solo de elsitiodelpelotero.com) y lo devuelve como imagen, para que el creador lo cargue solo. */
function logoUrl_(u) {
  u = String(u || '');
  if (!/^https:\/\/www\.elsitiodelpelotero\.com\/clientes\/[\w.\-%]+$/.test(u)) return { ok: false, mensaje: 'Dirección de logo no permitida.' };
  var r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: false });
  if (r.getResponseCode() !== 200) return { ok: false, mensaje: 'No se pudo bajar el logo.' };
  var bl = r.getBlob(), ct = String(bl.getContentType() || ''), by = bl.getBytes();
  if (!/^image\/(png|jpeg|webp|gif)$/.test(ct) || by.length > 3000000) return { ok: false, mensaje: 'El logo no es una imagen válida.' };
  return { ok: true, data: { dataUrl: 'data:' + ct + ';base64,' + Utilities.base64Encode(by) } };
}

/** Salones a los que ya se les mandó el mensaje (se comparte entre la compu y el celu). */
function enviados_() {
  var it = carpeta_().getFilesByName('_enviados.json');
  try { return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : {}; } catch (x) { return {}; }
}
function enviadoMarcar_(b) {
  var ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(String).filter(function (i) { return /^[a-z0-9]{3,40}$/.test(i); }).slice(0, 500);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var m = enviados_(), ahora = new Date().getTime(), nuevos = ids.filter(function (i) { return !m[i]; }); ids.forEach(function (i) { if (!m[i]) m[i] = ahora; });
    try { crmEnviado_(nuevos); } catch (e) {}
    var d = carpeta_(), it = d.getFilesByName('_enviados.json');
    if (it.hasNext()) it.next().setContent(JSON.stringify(m)); else d.createFile('_enviados.json', JSON.stringify(m), MimeType.PLAIN_TEXT);
    return { ok: true, data: m };
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (b.action === 'demoCrear') return json_(demoCrear_(b));
    if (b.action === 'opMarcar') return json_(enviadoMarcar_(b));
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
    if (p.action === 'logoUrl') return json_(logoUrl_(p.u));
    if (p.action === 'salon') return json_(crmSalonPublico_(p.id));
    if (p.action === 'enviados') return json_({ ok: true, data: enviados_() });
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

/* ============ Base de salones (CRM): la planilla "Salones" es la fuente única ============
 * Columnas: A Nombre · B Logo · C Provincia · D Ciudad · E WhatsApp · F Link WhatsApp (los carga el dueño)
 *           G ID · H Etapa (hablando/cliente/postventa/descartado; vacío = automática) · I Demo · J Demo creada · K Enviada
 *           L Acordado · M Web vendida · N Resumen. Hojas "Notas" y "Cobros" (con comprobantes en Drive). Los salones NUNCA se borran. */
var SHEET_ID = '1BVH40TxG4BkY--b_NhRkkL731Dz9GsdCpTH2vSL2hr0', HOJA = 'Salones', ETAPAS = ['hablando', 'cliente', 'postventa', 'descartado'];
var CAB_NOTAS = ['Salón', 'Fecha', 'Nota', 'Id'], CAB_COBROS = ['Salón', 'Id', 'Fecha', 'Monto', 'Detalle', 'Archivo', 'Tipo', 'Nombre del archivo'];
function libro_() { return SpreadsheetApp.openById(SHEET_ID); }
function hojaAux_(nombre, cab) { var l = libro_(), h = l.getSheetByName(nombre); if (!h) { h = l.insertSheet(nombre); h.appendRow(cab); h.setFrozenRows(1); } return h; }
function digs_(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
function iso_(v) { if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString(); v = String(v == null ? '' : v); var t = Date.parse(v); return isNaN(t) ? '' : new Date(t).toISOString(); }
function wsp_(tel, lnk) { var d = digs_(lnk).length >= 10 ? digs_(lnk) : digs_(tel); if (!d) return ''; if (d.indexOf('54') === 0) return d; return '549' + d.replace(/^0+/, '').replace(/^(\d{2,4})15/, '$1'); }
function slugId_(nombre, usados) {
  var base = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24); if (base.length < 3) base = (base + 'salon').slice(0, 24);
  var id = base, n = 1; while (usados[id] || RESERVADOS.indexOf(id) >= 0) { n++; id = base + n; } return id;
}
/** Lista vieja de salones (con los ids que ya usaban los "enviados"): sirve solo para asignar los ids la primera vez. */
function semilla_() { try { var l = JSON.parse(UrlFetchApp.fetch(SITIO + 'crear/salones.json').getContentText()), m = {}; l.forEach(function (x) { m[digs_(x.w).slice(-10)] = x.i; }); return m; } catch (e) { return {}; } }
/** Lee la planilla, asigna ids a filas nuevas, enlaza las demos existentes y trae lo que falte. Devuelve las filas listas. */
function crmLeer_() {
  var h = libro_().getSheetByName(HOJA), n = h.getLastRow(), vals = n > 1 ? h.getRange(2, 1, n - 1, 14).getValues() : [], usados = {}, sem = null, rows = [];
  vals.forEach(function (r) { if (r[6]) usados[String(r[6]).trim()] = 1; });
  vals.forEach(function (r, i) {
    var nom = String(r[0] || '').trim(); if (!nom) return;
    var id = String(r[6] || '').trim();
    if (!id) {
      if (sem === null) sem = semilla_();
      var s0 = sem[digs_(r[4]).slice(-10)]; id = (s0 && !usados[s0]) ? s0 : slugId_(nom, usados); usados[id] = 1; h.getRange(i + 2, 7).setValue(id);
    }
    rows.push({ fila: i + 2, id: id, n: nom, logo: String(r[1] || ''), prov: String(r[2] || ''), ciu: String(r[3] || ''), w: wsp_(r[4], r[5]), etapa: String(r[7] || '').toLowerCase().trim(), demo: String(r[8] || '').trim(), creada: iso_(r[9]), enviada: iso_(r[10]), acordado: Number(r[11]) || 0, web: String(r[12] || ''), resumen: String(r[13] || '') });
  });
  return { h: h, rows: rows, usados: usados };
}
function celdas_(h, fila, o) {  // o: { col: valor }
  Object.keys(o).forEach(function (c) { var v = o[c]; if (c === '10' || c === '11') { v = v ? new Date(v) : ''; var cell = h.getRange(fila, Number(c)); cell.setNumberFormat('dd/mm/yyyy hh:mm'); cell.setValue(v); } else h.getRange(fila, Number(c)).setValue(v); });
}
function crmEnlazar_(base, vivas, peds) {
  var rows = base.rows, h = base.h, env = enviados_(), cambio = false;
  var porTel = {}, porId = {}; rows.forEach(function (r) { if (r.w) porTel[r.w.slice(-10)] = r; porId[r.id] = r; });
  vivas.slice().sort(function (a, b) { return String(a.creada) < String(b.creada) ? -1 : 1; }).forEach(function (d) {
    var r = (d.whatsapp && porTel[digs_(d.whatsapp).slice(-10)]) || porId[slugId_(d.nombre, {})] || null;
    if (!r && peds[d.id]) {   // demo con pedido que no está en la planilla (ej: un cliente): se agrega
      var id = slugId_(d.nombre, base.usados); base.usados[id] = 1;
      h.appendRow([d.nombre, '', '', '', d.whatsapp || '', d.whatsapp ? 'https://wa.me/' + digs_(d.whatsapp) : '', id, 'hablando', d.id, '', '', '', '', '']);
      var fila = h.getLastRow(); celdas_(h, fila, { 10: d.creada });
      r = { fila: fila, id: id, n: d.nombre, logo: '', prov: '', ciu: '', w: digs_(d.whatsapp), etapa: 'hablando', demo: d.id, creada: d.creada, enviada: '', acordado: 0, web: '', resumen: '' }; rows.push(r); porId[id] = r; return;
    }
    if (!r) return;
    if (r.demo !== d.id && (!r.creada || String(d.creada) > String(r.creada))) { r.demo = d.id; r.creada = d.creada; celdas_(h, r.fila, { 9: d.id, 10: d.creada }); }
    if (peds[d.id] && !r.etapa) { r.etapa = 'hablando'; h.getRange(r.fila, 8).setValue('hablando'); }
  });
  rows.forEach(function (r) { if (!r.enviada && env[r.id]) { r.enviada = new Date(env[r.id]).toISOString(); celdas_(h, r.fila, { 11: r.enviada }); } });
  return rows;
}
function estadoSalon_(r, vivas, ahora) {
  if (ETAPAS.indexOf(r.etapa) >= 0) return { estado: r.etapa, dias: null };
  if (!r.demo) return { estado: 'nuevo', dias: null };
  var d = vivas[r.demo]; if (!d) return { estado: 'vencida', dias: null };
  var dias = DIAS_VIDA - Math.floor((ahora - Date.parse(d.creada)) / 86400000);
  if (!r.enviada) return { estado: 'creada', dias: dias };
  return { estado: dias <= 2 ? 'porvencer' : 'enviada', dias: dias };
}
function crmCobrado_() {
  var h = libro_().getSheetByName('Cobros'), m = {}; if (!h || h.getLastRow() < 2) return m;
  h.getRange(2, 1, h.getLastRow() - 1, 4).getValues().forEach(function (r) { var k = String(r[0]); m[k] = (m[k] || 0) + (Number(r[3]) || 0); }); return m;
}
function crmSalones_() {
  var base = crmLeer_(), ix = indice_(), vivas = {}, peds = {}, ahora = new Date().getTime();
  ix.forEach(function (d) { vivas[d.id] = d; });
  var fs = carp_(CARP_PEDIDOS).getFiles(); while (fs.hasNext()) { var f = fs.next(); try { var p = JSON.parse(f.getBlob().getDataAsString()); peds[p.id] = resumenPed_(p); } catch (e) {} }
  var rows = crmEnlazar_(base, ix, peds), cob = crmCobrado_();
  return rows.map(function (r) { var e = estadoSalon_(r, vivas, ahora); r.estado = e.estado; r.dias = e.dias; r.demoVivo = !!vivas[r.demo]; r.pedido = peds[r.demo] || null; r.cobrado = cob[r.id] || 0; return r; });
}
function crmFila_(id) { var base = crmLeer_(), r = base.rows.filter(function (x) { return x.id === id; })[0]; return r ? { h: base.h, r: r, base: base } : null; }
/** Se corre una sola vez a mano desde el editor: pide el permiso para leer la planilla y deja las filas ordenadas. */
function autorizarPlanilla() { var n = crmSalones_().length; Logger.log('Salones leidos: ' + n); return n; }
function crmSalonPublico_(id) { id = String(id || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40); var x = id && crmFila_(id); return x ? { ok: true, data: { i: x.r.id, n: x.r.n, l: x.r.logo, w: x.r.w, c: x.r.ciu, p: x.r.prov } } : { ok: false, mensaje: 'No encontré ese salón en la planilla.' }; }
function crmVincular_(salon, demoId, creada) { var x = crmFila_(String(salon || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)); if (x) celdas_(x.h, x.r.fila, { 9: demoId, 10: creada, 11: '' }); }
function crmEnviado_(ids) { if (ids.length > 20) return; var base = crmLeer_(); base.rows.forEach(function (r) { if (ids.indexOf(r.id) >= 0 && !r.enviada) celdas_(base.h, r.fila, { 11: new Date().toISOString() }); }); }
function crmAdmin_(b) {
  var a = String(b.action || ''), id = String(b.id || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  if (a === 'adminSalones') return { ok: true, data: { salones: crmSalones_(), transferencia: (function () { var t = transferCfg_(); if (t.mp === undefined) t.mp = MP_LINK; return t; })() } };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (a === 'adminSalonAlta') {
      var nom = texto_(b.nombre, 80); if (nom.length < 2) return { ok: false, mensaje: 'Falta el nombre.' };
      var base = crmLeer_(), nid = slugId_(nom, base.usados), tel = digs_(b.tel).slice(0, 15), et = ETAPAS.indexOf(b.etapa) >= 0 ? b.etapa : '';
      base.h.appendRow([nom, '', texto_(b.prov, 40), texto_(b.ciu, 60), tel, tel ? 'https://wa.me/' + wsp_(tel, '') : '', nid, et, '', '', '', '', '', '']);
      return { ok: true, data: { id: nid } };
    }
    var x = crmFila_(id); if (!x) return { ok: false, mensaje: 'Salón inexistente.' };
    if (a === 'adminSalon') {
      var nh = libro_().getSheetByName('Notas'), ch = libro_().getSheetByName('Cobros'), notas = [], cobros = [];
      if (nh && nh.getLastRow() > 1) nh.getRange(2, 1, nh.getLastRow() - 1, 4).getValues().forEach(function (r) { if (String(r[0]) === id) notas.push({ nid: String(r[3]), fecha: iso_(r[1]), texto: String(r[2]) }); });
      if (ch && ch.getLastRow() > 1) ch.getRange(2, 1, ch.getLastRow() - 1, 8).getValues().forEach(function (r) { if (String(r[0]) === id) cobros.push({ id: String(r[1]), fecha: iso_(r[2]), monto: Number(r[3]) || 0, detalle: String(r[4] || ''), archivo: String(r[7] || ''), tipo: String(r[6] || ''), tiene: !!r[5] }); });
      var vivas = {}; indice_().forEach(function (d) { vivas[d.id] = d; });
      var e = estadoSalon_(x.r, vivas, new Date().getTime()); x.r.estado = e.estado; x.r.dias = e.dias; x.r.demoVivo = !!vivas[x.r.demo];
      return { ok: true, data: { salon: x.r, notas: notas.reverse(), cobros: cobros.reverse() } };
    }
    if (a === 'adminSalonGuardar') {
      var c = {};
      if (b.etapa !== undefined) { var etp = String(b.etapa || ''); if (etp && ETAPAS.indexOf(etp) < 0) return { ok: false, mensaje: 'Etapa inválida.' }; c[8] = etp; }
      if (b.acordado !== undefined) c[12] = Math.max(0, Math.min(1e9, Math.round(Number(b.acordado) || 0)));
      if (b.web !== undefined) { var w = String(b.web || '').trim(); c[13] = /^https:\/\/[^\s<>"]{3,200}$/.test(w) ? w : ''; }
      if (b.resumen !== undefined) c[14] = texto_(b.resumen, 300);
      celdas_(x.h, x.r.fila, c); return { ok: true, data: true };
    }
    if (a === 'adminNota') {
      var tx = texto_(b.texto, 1000); if (!tx) return { ok: false, mensaje: 'Escribí la nota.' };
      hojaAux_('Notas', CAB_NOTAS).appendRow([id, new Date(), tx, 'N' + Utilities.getUuid().replace(/-/g, '').slice(0, 8)]); return { ok: true, data: true };
    }
    if (a === 'adminNotaBorrar') {
      var nh2 = hojaAux_('Notas', CAB_NOTAS), v = nh2.getLastRow() > 1 ? nh2.getRange(2, 1, nh2.getLastRow() - 1, 4).getValues() : [];
      for (var i = 0; i < v.length; i++) if (String(v[i][0]) === id && String(v[i][3]) === String(b.nid)) { nh2.deleteRow(i + 2); return { ok: true, data: true }; }
      return { ok: false, mensaje: 'Nota inexistente.' };
    }
    if (a === 'adminCobro') {
      var monto = Math.round(Number(b.monto) || 0); if (monto < 1 || monto > 1e9) return { ok: false, mensaje: 'Escribí el monto.' };
      var tipo = String(b.tipo || '').toLowerCase(), ext = COMP_TIPOS[tipo], b64 = String(b.datos || '').replace(/^data:[^,]*,/, '').replace(/\s/g, '');
      if (b64 && !ext) return { ok: false, mensaje: 'El comprobante tiene que ser JPG, PNG o PDF.' };
      if (b64.length * 0.75 > 6 * 1024 * 1024) return { ok: false, mensaje: 'El archivo pesa demasiado (máximo 6 MB).' };
      var pid = 'C' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), nombre = texto_(b.nombre || '', 80).replace(/[\\\/:*?"<>|]/g, '_').replace(/\.[A-Za-z0-9]+$/, '') || 'comprobante';
      var f = b64 ? carp_(CARP_COMP).createFile(Utilities.newBlob(Utilities.base64Decode(b64), tipo, 'crm_' + id + '_' + pid + '.' + ext)) : null;
      var fch = b.fecha && !isNaN(Date.parse(b.fecha)) ? new Date(b.fecha) : new Date();
      hojaAux_('Cobros', CAB_COBROS).appendRow([id, pid, fch, monto, texto_(b.detalle, 120), f ? f.getId() : '', b64 ? tipo : '', f ? nombre + '.' + ext : '']); return { ok: true, data: true };
    }
    if (a === 'adminCobroBorrar' || a === 'adminCobroArchivo') {
      var ch2 = hojaAux_('Cobros', CAB_COBROS), v2 = ch2.getLastRow() > 1 ? ch2.getRange(2, 1, ch2.getLastRow() - 1, 8).getValues() : [];
      for (var j = 0; j < v2.length; j++) if (String(v2[j][0]) === id && String(v2[j][1]) === String(b.pagoId)) {
        if (a === 'adminCobroArchivo') { if (!v2[j][5]) return { ok: false, mensaje: 'Sin archivo.' }; var bl = DriveApp.getFileById(String(v2[j][5])).getBlob(); return { ok: true, data: { tipo: String(v2[j][6]), nombre: String(v2[j][7]), datos: Utilities.base64Encode(bl.getBytes()) } }; }
        if (v2[j][5]) { try { DriveApp.getFileById(String(v2[j][5])).setTrashed(true); } catch (e2) {} }
        ch2.deleteRow(j + 2); return { ok: true, data: true };
      }
      return { ok: false, mensaje: 'Cobro inexistente.' };
    }
    return { ok: false, mensaje: 'Acción desconocida.' };
  } finally { lock.releaseLock(); }
}

if (typeof module !== 'undefined') module.exports = { crmLeer_: crmLeer_, crmEnlazar_: crmEnlazar_, estadoSalon_: estadoSalon_, crmAdmin_: crmAdmin_, wsp_: wsp_, doPost: doPost, doGet: doGet, limpiarSvg_: limpiarSvg_, logoValido_: logoValido_ };
