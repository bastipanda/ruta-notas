// Puente entre la app Ventas NFC y esta hoja de Google.
// Se pega en Extensiones > Apps Script de la hoja y se publica como "Aplicación web".
//
// Cómo funciona: la app envía cada visita una sola vez y aquí se agrega como una fila en "Visitas".
// Las pestañas Seguimiento, Rendición, Motivos y Casos se recalculan solas a partir de "Visitas".
// La clave que pide cada envío vive en las "propiedades del script" (un almacén privado de Google),
// nunca en este código, para que el archivo pueda estar en el repositorio sin exponer nada.

const COLS = ['id','fecha','local','familia','tipo','direccion','resultado','motivo','volverFecha','volverHora','quien','notaGoogle','resenas','perfil','nfc','cantidad','precio','formato','nota','localId'];
const COLS_LOCAL = ['id','n','fam','tipo','tipoN','dir','lat','lon'];
const DIAS_CONTROL = 21;

/* ---------- menú dentro de la hoja ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Ventas NFC')
    .addItem('Preparar hoja', 'prepararHoja')
    .addItem('Recalcular pestañas', 'recalcular')
    .addItem('Ver clave', 'verClave')
    .addToUi();
}

function prepararHoja() {
  hoja_('Visitas', COLS);
  hoja_('Locales agregados', COLS_LOCAL);
  ['Seguimiento', 'Rendición', 'Motivos', 'Casos'].forEach(function (n) { hoja_(n); });
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('CLAVE')) p.setProperty('CLAVE', Utilities.getUuid().replace(/-/g, '').slice(0, 16));
  recalcular();
  verClave();
}

function verClave() {
  const c = PropertiesService.getScriptProperties().getProperty('CLAVE');
  SpreadsheetApp.getUi().alert(c ? 'Clave para conectar la app:\n\n' + c + '\n\nNo la compartas ni la pegues en el código.' : 'Primero usa "Preparar hoja".');
}

/* ---------- lo que llama la app ---------- */
function doGet() { // solo para comprobar en el navegador que la publicación quedó activa
  return ContentService.createTextOutput('Ventas NFC: conexión activa.');
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ok: false, error: 'formato'}); }
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave || d.clave !== clave) return json_({ok: false, error: 'clave'});

  if (d.accion === 'ping') return json_({ok: true});
  if (d.accion === 'todo') return json_({ok: true, visitas: leer_('Visitas', COLS), locales: leer_('Locales agregados', COLS_LOCAL)});

  const candado = LockService.getScriptLock(); // evita que dos envíos simultáneos se pisen
  candado.waitLock(20000);
  try {
    if (d.accion === 'visita') { agregar_('Visitas', COLS, d.dato); recalcular(); }
    else if (d.accion === 'local') agregar_('Locales agregados', COLS_LOCAL, d.dato);
    else return json_({ok: false, error: 'accion'});
  } finally { candado.releaseLock(); }
  return json_({ok: true});
}

/* ---------- ayudas ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function hoja_(nombre, encabezados) {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(nombre);
  if (!h) h = ss.insertSheet(nombre);
  if (encabezados && h.getLastRow() === 0) {
    // Todo como texto: así Google no convierte fechas ni números por su cuenta y vuelve tal cual a la app.
    h.getRange(1, 1, h.getMaxRows(), encabezados.length).setNumberFormat('@');
    h.appendRow(encabezados);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, encabezados.length).setFontWeight('bold');
  }
  return h;
}

function texto_(v) { // un texto que parte con = + - @ se guardaría como fórmula; el apóstrofo lo deja como texto
  const s = v == null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function agregar_(nombre, cols, dato) {
  const h = hoja_(nombre, cols), id = String(dato.id), n = h.getLastRow();
  if (n > 1) { // si la app reintenta un envío, no se duplica la fila
    const ids = h.getRange(2, 1, n - 1, 1).getDisplayValues();
    for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return;
  }
  h.appendRow(cols.map(function (c) { return texto_(dato[c]); }));
}

function leer_(nombre, cols) {
  const h = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!h || h.getLastRow() < 2) return [];
  return h.getRange(2, 1, h.getLastRow() - 1, cols.length).getDisplayValues().map(function (f) {
    const o = {}; cols.forEach(function (c, i) { o[c] = f[i]; }); return o;
  });
}

function escribir_(nombre, filas) {
  const h = hoja_(nombre);
  h.clearContents();
  h.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  h.getRange(1, 1, 1, filas[0].length).setFontWeight('bold');
  h.setFrozenRows(1);
}

function lunes_(fecha) { // lunes de la semana de una fecha 'AAAA-MM-DD'
  const p = fecha.slice(0, 10).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function sumarDias_(fecha, n) {
  const p = fecha.slice(0, 10).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/* ---------- pestañas calculadas ---------- */
