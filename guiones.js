// Textos base de la app: qué decir según la familia del local y su situación.
// Cada fila es [clave, para qué sirve, texto]. La app arma el guion uniendo tres piezas:
//   gancho de la familia + situación del local + cierre.
// Lo que va entre llaves se reemplaza solo: {local} {resenas} {nota} {rival} {resenasRival} {momento}.
//
// Estos son los textos de partida. Al conectar la hoja se copian a la pestaña "Guiones", y lo que se
// edite ahí manda sobre lo de este archivo. Así se corrigen los guiones sin tocar código.
window.GUIONES_BASE = [
  // --- gancho: por qué las reseñas importan en este rubro ---
  ['gancho:comida', 'Gancho para restaurantes, bares y pubs', 'Cuando alguien busca dónde comer por aquí, abre el mapa y mira dos cosas: la nota y cuántas opiniones hay.'],
  ['gancho:cafe', 'Gancho para cafés, panaderías y heladerías', 'Un café se elige de pasada: la persona mira el mapa, ve la nota y decide en diez segundos.'],
  ['gancho:rapida', 'Gancho para comida rápida', 'Para pedir algo rápido la gente no compara mucho: elige el de mejor nota entre los primeros que le muestra el mapa.'],
  ['gancho:salud', 'Gancho para dentistas, clínicas y consultas', 'Casi nadie pide hora con un profesional de salud sin leer antes lo que dicen otros pacientes.'],
  ['gancho:belleza', 'Gancho para peluquerías, barberías y estética', 'Un corte o un tratamiento es confianza: la gente lee reseñas antes de probar un lugar nuevo.'],
  ['gancho:autos', 'Gancho para talleres y tiendas de autos o bicis', 'Dejar el auto o la bici en un taller que uno no conoce da desconfianza. Las reseñas son lo que la quita.'],
  ['gancho:servicios', 'Gancho para lavanderías, gimnasios, estudios y clases', 'Sus clientes vuelven seguido. Cada uno que opina le trae a otra persona del barrio que busca lo mismo en el mapa.'],
  ['gancho:mascotas', 'Gancho para veterinarias y tiendas de mascotas', 'Con las mascotas la gente es exigente: antes de venir lee lo que opinaron otros dueños.'],
  ['gancho:tiendas', 'Gancho para tiendas', 'Quien busca un producto puntual lo escribe en el mapa y va a la tienda que le da más confianza.'],

  // --- situación: lo que dicen los números de este local ---
  ['sit:pocas', 'Pocas reseñas y ya anotaste un competidor del mismo tipo', 'Antes de entrar busqué {local} en Google Maps: tienen {resenas} reseñas. {rival} tiene {resenasRival}. Quien compara elige al que tiene más opiniones, aunque ustedes atiendan mejor.'],
  ['sit:pocas-sin-rival', 'Pocas reseñas, sin competidor anotado', 'Antes de entrar busqué {local} en Google Maps: tienen {resenas} reseñas. Con tan pocas, quien los encuentra en el mapa no alcanza a confiar, aunque ustedes atiendan bien.'],
  ['sit:notabaja', 'Nota bajo 4,2', '{local} aparece con nota {nota} en Google. Casi siempre opina el cliente molesto; los contentos se van sin decir nada. La idea es que el contento opine antes de salir.'],
  ['sit:sinperfil', 'No aparece en Google Maps', 'Busqué {local} en Google Maps y no aparece. Quien busca un local como este por aquí cerca hoy encuentra a otros.'],
  ['sit:bien', 'Ya está bien posicionado (prioridad baja)', '{local} ya está bien en Google: nota {nota} con {resenas} reseñas. La tarjeta sirve para no perder el ritmo. Si no hay interés rápido, sigue con el siguiente local.'],
  ['sit:nfc', 'Ya tiene una tarjeta NFC', 'Veo que ya tienen una tarjeta para reseñas. ¿Les ha funcionado? Muchas veces falta pedirla en el momento justo, o tener una donde el cliente la vea.'],
  ['sit:sin-datos', 'Todavía no anotaste su nota ni sus reseñas', 'Estoy ayudando a negocios del barrio a conseguir más reseñas en Google Maps. ¿Sabe cuántas tiene hoy su local? Veámoslo juntos en el mapa.'],

  // --- cierre: la demostración ---
  ['cierre', 'Cierre normal: demo con el teléfono del dueño', 'Esta tarjeta se acerca al teléfono y abre directo la reseña. ¿Me presta el suyo para mostrarle? El mejor momento para pedirla es {momento}.'],
  ['cierre:sinperfil', 'Cierre cuando no tiene perfil', 'Crear el perfil es gratis. Lo dejamos iniciado ahora, con su cuenta, en diez minutos, y vuelvo cuando Google lo verifique.'],
  ['cierre:nfc', 'Cierre cuando ya tiene NFC', 'Puedo dejarle unidades extra para pedirla {momento}, y una frase lista para que su equipo la pida.'],

  // --- momento: cuándo pedir la reseña en cada rubro ---
  ['momento:comida', 'Momento para pedir la reseña', 'al traer la cuenta'],
  ['momento:cafe', 'Momento para pedir la reseña', 'al entregar el pedido en la caja'],
  ['momento:rapida', 'Momento para pedir la reseña', 'al entregar el pedido'],
  ['momento:salud', 'Momento para pedir la reseña', 'en recepción, al pagar o agendar el control'],
  ['momento:belleza', 'Momento para pedir la reseña', 'al terminar, frente al espejo'],
  ['momento:autos', 'Momento para pedir la reseña', 'al entregar el auto o la bici'],
  ['momento:servicios', 'Momento para pedir la reseña', 'al terminar la clase o entregar el trabajo'],
  ['momento:mascotas', 'Momento para pedir la reseña', 'al despedir a la mascota'],
  ['momento:tiendas', 'Momento para pedir la reseña', 'en la caja, al entregar la bolsa'],

  // --- objeciones: "lo que dice el dueño → qué responder" ---
  ['objecion:1', 'Objeción y respuesta, separadas por una flecha', 'Es muy caro → ¿Cuánto le deja un cliente nuevo? Con uno solo que llegue por Google, la tarjeta está pagada.'],
  ['objecion:2', 'Objeción y respuesta, separadas por una flecha', 'No uso Google → Usted no, pero sus clientes sí: buscan en el mapa antes de venir. Mire, así aparece hoy su local.'],
  ['objecion:3', 'Objeción y respuesta, separadas por una flecha', '¿Y si me ponen una mala reseña? → Las malas llegan igual, con o sin tarjeta. Esto hace que también opinen los contentos, que son la mayoría.'],
  ['objecion:4', 'Objeción y respuesta, separadas por una flecha', 'Déjeme pensarlo → Claro. ¿Qué día y a qué hora le acomoda que pase de nuevo? (y agendar en Volver)'],
  ['objecion:5', 'Objeción y respuesta, separadas por una flecha', 'Ya pido las reseñas de palabra → Perfecto, entonces su gente ya tiene el hábito. La tarjeta le quita al cliente el trabajo de buscar el local y encontrar el botón.'],

  // --- otros textos ---
  ['frase:staff', 'Frase que se le deja al local para pedir reseñas', 'Si le gustó la atención, ¿nos ayuda con una reseña? Acerque su teléfono aquí, son diez segundos.'],
  ['encuesta:intro', 'Cómo pedir la encuesta después de un "no"', 'Gracias por su tiempo. Esto es parte de un proyecto de la universidad, ¿me ayuda con tres preguntas cortas? A cambio le muestro cómo se ve su local en Google frente a otros parecidos.'],
  ['diag:pocas', 'Consejo del mini diagnóstico: pocas reseñas', 'Con pocas reseñas, cada opinión nueva pesa mucho. Pedir una al día a un cliente contento cambia la ficha en un mes.'],
  ['diag:notabaja', 'Consejo del mini diagnóstico: nota baja', 'La nota sube cuando opinan los clientes contentos, que hoy se van callados. Responder con respeto las reseñas malas también ayuda.'],
  ['diag:sinperfil', 'Consejo del mini diagnóstico: sin perfil', 'Sin perfil, el local no existe para quien busca en el mapa. Crearlo es gratis y toma diez minutos.'],
  ['diag:bien', 'Consejo del mini diagnóstico: bien posicionado', 'Van bien. Lo que mantiene la posición es que sigan llegando reseñas recientes, no solo tener muchas antiguas.'],
  ['diag:general', 'Consejo que va siempre en el mini diagnóstico', 'Google no permite dar descuentos ni regalos a cambio de reseñas. Lo que sí funciona es pedirla en el momento en que el cliente está contento.']
];
