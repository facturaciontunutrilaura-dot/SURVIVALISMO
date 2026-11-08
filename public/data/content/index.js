// Agregador de la base de conocimiento offline.
import { SOURCES, SOURCE_MAP, FECHA_CONSULTA, DISCLAIMER } from './sources.js';
import { EMERGENCIAS, EMERGENCIAS_MAP, SOS_SANITARIAS, SOS_SANITARIAS_MAP, GRUPOS_EMERGENCIA } from './emergencias.js';
import { ART_RECURSOS } from './art-recursos.js';
import { ART_TECNICAS } from './art-tecnicas.js';
import { ART_PREPARACION } from './art-preparacion.js';
import { ART_TERRITORIO } from './art-territorio.js';
import { ART_COMUNICACIONES, FRECUENCIAS } from './comunicaciones.js';
import { ART_HUERTO } from './art-huerto.js';
import { ART_CASA } from './art-casa.js';
import { ART_BRICOLAJE } from './art-bricolaje.js';
import { ART_DEFENSA } from './art-defensa.js';
import { CHECKLISTS } from './checklists.js';
import { CURSOS } from './cursos.js';
import { QUIZ, QUIZ_CATEGORIAS, RESPIRACIONES, GROUNDING } from './juegos.js';
import { RIESGOS, NIVELES, CATEGORIAS_RIESGO } from './riesgos.js';
import { SITUACIONES } from './familia.js';

export const VERSION = '1.20.0';
export const FECHA_CONTENIDO = FECHA_CONSULTA;

