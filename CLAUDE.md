# demo — cómo trabajar en este repo

El dueño del proyecto (Argentina, español rioplatense con voseo) NO es técnico. Hablarle en simple, sin jerga y anticipando los detalles.
Las herramientas para exportar y armar el sitio están en `herramientas/` (ver su README). Todo se publica con GitHub Pages desde `main`.

## Pensar como especialista antes de tocar
Ante cualquier problema (lentitud, peso, algo que se ve mal), primero preguntarme qué haría un especialista en 3D y en webs de este tipo, y hacer eso directamente, sin medir ni parchar de a poco hasta que me lo pidan. Medir solo para confirmar el resultado, no para encontrar el camino.
Lo que un especialista haría siempre acá:
- Preparar de antemano lo pesado (piezas 3D ya armadas, modelos comprimidos) y no construirlo al abrir el sitio.
- Empezar a bajar lo pesado desde el primer segundo, en paralelo con el código.
- Que el cargador muestre progreso real (nunca un contador clavado en 000).
- Mirar los números en el celular y en la PC, en visita nueva (incógnito) y en visita repetida.

## Regla: nada en modo prueba sobre el admin, las demos ni las webs de clientes
Está prohibido publicar o desplegar experimentos, pruebas o ideas a medio terminar en el admin, en las demos (`demo-repo`, la fábrica, `demo.tuweeb.com`) ni en las webs de clientes (lo que ve un cliente o un salón). Lo que se publica ahí tiene que estar probado y ser algo que Ronaldo ya pidió dejar funcionando.
- Probar siempre aparte: en local, con una copia o en una rama que no se publica. Nunca en `main` ni en el sistema (Apps Script) que usan las demos y los clientes.
- Si una idea necesita verse en vivo, se pide permiso antes de publicarla y se deja apagada por defecto.
- Si algo de prueba llegó a publicarse, sacarlo enseguida y avisarle a Ronaldo.
