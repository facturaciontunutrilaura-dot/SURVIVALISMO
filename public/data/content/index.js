// Agregador de la base de conocimiento offline.
import { SOURCES, SOURCE_MAP, FECHA_CONSULTA, DISCLAIMER } from './sources.js';
import { EMERGENCIAS, EMERGENCIAS_MAP } from './emergencias.js';
import { ART_RECURSOS } from './art-recursos.js';
import { ART_TECNICAS } from './art-tecnicas.js';
import { ART_PREPARACION } from './art-preparacion.js';
import { ART_TERRITORIO } from './art-territorio.js';
import { ART_COMUNICACIONES, FRECUENCIAS } from './comunicaciones.js';
import { CHECKLISTS } from './checklists.js';
import { CURSOS } from './cursos.js';
import { QUIZ, QUIZ_CATEGORIAS, RESPIRACIONES, GROUNDING } from './juegos.js';
import { RIESGOS, ZONAS, NIVELES, CATEGORIAS_RIESGO } from './riesgos.js';
import { SITUACIONES, CORREDORES } from './familia.js';

export const VERSION = '1.4.0';
export const FECHA_CONTENIDO = FECHA_CONSULTA;

export const SECCIONES = [
  { id: 'emergencia', t: 'EMERGENCIA', ic: '🚨', cls: 'sos', desc: 'Qué hacer AHORA, escenario por escenario' },
  { id: 'familia', t: 'FAMILIA', ic: '👨‍👩‍👧', cls: 'destacada', desc: 'Coordinación, rutas y estado de los tuyos' },
  { id: 'riesgos', t: 'RIESGOS 2036', ic: '📊', cls: 'destacada', desc: 'Cómo evolucionan los riesgos 2026–2036' },
  { id: 'mapa', t: 'MAPA', ic: '🗺', desc: 'Mapas offline y tus puntos personales' },
  { id: 'orientacion', t: 'ORIENTACIÓN', ic: '🧭', desc: 'Brújula, mapas, coordenadas y navegación' },
  { id: 'agua', t: 'AGUA', ic: '💧', desc: 'Necesidades, almacenaje, búsqueda y potabilización' },
  { id: 'fuego', t: 'FUEGO', ic: '🔥', desc: 'Encender, usar y la legislación española' },
  { id: 'refugio', t: 'REFUGIO', ic: '🏕', desc: 'Protegerse del frío, el viento y el calor' },
  { id: 'alimentacion', t: 'ALIMENTACIÓN', ic: '🍲', desc: 'Despensa, conservación y cocina sin luz' },
  { id: 'primeros-auxilios', t: 'PRIMEROS AUXILIOS', ic: '🩹', desc: 'PAS, RCP, hemorragias y urgencias' },
  { id: 'comunicaciones', t: 'COMUNICACIONES', ic: '📻', desc: 'Plan de comunicación, radio y frecuencias' },
  { id: 'equipo', t: 'EQUIPO', ic: '🎒', desc: 'Niveles de preparación, mochilas y checklists' },
  { id: 'psicologia', t: 'PSICOLOGÍA', ic: '🧠', desc: 'Decidir bajo presión y resistir en el tiempo' },
  { id: 'juegos', t: 'JUEGOS', ic: '🎮', desc: 'Juegos offline y modo calma' },
  { id: 'audio', t: 'AUDIO', ic: '🎵', desc: 'Música y mensajes de voz sin conexión' },
  { id: 'bushcraft', t: 'BUSHCRAFT', ic: '🌲', desc: 'Herramientas, nudos y campamento responsable' },
  { id: 'espana', t: 'ESPAÑA', ic: '🇪🇸', desc: 'Riesgos, sistema de emergencias e infraestructura' },
  { id: 'avila', t: 'ÁVILA', ic: '📍', desc: 'Plan local: territorio, riesgos y servicios' },
  { id: 'vehiculo', t: 'VEHÍCULO', ic: '🚗', desc: 'Kit, invierno, nieve e inundación' },
  { id: 'mascotas', t: 'MASCOTAS', ic: '🐕', desc: 'Preparación y evacuación con animales' },
  { id: 'plan-familiar', t: 'PLAN FAMILIAR', ic: '👨‍👩‍👧', desc: 'Contactos, puntos de encuentro y reunificación' },
  { id: 'calculadoras', t: 'CALCULADORAS', ic: '🧮', desc: 'Agua, comida, marcha, rumbo, unidades' },
  { id: 'cursos', t: 'FORMACIÓN', ic: '🎓', desc: '10 cursos con teoría, ejercicios y test' },
  { id: 'biblioteca', t: 'BIBLIOTECA', ic: '📚', desc: 'Tablas, meteorología, plantas y referencias' },
  { id: 'manual', t: 'MANUAL', ic: '📖', desc: 'Índice completo de todo el contenido' },
  { id: 'fuentes', t: 'FUENTES', ic: '📑', desc: 'De dónde procede cada dato' },
  { id: 'config', t: 'CONFIGURACIÓN', ic: '⚙️', desc: 'Estado offline, copias de seguridad y ajustes' },
];

