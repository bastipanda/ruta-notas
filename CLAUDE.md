# ventas-nfc (nombre provisorio)

## Qué es
Webapp para el teléfono que usa **una sola persona** (el primo de Bastián, estudiante de Ing. Comercial UAI)
para vender puerta a puerta tarjetas NFC de reseñas de Google a negocios locales, durante el verano 2026-2027.
Dos objetivos: llevar registro (seguimiento y rendición al grupo) y ayudarlo a vender mejor.

El producto (tarjetas NFC) lo eligió el grupo por votación y no se cambia.

## Estado (2026-11-14)
Versión 1.0 en construcción, por etapas: **A** lista real + registro (en curso), **B** nota y reseñas en
vivo desde Google Maps, **C** guiones por familia, encuesta y mini diagnóstico.
Hecho de la etapa A: app funcionando en modo prueba (guarda en el navegador) con 2.510 locales reales.
Sector: parte en Manuel Montt y avanza hacia Pedro de Valdivia y más allá, y hacia el sur. La lista cubre
desde Manuel Montt hasta pasado Los Leones, y desde Andrés Bello hasta Irarrázaval (Providencia y Ñuñoa).
La hoja de Google será de Bastián al inicio y después se traspasa al primo.
La hoja real está conectada (cuenta de Bastián) y el puente actualizado con la etapa C.
App publicada el 2026-11-14 (ver "Cómo publicar"). Falta la etapa B y probarla en la calle.

## Archivos
- `index.html`, `estilos.css`, `app.js`: la app. Sin instalaciones ni librerías.
- `datos/locales.js`: lista base de locales. Se genera, no se edita a mano.
- `datos/osm-crudo.json` y `datos/consulta-osm.txt`: lo que entregó OpenStreetMap y la consulta usada.
- `herramientas/preparar-locales.js`: convierte lo de OpenStreetMap en la lista base y asigna familias.
- `preview/`: maqueta inicial con datos inventados (publicada como artefacto). Queda de referencia.

- `apps-script/Codigo.gs`: el puente. Se pega dentro de la hoja de Google (Extensiones > Apps Script).
- `guiones.js`: textos base (gancho por familia, situación, cierre, objeciones, encuesta, diagnóstico).
  Al conectar la hoja se copian a su pestaña "Guiones"; lo editado ahí reemplaza a este archivo.

## Cómo se arma un guion
Gancho de la familia + situación del local + cierre. La situación sale de lo anotado en la ficha:
ya tiene NFC, no aparece en Google, sin datos, nota bajo 4,2, menos de 50 reseñas (con o sin competidor
del mismo tipo anotado) o ya bien posicionado. El mini diagnóstico usa esos mismos datos.

## Cómo está armada la app
Cada visita se guarda una sola vez como una fila (fecha, local, resultado, motivo, cuándo volver, reseñas,
venta). El estado de cada local, la pantalla Hoy y el Resumen se calculan desde esas filas.

Guardado (objeto `Store` en `app.js`): primero en el navegador y en una cola de "por enviar"; la cola se
vacía sola hacia la hoja cuando hay señal. Al abrir, la app sube lo pendiente y baja lo que haya en la hoja.

Puente (`Codigo.gs`): recibe cada visita, la agrega a la pestaña "Visitas" (sin duplicar si se reintenta)
y recalcula las pestañas Seguimiento, Rendición, Motivos y Casos. Se calculan con código y no con
fórmulas, porque las fórmulas cambian de escritura según el idioma de la hoja.

Secretos: la clave del puente vive en las propiedades del script (Google) y en el navegador del teléfono.
La dirección del puente tampoco va en el código: se pega en Resumen > Hoja de Google.

## Cómo conectar la hoja (una vez por cuenta)
1. Crear una hoja de Google nueva. Extensiones > Apps Script, pegar `apps-script/Codigo.gs`, guardar.
2. Recargar la hoja. Menú "Ventas NFC" > "Preparar hoja" (pide autorización la primera vez; repetir).
3. En Apps Script: Implementar > Nueva implementación > Aplicación web, ejecutar como "Yo", acceso
   "Cualquier usuario". Copiar la dirección que termina en `/exec`.
4. En la app: Resumen > Hoja de Google, pegar dirección y clave, Conectar.
Si se cambia `Codigo.gs`, hay que publicar una versión nueva en Implementar > Gestionar implementaciones.

## Principio de diseño
La app no vende; venden ciertos hábitos. Cada pantalla existe para forzar uno:
1. Llegar con el dato del local (nota y reseñas propias y de un competidor).
2. Demo en la mano del dueño y dejar la tarjeta funcionando al vender.
3. Volver: registrar cuándo y por quién preguntar.
4. Anotar el motivo de cada "no".
5. Evidencia antes/después: reseñas al vender y a las 2 o 3 semanas.
6. Enseñar al local a pedir reseñas (frase lista).

## Pantallas de la versión 1
| Pantalla | Qué hace |
|---|---|
| Hoy | A quién volver hoy y a qué hora |
| Ficha del local | Rubro, nota y reseñas propias y de un competidor, si tiene perfil |
| Resultado | Vendido / volver (cuándo, por quién preguntar) / no (motivo + encuesta de máx. 3 preguntas) |
| Guion | Discurso, objeciones y frase para que el local pida reseñas |
| Seguimiento | Reseñas antes y después; verificación de perfiles nuevos |
| Resumen | Números para el grupo y exportar a Excel |

