
/* ═══════════════ MULTI-CLIENTE (lo agrega herramientas/armar_reservas.py; no editar a mano) ═══════════════
   Un solo sistema atiende a todos los clientes. Cada pedido trae «c» (código del cliente); el sistema busca la hoja de ese
   cliente y trabaja sobre ella. Cada cliente tiene su hoja, su clave de panel y su caché, y no se mezclan. */
var RV_CTX = { id: '', sheetId: '' };
function rvCache_() {
  var c = CacheService.getScriptCache(), pre = 'rv:' + RV_CTX.id + ':';
  return { get: function (k) { return c.get(pre + k); }, put: function (k, v, t) { return t == null ? c.put(pre + k, v) : c.put(pre + k, v, t); }, remove: function (k) { c.remove(pre + k); } };
}
function rvIdOk_(id) { id = String(id || '').toLowerCase(); return /^[a-z0-9][a-z0-9-]{2,29}$/.test(id) ? id : ''; }
/** Cambia al cliente indicado. false si ese cliente no está registrado. */
function rvUsar_(id) {
  id = rvIdOk_(id); if (!id) return false;
  var c = CacheService.getScriptCache(), sid = c.get('rvmap:' + id);
  if (!sid) { sid = PropertiesService.getScriptProperties().getProperty('RVC:' + id); if (!sid) return false; c.put('rvmap:' + id, sid, 21600); }
  RV_CTX = { id: id, sheetId: sid }; CFG_MEMO = null; return true;
}
function rvEntrada_(p, esPost) {
  if (!rvUsar_(p.cl)) return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'SIN_CLIENTE', mensaje: 'Este sitio todavía no tiene su sistema de reservas conectado.' })).setMimeType(ContentService.MimeType.JSON);
  return responder_(function () { return despachar_(p, esPost); });
}
function rvDoGet(e) { return rvEntrada_((e && e.parameter) || {}, false); }
function rvClientes_() { var o = PropertiesService.getScriptProperties().getProperties(), l = []; Object.keys(o).forEach(function (k) { if (k.indexOf('RVC:') === 0) l.push(k.slice(4)); }); return l; }
/** Da de alta un cliente: arma las pestañas de su hoja, carga nombre y WhatsApp y crea el acceso del dueño al panel. */
function rvRegistrar_(o) {
  var id = rvIdOk_(o.id); if (!id || !o.sheetId) throw new Error('Cliente inválido');
  PropertiesService.getScriptProperties().setProperty('RVC:' + id, String(o.sheetId)); CacheService.getScriptCache().remove('rvmap:' + id);
  if (!rvUsar_(id)) throw new Error('No pude registrar al cliente');
  rvInstalarHoja_();
  var vals = {}; if (o.nombre) vals.nombre = String(o.nombre).slice(0, 80); if (o.whatsapp) vals.whatsapp = String(o.whatsapp).replace(/\D/g, '').slice(0, 15);
  if (Object.keys(vals).length) guardarConfig_({ valores: vals }, 'sistema');
  definirUsuario_(o.email, o.clave, o.dueno || 'Dueño/a', 'admin');
  return true;
}
function rvNuevaClave_(id, email, clave) { if (!rvUsar_(id)) throw new Error('Ese cliente no tiene sistema de reservas'); definirUsuario_(email, clave, '', ''); return true; }
function rvQuitar_(id) { id = rvIdOk_(id); if (!id) return false; PropertiesService.getScriptProperties().deleteProperty('RVC:' + id); CacheService.getScriptCache().remove('rvmap:' + id); return true; }
function rvPorCliente_(fn) { rvClientes_().forEach(function (id) { try { if (rvUsar_(id)) fn(); } catch (e) {} }); }
function rvVencerTodos_() { rvPorCliente_(vencer_); }
function rvBackupTodos_() { rvPorCliente_(backup_); }
function rvLimpiarTodos_() { rvPorCliente_(limpiarComprobantes_); }
function rvInstalarTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { var f = t.getHandlerFunction(); if (f === 'rvVencerTodos_' || f === 'rvBackupTodos_' || f === 'rvLimpiarTodos_') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('rvVencerTodos_').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('rvBackupTodos_').timeBased().everyDays(1).atHour(3).create();
  ScriptApp.newTrigger('rvLimpiarTodos_').timeBased().everyDays(1).atHour(4).create();
  return true;
}
