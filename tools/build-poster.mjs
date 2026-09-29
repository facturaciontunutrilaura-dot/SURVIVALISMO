/* =========================================================================
   build-poster.mjs — genera el póster de Instagram (9:16, 1080×1920)
   ---------------------------------------------------------------------------
   TODO lo que aparece en el póster sale de datos que ya están en la app:
     · La geometría de España viene de public/data/geo/es-provincias.geojson,
       derivada de es-atlas (IGN). No hay ningún mapa dibujado a mano.
     · Los niveles de riesgo salen de public/data/content/riesgos.js, con su
       tipo de evidencia y su confianza. No se inventa ninguna cifra.
     · Las fuentes salen de public/data/content/sources.js, con su URL real.

   REGLA IMPORTANTE: el mapa NO colorea las provincias por nivel de riesgo.
   No existe una evaluación oficial homogénea provincia a provincia, así que
   pintar 50 colores sería inventarse el dato. Lo que sí dibuja el mapa es una
   división real y verificable: las 17 comunidades autónomas más Ceuta y
   Melilla, que es el nivel al que en España se planifican las emergencias.

   Gibraltar aparece en el conjunto de datos de origen como polígono aparte.
   Se excluye: no es territorio español y pintarlo como una provincia más
   sería un error de hecho.
   ========================================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(DIR, '..');
const geo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public/data/geo/es-provincias.geojson'), 'utf8'));
const geoCcaa = JSON.parse(fs.readFileSync(path.join(RAIZ, 'public/data/geo/es-ccaa.geojson'), 'utf8'));

/* Códigos que el conjunto de datos incluye pero que NO son territorio
   español: se excluyen para no afirmar algo falso en el mapa. */
const FUERA_PROV = new Set(['54']);
const FUERA_CCAA = new Set(['20']);

const { RIESGOS, NIVELES, EVIDENCIA, RIESGOS_ACTUALIZADO, RIESGOS_PROXIMA_REVISION, conf } =
  await import(path.join(RAIZ, 'public/data/content/riesgos.js'));
const { SOURCES } = await import(path.join(RAIZ, 'public/data/content/sources.js'));

/* ---------- Proyección -------------------------------------------------- */
/* Equirectangular con corrección por coseno de la latitud media. Suficiente
   para un póster; no pretende ser una proyección cartográfica formal. */
const CANARIAS = new Set(['35', '38']);

function proyector({ lon0, lat0, lon1, lat1, x, y, w, h }) {
  const k = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
  const anchoGeo = (lon1 - lon0) * k;
  const altoGeo = lat1 - lat0;
  const s = Math.min(w / anchoGeo, h / altoGeo);
  const offX = x + (w - anchoGeo * s) / 2;
  const offY = y + (h - altoGeo * s) / 2;
  return ([lon, lat]) => [
    +(offX + (lon - lon0) * k * s).toFixed(1),
    +(offY + (lat1 - lat) * s).toFixed(1),
  ];
}

function aPath(geometry, p) {
  const anillos = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
  const trozos = [];
  for (const anillo of anillos) {
    if (anillo.length < 4) continue; // artefactos degenerados del TopoJSON
    let d = '';
    for (let i = 0; i < anillo.length; i++) {
      const [X, Y] = p(anillo[i]);
      d += (i ? 'L' : 'M') + X + ' ' + Y;
    }
    trozos.push(d + 'Z');
  }
  return trozos.join('');
}

/* Marco peninsular + Baleares, y recuadro aparte para Canarias: es la
   convención cartográfica habitual, no un recorte arbitrario. */
const pPen = proyector({ lon0: -9.9, lat0: 35.8, lon1: 4.6, lat1: 44.0, x: 0, y: 0, w: 940, h: 620 });
const pCan = proyector({ lon0: -18.4, lat0: 27.4, lon1: -13.2, lat1: 29.6, x: 10, y: 502, w: 192, h: 102 });

const provincias = geo.features
  .filter((f) => !FUERA_PROV.has(f.properties.cod))
  .map((f) => ({
    cod: f.properties.cod,
    nombre: f.properties.nombre,
    d: aPath(f.geometry, CANARIAS.has(f.properties.cod) ? pCan : pPen),
    canaria: CANARIAS.has(f.properties.cod),
  }))
  .filter((f) => f.d);

/* Comunidades autónomas: es el nivel administrativo al que se planifican las
   emergencias en España, así que se dibuja encima de las provincias. */