## Arquitectura (propuesta, sin implementar)
- **Interfaz:** webapp instalable en la pantalla de inicio (PWA). El usuario nunca abre la hoja en la calle.
- **Datos:** un archivo de Google Sheets. La app escribe cada visita una sola vez en una pestaña de datos
  crudos; las demás pestañas (Seguimiento, Rendición al grupo, Motivos del no, Casos) se calculan con fórmulas.
  Cada pestaña se descarga como Excel. La hoja es también el respaldo.
- **Puente:** Google Apps Script entre la webapp y la hoja (mismo esquema que EcoRanval).
- **Guiones:** viven en una pestaña editable de la hoja, no en el código.

## Decisiones tomadas (con su porqué)
- **Un solo usuario, sin login.** La usa solo el primo; el grupo recibe los Excel.
- **Directo a webapp**, sin pasar por Google Forms: hay tiempo antes del verano.
- **Sheets como base de datos:** da los Excel y el respaldo sin trabajo extra.
- **Ficha con núcleo fijo + campos según el caso:** si cada local se registra distinto, los Excel no se comparan.
- **Guion personalizado por reglas** (rubro × situación × brecha con el competidor), con las cifras insertadas.
  No se usa IA para redactar: cuesta por uso y un guion distinto cada vez es más difícil de decir bien.
- **Categorías en dos niveles** (aprobado 2026-11-14). *Tipo exacto* (lo entrega Google u OpenStreetMap):
  solo para elegir competidor, dentista contra dentista; si no hay otro del mismo tipo cerca, no se compara.
  *Familia de guion*: comida para sentarse, café y dulces, comida rápida, salud, belleza, autos y bicis,
  servicios de barrio y clases, mascotas, tiendas (prioridad baja). Grupo "no visitar": bancos, colegios,
  hospitales, cadenas, bencineras.
- **OpenStreetMap como lista base** guardada en la hoja (gratis y se puede guardar). Google se usa solo
  para nota y reseñas en vivo. Abrir la app no gasta consultas.
- **Lo que trae la API de Google no se guarda** (sus condiciones solo permiten el identificador del local
  y, por 30 días, las coordenadas). Las reseñas del "antes" y "después" las escribe el primo a mano.
- **Situaciones:** sin perfil, pocas reseñas, nota baja, ya bien posicionado (baja prioridad).
- **Tras un "no": encuesta corta** ("es un proyecto de la universidad") y, a cambio, un **mini diagnóstico
  gratis** del local en Google. No se ofrecen reseñas de 5 estrellas: serían falsas y contradicen el producto.
- **Carril "sin perfil":** ayudar al dueño a iniciar su perfil (con la cuenta del dueño, sin tocar sus
  contraseñas), agendar la vuelta cuando esté verificado y vender ahí. Es secundario frente a locales con
  perfil y pocas reseñas.
- **No recomendar a los locales** dar descuentos por reseñas ni pedirlas solo a clientes contentos:
  Google lo prohíbe.

## Integración con Google Maps (investigada el 2026-11-14, decisión pendiente)
Ver `BACKLOG.md`, sección "Por verificar". Resumen: técnicamente posible y dentro del uso gratuito para
un solo vendedor, pero exige una cuenta de facturación de Google con tarjeta.

## Reglas del proyecto
- Costo cero. Cualquier servicio que pueda cobrar se avisa antes.
- Secretos (claves de API) nunca en el código ni en el repo: van en las propiedades del Apps Script o en `.env`.
- Probar antes de publicar; resumen en simple y OK de Bastián antes de cada push.
- Commits chicos, en español, explicando el porqué.

## Cómo probar
1. En una terminal, dentro de la carpeta del proyecto: `python -m http.server 8123`
2. Abrir `http://localhost:8123` en el navegador. Para verla como teléfono: F12 y el ícono de celular.
3. Control: aparece la pantalla "Hoy"; en "Locales" se ven locales reales de Manuel Montt y Providencia.
Los datos de prueba se borran desde Resumen > "Borrar datos de prueba".

Para cambiar de sector: editar las coordenadas en `datos/consulta-osm.txt`, volver a descargar y correr
`node herramientas/preparar-locales.js`.

## Cómo publicar
- Repositorio público en GitHub: `bastipanda/ruta-notas` (nombre neutro a propósito; la carpeta local
  sigue siendo `ventas-nfc`). Es público porque GitHub Pages gratis lo exige.
- La app se sirve con GitHub Pages desde la rama `main`: https://bastipanda.github.io/ruta-notas/
- Publicar un cambio = commit + `git push` (con el OK de Bastián). GitHub tarda uno o dos minutos en
  actualizar la página. En el teléfono puede hacer falta recargar para ver la versión nueva.
- Al cambiar `app.js`, `estilos.css`, `guiones.js` o `datos/locales.js`, subir el número `?v=` de ese
  archivo en `index.html`. Sin eso el teléfono puede seguir mostrando la copia antigua que tiene guardada.
- Instalable en iPhone: Safari > compartir > "Agregar a inicio". La app instalada tiene memoria propia,
  separada de Safari: la hoja se conecta dentro de la app ya instalada. Ícono: `herramientas/crear-icono.py`.
- Nunca subir claves, la dirección del puente ni planillas con datos reales (`.gitignore` ya excluye
  `.env`, `*.csv` y `*.xlsx`).
