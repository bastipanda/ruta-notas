# Backlog de ventas-nfc

## Pendiente acordado
- **Etapa A, lo que falta:**
  - Hoja real conectada el 2026-11-14 (confirmado por Bastián), en su cuenta. Falta revisar con datos
    de verdad que las pestañas Seguimiento, Rendición, Motivos y Casos se calculen bien. Al traspasarla al primo hay que volver a publicar el Apps Script desde su cuenta y
    actualizar la dirección en la app (el script publicado corre a nombre de quien lo publicó).
  - Publicar la app para abrirla en el teléfono (la ubicación solo funciona en una dirección https).
  - Sector ampliado el 2026-11-14 a 2.510 locales. 698 no traen dirección en OpenStreetMap: se ubican
    por cercanía, no por calle.
  - Revisar con el primo la clasificación: hay cadenas dentro de familias vendibles (farmacias, comida rápida).
- Mostrarle al primo el preview navegable (`preview/index.html`, publicado como artefacto) y recoger su
  opinión con la pestaña "Opinión", antes de construir.
- Diseñar la ficha del local: núcleo fijo y campos según el caso.
- Redactar los guiones base por rubro y situación (el primo los pasa a sus palabras).
- Definir las 3 preguntas de la encuesta tras un "no" y el contenido del mini diagnóstico.
- Diseñar las pestañas de la hoja: datos crudos, Seguimiento, Rendición al grupo, Motivos del no, Casos, Guiones.
- Construir la versión 1 (pantallas en `CLAUDE.md`).
- Definir el nombre definitivo (`ventas-nfc` es provisorio).

## Aprobado por Bastián el 2026-11-14 (ya está en CLAUDE.md)
- **Categorías en dos niveles** (corrige el error de comparar un dentista con una peluquería):
  - *Tipo exacto*: viene solo de la fuente de datos (Google y OpenStreetMap ya clasifican cada local).
    Se usa para elegir al competidor: dentista contra dentista. Si no hay otro del mismo tipo cerca,
    la app no compara.
  - *Familia de guion*: agrupa tipos que se venden igual. Propuesta según la muestra del sector:
    comida para sentarse, café y dulces, comida rápida, belleza, salud, mascotas, autos y bicis,
    servicios de barrio y clases, tiendas. Más un grupo "no visitar" (bancos, colegios, hospitales,
    cadenas, bencineras, estacionamientos).
- **OpenStreetMap como lista base**, guardada en la hoja: sirve para planificar la ruta, sacar los
  "no visitar" y abrir la app sin gastar consultas. Google se usa solo para nota y reseñas en vivo.
- **Muestra del sector** (2026-11-14): 627 locales con nombre entre Providencia y unas 15 cuadras de
  Manuel Montt, en `datos/muestra-osm-2026-11-14.csv`. Comida es cerca del 36 %. Ojo: OpenStreetMap
  trae solo 7 peluquerías, casi seguro faltan; no sirve como censo completo de servicios chicos.

## Por verificar
- Si la búsqueda por nombre de Google en modo "solo identificador" (gratis e ilimitada según la lista de
  precios) permite detectar sin costo qué locales de la lista base no tienen perfil. Hay que probarlo con
  la clave real; el cruce por nombre puede fallar.