const CANARIAS_CCAA = new Set(['05']);
const ccaa = geoCcaa.features
  .filter((f) => !FUERA_CCAA.has(f.properties.cod))
  .map((f) => ({
    cod: f.properties.cod,
    nombre: f.properties.nombre,
    d: aPath(f.geometry, CANARIAS_CCAA.has(f.properties.cod) ? pCan : pPen),
  }))
  .filter((f) => f.d);

const nProv = provincias.filter((f) => +f.cod <= 50).length;
const nCiudades = provincias.filter((f) => +f.cod === 51 || +f.cod === 52).length;

/* ---------- Riesgos que se muestran ------------------------------------- */
/* Se eligen por nivel de exposición en el ámbito ESPAÑA, que es el ámbito del
   póster. El orden es el de la propia app. */
const DESTACADOS = ['incendio-forestal', 'ola-calor', 'sequia', 'inundacion', 'apagon', 'ciber'];
const TEND = { up: '▲', flat: '▬', down: '▼' };
const TEND_T = { up: 'al alza', flat: 'estable', down: 'a la baja' };

const fichas = DESTACADOS.map((id) => {
  const r = RIESGOS.find((x) => x.id === id);
  const z = r.z.espana;
  return {
    t: r.t, ic: r.ic,
    nivel: NIVELES[z.nivel].t, color: NIVELES[z.nivel].c, v: NIVELES[z.nivel].v,
    tend: TEND[z.tend], tendT: TEND_T[z.tend],
    ev: EVIDENCIA[z.ev].t, conf: conf(z.conf),
  };
});

const conflicto = RIESGOS.find((x) => x.id === 'conflicto').z.espana;

/* ---------- Fuentes ----------------------------------------------------- */
const IDS_FUENTE = ['aemet-cc', 'infocal', 'pc-es', 'ign', 'ue-eea'];
const fuentes = IDS_FUENTE.map((id) => SOURCES.find((s) => s.id === id)).filter(Boolean);

/* ---------- Salida ------------------------------------------------------ */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const paths = provincias
  .filter((f) => f.cod !== '05')
  .map((f) => `<path class="pr${f.canaria ? ' can' : ''}" d="${f.d}"/>`)
  .join('\n      ');

const escala = (() => {
  // Barra de escala honesta: se mide sobre la propia proyección.
  const a = pPen([-4, 40.5]);
  const b = pPen([-4 + 1 / (111.32 * Math.cos((40.5 * Math.PI) / 180)) * 200, 40.5]);
  return { px: +(b[0] - a[0]).toFixed(1), km: 200 };
})();

const datos = { provincias: provincias.length, nProv, nCiudades, ccaa: ccaa.length,
  fichas, conflicto, fuentes, escala,
  actualizado: RIESGOS_ACTUALIZADO, revision: RIESGOS_PROXIMA_REVISION };


