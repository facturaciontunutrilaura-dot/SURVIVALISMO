/* =========================================================================
   compra-pdf.js — la lista de compra de colapso en PDF
   ---------------------------------------------------------------------------
   Genera el PDF en el propio dispositivo, sin conexión y sin librerías: un
   documento A4 con la estética de la app (fondo verde de campaña, texto
   arena, acentos óxido) y casillas para marcar a mano.
   Usa las fuentes estándar de PDF (Helvetica), que cualquier lector tiene,
   con codificación WinAnsi (todas las letras del español), y sus métricas
   para partir las líneas.
   ========================================================================= */

const A4 = { w: 595.28, h: 841.89 };
const M = 36;                       // margen
const ANCHO = A4.w - 2 * M;

/* Colores de la app (los mismos tokens que app.css). */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const C = {
  bg: hex('#1B1F14'), bg2: hex('#232819'), panel: hex('#2F3724'), line: hex('#59583E'),
  txt: hex('#E6DCCB'), dim: hex('#C0A988'), olive: hex('#565E35'), olive3: hex('#A1A265'),
  sand: hex('#BAA37A'), red: hex('#C06044'), rojo: hex('#B3261E'),
};

/* Anchos de Helvetica y Helvetica-Bold (milésimas del cuerpo) para los
   códigos WinAnsi 32–255: son las métricas estándar de las fuentes del PDF.
   Medir con ellas (y no con las fuentes del móvil, que en Android no son
   Helvetica) deja las cantidades alineadas a la derecha y los saltos de
   línea exactos en cualquier dispositivo. */
const ANCHOS = {
  n: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,278,556,278,222,556,333,1000,556,556,333,1000,667,333,1000,278,611,278,278,222,222,333,333,350,556,1000,333,1000,500,333,944,278,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,552,400,549,333,333,333,576,537,333,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,549,611,556,556,556,556,500,556,500],
  b: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,278,556,278,278,556,500,1000,556,556,333,1000,667,333,1000,278,611,278,278,278,278,500,500,350,556,1000,333,1000,556,333,944,278,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,552,400,549,333,333,333,576,556,333,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,549,611,611,611,611,611,556,611,556],
};

/* ---------------------------- Texto WinAnsi ---------------------------- */
const W1252 = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e,
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
const SUSTITUTOS = { '≈': '~', '→': '->', '←': '<-', '✓': 'x', '✔': 'x', '−': '-', ' ': ' ', ' ': ' ' };

/** Texto apto para las fuentes estándar: lo que no existe en WinAnsi
 *  (emojis, símbolos raros) se sustituye o se quita. */