export const SECCIONES = [
  { id: 'emergencia', t: 'Emergencia', ic: '🚨', cls: 'sos', desc: 'Qué hacer AHORA, escenario por escenario' },
  { id: 'familia', t: 'Mi plan familiar', ic: '👨‍👩‍👧', cls: 'destacada', desc: 'Coordinación, rutas y estado de los tuyos' },
  { id: 'riesgos', t: 'Riesgos que vienen', ic: '📊', cls: 'destacada', desc: 'Cómo evolucionan los riesgos 2026–2036' },
  { id: 'mapa', t: 'Mapa', ic: '🗺', desc: 'Mapas offline y tus puntos personales' },
  { id: 'orientacion', t: 'Orientación', ic: '🧭', desc: 'Brújula, mapas, coordenadas y navegación' },
  { id: 'agua', t: 'Agua', ic: '💧', desc: 'Necesidades, almacenaje, búsqueda y potabilización' },
  { id: 'fuego', t: 'Fuego', ic: '🔥', desc: 'Encender, usar y la legislación española' },
  { id: 'refugio', t: 'Refugio', ic: '🏕', desc: 'Protegerse del frío, el viento y el calor' },
  { id: 'alimentacion', t: 'Alimentación', ic: '🍲', desc: 'Despensa, conservación y cocina sin luz' },
  { id: 'en-casa', t: 'En casa durante la crisis', ic: '🏠', desc: 'Váter sin agua, frío, calor, luz, refugio ante un ataque, seguridad' },
  { id: 'bricolaje', t: 'Reparaciones en casa', ic: '🔧', desc: 'Cortar suministros, reparar fugas, cristales, electricidad segura y apaños' },
  { id: 'defensa', t: 'Seguridad y defensa', ic: '🛡️', desc: 'Prevenir, calmar, escapar, la ley y la seguridad de tu familia' },
  { id: 'huerto', t: 'Huerto', ic: '🥔', desc: 'Huerto de supervivencia: patatas, calendario, semillas y conservar' },
  { id: 'primeros-auxilios', t: 'Primeros auxilios', ic: '🩹', desc: 'PAS, RCP, hemorragias y urgencias' },
  { id: 'comunicaciones', t: 'Comunicaciones', ic: '📻', desc: 'Plan de comunicación, radio y frecuencias' },
  { id: 'equipo', t: 'Mochila y equipo', ic: '🎒', desc: 'Niveles de preparación, mochilas y checklists' },
  { id: 'psicologia', t: 'Psicología', ic: '🧠', desc: 'Decidir bajo presión y resistir en el tiempo' },
  { id: 'juegos', t: 'Juegos', ic: '🎮', desc: 'Juegos offline y modo calma' },
  { id: 'audio', t: 'Audio', ic: '🎵', desc: 'Música y mensajes de voz sin conexión' },
  { id: 'bushcraft', t: 'Técnicas de campo', ic: '🌲', desc: 'Herramientas, nudos y campamento responsable' },
  { id: 'espana', t: 'España', ic: '🇪🇸', desc: 'Riesgos, sistema de emergencias e infraestructura' },
  { id: 'avila', prov: '05', t: 'Guía de Ávila', ic: '📍', desc: 'Guía provincial detallada: territorio, riesgos y servicios' },
  { id: 'vehiculo', t: 'Vehículo', ic: '🚗', desc: 'Kit, invierno, nieve e inundación' },
  { id: 'mascotas', t: 'Mascotas', ic: '🐕', desc: 'Preparación y evacuación con animales' },
  { id: 'plan-familiar', t: 'Contactos y acuerdos', ic: '👨‍👩‍👧', desc: 'Contactos, puntos de encuentro y reunificación' },
  { id: 'calculadoras', t: 'Calculadoras', ic: '🧮', desc: 'Agua, comida, marcha, rumbo, unidades' },
  { id: 'noticias', t: 'Noticias de última hora', ic: '📰', cls: 'noticias', desc: 'España y el mundo: emergencias, catástrofes y conflictos, cada 30 min' },
  { id: 'alex', t: 'Pregúntale a Alex', ic: '💬', desc: 'Tu asistente de supervivencia, también sin conexión' },
  { id: 'evacuacion', t: 'Plan de evacuación', ic: '🧭', cls: 'evacuacion', desc: 'Por dónde salir según lo que pase: España, Portugal, Francia y por mar' },
  { id: 'herramientas', t: 'Herramientas SOS', ic: '🔦', desc: 'Avisar «Estoy bien» por SMS, silbato, linterna, señales, diario y tarjeta' },
  { id: 'efectivo', t: 'Mi efectivo', ic: '💶', desc: 'Cuánto dinero en efectivo te queda y para cuántos días' },
  { id: 'despensa-calc', t: 'Calculadora de despensa', ic: '🥫', desc: 'Para cuántos días os llega lo que tenéis en casa' },
  { id: 'entrenamiento', t: 'Entrenamiento', ic: '💪', desc: 'En casa, sin material: de principiante a extremo' },
  { id: 'compra', t: 'Compra urgente', ic: '🛒', cls: 'colapso', desc: 'Lista de compra urgente, oculta hasta que la actives' },
  { id: 'cursos', t: 'Formación', ic: '🎓', desc: '10 cursos con teoría, ejercicios y test' },
  { id: 'biblioteca', t: 'Biblioteca', ic: '📚', desc: 'Tablas, meteorología, plantas y referencias' },
  { id: 'manual', t: 'Índice completo', ic: '📖', desc: 'Índice completo de todo el contenido' },
  { id: 'fuentes', t: 'Fuentes', ic: '📑', desc: 'De dónde procede cada dato' },
  { id: 'config', t: 'Ajustes', ic: '⚙️', desc: 'Estado offline, copias de seguridad y ajustes' },
];

/* Portada (v1.14) ordenada por MOMENTOS, no por temas: prepárate, si está
   pasando, si tienes que salir, calma y aprende más. Arriba van siempre SOS,
   el 112 y el buscador. Una puerta es una sección («familia») o un grupo
   («g:mochila») que reúne varias secciones en una pantalla (#/grupo/<id>).
   No se borra ni se renombra ningún id ni ninguna ruta: los grupos son
   pantallas nuevas que llevan a las secciones de siempre.
   Fuera de la portada, a propósito: SOS (arriba), Noticias y Alex (barra
   inferior y buscador), Ajustes (botón ⚙ de la cabecera) y «plan-familiar»
   (desde Mi plan familiar). Toda otra sección aparece exactamente una vez
   (lo comprueba tools/test-unit.mjs). */