export const PRIORIDADES = {
  critico: { t: 'CRÍTICO', ic: '🔴', ord: 0 },
  importante: { t: 'IMPORTANTE', ic: '🟠', ord: 1 },
  recomendado: { t: 'RECOMENDADO', ic: '🟡', ord: 2 },
  info: { t: 'INFORMACIÓN', ic: '🟢', ord: 3 },
};

export const ARTICULOS = [
  ...ART_RECURSOS,
  ...ART_TECNICAS,
  ...ART_PREPARACION,
  ...ART_TERRITORIO,
  ...ART_COMUNICACIONES,
];

export const ARTICULOS_MAP = Object.fromEntries(ARTICULOS.map((a) => [a.id, a]));

export function articulosDeSeccion(sec) {
  return ARTICULOS.filter((a) => a.sec === sec).sort(
    (a, b) => PRIORIDADES[a.pr].ord - PRIORIDADES[b.pr].ord
  );
}

/* ------------------------- Índice de búsqueda ------------------------- */
function textoDeBloques(body = []) {
  const out = [];
  for (const b of body) {
    if (b.p) out.push(b.p);
    if (b.h) out.push(b.h);
    if (b.warn) out.push(b.warn);
    if (b.note) out.push(b.note);
    if (b.ul) out.push(b.ul.join(' '));
    if (b.ol) out.push(b.ol.join(' '));
    if (b.kv) out.push(b.kv.map((r) => r.join(' ')).join(' '));
    if (b.card) out.push(b.card.t + ' ' + b.card.lines.join(' '));
    if (b.table) out.push(b.table.head.join(' ') + ' ' + b.table.rows.map((r) => r.join(' ')).join(' '));
  }
  return out.join(' ');
}

