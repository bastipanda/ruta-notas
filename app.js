// Ventas NFC, etapa A: lista real de locales, ficha y registro de visitas.
// Idea central: cada visita se guarda UNA vez como una fila (igual que irá a la hoja de Google);
// todo lo demás (estado del local, pendientes de hoy, resumen) se calcula a partir de esas filas.
(function () {
'use strict';

const FAM = {comida:'Comida para sentarse', cafe:'Café y dulces', rapida:'Comida rápida', salud:'Salud', belleza:'Belleza',
  autos:'Autos y bicis', servicios:'Servicios y clases', mascotas:'Mascotas', tiendas:'Tiendas', novisitar:'No visitar'};
const EST = {vendido:['Vendido','c-ok'], volver:['Volver','c-warn'], no:['Dijo que no','c-bad'], perfil:['Perfil en trámite','c-brand']};
const MOTIVOS = ['Muy caro','No usa Google','Ya tiene algo parecido','No decide aquí','Sin tiempo','No le interesa','Otro'];
const DIAS_CONTROL = 21; // a las 3 semanas de vender se vuelve a contar las reseñas

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hoy = () => iso(new Date());
const masDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const fechaCorta = s => { const p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1]; };
const diasEntre = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
const chip = p => `<span class="chip ${p[1]}">${p[0]}</span>`;
function toast(t) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 3000); }
function metros(a, b) { // distancia aproximada, suficiente para ordenar locales de un barrio
  const x = (b.lon - a.lon) * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180), y = b.lat - a.lat;
  return Math.sqrt(x * x + y * y) * 111320;
}

/* ---------- guardado ----------
   Primero en el teléfono, después en la hoja. Cada registro se guarda de inmediato en el navegador
   y queda en una cola de "por enviar"; la cola se vacía sola hacia la hoja de Google cuando hay señal.
   Así nada se pierde si en la calle no hay internet.
   La dirección del puente y la clave se guardan solo en este navegador, nunca en el código. */
const CLAVE = 'ventas-nfc-v1', CLAVE_CFG = 'ventas-nfc-cfg';
const Store = {
  datos: {visitas: [], locales: [], pend: []},
  cfg: null, ocupado: false, error: false,
  cargar() {
    try {
      const t = localStorage.getItem(CLAVE); if (t) this.datos = Object.assign({visitas: [], locales: [], pend: []}, JSON.parse(t));
      const c = localStorage.getItem(CLAVE_CFG); if (c) this.cfg = JSON.parse(c);
    } catch (e) { this.falla = true; }
  },
  guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(this.datos)); } catch (e) { this.falla = true; toast('No se pudo guardar en este navegador.'); } },
  guardarCfg() { try { this.cfg ? localStorage.setItem(CLAVE_CFG, JSON.stringify(this.cfg)) : localStorage.removeItem(CLAVE_CFG); } catch (e) {} },
  agregarVisita(v) { this.datos.visitas.push(v); if (this.cfg) this.datos.pend.push({accion: 'visita', dato: v}); this.guardar(); indexar(); this.sincronizar(); },
  agregarLocal(l) { this.datos.locales.push(l); if (this.cfg) this.datos.pend.push({accion: 'local', dato: l}); this.guardar(); indexar(); this.sincronizar(); },
  borrarTodo() { this.datos = {visitas: [], locales: [], pend: []}; this.guardar(); indexar(); },

  async llamar(cuerpo, cfg) {
    cfg = cfg || this.cfg;
    // Sin cabeceras especiales a propósito: así el navegador lo trata como envío simple y Google lo acepta.
    const r = await fetch(cfg.url, {method: 'POST', body: JSON.stringify(Object.assign({clave: cfg.clave}, cuerpo))});
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'error');
    return j;
  },
  async sincronizar() { // envía la cola en orden; si falla, queda para el próximo intento
    if (!this.cfg || this.ocupado) return;
    this.ocupado = true;
    try {
      while (this.datos.pend.length) { await this.llamar(this.datos.pend[0]); this.datos.pend.shift(); this.guardar(); aviso(); }
      this.error = false;
    } catch (e) { this.error = true; }
    this.ocupado = false; aviso();
  },
  async bajar() { // trae lo que hay en la hoja y conserva lo local que aún no se envía
    const j = await this.llamar({accion: 'todo'});
    const une = (remotos, locales, accion) => {
      const enCola = new Set(this.datos.pend.filter(p => p.accion === accion).map(p => String(p.dato.id)));
      const ids = new Set(remotos.map(x => String(x.id)));
      return remotos.concat(locales.filter(x => enCola.has(String(x.id)) && !ids.has(String(x.id))));
    };
    this.datos.visitas = une(j.visitas, this.datos.visitas, 'visita').sort((a, b) => (a.fecha + a.id).localeCompare(b.fecha + b.id));
    this.datos.locales = une(j.locales.map(l => Object.assign(l, {lat: l.lat === '' ? null : +l.lat, lon: l.lon === '' ? null : +l.lon, manual: true})), this.datos.locales, 'local');
    this.guardar(); indexar();
  },
  async conectar(url, clave) {
    await this.llamar({accion: 'ping'}, {url, clave}); // si la dirección o la clave están mal, falla aquí
    this.cfg = {url, clave}; this.guardarCfg();
    // lo registrado en modo prueba también sube a la hoja
    this.datos.pend = this.datos.locales.map(l => ({accion: 'local', dato: l})).concat(this.datos.visitas.map(v => ({accion: 'visita', dato: v})));
    this.guardar();
    await this.sincronizar(); if (!this.error) await this.bajar();
  },
  desconectar() { this.cfg = null; this.datos.pend = []; this.error = false; this.guardarCfg(); this.guardar(); }
};