export const GRUPOS = {
  mochila: { t: 'Mochila y despensa', ic: '🎒', desc: 'Equipo, compra urgente y calculadoras de agua y comida', secs: ['equipo', 'compra', 'despensa-calc', 'calculadoras'] },
  casa: { t: 'En casa durante la crisis', ic: '🏠', desc: 'Váter sin agua, frío, calor, luz, refugio y reparaciones', secs: ['en-casa', 'bricolaje'] },
  'agua-comida': { t: 'Agua y comida', ic: '💧', desc: 'Potabilizar, conservar, cocinar sin luz y huerto', secs: ['agua', 'alimentacion', 'huerto'] },
  orientacion: { t: 'Orientación y mapas', ic: '🗺', desc: 'Mapas sin conexión, brújula y coordenadas', secs: ['mapa', 'orientacion'] },
  campo: { t: 'Vida en el campo', ic: '🏕', desc: 'Refugio, fuego y técnicas de campo', secs: ['refugio', 'fuego', 'bushcraft'] },
  coche: { t: 'Coche y mascotas', ic: '🚗', desc: 'Kit del coche, nieve, inundación y animales', secs: ['vehiculo', 'mascotas'] },
  calma: { t: 'Calma y ánimo', ic: '🌿', desc: 'Psicología, respiración, juegos y audio', secs: ['psicologia', 'juegos', 'audio'] },
  riesgos: { t: 'Riesgos en España y en tu zona', ic: '📊', desc: 'Qué puede pasar, dónde y cómo evoluciona', secs: ['riesgos', 'espana', 'avila'] },
  biblioteca: { t: 'Biblioteca', ic: '📚', desc: 'Tablas, referencias, índice completo y fuentes', secs: ['biblioteca', 'manual', 'fuentes'] },
};
export const PORTADA = [
  { id: 'preparate', t: 'Prepárate', puertas: ['familia', 'g:mochila', 'evacuacion', 'entrenamiento'] },
  { id: 'pasando', t: 'Si está pasando', puertas: ['herramientas', 'efectivo', 'g:casa', 'primeros-auxilios', 'g:agua-comida', 'comunicaciones', 'defensa'] },
  { id: 'salir', t: 'Si tienes que salir', puertas: ['g:orientacion', 'g:campo', 'g:coche'] },
  { id: 'calma', t: 'Calma y ánimo', puertas: ['g:calma'] },
  { id: 'aprende', t: 'Aprende más', puertas: ['g:riesgos', 'cursos', 'g:biblioteca'] },
];
/** Secciones a las que lleva una puerta de la portada. */
export const seccionesDePuerta = (p) => (p.startsWith('g:') ? GRUPOS[p.slice(2)].secs : [p]);

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
  ...ART_CASA,
  ...ART_HUERTO,
  ...ART_BRICOLAJE,
  ...ART_DEFENSA,
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
  // --- Emergencias sanitarias de SOS (apuntan a su artículo de primeros auxilios) ---
  ...SOS_SANITARIAS.map((s) => {
    const a = ARTICULOS_MAP[s.art];
    return {
      tipo: 'sos',
      id: s.id,
      ruta: `#/emergencia/sanitaria/${s.id}`,
      t: s.t,
      sec: 'emergencia',
      pr: 'critico',
      sum: a?.sum || '',
      tags: [...s.tags, ...(a?.tags || [])].join(' '),
      texto: a ? textoDeBloques(a.body) : '',
    };
  }),
  ...ARTICULOS.map((a) => ({
    tipo: 'articulo',
    id: a.id,
    ruta: `#/art/${a.id}`,
    t: a.t,
    sec: a.sec,
    pr: a.pr,
    sum: a.sum,
    tags: (a.tags || []).join(' '),
    texto: textoDeBloques(a.body),
  })),
  ...EMERGENCIAS.map((e) => ({
    tipo: 'emergencia',
    id: e.id,
    ruta: `#/emergencia/${e.id}`,
    t: e.t,
    sec: 'emergencia',
    pr: e.pr,
    sum: e.card[0],
    texto: [e.card.join(' '), e.ahora.join(' '), e.horas.join(' '), e.dias.join(' '), e.no.join(' '), e.eq.join(' ')].join(' '),
  })),
  ...CHECKLISTS.map((c) => ({
    tipo: 'checklist',
    id: c.id,
    ruta: `#/check/${c.id}`,
    t: c.t,
    sec: 'equipo',
    pr: 'importante',
    sum: c.desc,
    texto: c.grupos.map((g) => g.g + ' ' + g.items.join(' ')).join(' '),
  })),
  ...CURSOS.map((c) => ({
    tipo: 'curso',
    id: c.id,
    ruta: `#/curso/${c.id}`,
    t: `${c.n} — ${c.t}`,
    sec: 'cursos',
    pr: 'recomendado',
    sum: c.obj,
    texto: c.teoria.join(' '),
  })),
  ...FRECUENCIAS.map((f) => ({
    tipo: 'frecuencia',
    id: f.id,
    ruta: `#/sec/comunicaciones`,
    t: f.nombre,
    sec: 'comunicaciones',
    pr: 'info',
    sum: `${f.rx} ${f.unidad} · ${f.licencia}`,
    texto: [f.grupo, f.rx, f.uso, f.zona, f.notas].join(' '),
  })),
  {
    tipo: 'frecuencia', id: 'base-frecuencias', ruta: '#/sec/comunicaciones', t: 'Base de frecuencias de radio',
    sec: 'comunicaciones', pr: 'importante', sum: 'Emisoras, canales PMR446 y frecuencias de emergencia, con su verificación y fuente. Incluye radio log.',
    tags: 'frecuencias radio emisoras canales pmr446 walkie radioaficionado radio log',
    texto: FRECUENCIAS.map((f) => `${f.nombre} ${f.rx} ${f.unidad} ${f.grupo}`).join(' · '),
  },
  // --- Riesgos 2026–2036: una entrada por riesgo y zona principal ---
  ...RIESGOS.map((r) => ({
    tipo: 'riesgo',
    id: r.id,
    ruta: '#/sec/riesgos',
    t: `${r.t} — riesgo 2026·2036`,
    sec: 'riesgos',
    pr: 'importante',
    sum: r.z.espana?.actual?.slice(0, 140) || Object.values(r.z)[0]?.actual?.slice(0, 140) || '',
    texto: [CATEGORIAS_RIESGO[r.cat]?.t,
      ...Object.values(r.z).map((z) => [z?.actual, z?.h2030, z?.h2036].join(' ')),
      'riesgo proyección escenario 2036 tendencia confianza',
    ].join(' '),
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
    texto: [s.ruta, s.antes.join(' '), s.ojo.join(' '), 'ruta familia desplazamiento'].join(' '),
  })),
  // --- Juegos y modo calma ---
  {
    tipo: 'juego', id: 'juegos', ruta: '#/sec/juegos', t: 'Juegos offline', sec: 'juegos',
    pr: 'recomendado', sum: 'Tres en raya, ajedrez, memory de supervivencia y reto de preguntas. Funcionan sin conexión.',
    texto: ['juegos offline tres en raya ajedrez memory reto quiz preguntas niños aburrimiento estrés grupo',
      ...QUIZ.map((q) => q.q), ...Object.values(QUIZ_CATEGORIAS).map((c) => c.t)].join(' '),
  },
  {
    tipo: 'juego', id: 'calma', ruta: '#/sec/juegos', t: 'Modo calma — respiración y grounding', sec: 'juegos',
    pr: 'recomendado', sum: 'Respiración guiada con temporizador visual, grounding y ejercicios de grupo.',
    texto: ['modo calma respiración guiada grounding ansiedad estrés temporizador ejercicios grupo niños',
      ...RESPIRACIONES.map((r) => r.t + ' ' + r.desc), ...GROUNDING.map((g) => g.t + ' ' + g.desc)].join(' '),
  },
  {
    tipo: 'audio', id: 'audio-offline', ruta: '#/sec/audio', t: 'Audio offline', sec: 'audio',
    pr: 'recomendado', sum: 'Música y mensajes de voz guardados en el dispositivo, reproducibles sin conexión.',
    texto: 'audio offline música mp3 canciones mensajes de voz grabaciones instrucciones habladas niños cuentos apagón aislamiento moral reproductor sin conexión importar archivos',
  },
  {
    tipo: 'familia', id: 'centro-familiar', ruta: '#/sec/familia', t: 'Centro de coordinación familiar', sec: 'familia',
    pr: 'critico', sum: 'Tus ubicaciones y las de tu familia: estado, rutas, plan 72 h y reunificación.',
    texto: ['familia centro coordinación ubicaciones estado reunificación plan 72 horas rutas mapa familiar padres abuelos hijos llegar a mi familia comparar'].join(' '),
  },
  {
    tipo: 'evacuacion', id: 'plan-evacuacion', ruta: '#/sec/evacuacion', t: 'Plan de evacuación', sec: 'evacuacion',
    pr: 'critico', sum: 'Qué hacer y por dónde salir desde tu ciudad según el escenario: colapso, guerra, nuclear, apagón… De 72 horas a meses, con corredores a Portugal, Francia, Andorra y por mar.',
    texto: 'plan de evacuación evacuar huir salir del país frontera portugal francia andorra marruecos ceuta reino unido ferri corredor ruta carretera colapso guerra conflicto armado nuclear almaraz apagón refugio interior gredos tiétar escapar emigrar exilio',
  },
  {
    tipo: 'noticias', id: 'noticias-ultima-hora', ruta: '#/sec/noticias', t: 'Noticias de última hora', sec: 'noticias',
    pr: 'importante', sum: 'Noticias importantes de España y del mundo sobre emergencias, catástrofes, conflictos y suministros, actualizadas cada 30 minutos.',
    texto: 'noticias última hora actualidad qué está pasando hoy avisos alertas aemet terremotos guerra apagón catástrofe prensa',
  },
  {
    tipo: 'alex', id: 'preguntale-alex', ruta: '#/sec/alex', t: 'Pregúntale a Alex', sec: 'alex',
    pr: 'recomendado', sum: 'Cuéntale a Alex qué pasa con tus palabras y te responde con los pasos de la app, también sin conexión.',
    texto: 'asistente alex preguntar pregunta ayuda chat conversación consejo qué hago inteligencia artificial ia',
  },
  {
    tipo: 'entrenamiento', id: 'entrenamiento-casa', ruta: '#/sec/entrenamiento', t: 'Entrenamiento en casa', sec: 'entrenamiento',
    pr: 'recomendado', sum: 'Rutinas de 2 a 5 días por semana sin material o con muy poco, de principiante a extremo, con tu progreso guardado.',
    texto: 'entrenamiento en casa ejercicio rutina gimnasio sin material calistenia fuerza resistencia forma física flexiones sentadillas plancha burpees cardio nivel principiante avanzado extremo progreso',
  },
  {
    tipo: 'compra', id: 'compra-colapso', ruta: '#/sec/compra', t: 'Compra de colapso', sec: 'compra',
    pr: 'critico', sum: 'Lista de compra urgente para quedarse en casa de 72 horas a una semana, calculada para las personas de tu hogar.',
    texto: 'compra colapso lista de la compra supermercado comprar víveres provisiones despensa agua comida comprar antes de que se agote 72 horas una semana kcal proteína hogar',
  },
];

export {
  SOURCES,
  SOURCE_MAP,
  DISCLAIMER,
  EMERGENCIAS,
  EMERGENCIAS_MAP,
  SOS_SANITARIAS,
  SOS_SANITARIAS_MAP,
  GRUPOS_EMERGENCIA,
  CHECKLISTS,
  CURSOS,
  FRECUENCIAS,
  RIESGOS,
  NIVELES,
  SITUACIONES,
  QUIZ,
};