export const INDICE = [
  ...ARTICULOS.map((a) => ({
    tipo: 'articulo',
    id: a.id,
    ruta: `#/art/${a.id}`,
    t: a.t,
    sec: a.sec,
    pr: a.pr,
    sum: a.sum,
    texto: [a.t, a.sum, (a.tags || []).join(' '), textoDeBloques(a.body)].join(' ').toLowerCase(),
  })),
  ...EMERGENCIAS.map((e) => ({
    tipo: 'emergencia',
    id: e.id,
    ruta: `#/emergencia/${e.id}`,
    t: e.t,
    sec: 'emergencia',
    pr: e.pr,
    sum: e.card[0],
    texto: [e.t, e.card.join(' '), e.ahora.join(' '), e.horas.join(' '), e.dias.join(' '), e.no.join(' '), e.eq.join(' ')]
      .join(' ')
      .toLowerCase(),
  })),
  ...CHECKLISTS.map((c) => ({
    tipo: 'checklist',
    id: c.id,
    ruta: `#/check/${c.id}`,
    t: c.t,
    sec: 'equipo',
    pr: 'importante',
    sum: c.desc,
    texto: [c.t, c.desc, c.grupos.map((g) => g.g + ' ' + g.items.join(' ')).join(' ')].join(' ').toLowerCase(),
  })),
  ...CURSOS.map((c) => ({
    tipo: 'curso',
    id: c.id,
    ruta: `#/curso/${c.id}`,
    t: `${c.n} — ${c.t}`,
    sec: 'cursos',
    pr: 'recomendado',
    sum: c.obj,
    texto: [c.n, c.t, c.obj, c.teoria.join(' ')].join(' ').toLowerCase(),
  })),
  ...FRECUENCIAS.map((f) => ({
    tipo: 'frecuencia',
    id: f.id,
    ruta: `#/sec/comunicaciones`,
    t: f.nombre,
    sec: 'comunicaciones',
    pr: 'info',
    sum: `${f.rx} ${f.unidad} · ${f.licencia}`,
    texto: [f.nombre, f.grupo, f.rx, f.uso, f.zona, f.notas].join(' ').toLowerCase(),
  })),
  // --- Riesgos 2026–2036: una entrada por riesgo y zona principal ---
  ...RIESGOS.map((r) => ({
    tipo: 'riesgo',
    id: r.id,
    ruta: '#/sec/riesgos',
    t: `${r.t} — riesgo 2026·2036`,
    sec: 'riesgos',
    pr: 'importante',
    sum: r.z.avila?.actual?.slice(0, 140) || r.z.espana?.actual?.slice(0, 140) || '',
    texto: [r.t, CATEGORIAS_RIESGO[r.cat]?.t,
      ...ZONAS.map((z) => [r.z[z.id]?.actual, r.z[z.id]?.h2030, r.z[z.id]?.h2036].join(' ')),
      'riesgo proyección escenario 2036 tendencia confianza',
    ].join(' ').toLowerCase(),
  })),
  // --- Situaciones de ruta familiar ---
  ...SITUACIONES.map((s) => ({
    tipo: 'ruta',
    id: s.id,
    ruta: '#/familia/rutas',
    t: `Ruta familiar — ${s.t}`,
    sec: 'familia',
    pr: 'importante',
    sum: s.resumen,
    texto: [s.t, s.resumen, s.ruta, s.antes.join(' '), s.ojo.join(' '), 'ávila terrassa getafe ruta familia'].join(' ').toLowerCase(),
  })),
  // --- Juegos y modo calma ---
  {
    tipo: 'juego', id: 'juegos', ruta: '#/sec/juegos', t: 'Juegos offline', sec: 'juegos',
    pr: 'recomendado', sum: 'Tres en raya, memory de supervivencia y reto de preguntas. Funcionan sin conexión.',
    texto: ['juegos offline tres en raya memory reto quiz preguntas niños aburrimiento estrés grupo',
      ...QUIZ.map((q) => q.q), ...Object.values(QUIZ_CATEGORIAS).map((c) => c.t)].join(' ').toLowerCase(),
  },
  {
    tipo: 'juego', id: 'calma', ruta: '#/sec/juegos', t: 'Modo calma — respiración y grounding', sec: 'juegos',
    pr: 'recomendado', sum: 'Respiración guiada con temporizador visual, grounding y ejercicios de grupo.',
    texto: ['modo calma respiración guiada grounding ansiedad estrés temporizador ejercicios grupo niños',
      ...RESPIRACIONES.map((r) => r.t + ' ' + r.desc), ...GROUNDING.map((g) => g.t + ' ' + g.desc)].join(' ').toLowerCase(),
  },
  {
    tipo: 'audio', id: 'audio-offline', ruta: '#/sec/audio', t: 'Audio offline', sec: 'audio',
    pr: 'recomendado', sum: 'Música y mensajes de voz guardados en el dispositivo, reproducibles sin conexión.',
    texto: 'audio offline música mp3 canciones mensajes de voz grabaciones instrucciones habladas niños cuentos apagón aislamiento moral reproductor sin conexión importar archivos'.toLowerCase(),
  },
  {
    tipo: 'familia', id: 'centro-familiar', ruta: '#/sec/familia', t: 'Centro de coordinación familiar', sec: 'familia',
    pr: 'critico', sum: 'Ávila, Terrassa y Getafe: estado, rutas, plan 72 h y reunificación.',
    texto: ['familia centro coordinación ávila terrassa getafe estado reunificación plan 72 horas rutas mapa familiar carlos padres pareja llegar a mi familia',
      ...CORREDORES.map((c) => c.t)].join(' ').toLowerCase(),
  },
];

export {
  SOURCES,
  SOURCE_MAP,
  DISCLAIMER,
  EMERGENCIAS,
  EMERGENCIAS_MAP,
  CHECKLISTS,
  CURSOS,
  FRECUENCIAS,
  RIESGOS,
  NIVELES,
  SITUACIONES,
  QUIZ,
};
