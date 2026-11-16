/* crear/vectorizar.js — pasa el logo que sube una persona (PNG/JPG, con o sin fondo) a SVG limpio para el 3D y saca los colores de la marca.
   Corre en el navegador (también en Node para probarlo). Pasos: quitar el fondo liso → reducir a pocos colores planos (k-means) → limpiar manchas del JPG → trazar → limpiar el SVG. */
(function (root) {
  var IT = root.ImageTracer || (typeof require !== 'undefined' ? require('./imagetracer.js') : null);
  function hex(r, g, b) { return [r, g, b].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
  function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m, s = 0, h = 0; if (d) { s = l > .5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
  /* 1 · fondo liso: si el borde de la imagen es de un solo color, ese color (conectado al borde) pasa a transparente */
  function quitarFondo(id) {
    quitarFondo.ultimo = '';
    var w = id.width, h = id.height, d = id.data, i, n = 0, tr = 0;
    for (i = 3; i < d.length; i += 4) { n++; if (d[i] < 200) tr++; }
    if (tr / n > .02) return false;                                              // ya trae transparencia
    var borde = [], x, y; for (x = 0; x < w; x++) { borde.push(x, (h - 1) * w + x); } for (y = 0; y < h; y++) { borde.push(y * w, y * w + w - 1); }
    var cub = {}, mejor = '', mc = 0; borde.forEach(function (p) { var k = (d[p * 4] >> 4) + ',' + (d[p * 4 + 1] >> 4) + ',' + (d[p * 4 + 2] >> 4); cub[k] = (cub[k] || 0) + 1; if (cub[k] > mc) { mc = cub[k]; mejor = k; } });
    var r = 0, g = 0, b = 0, nb = 0; borde.forEach(function (p) { var k = (d[p * 4] >> 4) + ',' + (d[p * 4 + 1] >> 4) + ',' + (d[p * 4 + 2] >> 4); if (k === mejor) { r += d[p * 4]; g += d[p * 4 + 1]; b += d[p * 4 + 2]; nb++; } }); r /= nb; g /= nb; b /= nb;
    var cerca = function (p, t) { var dr = d[p * 4] - r, dg = d[p * 4 + 1] - g, db = d[p * 4 + 2] - b; return dr * dr + dg * dg + db * db <= t * t; };
    var ok = borde.filter(function (p) { return cerca(p, 48); }).length / borde.length; if (ok < .6) return false;
    var vis = new Uint8Array(w * h), pila = borde.filter(function (p) { return cerca(p, 52); }); pila.forEach(function (p) { vis[p] = 1; });
    while (pila.length) { var p = pila.pop(), px = p % w, py = (p - px) / w, vec = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1]; vec.forEach(function (q) { if (q >= 0 && !vis[q] && cerca(q, 52)) { vis[q] = 1; pila.push(q); } }); }
    var halo = new Uint8Array(vis); for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) { var pp = yy * w + xx; if (vis[pp]) continue; if ((xx > 0 && vis[pp - 1]) || (xx < w - 1 && vis[pp + 1]) || (yy > 0 && vis[pp - w]) || (yy < h - 1 && vis[pp + w])) halo[pp] = 1; }
    for (i = 0; i < halo.length; i++) if (halo[i]) d[i * 4 + 3] = 0;
    quitarFondo.ultimo = hex(r, g, b); return true;
  }
  /* 2 · pocos colores planos */
  function kmeans(pts, k) {
    var c = [pts[0].slice()], i, j, it; for (i = 1; i < k; i++) { var best = -1, bd = -1; for (j = 0; j < pts.length; j += Math.max(1, pts.length / 2000 | 0)) { var dm = 1e9; c.forEach(function (q) { var dd = (pts[j][0] - q[0]) * (pts[j][0] - q[0]) + (pts[j][1] - q[1]) * (pts[j][1] - q[1]) + (pts[j][2] - q[2]) * (pts[j][2] - q[2]); if (dd < dm) dm = dd; }); if (dm > bd) { bd = dm; best = j; } } c.push(pts[best].slice()); }
    for (it = 0; it < 10; it++) { var s = c.map(function () { return [0, 0, 0, 0]; }); pts.forEach(function (p) { var m = 0, md = 1e9; c.forEach(function (q, qi) { var dd = (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]) + (p[2] - q[2]) * (p[2] - q[2]); if (dd < md) { md = dd; m = qi; } }); s[m][0] += p[0]; s[m][1] += p[1]; s[m][2] += p[2]; s[m][3]++; }); c.forEach(function (q, qi) { if (s[qi][3]) { q[0] = s[qi][0] / s[qi][3]; q[1] = s[qi][1] / s[qi][3]; q[2] = s[qi][2] / s[qi][3]; } }); }
    return c;
  }
  function cuantizar(id, kmax) {
    var w = id.width, h = id.height, d = id.data, pts = [], idx = [], i;
    for (i = 0; i < w * h; i++) if (d[i * 4 + 3] >= 128) { pts.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]); idx.push(i); }
    if (!pts.length) throw new Error('El logo está vacío o es todo transparente.');
    var pal = kmeans(pts, Math.min(kmax, 8)), fundir = true;
    while (fundir) { fundir = false; for (var a = 0; a < pal.length && !fundir; a++) for (var b = a + 1; b < pal.length && !fundir; b++) { var dr = pal[a][0] - pal[b][0], dg = pal[a][1] - pal[b][1], db = pal[a][2] - pal[b][2]; if (dr * dr + dg * dg + db * db < 38 * 38) { pal.splice(b, 1); fundir = true; } } }
    var lab = new Int16Array(w * h).fill(-1);
    idx.forEach(function (p) { var m = 0, md = 1e9, r = d[p * 4], g = d[p * 4 + 1], bl = d[p * 4 + 2]; pal.forEach(function (q, qi) { var dd = (r - q[0]) * (r - q[0]) + (g - q[1]) * (g - q[1]) + (bl - q[2]) * (bl - q[2]); if (dd < md) { md = dd; m = qi; } }); lab[p] = m; });
    for (var pasada = 0; pasada < 2; pasada++) { var nl = lab.slice(); for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) { var p = y * w + x; if (lab[p] < 0) continue; var cnt = {}, best = lab[p], bc = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var l = lab[p + dy * w + dx]; if (l < 0) continue; cnt[l] = (cnt[l] || 0) + 1; if (cnt[l] > bc) { bc = cnt[l]; best = l; } } if (bc >= 5) nl[p] = best; } lab = nl; }
    var area = pal.map(function () { return 0; }); lab.forEach(function (l) { if (l >= 0) area[l]++; });
    var tot = area.reduce(function (a, b) { return a + b; }, 0) || 1;
    for (var k = 0; k < pal.length; k++) { if (area[k] && area[k] / tot < .008) { var bm = -1, bdd = 1e9; pal.forEach(function (q, qi) { if (qi === k || !area[qi] || area[qi] / tot < .008) return; var dd = (pal[k][0] - q[0]) * (pal[k][0] - q[0]) + (pal[k][1] - q[1]) * (pal[k][1] - q[1]) + (pal[k][2] - q[2]) * (pal[k][2] - q[2]); if (dd < bdd) { bdd = dd; bm = qi; } }); if (bm >= 0) { for (var z = 0; z < lab.length; z++) if (lab[z] === k) lab[z] = bm; area[bm] += area[k]; area[k] = 0; } } }
    /* colores "puente": mezcla de dos colores grandes (borde entre letra y fondo en un JPG); se reparten entre los dos */
    for (var m = 0; m < pal.length; m++) {
      if (!area[m] || area[m] / tot > .1) continue; var P = pal[m], mejorA = -1, mejorB = -1, md = 1e9;
      for (var a = 0; a < pal.length; a++) for (var b = a + 1; b < pal.length; b++) { if (a === m || b === m || area[a] / tot < .06 || area[b] / tot < .06) continue;
        var A = pal[a], B = pal[b], vx = B[0] - A[0], vy = B[1] - A[1], vz = B[2] - A[2], L = vx * vx + vy * vy + vz * vz || 1, t = ((P[0] - A[0]) * vx + (P[1] - A[1]) * vy + (P[2] - A[2]) * vz) / L; if (t < .05 || t > .95) continue;
        var dx = A[0] + vx * t - P[0], dy = A[1] + vy * t - P[1], dz = A[2] + vz * t - P[2], dd = Math.sqrt(dx * dx + dy * dy + dz * dz); if (dd < md) { md = dd; mejorA = a; mejorB = b; } }
      if (md < 26) { for (var q2 = 0; q2 < lab.length; q2++) if (lab[q2] === m) { /* al extremo más cercano de cada píxel se decide por color */ var px = q2 * 4, r0 = d[px], g0 = d[px + 1], b0 = d[px + 2], dA = (r0 - pal[mejorA][0]) * (r0 - pal[mejorA][0]) + (g0 - pal[mejorA][1]) * (g0 - pal[mejorA][1]) + (b0 - pal[mejorA][2]) * (b0 - pal[mejorA][2]), dB = (r0 - pal[mejorB][0]) * (r0 - pal[mejorB][0]) + (g0 - pal[mejorB][1]) * (g0 - pal[mejorB][1]) + (b0 - pal[mejorB][2]) * (b0 - pal[mejorB][2]); lab[q2] = dA < dB ? mejorA : mejorB; } area[mejorA] += area[m] / 2; area[mejorB] += area[m] / 2; area[m] = 0; }
    }
    return { pal: pal, lab: lab, area: area };
  }
  /* 3 · colores de la marca */
  function colores(pal, area) {
    var tot = area.reduce(function (a, b) { return a + b; }, 0) || 1, it = pal.map(function (c, i) { var q = hsl(c[0], c[1], c[2]); return { hex: hex(c[0], c[1], c[2]), h: q[0], s: q[1], l: q[2], a: area[i] / tot }; });
    var vivos = it.filter(function (x) { return x.s >= .28 && x.l > .12 && x.l < .9 && x.a > .015; }).sort(function (a, b) { return (b.a * (.4 + b.s)) - (a.a * (.4 + a.s)); });
    var c1, c2 = '';
    if (vivos.length) { c1 = vivos[0].hex; var o = vivos.filter(function (x) { var dh = Math.abs(x.h - vivos[0].h); dh = Math.min(dh, 360 - dh); return dh > 35 && x.a > vivos[0].a * .12; })[0]; if (o) c2 = o.hex; }
    else { var os = it.slice().sort(function (a, b) { return b.a - a.a; }).filter(function (x) { return x.l < .85; }); c1 = (os[0] || it[0]).hex; }
    return { color: c1, color2: c2, paleta: it.sort(function (a, b) { return b.a - a.a; }).map(function (x) { return x.hex; }) };
  }
  /* 4 · trazado y limpieza del SVG */
  function trazar(id, q, escala) {
    var w = id.width, h = id.height, rgba = new Uint8ClampedArray(w * h * 4);
    for (var i = 0; i < w * h; i++) { var l = q.lab[i]; if (l >= 0) { rgba[i * 4] = q.pal[l][0]; rgba[i * 4 + 1] = q.pal[l][1]; rgba[i * 4 + 2] = q.pal[l][2]; rgba[i * 4 + 3] = 255; } }
    var pal = q.pal.map(function (c) { return { r: Math.round(c[0]), g: Math.round(c[1]), b: Math.round(c[2]), a: 255 }; });
    var svg = IT.imagedataToSVG({ width: w, height: h, data: rgba }, { pal: pal, colorsampling: 0, numberofcolors: pal.length, layering: 0, strokewidth: 0, linefilter: true, scale: 1, roundcoords: 1, viewbox: true, desc: false, blurradius: 0, pathomit: Math.max(8, Math.round(w * h / 9000)), ltres: 1.2, qtres: 1.2 });
    svg = svg.replace(/ stroke="[^"]*"/g, '').replace(/ stroke-width="[^"]*"/g, '').replace(/ opacity="1"/g, '');
    return svg.replace(/<path[^>]* opacity="0[^"]*"[^>]*\/>/g, '').replace(/^<svg /, '<svg data-relieve="1" ');
  }
  /* 3b · placa: un color que ocupa casi todo el recuadro del logo (ej. cuadrado magenta con letras blancas). En 3D queda como un cartel: se saca y quedan las letras. */
  function quitarPlaca(q, w, h) {
    var tot = q.area.reduce(function (a, b) { return a + b; }, 0) || 1, mx = [], i;
    q.pal.forEach(function () { mx.push([w, h, -1, -1, 0]); });
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var l = q.lab[y * w + x]; if (l < 0) continue; var m = mx[l]; if (x < m[0]) m[0] = x; if (y < m[1]) m[1] = y; if (x > m[2]) m[2] = x; if (y > m[3]) m[3] = y; }
    var bx0 = w, by0 = h, bx1 = -1, by1 = -1; mx.forEach(function (m) { if (m[2] < 0) return; bx0 = Math.min(bx0, m[0]); by0 = Math.min(by0, m[1]); bx1 = Math.max(bx1, m[2]); by1 = Math.max(by1, m[3]); });
    var bA = (bx1 - bx0 + 1) * (by1 - by0 + 1), pl = -1;
    q.pal.forEach(function (c, k) { var m = mx[k]; if (m[2] < 0) return; var a = (m[2] - m[0] + 1) * (m[3] - m[1] + 1); if (a / bA > .8 && q.area[k] / tot > .3 && q.area[k] / a > .55 && q.area.length > 1) pl = k; });
    if (pl < 0) return -1;
    for (i = 0; i < q.lab.length; i++) if (q.lab[i] === pl) q.lab[i] = -1; q.area[pl] = 0; return pl;
  }
  function procesar(id, opt) {
    opt = opt || {}; var fondo = quitarFondo(id), q = cuantizar(id, opt.colores || 6), pl = -1, plHex = '';
    if (opt.sinPlaca !== false) { var antes = q.pal.slice(); pl = quitarPlaca(q, id.width, id.height); if (pl >= 0) plHex = hex(antes[pl][0], antes[pl][1], antes[pl][2]); }
    /* tonos casi iguales al fondo o a la placa que se sacó (anillo oscuro del JPG alrededor de las letras) también se van */
    [plHex, fondo ? quitarFondo.ultimo : ''].forEach(function (hx) { if (!hx) return; var hh = hsl(parseInt(hx.substr(0, 2), 16), parseInt(hx.substr(2, 2), 16), parseInt(hx.substr(4, 2), 16)); if (hh[1] < .25) return; var R = parseInt(hx.substr(0, 2), 16), G = parseInt(hx.substr(2, 2), 16), B = parseInt(hx.substr(4, 2), 16);
      q.pal.forEach(function (c, k) { if (!q.area[k]) return; var dd = Math.sqrt((c[0] - R) * (c[0] - R) + (c[1] - G) * (c[1] - G) + (c[2] - B) * (c[2] - B)); if (dd < 85 && q.area.length > 1) { for (var z = 0; z < q.lab.length; z++) if (q.lab[z] === k) q.lab[z] = -1; q.area[k] = 0; } }); });
    /* si lo que quedó son solo letras claras/blancas, sobre las nubes blancas del 3D no se leerían: toman el color de la marca (la placa o el fondo que se sacó) */
    var invertido = false, marca0 = plHex || (fondo ? quitarFondo.ultimo : '');
    if (marca0) { var mr = parseInt(marca0.substr(0, 2), 16), mg = parseInt(marca0.substr(2, 2), 16), mb = parseInt(marca0.substr(4, 2), 16), mh = hsl(mr, mg, mb);
      var vivos0 = q.pal.filter(function (c, k) { return q.area[k] > 0; }), claros = vivos0.length && vivos0.every(function (c) { var t = hsl(c[0], c[1], c[2]); return t[2] > .8 && (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])) < 40; });
      if (claros && mh[1] >= .25 && mh[2] > .12 && mh[2] < .88) { q.pal.forEach(function (c, k) { if (q.area[k] > 0) { q.pal[k] = [mr, mg, mb]; } }); invertido = true; } }
    var c = colores(q.pal.filter(function (_, k) { return q.area[k] > 0; }), q.area.filter(function (a) { return a > 0; })), svg = trazar(id, q);
    var marca = plHex || (fondo ? quitarFondo.ultimo : ''), mq = marca ? hsl(parseInt(marca.substr(0, 2), 16), parseInt(marca.substr(2, 2), 16), parseInt(marca.substr(4, 2), 16)) : null;
    if (mq && mq[1] >= .25 && mq[2] > .12 && mq[2] < .88) { if (c.color !== marca) { c.color2 = c.color2 && c.color2 !== c.color ? c.color2 : c.color; var q2 = hsl(parseInt(c.color2.substr(0, 2), 16), parseInt(c.color2.substr(2, 2), 16), parseInt(c.color2.substr(4, 2), 16)); if (q2[1] < .2 || q2[2] > .9 || q2[2] < .1) c.color2 = ''; } c.color = marca; if (c.paleta.indexOf(marca) < 0) c.paleta.unshift(marca); }
    return { svg: svg, color: c.color, color2: c.color2, paleta: c.paleta, fondoQuitado: fondo, placaQuitada: plHex, letrasConColorDeMarca: invertido, ancho: id.width, alto: id.height, formas: (svg.match(/<path/g) || []).length };
  }
  var API = { procesar: procesar, quitarFondo: quitarFondo, colores: colores, _cuantizar: cuantizar };
  if (typeof module !== 'undefined') module.exports = API; else root.Vectorizar = API;
})(typeof window !== 'undefined' ? window : globalThis);