function aviso() { // franja de arriba: dice dónde están guardados los datos
  const e = $('#aviso'), n = Store.datos.pend.length;
  if (!Store.cfg) { e.className = 'demo'; e.textContent = 'Modo prueba: lo que registres se guarda solo en este navegador. Conecta la hoja de Google en Resumen.'; }
  else if (n) { e.className = 'demo'; e.textContent = n + (n === 1 ? ' registro por enviar' : ' registros por enviar') + ' a la hoja. ' + (Store.error ? 'No hubo conexión; se reintenta solo.' : 'Enviando…'); }
  else { e.className = 'demo ok'; e.textContent = 'Conectada: todo está guardado en la hoja de Google.'; }
}

/* ---------- índice: estado de cada local calculado desde las visitas ---------- */
let LOC = {}, TODOS = [], IDX = {};
function indexar() {
  TODOS = (window.LOCALES_BASE || []).concat(Store.datos.locales);
  LOC = {}; TODOS.forEach(l => LOC[l.id] = l);
  IDX = {};
  for (const v of Store.datos.visitas) {
    const x = IDX[v.localId] || (IDX[v.localId] = {vis: []});
    x.vis.push(v);
    if (v.resultado === 'control') x.control = v;
    else { x.ult = v; if (v.resultado === 'vendido') { x.venta = v; x.control = null; } }
    if (v.resenas !== '' && v.resenas != null) { x.resenas = +v.resenas; x.nota = v.notaGoogle; }
    if (v.perfil) x.perfil = v.perfil;
    x.nfc = v.nfc === 'sí';
  }
}

const S = {tab: 'hoy', localId: null, paso: null, agregando: false, b: {}, fam: 'todas', q: '', pos: null, limite: 40, borrar: false};