/* ---------- CSS del póster y de la página de prueba --------------------- */
const CSS = String.raw`
/* Paleta Military Camo, la misma que usa la app. Neutros con sesgo oliva:
   un gris puro aquí cantaría muchísimo. */
:root{
  --bg:#12100E; --hoja:#171513; --panel:#211E1B; --panel2:#332F2E;
  --line:#45422F; --line2:#56594E; --txt:#E6DCCB; --txt2:#BAA37A;
  --txt3:#8B8570; --olive:#565E35; --olive2:#6C6644; --olive3:#A1A265;
  --sand:#BAA37A; --red:#9E4B31; --amber:#B07A45;
  --pw:1080px; --ph:1920px;
}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--txt);
  font-family:"IBM Plex Sans",system-ui,-apple-system,Segoe UI,sans-serif}

/* ===== Página de prueba ================================================= */
.pagina{max-width:1180px;margin:0 auto;padding:40px 24px 72px;
  display:flex;flex-direction:column;gap:36px}
.cab{display:flex;flex-direction:column;gap:10px;max-width:66ch}
.cab-e{margin:0;font-family:"IBM Plex Mono",monospace;font-size:11px;
  letter-spacing:.22em;text-transform:uppercase;color:var(--olive3)}
.cab-t{margin:0;font-family:"Barlow Condensed",Impact,sans-serif;font-weight:700;
  font-size:clamp(38px,6vw,60px);line-height:.95;letter-spacing:.01em;
  text-transform:uppercase;text-wrap:balance}
.cab-d{margin:0;font-size:15px;line-height:1.6;color:var(--txt2)}
.cab-c{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:6px}
.btn{font:600 13px/1 "IBM Plex Sans",sans-serif;color:var(--txt);
  background:var(--panel2);border:1px solid var(--line);border-radius:2px;
  padding:11px 16px;cursor:pointer;letter-spacing:.02em}
.btn:hover{background:var(--olive);border-color:var(--olive3)}
.btn:focus-visible{outline:2px solid var(--olive3);outline-offset:2px}
.cab-m{font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--txt3)}

.marco{overflow:auto;border:1px solid var(--line);background:#0b0a09;
  padding:20px;display:flex;justify-content:center;border-radius:2px}
.marco .poster{transform:scale(.52);transform-origin:top center;
  margin-bottom:calc(var(--ph) * -0.48)}
.marco.real{justify-content:flex-start}
.marco.real .poster{transform:none;margin-bottom:0}

.proc h2{margin:0 0 18px;font-family:"Barlow Condensed",sans-serif;font-weight:600;
  font-size:24px;letter-spacing:.06em;text-transform:uppercase;color:var(--olive3)}
.proc dl{margin:0;display:grid;gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:2px}
.proc dl>div{background:var(--panel);padding:16px 18px;
  display:grid;grid-template-columns:200px 1fr;gap:18px}
.proc dt{font-family:"IBM Plex Mono",monospace;font-size:12px;line-height:1.5;
  letter-spacing:.04em;text-transform:uppercase;color:var(--sand)}
.proc dd{margin:0;font-size:14px;line-height:1.65;color:var(--txt2)}
.proc code{font-family:"IBM Plex Mono",monospace;font-size:.9em;color:var(--olive3)}
.proc-n{margin:16px 0 0;font-size:13px;color:var(--txt3)}
@media (max-width:720px){.proc dl>div{grid-template-columns:1fr;gap:6px}}

/* ===== Póster =========================================================== */
.poster{width:var(--pw);height:var(--ph);flex:0 0 auto;background:var(--hoja);
  color:var(--txt);position:relative;overflow:hidden;
  /* Textura de papel de mapa: dos tramas muy tenues, nada de imágenes. */
  background-image:
    repeating-linear-gradient(0deg,rgba(230,220,203,.022) 0 1px,transparent 1px 4px),
    repeating-linear-gradient(90deg,rgba(230,220,203,.022) 0 1px,transparent 1px 4px);
}
.neatline{position:absolute;inset:20px;border:3px solid var(--line);
  outline:1px solid var(--olive2);outline-offset:5px;
  padding:20px 30px 18px;display:flex;flex-direction:column;gap:11px}

.sheet{display:flex;justify-content:space-between;align-items:baseline;
  font-family:"IBM Plex Mono",monospace;font-size:15px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--olive3);
  border-bottom:1px solid var(--line);padding-bottom:10px}
.sheet-r{color:var(--txt3)}

.hero{display:flex;flex-direction:column;gap:8px}
.eyebrow{margin:0;font-family:"IBM Plex Mono",monospace;font-size:16px;
  letter-spacing:.2em;text-transform:uppercase;color:var(--sand)}
.hero h1{margin:0;font-family:"Barlow Condensed",Impact,sans-serif;font-weight:700;
  font-size:100px;line-height:.86;letter-spacing:.005em;text-transform:uppercase;
  color:var(--txt)}
.years{margin:4px 0 0;display:flex;align-items:center;gap:16px;
  font-family:"Barlow Condensed",sans-serif;font-weight:600;font-size:38px;
  letter-spacing:.1em;color:var(--olive3)}
.years i{flex:1;height:3px;background:linear-gradient(90deg,var(--olive3),var(--olive2));display:block}
.claim{margin:8px 0 0;font-size:21px;line-height:1.42;color:var(--txt2)}
.claim b{color:var(--txt);font-weight:600}

.mapa{margin:0;display:flex;flex-direction:column;gap:8px}
.mapa svg{width:100%;height:566px;display:block;
  background:linear-gradient(180deg,#14120F,#100E0C);
  border:1px solid var(--line)}
.tierra .pr{fill:#2E2B23;stroke:#585340;stroke-width:.9;
  stroke-linejoin:round;vector-effect:non-scaling-stroke}
/* Las islas son polígonos muy pequeños: con el relleno de la península
   desaparecen a tamaño Instagram. Se les sube el contraste a propósito. */
.tierra .pr.can{fill:#3B372C;stroke:#736C52;stroke-width:1.4}
/* La capa autonómica va encima y con más peso que la provincial: es el nivel
   al que se planifican las emergencias, así que es la división que importa. */
.ccaa path{fill:none;stroke:var(--olive3);stroke-width:1.8;stroke-linejoin:round;
  vector-effect:non-scaling-stroke;opacity:.9}
.tick{stroke:var(--olive2);stroke-width:1.4}
.inset{fill:none;stroke:var(--line);stroke-width:1.2;stroke-dasharray:5 4}
.inset-t{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.16em;
  fill:var(--txt3)}
.marca .halo{fill:rgba(161,162,101,.10);stroke:var(--olive3);stroke-width:1;
  stroke-dasharray:3 5}
.marca .pt{fill:var(--amber)}
.marca line{stroke:var(--amber);stroke-width:2.2;stroke-linecap:round}
.etq{font-family:"Barlow Condensed",sans-serif;font-weight:600;font-size:34px;
  letter-spacing:.09em;fill:var(--txt)}
.etq2{font-family:"IBM Plex Mono",monospace;font-weight:400;font-size:14px;
  letter-spacing:.05em;fill:var(--txt3)}
.norte path{fill:var(--olive3)}
.norte text{font-family:"Barlow Condensed",sans-serif;font-weight:600;font-size:24px;
  fill:var(--olive3);text-anchor:middle}
.escala line{stroke:var(--txt2);stroke-width:1.8}
.escala text{font-family:"IBM Plex Mono",monospace;font-size:14px;fill:var(--txt2);
  text-anchor:middle;letter-spacing:.08em}
.mapa figcaption{margin:0;font-size:15px;line-height:1.42;color:var(--txt3);
  border-left:3px solid var(--olive2);padding-left:14px}
.mapa figcaption b{color:var(--sand);font-weight:600}

.tabla h2{margin:0 0 8px;font-family:"Barlow Condensed",sans-serif;font-weight:600;
  font-size:27px;letter-spacing:.12em;text-transform:uppercase;color:var(--olive3)}
.rows{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:1px;
  background:var(--line);border-block:1px solid var(--line)}
.rw{background:var(--panel);display:grid;
  grid-template-columns:44px 1fr 168px 34px 210px 96px;align-items:center;
  gap:12px;padding:8px 14px}
.rw-ic{font-size:24px;line-height:1;text-align:center}
.rw-t{font-family:"Barlow Condensed",sans-serif;font-weight:600;font-size:28px;
  letter-spacing:.02em;color:var(--txt);line-height:1.05}
.rw-n{font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:15px;
  letter-spacing:.1em;text-align:center;color:var(--c);
  border:1.5px solid var(--c);border-radius:2px;padding:5px 4px;
  background:color-mix(in srgb,var(--c) 14%,transparent)}
.rw-tr{font-size:17px;text-align:center;color:var(--sand)}
.rw-ev{font-family:"IBM Plex Sans",sans-serif;font-size:15px;color:var(--txt3);
  line-height:1.25}
.rw-cf{font-size:15px;letter-spacing:.05em;color:var(--olive3);text-align:right}
.leyenda{margin:7px 0 0;font-family:"IBM Plex Mono",monospace;font-size:13px;
  letter-spacing:.06em;color:var(--txt3)}

.nd{border:2px dashed var(--red);border-radius:2px;padding:11px 16px;
  background:rgba(158,75,49,.09);display:flex;flex-direction:column;gap:3px}
.nd-k{margin:0;font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:16px;
  letter-spacing:.2em;color:var(--red)}
.nd-v{margin:0;font-family:"Barlow Condensed",sans-serif;font-weight:600;font-size:30px;
  letter-spacing:.02em;color:var(--txt)}
.nd-d{margin:2px 0 0;font-size:16px;line-height:1.4;color:var(--txt2)}

.fuentes{border-top:1px solid var(--line);padding-top:10px}
.fuentes h3{margin:0 0 8px;font-family:"IBM Plex Mono",monospace;font-weight:600;
  font-size:14px;letter-spacing:.22em;text-transform:uppercase;color:var(--sand)}
.fuentes ul{margin:0;padding:0;list-style:none;
  display:grid;grid-template-columns:1fr 1fr;gap:5px 26px}
.fuentes li{display:flex;flex-direction:column;line-height:1.28;min-width:0}
.fuentes b{font-weight:600;font-size:15px;color:var(--txt2)}
.fuentes span{font-family:"IBM Plex Mono",monospace;font-size:13px;color:var(--txt3);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.pie{margin-top:auto;display:flex;justify-content:space-between;align-items:baseline;
  font-family:"IBM Plex Mono",monospace;font-size:14px;letter-spacing:.1em;
  text-transform:uppercase;border-top:1px solid var(--line);padding-top:11px}
.pie-a{color:var(--olive3)}
.pie-b{color:var(--txt3)}

@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

/* ---------- HTML --------------------------------------------------------- */
const filas = fichas.map((f) => `
        <li class="rw">
          <span class="rw-ic" aria-hidden="true">${f.ic}</span>
          <span class="rw-t">${esc(f.t)}</span>
          <span class="rw-n" style="--c:${f.color}">${esc(f.nivel)}</span>
          <span class="rw-tr" title="Tendencia ${esc(f.tendT)}">${f.tend}</span>
          <span class="rw-ev">${esc(f.ev)}</span>
          <span class="rw-cf">${esc(f.conf)}</span>
        </li>`).join('');

const listaFuentes = fuentes.map((s) => `
          <li><b>${esc(s.org)}</b><span>${esc(s.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</span></li>`).join('');

const marcasEje = (() => {
  let t = '';
  for (let x = 60; x < 940; x += 60) t += `<line class="tick" x1="${x}" y1="0" x2="${x}" y2="9"/><line class="tick" x1="${x}" y1="611" x2="${x}" y2="620"/>`;
  for (let y = 60; y < 620; y += 60) t += `<line class="tick" x1="0" y1="${y}" x2="9" y2="${y}"/><line class="tick" x1="931" y1="${y}" x2="940" y2="${y}"/>`;
  return t;
})();

const POSTER = `
  <article class="poster" id="poster" aria-label="Póster: riesgos en España 2026 a 2036">
    <div class="neatline">

      <header class="sheet">
        <span class="sheet-l">SURVIVAL OFFLINE · MANUAL DE CAMPO</span>
        <span class="sheet-r">HOJA ES-00 · NACIONAL · REV ${esc(RIESGOS_ACTUALIZADO)}</span>
      </header>

      <div class="hero">
        <p class="eyebrow">Evaluación de riesgos · horizonte de diez años</p>
        <h1>RIESGOS<br>EN ESPAÑA</h1>
        <p class="years"><span>2026</span><i></i><span>2036</span></p>
        <p class="claim">Niveles cualitativos de exposición tomados de organismos oficiales.<br><b>Ninguna cifra de este póster está inventada.</b></p>
      </div>

      <figure class="mapa">
        <svg viewBox="0 0 940 620" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa de las provincias de España con Ávila resaltada">
          <g class="ejes">${marcasEje}</g>
          <g class="tierra">
            ${paths}
          </g>
          <g class="ccaa">${ccaa.map((c) => `<path d="${c.d}"/>`).join('')}</g>
          <rect class="inset" x="8" y="500" width="196" height="106" rx="2"/>
          <text class="inset-t" x="14" y="516">CANARIAS</text>
          <g class="norte" transform="translate(886 96)">
            <path d="M0 -34 L11 12 L0 3 L-11 12 Z"/>
            <text y="34">N</text>
          </g>
          <g class="escala" transform="translate(700 588)">
            <line x1="0" y1="0" x2="${escala.px}" y2="0"/>
            <line x1="0" y1="-6" x2="0" y2="6"/>
            <line x1="${escala.px}" y1="-6" x2="${escala.px}" y2="6"/>
            <text x="${escala.px / 2}" y="-14">${escala.km} km</text>
          </g>
        </svg>
        <figcaption>
          <b>El mapa no colorea el riesgo.</b> No existe evaluación oficial homogénea provincia a provincia,
          así que pintar cincuenta colores sería inventarse el dato. Lo que sí dibuja es una división real:
          ${nProv} provincias y ${nCiudades} ciudades autónomas agrupadas en las ${ccaa.length} administraciones
          que planifican las emergencias en España. Geometría: IGN.
        </figcaption>
      </figure>

      <section class="tabla">
        <h2>Ámbito estatal · nivel de exposición</h2>
        <ol class="rows">${filas}</ol>
        <p class="leyenda">Columnas: riesgo · nivel · tendencia · tipo de evidencia · confianza (★ de 5)</p>
      </section>

      <section class="nd">
        <p class="nd-k">DATOS NO DISPONIBLES</p>
        <p class="nd-v">Conflicto armado de gran escala</p>
        <p class="nd-d">Incertidumbre alta: no existe base científica para cuantificarlo. La app describe
          escenarios y medidas, nunca porcentajes. Preferimos decir que no lo sabemos.</p>
      </section>

      <section class="fuentes">
        <h3>Fuentes</h3>
        <ul>${listaFuentes}</ul>
      </section>

      <footer class="pie">
        <span class="pie-a">Aplicación 100 % offline · los datos no salen del dispositivo</span>
        <span class="pie-b">Próxima revisión ${esc(RIESGOS_PROXIMA_REVISION)}</span>
      </footer>

    </div>
  </article>`;

const HTML = `<title>Riesgos en España</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
${CSS}
</style>
<main class="pagina">
  <header class="cab">
    <p class="cab-e">Prueba de diseño</p>
    <h1 class="cab-t">Hoja nacional</h1>
    <p class="cab-d">Póster vertical 1080 × 1920 para Instagram, montado con la geometría real del IGN
      —${nProv} provincias, ${nCiudades} ciudades autónomas y las ${ccaa.length} administraciones que planifican
      emergencias— y los niveles de riesgo que ya viven en la app. Cada dato se puede rastrear hasta su fuente.</p>
    <div class="cab-c">
      <button type="button" id="zoom" class="btn" aria-pressed="false">Ver a tamaño real (1080 px)</button>
      <span class="cab-m">1080 × 1920 · 9:16</span>
    </div>
  </header>

  <div class="marco" id="marco">
${POSTER}
  </div>

  <section class="proc">
    <h2>De dónde sale cada cosa</h2>
    <dl>
      <div><dt>Contorno de España</dt><dd><code>data/geo/es-provincias.geojson</code> y
        <code>es-ccaa.geojson</code> — TopoJSON derivado del Equipamiento Geográfico de Referencia Nacional
        del IGN. Proyección equirectangular corregida por el coseno de la latitud media. Canarias va en
        recuadro, como es convención cartográfica.</dd></div>
      <div><dt>Gibraltar</dt><dd>El conjunto de datos de origen lo incluye como polígono aparte. Se excluye:
        no es territorio español y pintarlo como una provincia más sería un error de hecho.</dd></div>
      <div><dt>Barra de escala</dt><dd>Medida sobre la proyección real: ${escala.px} px equivalen a
        ${escala.km} km en el paralelo 40,5° N.</dd></div>
      <div><dt>Niveles y tendencias</dt><dd><code>data/content/riesgos.js</code>, ámbito <code>espana</code>.
        Escala cualitativa de exposición y consecuencia, no probabilidad. Se arrastra también el tipo de
        evidencia y la confianza, para que se vea qué respalda cada valoración.</dd></div>
      <div><dt>Fuentes del pie</dt><dd><code>data/content/sources.js</code>, con la URL tal cual está
        registrada en la app.</dd></div>
      <div><dt>Lo que deliberadamente no aparece</dt><dd>Provincias coloreadas por riesgo, porcentajes,
        rankings de «zonas seguras» y cualquier etiqueta que la app no pueda sostener con una fuente
        oficial. La ficha de <i>DATOS NO DISPONIBLES</i> está a propósito: es la parte que distingue esto
        de un póster de miedo.</dd></div>
    </dl>
    <p class="proc-n">Regenerable con <code>node tools/build-poster.mjs</code>: cambian los datos de la app y
      el póster se rehace solo.</p>
  </section>
</main>
<script>
  var b = document.getElementById('zoom'), m = document.getElementById('marco');
  b.addEventListener('click', function () {
    var on = m.classList.toggle('real');
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Ajustar a la pantalla' : 'Ver a tamaño real (1080 px)';
  });
</script>
`;

fs.writeFileSync(path.join(RAIZ, 'poster-es05.html'), HTML);
fs.writeFileSync(path.join(DIR, '.poster-datos.json'), JSON.stringify(datos));
console.log(`Geometría: ${nProv} provincias + ${nCiudades} ciudades autónomas · ${ccaa.length} CCAA/ciudades · escala ${escala.px}px = ${escala.km} km`);
console.log(`Fichas: ${fichas.map((f) => f.t + ' ' + f.nivel).join(' | ')}`);
console.log(`Fuentes: ${fuentes.length}`);
