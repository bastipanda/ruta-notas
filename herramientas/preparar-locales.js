// Convierte lo que entrega OpenStreetMap (datos/osm-crudo.json) en la lista base que usa la app
// (datos/locales.js). Se corre a mano cada vez que se quiera actualizar o cambiar de sector:
//   node herramientas/preparar-locales.js
// Por qué existe: la app necesita pocos campos por local y una "familia de guion" ya asignada;
// hacerlo aquí una sola vez deja la app más simple y el archivo más liviano.

const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const crudo = JSON.parse(fs.readFileSync(path.join(raiz, 'datos', 'osm-crudo.json'), 'utf8'));

// Tipo exacto en español (para mostrar y para comparar solo contra el mismo tipo).
const NOMBRE_TIPO = {
  restaurant: 'Restaurante', pub: 'Pub', bar: 'Bar', nightclub: 'Discoteca', cafe: 'Café', ice_cream: 'Heladería',
  fast_food: 'Comida rápida', dentist: 'Dentista', clinic: 'Clínica o centro médico', doctors: 'Consulta médica',
  veterinary: 'Veterinaria', pharmacy: 'Farmacia', studio: 'Estudio', arts_centre: 'Centro cultural',
  bakery: 'Panadería', pastry: 'Pastelería', confectionery: 'Dulcería', tea: 'Tienda de té', coffee: 'Tienda de café',
  hairdresser: 'Peluquería o barbería', beauty: 'Centro de estética', tattoo: 'Estudio de tatuajes', cosmetics: 'Cosméticos',
  massage: 'Masajes', pet: 'Tienda de mascotas', pet_grooming: 'Peluquería canina', car: 'Venta de autos',
  car_repair: 'Taller mecánico', bicycle: 'Tienda o taller de bicicletas', motorcycle: 'Motos', tyres: 'Neumáticos',
  car_parts: 'Repuestos', laundry: 'Lavandería', dry_cleaning: 'Lavaseco', photo: 'Fotografía',
  travel_agency: 'Agencia de viajes', copyshop: 'Centro de copiado', tailor: 'Sastrería', locksmith: 'Cerrajería',
  optician: 'Óptica', medical_supply: 'Insumos médicos', convenience: 'Almacén o minimarket', clothes: 'Ropa',
  computer: 'Computación', alcohol: 'Botillería', electronics: 'Electrónica', shoes: 'Zapatería',
  mobile_phone: 'Celulares', hardware: 'Ferretería', stationery: 'Librería', sports: 'Deportes', games: 'Juegos',
  jewelry: 'Joyería', greengrocer: 'Verdulería', butcher: 'Carnicería', florist: 'Florería', books: 'Libros',
  furniture: 'Muebles', gift: 'Regalos', toys: 'Juguetes', health_food: 'Alimentos saludables',
  fitness_centre: 'Gimnasio', sports_centre: 'Centro deportivo', dance: 'Academia de baile',
  laboratory: 'Laboratorio', alternative: 'Terapias alternativas', physiotherapist: 'Kinesiología',
  psychotherapist: 'Psicología', supermarket: 'Supermercado', bank: 'Banco', school: 'Colegio',
  kindergarten: 'Jardín infantil', university: 'Universidad', college: 'Instituto', hospital: 'Hospital',
  fuel: 'Bencinera', yes: 'Tienda'
};

const EN = (lista) => new Set(lista.split(' '));
const NO_VISITAR = EN('bank school kindergarten university college hospital fuel parking bicycle_parking bicycle_rental place_of_worship post_office library marketplace car_rental atm police fire_station townhall embassy bus_station taxi parking_entrance social_facility community_centre theatre cinema courthouse public_building charging_station toilets');
const A_COMIDA = EN('restaurant pub bar nightclub biergarten');
const A_CAFE = EN('cafe ice_cream');
const A_SALUD = EN('dentist clinic doctors');
const S_CAFE = EN('bakery pastry confectionery tea coffee chocolate');
const S_BELLEZA = EN('hairdresser beauty tattoo cosmetics massage perfumery');
const S_AUTOS = EN('car car_repair bicycle motorcycle tyres car_parts');
const S_SERVICIOS = EN('laundry dry_cleaning photo travel_agency copyshop tailor locksmith');
const S_SALUD = EN('optician medical_supply hearing_aids');

function clasificar(t) {
  // Primero lo que no se visita y las farmacias: muchos hospitales y farmacias también traen la
  // etiqueta "healthcare" y si no, terminarían contados como Salud.
  if (t.amenity && NO_VISITAR.has(t.amenity)) return [t.amenity, 'novisitar'];
  if (t.amenity === 'pharmacy') return ['pharmacy', 'tiendas'];
  if (t.healthcare) return [t.healthcare, 'salud'];
  if (t.amenity) {
    const a = t.amenity;
    if (NO_VISITAR.has(a)) return [a, 'novisitar'];
    if (A_COMIDA.has(a)) return [a, 'comida'];
    if (A_CAFE.has(a)) return [a, 'cafe'];
    if (a === 'fast_food' || a === 'food_court') return [a, 'rapida'];
    if (A_SALUD.has(a)) return [a, 'salud'];
    if (a === 'veterinary') return [a, 'mascotas'];
    if (a === 'pharmacy') return [a, 'tiendas'];
    return [a, 'servicios'];
  }
  if (t.shop) {
    const s = t.shop;
    if (s === 'supermarket') return [s, 'novisitar'];
    if (S_CAFE.has(s)) return [s, 'cafe'];
    if (S_BELLEZA.has(s)) return [s, 'belleza'];
    if (s === 'pet' || s === 'pet_grooming') return [s, 'mascotas'];
    if (S_AUTOS.has(s)) return [s, 'autos'];
    if (S_SERVICIOS.has(s)) return [s, 'servicios'];
    if (S_SALUD.has(s)) return [s, 'salud'];
    return [s, 'tiendas'];
  }
  if (t.craft) return [t.craft, 'servicios'];
  if (t.leisure) return [t.leisure, 'servicios'];
  return ['otro', 'tiendas'];
}

const locales = [];
for (const e of crudo.elements) {
  const t = e.tags || {};
  const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
  if (!t.name || lat == null) continue;
  const [tipo, fam] = clasificar(t);
  const calle = (t['addr:street'] || '').replace(/^Avenida /, 'Av. ');
  locales.push({
    id: 'osm-' + e.type[0] + e.id,
    n: t.name.trim(),
    lat: +lat.toFixed(6), lon: +lon.toFixed(6),
    dir: [calle, t['addr:housenumber']].filter(Boolean).join(' '),
    tipo, tipoN: NOMBRE_TIPO[tipo] || tipo.replace(/_/g, ' '),
    fam
  });
}
locales.sort((a, b) => a.n.localeCompare(b.n, 'es'));

const salida = '// Generado por herramientas/preparar-locales.js. No editar a mano.\n' +
  '// Datos © colaboradores de OpenStreetMap (licencia ODbL).\n' +
  'window.LOCALES_BASE = ' + JSON.stringify(locales) + ';\n';
fs.writeFileSync(path.join(raiz, 'datos', 'locales.js'), salida);

const cuenta = {};
locales.forEach(l => cuenta[l.fam] = (cuenta[l.fam] || 0) + 1);
console.log(locales.length + ' locales escritos en datos/locales.js');
console.log(cuenta);