/* ---------- campos de formulario: todo lo que se escribe queda en S.b ---------- */
const inp = (f, label, type, extra) => `<label class="f">${label}<input data-f="${f}" id="f-${f}" type="${type}" value="${esc(S.b[f] ?? '')}" ${extra || ''}></label>`;
const sel = (f, label, ops) => `<label class="f">${label}<select data-f="${f}" id="f-${f}">${ops.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${S.b[f] === v ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
const chk = (f, label) => `<label class="chk"><input data-f="${f}" id="f-${f}" type="checkbox" ${S.b[f] ? 'checked' : ''}> ${label}</label>`;

/* ---------- pantalla: Hoy ---------- */
function vHoy() {
  const h = hoy(), pend = [], prox = [], ctrl = [];
  for (const id in IDX) {
    const x = IDX[id], l = LOC[id]; if (!l || !x.ult) continue;
    if ((x.ult.resultado === 'volver' || x.ult.resultado === 'perfil') && x.ult.volverFecha) (x.ult.volverFecha <= h ? pend : prox).push([l, x.ult]);
    if (x.ult.resultado === 'vendido' && !x.control && diasEntre(x.venta.fecha.slice(0, 10), h) >= DIAS_CONTROL) ctrl.push([l, x.venta]);
  }
  const porFecha = (a, b) => (a[1].volverFecha + a[1].volverHora).localeCompare(b[1].volverFecha + b[1].volverHora);
  pend.sort(porFecha); prox.sort(porFecha);
  const deHoy = Store.datos.visitas.filter(v => v.fecha.slice(0, 10) === h);
  const fila = ([l, v]) => `<button class="item" data-abrir="${l.id}"><div class="row between"><strong>${esc(l.n)}</strong>${chip(v.volverFecha < h ? ['Atrasado','c-bad'] : EST[v.resultado])}</div>
    <div class="sub">${fechaCorta(v.volverFecha)}${v.volverHora ? ' a las ' + esc(v.volverHora) : ''}${v.quien ? ' · preguntar por ' + esc(v.quien) : ''}${l.dir ? ' · ' + esc(l.dir) : ''}</div>${v.nota ? `<div class="sub">${esc(v.nota)}</div>` : ''}</button>`;
  return `<h1>Hoy</h1><p class="sub">Lo que no puede quedar sin hacer antes de tocar puertas nuevas.</p>
  <div class="stats"><div class="stat"><b>${deHoy.length}</b><span>visitas registradas hoy</span></div><div class="stat"><b>${deHoy.filter(v => v.resultado === 'vendido').length}</b><span>ventas hoy</span></div></div>
  <div class="label">Volver hoy</div>${pend.map(fila).join('') || '<p class="sub">Nadie agendado para hoy.</p>'}
  <div class="label">Contar reseñas (3 semanas después de vender)</div>${ctrl.map(([l, v]) => `<button class="item" data-abrir="${l.id}"><div class="row between"><strong>${esc(l.n)}</strong>${chip(['Control pendiente','c-ok'])}</div><div class="sub">Tenía ${esc(v.resenas)} reseñas al vender, el ${fechaCorta(v.fecha)}.</div></button>`).join('') || '<p class="sub">Sin controles pendientes.</p>'}
  ${prox.length ? `<div class="label">Próximos días</div>${prox.map(fila).join('')}` : ''}
  <button class="btn primary block" data-tab="locales">Ver locales</button>`;
}

/* ---------- pantalla: Locales ---------- */
function listaFiltrada() {
  const q = S.q.trim().toLowerCase();
  let l = TODOS.filter(x => (S.fam === 'todas' ? x.fam !== 'novisitar' : x.fam === S.fam) && (!q || (x.n + ' ' + x.dir).toLowerCase().includes(q)));
  if (S.pos) { l.forEach(x => x._d = metros(S.pos, x)); l.sort((a, b) => a._d - b._d); }
  return l;
}
function listaHTML() {
  const l = listaFiltrada();
  return `<p class="sub">${l.length} locales${S.pos ? ', del más cercano al más lejano' : ', por orden alfabético'}.</p>` +
    l.slice(0, S.limite).map(x => { const i = IDX[x.id] || {};
      return `<button class="item" data-abrir="${x.id}"><div class="row between"><strong>${esc(x.n)}</strong>${S.pos ? `<span class="dist">${x._d < 1000 ? Math.round(x._d / 10) * 10 + ' m' : (x._d / 1000).toFixed(1) + ' km'}</span>` : ''}</div>
      <div class="sub">${esc(x.tipoN)}${x.dir ? ' · ' + esc(x.dir) : ''}</div>
      <div class="row">${i.ult ? chip(EST[i.ult.resultado]) : ''}${i.resenas != null ? `<span class="rating">★ ${esc(i.nota || '–')} (${i.resenas})</span>` : ''}${i.nfc ? chip(['Ya tiene NFC','c-idle']) : ''}</div></button>`; }).join('') +
    (l.length > S.limite ? `<button class="btn block" data-mas="1">Ver más</button>` : '');
}
function vLocales() {
  return `<h1>Locales</h1>
  <div class="row"><button class="btn small ${S.pos ? '' : 'primary'}" data-ubicar="1">${S.pos ? 'Actualizar mi ubicación' : 'Usar mi ubicación'}</button><button class="btn small ghost" data-agregar="1">Agregar uno que falta</button></div>
  <input id="buscar" type="search" placeholder="Buscar por nombre o calle" value="${esc(S.q)}" aria-label="Buscar por nombre o calle">
  <div class="opts"><button class="opt" aria-pressed="${S.fam === 'todas'}" data-fam="todas">Todas</button>${Object.entries(FAM).map(([k, t]) => `<button class="opt" aria-pressed="${S.fam === k}" data-fam="${k}">${t}</button>`).join('')}</div>
  <div id="lista" class="stack">${listaHTML()}</div>
  <p class="sub">Lista de locales: © colaboradores de OpenStreetMap. Puede faltar alguno; agrégalo con el botón de arriba.</p>`;
}

/* ---------- pantalla: agregar local ---------- */
function vAgregar() {
  return `<button class="back" data-tab="locales">‹ Volver a la lista</button><h1>Agregar local</h1>
  <div class="card">${inp('aNombre', 'Nombre del local', 'text')}${sel('aFam', 'Familia', Object.entries(FAM).filter(([k]) => k !== 'novisitar'))}
  ${inp('aTipo', 'Qué es exactamente (ej. barbería, dentista)', 'text')}${inp('aDir', 'Dirección', 'text', 'placeholder="ej. Manuel Montt 188"')}
  <p class="sub">${S.pos ? 'Se guardará con tu ubicación actual.' : 'Si antes tocas "Usar mi ubicación" en la lista, queda guardado dónde está.'}</p>
  <button class="btn primary block" data-guardar-local="1">Guardar local</button></div>`;
}

/* ---------- pantalla: ficha del local ---------- */
function rivalDe(l) { // solo contra el mismo tipo exacto, y solo con datos que ya anotaste
  return TODOS.filter(x => x.id !== l.id && x.tipo === l.tipo && IDX[x.id] && IDX[x.id].resenas != null).sort((a, b) => IDX[b.id].resenas - IDX[a.id].resenas)[0] || null;
}
function vFicha(l) {
  const i = IDX[l.id] || {vis: []}, b = S.b, c = rivalDe(l);
  const mapa = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.n + ' ' + (l.dir || '') + ' Santiago'); // el sector cruza Providencia y Ñuñoa
  let h = `<button class="back" data-tab="locales">‹ Volver a la lista</button><h1>${esc(l.n)}</h1><p class="sub">${esc(l.tipoN)} · ${FAM[l.fam]}${l.dir ? ' · ' + esc(l.dir) : ''}</p>
  <div class="row">${i.ult ? chip(EST[i.ult.resultado]) : chip(['Sin visitar','c-idle'])}<a href="${mapa}" target="_blank" rel="noopener">Abrir en Google Maps</a></div>
  <div class="card"><div class="label">Lo que ves hoy en Google Maps</div>
    <div class="row">${inp('nota', 'Nota (estrellas)', 'number', 'step="0.1" min="1" max="5" inputmode="decimal" placeholder="4.3"')}${inp('resenas', 'Cantidad de reseñas', 'number', 'min="0" inputmode="numeric" placeholder="23"')}</div>
    ${sel('perfil', '¿Aparece en Google Maps?', [['', 'No revisé'], ['sí', 'Sí'], ['no', 'No aparece']])}${chk('nfc', 'Ya tiene una tarjeta NFC de reseñas')}</div>`;
  if (b.resenas !== '' && b.resenas != null) {
    const mio = +b.resenas, max = Math.max(mio, c ? IDX[c.id].resenas : 0, 1);
    h += `<div class="card"><div class="label">Comparación (mismo tipo de local)</div>
      <div class="bar"><div><div>${esc(l.n)}</div><div class="track"><div class="fill" style="width:${mio / max * 100}%"></div></div></div><b>${mio}</b></div>
      ${c ? `<div class="bar"><div><div>${esc(c.n)}</div><div class="track"><div class="fill rival" style="width:${IDX[c.id].resenas / max * 100}%"></div></div></div><b>${IDX[c.id].resenas}</b></div>`
          : `<p class="sub">Aún no has anotado reseñas de otro local del tipo "${esc(l.tipoN)}". Anota las de un competidor cercano y aparecerá aquí.</p>`}</div>`;
  }
  if (S.paso === 'vendido') h += `<div class="card"><h2>Venta</h2><div class="row">${inp('cantidad', 'Unidades', 'number', 'min="1" inputmode="numeric"')}${inp('precio', 'Precio total ($)', 'number', 'min="0" inputmode="numeric"')}</div>
    ${sel('formato', 'Formato', ['Tarjeta', 'Soporte de mesa', 'Adhesivo', 'Otro'])}${inp('notaTxt', 'Nota', 'text', 'placeholder="ej. la dejé en la caja"')}
    <p class="sub">Las reseñas anotadas arriba quedan como el "antes". En ${DIAS_CONTROL} días la app te pedirá contarlas de nuevo.</p><button class="btn primary block" data-guardar="vendido">Guardar venta</button></div>`;
  else if (S.paso === 'volver') h += `<div class="card"><h2>Volver</h2><div class="row">${inp('volverFecha', 'Día', 'date')}${inp('volverHora', 'Hora', 'time')}</div>
    ${inp('quien', 'Preguntar por', 'text', 'placeholder="ej. Carla, la dueña"')}${inp('notaTxt', 'Nota', 'text', 'placeholder="ej. le interesó la demo"')}<button class="btn primary block" data-guardar="volver">Agendar</button></div>`;
  else if (S.paso === 'no') h += `<div class="card"><h2>Dijo que no</h2><div class="label">Motivo principal</div><div class="opts">${MOTIVOS.map(m => `<button class="opt" aria-pressed="${b.motivo === m}" data-motivo="${m}">${m}</button>`).join('')}</div>
    ${inp('notaTxt', 'Nota (en sus palabras)', 'text')}<button class="btn primary block" data-guardar="no">Guardar</button></div>`;
  else if (S.paso === 'perfil') h += `<div class="card"><h2>Crear su perfil en Google</h2><p class="sub">Siempre con la cuenta del dueño. Tú no tocas sus contraseñas.</p>
    ${chk('pIniciado', 'Perfil iniciado con el dueño')}${chk('pVerif', 'Verificación de Google solicitada')}
    <div class="row">${inp('volverFecha', 'Volver el', 'date')}${inp('quien', 'Preguntar por', 'text')}</div><button class="btn primary block" data-guardar="perfil">Guardar seguimiento</button></div>`;
  else if (S.paso === 'control') h += `<div class="card"><h2>Control de reseñas</h2><p class="sub">Tenía ${esc(i.venta ? i.venta.resenas : '?')} al vender. Anota arriba cuántas tiene hoy y guarda.</p><button class="btn primary block" data-guardar="control">Guardar control</button></div>`;
  else h += `<div class="label">¿Cómo te fue?</div>
    <div class="three"><button class="btn b-ok" data-paso="vendido">Vendido</button><button class="btn b-warn" data-paso="volver">Volver</button><button class="btn b-bad" data-paso="no">No</button></div>
    ${b.perfil === 'no' ? '<button class="btn block" data-paso="perfil">No aparece en Google: ayudarle a crear su perfil</button>' : ''}
    ${i.venta ? '<button class="btn block" data-paso="control">Registrar control de reseñas</button>' : ''}`;
  if (S.paso) h += `<button class="btn block" data-paso="">Cancelar</button>`;
  if (i.vis.length) h += `<div class="card"><div class="label">Historial</div>${i.vis.slice().reverse().map(v => `<div><strong>${fechaCorta(v.fecha)}</strong> · ${v.resultado === 'control' ? 'Control' : EST[v.resultado][0]}${v.motivo ? ' (' + esc(v.motivo) + ')' : ''}${v.resenas !== '' ? ' · ' + esc(v.resenas) + ' reseñas' : ''}${v.nota ? ' · ' + esc(v.nota) : ''}</div>`).join('')}</div>`;
  return h;
}

/* ---------- pantalla: Resumen ---------- */
function vResumen() {
  const V = Store.datos.visitas, ventas = V.filter(v => v.resultado === 'vendido'), locs = new Set(V.map(v => v.localId)).size;
  const ingresos = ventas.reduce((a, v) => a + (+v.precio || 0), 0), mot = {}, fam = {};
  V.forEach(v => { if (v.resultado === 'no' && v.motivo) mot[v.motivo] = (mot[v.motivo] || 0) + 1; });
  for (const id in IDX) { const x = IDX[id], l = LOC[id]; if (!l) continue; const f = fam[l.fam] || (fam[l.fam] = [0, 0]); f[0]++; if (x.venta) f[1]++; }
  const mm = Object.entries(mot).sort((a, b) => b[1] - a[1]), max = mm.length ? mm[0][1] : 1;
  const casos = Object.keys(IDX).filter(id => IDX[id].venta && LOC[id]).map(id => [LOC[id].n, IDX[id].venta.resenas, IDX[id].control ? IDX[id].control.resenas : 'pendiente']);
  return `<h1>Resumen</h1>
  <div class="stats"><div class="stat"><b>${locs}</b><span>locales visitados</span></div><div class="stat"><b>${ventas.length}</b><span>ventas</span></div>
  <div class="stat"><b>${locs ? Math.round(ventas.length / locs * 100) : 0}%</b><span>de los locales visitados compró</span></div><div class="stat"><b>$${ingresos.toLocaleString('es-CL')}</b><span>ingresos</span></div></div>
  <div class="card"><h2>Por qué dicen que no</h2>${mm.map(([k, n]) => `<div class="bar"><div><div>${esc(k)}</div><div class="track"><div class="fill" style="width:${n / max * 100}%"></div></div></div><b>${n}</b></div>`).join('') || '<p class="sub">Todavía no hay rechazos registrados.</p>'}</div>
  <div class="card"><h2>Por familia</h2>${Object.keys(fam).length ? `<table><thead><tr><th>Familia</th><th class="n">Visitados</th><th class="n">Ventas</th></tr></thead><tbody>${Object.entries(fam).map(([k, f]) => `<tr><td>${FAM[k] || k}</td><td class="n">${f[0]}</td><td class="n">${f[1]}</td></tr>`).join('')}</tbody></table>` : '<p class="sub">Sin visitas todavía.</p>'}</div>
  <div class="card"><h2>Reseñas antes y después</h2>${casos.length ? `<table><thead><tr><th>Local</th><th class="n">Antes</th><th class="n">Después</th></tr></thead><tbody>${casos.map(c => `<tr><td>${esc(c[0])}</td><td class="n">${esc(c[1])}</td><td class="n">${esc(c[2])}</td></tr>`).join('')}</tbody></table>` : '<p class="sub">Aparecen aquí al registrar la primera venta.</p>'}</div>
  <div class="card"><h2>Respaldo</h2><p class="sub">Descarga todas las visitas en un archivo que Excel abre directo.</p>
    <button class="btn block" data-csv="1">Descargar visitas (CSV)</button></div>
  <div class="card"><h2>Hoja de Google</h2>${Store.cfg
    ? `<p class="sub">Conectada. Cada visita se envía sola a la hoja; los Excel se descargan desde ahí.</p><div class="row"><button class="btn small" data-sync="1">Sincronizar ahora</button><button class="btn small danger" data-desconectar="1">Desconectar</button></div>`
    : `<p class="sub">Pega la dirección que te dio Google al publicar el puente y la clave del menú "Ventas NFC > Ver clave".</p>${inp('cfgUrl', 'Dirección del puente', 'url', 'placeholder="https://script.google.com/macros/s/…/exec"')}${inp('cfgClave', 'Clave', 'password', 'autocomplete="off"')}<button class="btn primary block" data-conectar="1">Conectar</button>`}
    ${Store.cfg ? '' : S.borrar ?`<p class="sub">Esto borra todas las visitas y los locales agregados de este navegador. No se puede deshacer.</p><div class="row"><button class="btn danger" data-borrar="si">Sí, borrar todo</button><button class="btn" data-borrar="no">Cancelar</button></div>` : `<button class="btn block danger" data-borrar="pedir">Borrar datos de prueba</button>`}</div>`;
}

/* ---------- dibujar ---------- */
const TABS = [['hoy', 'Hoy', '<path d="M4 7h16M4 12h16M4 17h10"/>'], ['locales', 'Locales', '<path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>'], ['resumen', 'Resumen', '<path d="M5 19V10M12 19V5M19 19v-7"/>']];
function render() {
  const l = S.localId && LOC[S.localId];
  $('#view').innerHTML = l ? vFicha(l) : S.agregando ? vAgregar() : ({hoy: vHoy, locales: vLocales, resumen: vResumen}[S.tab])();
  $('#tabs').innerHTML = TABS.map(t => `<button data-tab="${t[0]}" ${S.tab === t[0] && !l && !S.agregando ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${t[2]}</svg>${t[1]}</button>`).join('');
}
function ir(tab) { S.tab = tab; S.localId = null; S.paso = null; S.agregando = false; S.borrar = false; render(); window.scrollTo(0, 0); }
function abrir(id) {
  const i = IDX[id] || {};
  S.localId = id; S.paso = null; S.agregando = false;
  S.b = {nota: i.nota ?? '', resenas: i.resenas ?? '', perfil: i.perfil || '', nfc: !!i.nfc, cantidad: 1, precio: '', formato: 'Tarjeta', volverFecha: masDias(1), volverHora: '16:00', quien: '', notaTxt: '', motivo: ''};
  render(); window.scrollTo(0, 0);
}

function guardarVisita(resultado) {
  const l = LOC[S.localId], b = S.b, ahora = new Date();
  if (resultado === 'vendido' && b.resenas === '') return toast('Anota cuántas reseñas tiene hoy: es el "antes".');
  if (resultado === 'control' && b.resenas === '') return toast('Anota arriba cuántas reseñas tiene hoy.');
  if (resultado === 'no' && !b.motivo) return toast('Marca el motivo principal.');
  if ((resultado === 'volver' || resultado === 'perfil') && !b.volverFecha) return toast('Falta el día para volver.');
  const agenda = resultado === 'volver' || resultado === 'perfil';
  Store.agregarVisita({
    id: String(ahora.getTime()), fecha: iso(ahora) + ' ' + pad(ahora.getHours()) + ':' + pad(ahora.getMinutes()),
    localId: l.id, local: l.n, familia: FAM[l.fam], tipo: l.tipoN, direccion: l.dir || '', resultado,
    motivo: resultado === 'no' ? b.motivo : '',
    volverFecha: agenda ? b.volverFecha : '', volverHora: resultado === 'volver' ? b.volverHora : '', quien: agenda ? b.quien : '',
    notaGoogle: b.nota, resenas: b.resenas, perfil: b.perfil, nfc: b.nfc ? 'sí' : 'no',
    cantidad: resultado === 'vendido' ? b.cantidad : '', precio: resultado === 'vendido' ? b.precio : '', formato: resultado === 'vendido' ? b.formato : '',
    nota: resultado === 'perfil' ? [b.pIniciado ? 'perfil iniciado' : '', b.pVerif ? 'verificación solicitada' : ''].filter(Boolean).join(', ') : b.notaTxt
  });
  toast({vendido: 'Venta guardada. Control agendado para ' + DIAS_CONTROL + ' días más.', volver: 'Agendado. Aparecerá en Hoy ese día.', no: 'Guardado. El motivo se suma al resumen.', perfil: 'Seguimiento guardado.', control: 'Control guardado.'}[resultado]);
  ir(resultado === 'control' ? 'resumen' : 'locales');
}

function descargarCSV() {
  const cols = ['fecha', 'local', 'familia', 'tipo', 'direccion', 'resultado', 'motivo', 'volverFecha', 'volverHora', 'quien', 'notaGoogle', 'resenas', 'perfil', 'nfc', 'cantidad', 'precio', 'formato', 'nota', 'localId'];
  const celda = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  // ";" como separador y una marca inicial (BOM) para que Excel en español lo abra bien con tildes
  const txt = '﻿' + [cols.join(';')].concat(Store.datos.visitas.map(v => cols.map(c => celda(v[c])).join(';'))).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], {type: 'text/csv;charset=utf-8'}));
  a.download = 'visitas-' + hoy() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.tab) return ir(d.tab);
  if (d.abrir) return abrir(d.abrir);
  if (d.paso !== undefined) { S.paso = d.paso || null; return render(); }
  if (d.motivo) { S.b.motivo = d.motivo; return render(); }
  if (d.guardar) return guardarVisita(d.guardar);
  if (d.fam) { S.fam = d.fam; S.limite = 40; return render(); }
  if (d.mas) { S.limite += 40; $('#lista').innerHTML = listaHTML(); return; }
  if (d.agregar) { S.agregando = true; S.b = {aNombre: S.q, aFam: 'tiendas', aTipo: '', aDir: ''}; render(); return window.scrollTo(0, 0); }
  if (d.guardarLocal) {
    const n = (S.b.aNombre || '').trim(); if (!n) return toast('Falta el nombre del local.');
    const tipo = (S.b.aTipo || '').trim() || FAM[S.b.aFam];
    const l = {id: 'man-' + Date.now(), n, fam: S.b.aFam, tipo: tipo.toLowerCase(), tipoN: tipo, dir: (S.b.aDir || '').trim(), lat: S.pos ? S.pos.lat : null, lon: S.pos ? S.pos.lon : null, manual: true};
    Store.agregarLocal(l); toast('Local agregado.'); return abrir(l.id);
  }
  if (d.ubicar) {
    if (!navigator.geolocation) return toast('Este navegador no entrega ubicación. Busca por nombre o calle.');
    toast('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(p => { S.pos = {lat: p.coords.latitude, lon: p.coords.longitude}; S.limite = 40; render(); toast('Lista ordenada por cercanía.'); },
      () => toast('No se pudo obtener la ubicación. Revisa el permiso o busca por nombre o calle.'), {enableHighAccuracy: true, timeout: 10000});
    return;
  }
  if (d.csv) { if (!Store.datos.visitas.length) return toast('Todavía no hay visitas que descargar.'); return descargarCSV(); }
  if (d.conectar) {
    const url = (S.b.cfgUrl || '').trim(), clave = (S.b.cfgClave || '').trim();
    if (!/^https?:\/\//.test(url) || !clave) return toast('Faltan la dirección del puente y la clave.');
    toast('Probando la conexión…');
    Store.conectar(url, clave).then(() => { S.b = {}; render(); toast(Store.error ? 'Conectada, pero quedaron registros por enviar.' : 'Conectada a la hoja de Google.'); })
      .catch(err => toast(err.message === 'clave' ? 'La clave no coincide con la de la hoja.' : 'No se pudo conectar. Revisa la dirección y que el puente esté publicado para "Cualquier usuario".'));
    return;
  }
  if (d.sync) { toast('Sincronizando…'); Store.sincronizar().then(() => Store.error ? null : Store.bajar()).then(() => { render(); toast(Store.error ? 'Sin conexión. Se reintenta solo.' : 'Al día con la hoja.'); }).catch(() => toast('No se pudo leer la hoja.')); return; }
  if (d.desconectar) { Store.desconectar(); aviso(); render(); return toast('Desconectada. Los datos siguen en este navegador y en la hoja.'); }
  if (d.borrar) { if (d.borrar === 'si') { Store.borrarTodo(); toast('Datos borrados.'); } S.borrar = d.borrar === 'pedir'; return render(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'buscar') { S.q = t.value; S.limite = 40; $('#lista').innerHTML = listaHTML(); return; }
  if (t.dataset.f) S.b[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value;
});
document.addEventListener('change', e => { // al salir de estos campos se redibuja para actualizar la comparación y los botones
  if (S.localId && ['resenas', 'perfil'].includes(e.target.dataset.f)) render();
});

Store.cargar(); indexar(); render(); aviso();
// Al abrir: primero sube lo pendiente y después trae lo que haya en la hoja (por si se usó otro teléfono).
if (Store.cfg) Store.sincronizar().then(() => Store.error ? null : Store.bajar()).then(() => { if (!S.localId && !S.agregando) render(); }).catch(() => {});
window.addEventListener('online', () => Store.sincronizar());
document.addEventListener('visibilitychange', () => { if (!document.hidden) Store.sincronizar(); });
})();