function recalcular() {
  const V = leer_('Visitas', COLS).sort(function (a, b) { return (a.fecha + a.id).localeCompare(b.fecha + b.id); });
  const porLocal = {};
  V.forEach(function (v) {
    const x = porLocal[v.localId] || (porLocal[v.localId] = {});
    if (v.resultado === 'control') x.control = v;
    else { x.ult = v; if (v.resultado === 'vendido') { x.venta = v; x.control = null; } }
  });

  // Seguimiento: a quién volver y qué controles de reseñas faltan
  const seg = [];
  Object.keys(porLocal).forEach(function (id) {
    const x = porLocal[id], u = x.ult; if (!u) return;
    if ((u.resultado === 'volver' || u.resultado === 'perfil') && u.volverFecha)
      seg.push([u.volverFecha, u.volverHora, u.resultado === 'perfil' ? 'Perfil en trámite' : 'Volver', u.local, u.direccion, u.familia, u.quien, u.nota]);
    if (u.resultado === 'vendido' && !x.control)
      seg.push([sumarDias_(x.venta.fecha, DIAS_CONTROL), '', 'Contar reseñas', u.local, u.direccion, u.familia, '', 'Tenía ' + x.venta.resenas + ' al vender']);
  });
  seg.sort(function (a, b) { return (a[0] + a[1]).localeCompare(b[0] + b[1]); });
  escribir_('Seguimiento', [['Día', 'Hora', 'Qué hacer', 'Local', 'Dirección', 'Familia', 'Preguntar por', 'Nota']].concat(seg));

  // Rendición: resumen por semana para el grupo
  const sem = {}, tot = {v: 0, l: {}, ve: 0, u: 0, i: 0};
  V.forEach(function (v) {
    if (v.resultado === 'control') return;
    const k = lunes_(v.fecha), s = sem[k] || (sem[k] = {v: 0, l: {}, ve: 0, u: 0, i: 0});
    [s, tot].forEach(function (a) {
      a.v++; a.l[v.localId] = 1;
      if (v.resultado === 'vendido') { a.ve++; a.u += Number(v.cantidad) || 0; a.i += Number(v.precio) || 0; }
    });
  });
  const ren = Object.keys(sem).sort().map(function (k) { const s = sem[k]; return [k, s.v, Object.keys(s.l).length, s.ve, s.u, s.i]; });
  ren.push(['Total', tot.v, Object.keys(tot.l).length, tot.ve, tot.u, tot.i]);
  escribir_('Rendición', [['Semana (lunes)', 'Visitas', 'Locales distintos', 'Ventas', 'Unidades', 'Ingresos ($)']].concat(ren));

  // Motivos del no, por familia
  const mot = {};
  V.forEach(function (v) { if (v.resultado === 'no' && v.motivo) { const k = v.motivo + '|' + v.familia; mot[k] = (mot[k] || 0) + 1; } });
  const mm = Object.keys(mot).map(function (k) { const p = k.split('|'); return [p[0], p[1], mot[k]]; }).sort(function (a, b) { return b[2] - a[2]; });
  escribir_('Motivos', [['Motivo', 'Familia', 'Veces']].concat(mm));

  // Casos: reseñas antes y después de cada venta
  const casos = [];
  Object.keys(porLocal).forEach(function (id) {
    const x = porLocal[id]; if (!x.venta) return;
    const a = Number(x.venta.resenas), d = x.control ? Number(x.control.resenas) : '';
    casos.push([x.venta.local, x.venta.familia, x.venta.fecha.slice(0, 10), a, x.control ? x.control.fecha.slice(0, 10) : 'pendiente', d, d === '' ? '' : d - a]);
  });
  escribir_('Casos', [['Local', 'Familia', 'Fecha de venta', 'Reseñas antes', 'Fecha de control', 'Reseñas después', 'Diferencia']].concat(casos));
}
