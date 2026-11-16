/* crear/vectorizar.js — pasa el logo que sube una persona (PNG/JPG, con o sin fondo) a SVG limpio para el 3D y saca los colores de la marca.
   Corre en el navegador (también en Node para probarlo). Pasos: quitar el fondo liso → reducir a pocos colores planos (k-means) → limpiar manchas del JPG → trazar → limpiar el SVG. */
(function (root) {
  var IT = root.ImageTracer || (typeof require !== 'undefined' ? require('./imagetracer.js') : null);
  function hex(r, g, b) { return [r, g, b].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
  function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m, s = 0, h = 0; if (d) { s = l > .5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
  /* 1 · fondo liso: si el borde de la imagen es de un solo color, ese color (conectado al borde) pasa a transparente */
  function quitarFondo(id) {
    var w = id.width, h = id.height, d = id.data, i, n = 0, tr = 0;
    for (i = 3; i < d.length; i += 4) { n++; if (d[i] < 200) tr++; }
    if (tr / n > .02) return false;                                              // ya trae transparencia
    var borde = [], x, y; for (x = 0; x < w; x++) { borde.push(x, (h - 1) * w + x); } for (y = 0; y < h; y++) { borde.push(y * w, y * w + w - 1); }
    var r = 0, g = 0, b = 0; borde.forEach(function (p) { r += d[p * 4]; g += d[p * 4 + 1]; b += d[p * 4 + 2]; }); r /= borde.length; g /= borde.length; b /= borde.length;
    var cerca = function (p, t) { var dr = d[p * 4] - r, dg = d[p * 4 + 1] - g, db = d[p * 4 + 2] - b; return dr * dr + dg * dg + db * db <= t * t; };
    var ok = borde.filter(function (p) { return cerca(p, 40); }).length / borde.length; if (ok < .85) return false;
    var vis = new Uint8Array(w * h), pila = borde.filter(function (p) { return cerca(p, 44); }); pila.forEach(function (p) { vis[p] = 1; });
    while (pila.length) { var p = pila.pop(), px = p % w, py = (p - px) / w, vec = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1]; vec.forEach(function (q) { if (q >= 0 && !vis[q] && cerca(q, 44)) { vis[q] = 1; pila.push(q); } }); }
    for (i = 0; i < vis.length; i++) if (vis[i]) d[i * 4 + 3] = 0; return true;
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
    return svg.replace(/<path[^>]* opacity="0[^"]*"[^>]*\/>/g, '');
  }
  function procesar(id, opt) {
    opt = opt || {}; var fondo = quitarFondo(id), q = cuantizar(id, opt.colores || 6), c = colores(q.pal, q.area), svg = trazar(id, q);
    return { svg: svg, color: c.color, color2: c.color2, paleta: c.paleta, fondoQuitado: fondo, ancho: id.width, alto: id.height, formas: (svg.match(/<path/g) || []).length };
  }
  var API = { procesar: procesar, quitarFondo: quitarFondo, colores: colores };
  if (typeof module !== 'undefined') module.exports = API; else root.Vectorizar = API;
})(typeof window !== 'undefined' ? window : globalThis);
