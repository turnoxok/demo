# bloques

Proyecto aparte dentro de `demo`: el editor con el sistema de bloques (piezas de encastre + piezas suaves).
- `editor.html`: copia del editor. Usa `<base href="../">`, así que los modelos e imágenes (`assets/`) son los mismos de `demo`.
- Las piezas suaves (arcos, túnel, toboganes, escalera, piso) están dentro del código; el original en Blender exportado es `assets/models/bloques_suaves.glb`.
- Abrir: https://demo.tuweeb.com/bloques/editor.html
- Los cambios al sistema de bloques se hacen acá; el editor de la raíz queda como estaba.

## Escenario de prueba: "Mundo de Bloques"
- `index.html`: el sitio exportado (se abre en https://demo.tuweeb.com/bloques/).
- `mundo-de-bloques.json`: el mismo proyecto como archivo (se abre con el ícono de carpeta del editor). El editor ya lo trae cargado.
- Pensado para celular en vertical: 6 paradas de cámara (entrada, se arma el castillo, castillo listo, tobogán, pileta, vista general). El castillo se arma solo al scrollear.