export function limpiar(s) {
  let out = '';
  for (const ch of String(s ?? '').normalize('NFC')) {
    const c = ch.codePointAt(0);
    if (SUSTITUTOS[ch]) out += SUSTITUTOS[ch];
    else if ((c >= 32 && c < 127) || (c >= 160 && c <= 255) || W1252[ch]) out += ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Cadena PDF literal: escapa ( ) \ y escribe los bytes > 126 en octal. */
function lit(s) {
  let out = '(';
  for (const ch of s) {
    const c = W1252[ch] ?? ch.codePointAt(0);
    if (ch === '(' || ch === ')' || ch === '\\') out += '\\' + ch;
    else if (c > 126 || c < 32) out += '\\' + c.toString(8).padStart(3, '0');
    else out += ch;
  }
  return out + ')';
}

/** Ancho en puntos de un texto (ya limpio) en Helvetica. */
export function medirHelvetica(t, negrita, tam) {
  const tab = negrita ? ANCHOS.b : ANCHOS.n;
  let w = 0;
  for (const ch of t) { const c = W1252[ch] ?? ch.codePointAt(0); w += (c >= 32 && c <= 255 ? tab[c - 32] : 556); }
  return (w * tam) / 1000;
}

/** Parte un texto en líneas que caben en `ancho` puntos. */
function partir(texto, ancho, medir, negrita, tam) {
  const palabras = limpiar(texto).split(' ');
  const lineas = [];
  let l = '';
  for (const p of palabras) {
    const prueba = l ? `${l} ${p}` : p;
    if (!l || medir(prueba, negrita, tam) <= ancho) l = prueba;
    else { lineas.push(l); l = p; }
  }
  if (l) lineas.push(l);
  return lineas.length ? lineas : [''];
}

/* ------------------------------ Documento ------------------------------ */
/**
 * @param r       resultado de calcularCompra()
 * @param op      { titulo, duracion, personas: [nombre], marcadas, fecha, version, medir? }
 * @returns Uint8Array con el PDF
 */
export function pdfCompra(r, op) {
  const medir = op.medir || medirHelvetica;
  const paginas = [];
  let ops, y;

  const f = (n) => (Math.round(n * 100) / 100).toString();
  const color = (c, trazo = false) => `${c.map(f).join(' ')} ${trazo ? 'RG' : 'rg'}`;
  const rect = (x, yy, w, h, c) => ops.push(`${color(c)} ${f(x)} ${f(yy)} ${f(w)} ${f(h)} re f`);
  const marco = (x, yy, w, h, c, g = 1) => ops.push(`${color(c, true)} ${g} w ${f(x)} ${f(yy)} ${f(w)} ${f(h)} re S`);
  const linea = (x1, y1, x2, y2, c, g = 1) => ops.push(`${color(c, true)} ${g} w ${f(x1)} ${f(y1)} m ${f(x2)} ${f(y2)} l S`);
  const texto = (s, x, yy, { tam = 10, negrita = false, c = C.txt, derecha = false, espaciado = 0 } = {}) => {
    const t = limpiar(s);
    const xx = derecha ? x - medir(t, negrita, tam) - espaciado * Math.max(0, t.length - 1) : x;
    ops.push(`BT /${negrita ? 'F2' : 'F1'} ${tam} Tf ${espaciado ? `${f(espaciado)} Tc ` : ''}${color(c)} ${f(xx)} ${f(yy)} Td ${lit(t)} Tj${espaciado ? ' 0 Tc' : ''} ET`);
  };

  function nueva() {
    ops = [];
    paginas.push(ops);
    rect(0, 0, A4.w, A4.h, C.bg);
    rect(0, A4.h - 6, A4.w, 6, C.red);            // franja óxido superior
    y = A4.h - M - 6;
  }
  /** Garantiza `alto` puntos libres; si no caben, salta de página. */
  const sitio = (alto) => { if (y - alto < M + 26) { nueva(); y -= 4; } };

  /* --- Cabecera --- */
  nueva();
  texto('SUPERVIVENCIA', M, y - 18, { tam: 22, negrita: true, espaciado: 2.2 });
  texto(op.titulo, M, y - 36, { tam: 11, negrita: true, c: C.red, espaciado: 1.4 });
  texto(`${op.duracion} · ${r.personas.length} ${r.personas.length === 1 ? 'persona' : 'personas'}`, A4.w - M, y - 18, { tam: 11, negrita: true, c: C.olive3, derecha: true });
  texto(`Generada el ${op.fecha}`, A4.w - M, y - 36, { tam: 9, c: C.dim, derecha: true });
  y -= 48;
  linea(M, y, A4.w - M, y, C.olive, 2);
  y -= 16;

  /* --- Resumen por persona --- */
  const filas = [
    ...r.personas.map((p, i) => [op.personas[i], `${miles(p.kcal)} kcal · ${p.prot} g proteína · ${String(p.agua).replace('.', ',')} l de agua al día`, false]),
    [`Hogar, ${op.duracion}`, `${miles(r.kcalDia * r.dias)} kcal · ${miles(r.protDia * r.dias)} g proteína · ${r.aguaL} l de agua`, true],
  ];
  const col = 150, altoFila = 20;
  sitio(filas.length * altoFila + 8);
  rect(M, y - filas.length * altoFila, ANCHO, filas.length * altoFila, C.panel);
  filas.forEach(([a, b, neg], i) => {
    const yy = y - (i + 1) * altoFila;
    if (i) linea(M, yy + altoFila, A4.w - M, yy + altoFila, C.line, 0.5);
    texto(a.toUpperCase(), M + 9, yy + 7, { tam: 8.5, c: C.dim, negrita: neg, espaciado: 0.6 });
    texto(b, M + col, yy + 7, { tam: 9.5, negrita: neg });
  });
  marco(M, y - filas.length * altoFila, ANCHO, filas.length * altoFila, C.line, 0.6);
  linea(M + col - 9, y, M + col - 9, y - filas.length * altoFila, C.line, 0.5);
  y -= filas.length * altoFila + 14;

  /* --- Avisos --- */
  for (const a of op.avisos) {
    const ls = partir(a, ANCHO - 26, medir, false, 9);
    const alto = ls.length * 12 + 10;
    sitio(alto + 6);
    rect(M, y - alto, ANCHO, alto, C.bg2);
    rect(M, y - alto, 3, alto, C.sand);
    texto('i', M + 11, y - 15, { tam: 9, negrita: true, c: C.sand });
    ls.forEach((l, i) => texto(l, M + 20, y - 15 - i * 12, { tam: 9, c: C.txt }));
    y -= alto + 6;
  }
  y -= 8;

  /* --- Lista por grupos --- */
  const anchoCant = 150;
  for (const g of op.grupos) {
    sitio(30 + 34);                                 // título + al menos un producto
    texto(g.t.toUpperCase(), M, y - 14, { tam: 11.5, negrita: true, c: C.olive3, espaciado: 1 });
    y -= 22;
    for (const it of g.items) {
      const tx = partir(it.t, ANCHO - 34 - anchoCant - 10, medir, false, 10);
      const nota = it.nota ? partir(it.nota, ANCHO - 34 - anchoCant - 10, medir, false, 8.5) : [];
      const cant = partir(it.c, anchoCant, medir, true, 10);
      const alto = Math.max(tx.length * 13 + nota.length * 11, cant.length * 13) + 14;
      sitio(alto + 5);
      const marcado = !!op.marcadas[it.id];
      rect(M, y - alto, ANCHO, alto, marcado ? C.bg2 : C.panel);
      marco(M, y - alto, ANCHO, alto, C.line, 0.6);
      // Casilla para marcar a mano (o ya marcada en la app).
      const cy = y - 12 - 11;
      if (marcado) {
        rect(M + 9, cy, 12, 12, C.olive3);
        ops.push(`${color(C.bg, true)} 1.8 w ${f(M + 11.5)} ${f(cy + 6)} m ${f(M + 14.5)} ${f(cy + 3)} l ${f(M + 19)} ${f(cy + 9.5)} l S`);
      } else marco(M + 9, cy, 12, 12, C.sand, 1.2);
      tx.forEach((l, i) => texto(l, M + 30, y - 19 - i * 13, { tam: 10, c: marcado ? C.dim : C.txt }));
      if (marcado) tx.forEach((l, i) => { const yy = y - 19 - i * 13 + 3.4; linea(M + 30, yy, M + 30 + medir(l, false, 10), yy, C.dim, 0.7); });
      nota.forEach((l, i) => texto(l, M + 30, y - 19 - tx.length * 13 - i * 11 + 1, { tam: 8.5, c: C.dim }));
      cant.forEach((l, i) => texto(l, A4.w - M - 9, y - 19 - i * 13, { tam: 10, negrita: true, derecha: true }));
      y -= alto + 5;
    }
    y -= 10;
  }
  sitio(30);
  partir(op.cierre, ANCHO, medir, false, 8.5).forEach((l) => { texto(l, M, y - 10, { tam: 8.5, c: C.dim }); y -= 11; });

  /* --- Pie en todas las páginas --- */
  paginas.forEach((p, i) => {
    ops = p;
    linea(M, M + 12, A4.w - M, M + 12, C.line, 0.5);
    texto(`SUPERVIVENCIA v${op.version} · ${op.titulo}`, M, M, { tam: 8, c: C.dim });
    texto(`Página ${i + 1} de ${paginas.length}`, A4.w - M, M, { tam: 8, c: C.dim, derecha: true });
  });

  return escribir(paginas.map((p) => p.join('\n')), op.titulo);
}

const miles = (x) => Math.round(x).toLocaleString('es-ES');

/** Ensambla el archivo PDF (objetos, tabla xref y trailer). */
function escribir(contenidos, titulo) {
  const objs = [];
  const add = (s) => { objs.push(s); return objs.length; };
  const cat = add(null), pags = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = contenidos.map((c) => {
    const st = add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
    return add(`<< /Type /Page /Parent ${pags} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${st} 0 R >>`);
  });
  objs[cat - 1] = `<< /Type /Catalog /Pages ${pags} 0 R >>`;
  objs[pags - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  const info = add(`<< /Title ${lit(limpiar(titulo))} /Producer (SUPERVIVENCIA) >>`);

  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Todo el contenido es de un byte por carácter (las letras > 126 van en
  // octal), así que la longitud en caracteres es la longitud en bytes.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