- **Integración con Google Maps (Places API).** Investigado el 2026-11-14 en la documentación oficial de Google:
  - La nota y el número de reseñas se cobran en la categoría más cara ("Enterprise"): 1.000 consultas
    gratis al mes por tipo de consulta; después, USD 35 por cada 1.000 en "locales cercanos".
  - Una consulta de "locales cercanos" trae hasta 20 locales, cada uno con su nota y sus reseñas.
  - Exige una cuenta de facturación de Google con tarjeta, aunque no se supere lo gratuito.
  - Se puede poner un tope diario duro (cuota). Google sugiere 32 consultas al día para no pasar de 1.000 al mes;
    conviene dejarlo algo más bajo porque cuota y facturación no calzan exacto.
  - Las alertas de presupuesto solo avisan, no cortan.
  - Quién pone la tarjeta: indiferente para Bastián; se define al crear la cuenta.
  - **Verificado el 2026-11-14 (condiciones de Google, sección 14 de Places API):** lo que trae la API
    **no se puede guardar**, salvo el identificador del local (place ID, sin límite de tiempo) y sus
    coordenadas (máximo 30 días). Nombre, nota y reseñas se piden en vivo cada vez. Tampoco se pueden
    mostrar datos de Places sobre un mapa que no sea de Google, y hay que mostrar el logo "Google Maps".
  - **Consecuencia de diseño:** la hoja guarda el place ID más lo que el primo escribe a mano (nombre
    como él lo anota, reseñas del "antes" y del "después", notas). No se hace un barrido único del barrio
    para guardarlo.
  - **Ahorro de consultas:** buscar solo al tocar un botón (nunca automático), mantener la lista en
    pantalla mientras la app esté abierta, filtrar por rubro, contador visible del tope diario, y botón
    "Abrir en Google Maps" (gratis) como respaldo con ingreso a mano.
  - Hay tres bolsas gratis separadas de 1.000 al mes: locales cercanos, búsqueda por texto y detalle de un local.
- Cuánto tarda hoy la verificación de un perfil de negocio nuevo en Google.
- La ubicación del teléfono la da el navegador gratis, pero solo si la app se sirve por HTTPS y el usuario
  acepta el permiso. Confirmar en el teléfono del primo.

## Propuesto el 2026-11-14, falta el OK de Bastián
- **Saltarse el preview e ir directo a una versión 1.0 usable con locales reales**, en tres etapas:
  - A: lista base real (OpenStreetMap), registro de visitas, hoja de Google con las pestañas de Excel.
    No necesita tarjeta ni clave de Google.
  - B: nota y reseñas en vivo desde Google Maps (necesita cuenta de facturación con tarjeta y tope diario).
  - C: guiones por familia, encuesta tras el "no", mini diagnóstico, controles antes/después.
  El primo prueba en la calle desde la etapa A y su opinión ajusta las siguientes.
- **Estado "ya tiene NFC"** en la ficha: de quién es, si la usan, cuántas reseñas llevan. Sirve para vender
  unidades extra o reactivar una tarjeta guardada, y como información de mercado para el grupo.
- **Formatos:** máximo dos (por ejemplo tarjeta y soporte de mesa), no uno por rubro. La app registra qué
  formato se vende en cada familia para decidir con datos. Faltan costos y precios del grupo para calcular
  rentabilidad.

## Ideas sin decidir
- Guardar la nota y las reseñas que entrega Google, si el proyecto evoluciona. Hoy se decidió no hacerlo.
  Ojo: si crece o se vuelve comercial, el riesgo de incumplir aumenta, no baja; ahí habría que revisar
  las condiciones de nuevo o buscar una fuente de datos que sí permita guardar.
- IA que redacte un guion distinto para cada local. Cuesta por uso; se prefiere personalización por reglas.
- Mapa con los locales pintados por estado (vendido, volver, no).
- Usar OpenStreetMap (gratis y sí se puede guardar) para listar locales de una calle y planificar la ruta.
  No trae notas ni reseñas, y no se verificó qué tan completo está en Providencia.
- Uso compartido por todo el grupo (evitaría visitar el mismo local dos veces).
- Cobrar aparte por ayudar a crear el perfil de Google.

## Descartadas
- **Regalar reseñas de 5 estrellas a cambio de responder la encuesta.** Son reseñas falsas (Google las
  prohíbe), contradicen el producto que se vende y arriesgan la cuenta del vendedor. Reemplazado por
  el mini diagnóstico gratis.
- **Partir con Google Forms + Sheets (versión 0).** Hay tiempo de sobra antes del verano para la webapp.
- **Guardar los datos solo en el teléfono.** Se pierde todo si se borra el navegador o se pierde el equipo.
