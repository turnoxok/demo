// Pruebas del sistema único (varios clientes, una sola copia del código).  node reservas-base/test/mt.test.js
process.env.RV_MULTI = '1';
const { crear } = require('./mock');
const assert = require('assert');
let n = 0, fallos = 0;
const t = (nombre, fn) => { try { fn(); n++; console.log('  ok  ' + nombre); } catch (e) { fallos++; console.log('FALLA ' + nombre + '\n      ' + (e.stack || e).split('\n').slice(0, 3).join('\n      ')); } };
const NOW = Date.parse('2026-11-02T18:00:00-03:00');
const a = crear({ multi: true }); a.setNow(NOW);
const J = (o) => JSON.parse(o.getContent());
const get = (c, params) => J(a.ctx.rvDoGet({ parameter: Object.assign({ c }, params) }));
const post = (c, body) => J(a.ctx.rvEntrada_(Object.assign({ c }, body), true));
const reg = (id, sheet, nombre, wa, mail, clave) => a.run(`rvRegistrar_({ id: '${id}', sheetId: '${sheet}', nombre: '${nombre}', whatsapp: '${wa}', email: '${mail}', clave: '${clave}' })`);

reg('rana-loca', 'HOJA_A', 'Rana Loca', '5491111111111', 'ana@rana.com', 'clave-ana-1234');
reg('sapo-feliz', 'HOJA_B', 'Sapo Feliz', '5492222222222', 'beto@sapo.com', 'clave-beto-1234');

console.log('Sistema único');
t('cada cliente tiene su propia hoja con todas las pestañas', () => {
  ['Config', 'Salones', 'Turnos', 'Reservas', 'Pagos', 'Usuarios'].forEach(h => { assert(a.libros.HOJA_A.hojas[h], 'A sin ' + h); assert(a.libros.HOJA_B.hojas[h], 'B sin ' + h); });
  assert.notStrictEqual(a.libros.HOJA_A.hojas.Config, a.libros.HOJA_B.hojas.Config);
});
t('la configuración pública sale de la hoja de cada uno (sin mezclarse por la caché)', () => {
  const A1 = get('rana-loca', { action: 'config' }), B1 = get('sapo-feliz', { action: 'config' }), A2 = get('rana-loca', { action: 'config' });
  assert(A1.ok && B1.ok, JSON.stringify([A1, B1]));
  assert.equal(A1.data.nombre, 'Rana Loca'); assert.equal(B1.data.nombre, 'Sapo Feliz'); assert.equal(A2.data.nombre, 'Rana Loca');
  assert.equal(B1.data.whatsapp, '5492222222222');
});
t('un cliente que no existe recibe un aviso claro', () => {
  const r = get('no-existe', { action: 'config' }); assert(!r.ok && r.error === 'SIN_CLIENTE', JSON.stringify(r));
  const r2 = get('', { action: 'config' }); assert(!r2.ok && r2.error === 'SIN_CLIENTE');
  const r3 = get('../../x', { action: 'config' }); assert(!r3.ok && r3.error === 'SIN_CLIENTE');
});
t('el dueño de cada cliente entra con su mail y su clave, y no entra al del otro', () => {
  const l = post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' }); assert(l.ok, JSON.stringify(l));
  const x = post('sapo-feliz', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' }); assert(!x.ok, 'Ana no debería entrar al panel de Sapo Feliz');
  const l2 = post('sapo-feliz', { action: 'login', email: 'beto@sapo.com', clave: 'clave-beto-1234' }); assert(l2.ok);
});
t('el token de un cliente no sirve en el otro', () => {
  const l = post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' });
  const ok = post('rana-loca', { action: 'admin.ping', token: l.data.token }); assert(ok.ok, JSON.stringify(ok));
  const mal = post('sapo-feliz', { action: 'admin.ping', token: l.data.token }); assert(!mal.ok, 'el token de Rana Loca no debe servir en Sapo Feliz');
});
t('una reserva de un cliente queda en su hoja y no aparece en la del otro', () => {
  const tk = post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' }).data.token;
  const tu = post('rana-loca', { action: 'admin.guardarTurno', token: tk, salonId: 'S1', dias: '6', inicio: '14:00', fin: '18:00', etiqueta: 'Tarde', precio: 100000, senaTipo: 'pct', senaValor: 30 });
  assert(tu.ok, JSON.stringify(tu));
  const r = post('rana-loca', { action: 'reservar', turnoId: tu.data.id, fecha: '2026-11-07', nombre: 'Juan', telefono: '+54 9 11 5555-1234', email: 'juan@mail.com', personas: 20, metodo: 'transferencia' });
  assert(r.ok, JSON.stringify(r));
  const filasA = a.libros.HOJA_A.hojas.Reservas.filas.filter(f => f.some(x => x)).length, filasB = a.libros.HOJA_B.hojas.Reservas.filas.filter(f => f.some(x => x)).length;
  assert(filasA >= 2 && filasB <= 1, `A=${filasA} B=${filasB}`);
  const dispA = get('rana-loca', { action: 'disponibilidad', mes: '2026-11' }), dispB = get('sapo-feliz', { action: 'disponibilidad', mes: '2026-11' });
  assert(dispA.ok && dispB.ok);
  const dia = (d) => JSON.stringify((d.data.dias || d.data)).includes('2026-11-07');
  assert(dia(dispA) && !dia(dispB), 'el calendario de B no debe tener el turno de A');
});
t('una cuenta por cliente: las tareas automáticas recorren a todos', () => {
  a.run('rvInstalarTriggers_()'); assert.equal(a.triggers.length, 3);
  a.run('rvInstalarTriggers_()'); assert.equal(a.triggers.length, 3, 'no se duplican');
  assert.equal(JSON.stringify(a.run('rvClientes_().filter(function (x) { return x !== "uno"; }).sort()')), JSON.stringify(['rana-loca', 'sapo-feliz']));
  a.run('rvVencerTodos_()'); a.run('rvBackupTodos_()');
});
t('cambiar la clave de un dueño', () => {
  a.run("rvNuevaClave_('rana-loca', 'ana@rana.com', 'otra-clave-5678')");
  assert(!post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' }).ok);
  assert(post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'otra-clave-5678' }).ok);
});
t('quitar a un cliente corta su acceso y no toca al otro', () => {
  a.run("rvQuitar_('sapo-feliz')");
  a.cache && Object.keys(a.cache).forEach(k => { if (k.indexOf('rvmap:') === 0) delete a.cache[k]; });
  assert(!get('sapo-feliz', { action: 'config' }).ok);
  assert(get('rana-loca', { action: 'config' }).ok);
});
t('datos inválidos al registrar', () => {
  assert.throws(() => reg('x', 'H', 'N', '', 'mal', 'clave-larga-123'));
  assert.throws(() => reg('otro-cliente', 'H', 'N', '', 'ok@ok.com', 'corta'));
});
console.log('\n' + n + ' pruebas ok, ' + fallos + ' con fallas'); process.exit(fallos ? 1 : 0);
