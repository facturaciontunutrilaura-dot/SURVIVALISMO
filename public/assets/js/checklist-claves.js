/* =========================================================================
   checklist-claves.js — identificadores estables de los ítems de checklist
   ---------------------------------------------------------------------------
   Antes, cada marca se guardaba por POSICIÓN (`lista::grupo::índice`): si se
   editaba o reordenaba un checklist, las marcas pasaban en silencio a otro
   ítem («tengo X» cuando se marcó otra cosa). Ahora la clave sale del TEXTO
   del ítem (`lista::i:texto-normalizado`):
     · reordenar ítems o moverlos de grupo no mueve las marcas;
     · si se cambia el texto de un ítem, su marca deja de aplicarse (se pierde,
       pero nunca aparece en otro ítem).
   Las marcas antiguas se convierten al abrir el checklist (mapaMigracion).
   Módulo puro: sin DOM ni almacenamiento, para poder probarlo en Node.
   ========================================================================= */

export function slug(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

/** Claves de todos los ítems, agrupadas como en `c.grupos`. Si dos ítems de
 *  la misma lista tuvieran el mismo texto, el segundo lleva «~2». */
export function clavesChecklist(c) {
  const usados = new Map();
  return c.grupos.map((g) => g.items.map((it) => {
    const base = `${c.id}::i:${slug(it)}`;
    const n = (usados.get(base) || 0) + 1;
    usados.set(base, n);
    return n > 1 ? `${base}~${n}` : base;
  }));
}

/** Clave antigua (por posición) → clave nueva, con el contenido ACTUAL. */
export function mapaMigracion(c) {
  const nuevas = clavesChecklist(c);
  const m = new Map();
  c.grupos.forEach((g, gi) => g.items.forEach((_, i) => m.set(`${c.id}::${g.g}::${i}`, nuevas[gi][i])));
  return m;
}
