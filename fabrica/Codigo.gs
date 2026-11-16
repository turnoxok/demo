/**
 * Fábrica de demos de tuweeb.
 * Se publica una sola vez como "Aplicación web" (ejecutar como: yo · acceso: cualquiera).
 *  - POST {action:'demoCrear', ...}  -> crea la demo y manda los links por mail
 *  - GET  ?action=demo&id=XXXX       -> devuelve la configuración pública de esa demo
 * Cada demo es un archivo JSON en la carpeta "tuweeb-demos" de Drive.
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

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (b.action === 'demoCrear') return json_(demoCrear_(b));
    return json_({ ok: false, mensaje: 'Acción desconocida.' });
  } catch (x) { return json_({ ok: false, mensaje: 'No pudimos crear tu weeb. Probá de nuevo.' }); }
}
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'demo') return json_(demoLeer_(p.id));
    return json_({ ok: true, data: 'fabrica tuweeb' });
  } catch (x) { return json_({ ok: false, mensaje: 'Error.' }); }
}

/** Se programa una vez (diaria): borra demos viejas. */
function limpiar() {
  var corte = new Date().getTime() - DIAS_VIDA * 86400000, it = carpeta_().getFiles();
  while (it.hasNext()) { var f = it.next(); if (f.getDateCreated().getTime() < corte) f.setTrashed(true); }
}
function programarLimpieza() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'limpiar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('limpiar').timeBased().everyDays(1).atHour(4).create();
}
if (typeof module !== 'undefined') module.exports = { doPost: doPost, doGet: doGet, limpiarSvg_: limpiarSvg_, logoValido_: logoValido_ };
