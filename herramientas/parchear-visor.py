#!/usr/bin/env python3
"""Engancha el tema (tema.js) en el visor 3D: color de las piezas de la familia verde -> color de la marca, y logo extruido de la marca.
Sirve para el index.html exportado (minificado) y para los editores (donde el visor está escapado para HTML: acá no se usan los signos & < >).
uso: python3 herramientas/parchear-visor.py index.html editor.html ../weeb/editor/editor.html ..."""
import re, sys
HELPER_ED = """function temaColor(c) {
  if (!window.TEMA) return c;
  if (!TEMA.mapHsl) return c;
  const q = { h: 0, s: 0, l: 0 };
  c.getHSL(q, THREE.SRGBColorSpace);
  const r = TEMA.mapHsl(q.h * 360, q.s, q.l);
  if (r) c.setHSL(r[0] / 360, r[1], r[2], THREE.SRGBColorSpace);
  return c;
}
"""
HOOK = ('if (window.TEMA) { if (TEMA.logo3d) { OBJECTS.forEach(function (o) { if (o) { if (/logo-slogan[.]svg/.test(o.url || "")) { '
        'o.url = TEMA.logo3d.url; const m = Math.min(5.014 / TEMA.logo3d.aspect, 2.2); if (o.keyframes) o.keyframes.forEach(function (k) { k.scale = k.scale * m; }); } } }); } }')
INLINE_MAT = ("  if (base) { if (base.isColor) { base = base.clone(); if (window.TEMA) { if (TEMA.mapHsl) { const q = { h: 0, s: 0, l: 0 }; base.getHSL(q, THREE.SRGBColorSpace); "
              "const r = TEMA.mapHsl(q.h * 360, q.s, q.l); if (r) base.setHSL(r[0] / 360, r[1], r[2], THREE.SRGBColorSpace); } } } }\n")
def un(s): return s.replace('&amp;','&').replace('&lt;','<').replace('&gt;','>')
def parchear(f):
    s = open(f, encoding='utf-8').read()
    if 'temaColor' in s: print('ya parcheado', f); return
    n = 0
    if 'function gradeColor(base, g) {' in s:                                  # editor (fuente legible)
        s = s.replace('function gradeColor(base, g) {\n  const c = base.clone();', HELPER_ED + 'function gradeColor(base, g) {\n  const c = temaColor(base.clone());', 1); n += 1
        s = s.replace('function makeSvgMat(data, base, lite) {\n', 'function makeSvgMat(data, base, lite) {\n' + INLINE_MAT, 1); n += 1
        a = 'return `const OBJECTS = [\\n${objLines || "  // (sin objetos)"}\\n];`;'
        assert a in s, 'no encuentro el generador de OBJECTS en ' + f
        s = s.replace(a, 'return `const OBJECTS = [\\n${objLines || "  // (sin objetos)"}\\n];\\n' + HOOK.replace('\\', '\\\\') + '`;'); n += 1
    else:                                                                       # index exportado (minificado)
        helper = un(HELPER_ED).replace('\n', '').replace('  ', '')
        a = 'function gradeColor(base,g){const c=base.clone();'; assert a in s, 'sin gradeColor en ' + f
        s = s.replace(a, helper + 'function gradeColor(base,g){const c=temaColor(base.clone());', 1); n += 1
        a = 'function makeSvgMat(data,base,lite){'; assert a in s
        s = s.replace(a, a + INLINE_MAT.replace('\\n', '').replace('  ', ''), 1); n += 1
        i = s.index('const OBJECTS=['); d = 0; j = i + len('const OBJECTS=')
        q = None
        while True:                                                             # cierre del arreglo respetando comillas
            ch = s[j]
            if q:
                if ch == '\\': j += 1
                elif ch == q: q = None
            elif ch in '"\'`': q = ch
            elif ch == '[': d += 1
            elif ch == ']':
                d -= 1
                if d == 0: break
            j += 1
        assert s[j + 1] == ';', s[j:j + 20]
        s = s[:j + 2] + HOOK.replace('  ', ' ') + s[j + 2:]; n += 1
    open(f, 'w', encoding='utf-8').write(s); print('parcheado', f, n, 'puntos')
for f in sys.argv[1:]: parchear(f)
