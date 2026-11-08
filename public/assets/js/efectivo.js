/* =========================================================================
   efectivo.js — MI EFECTIVO
   Si cae el sistema bancario, el efectivo es lo único que funciona. Aquí se
   cuenta lo que hay (por billetes y monedas), en varios «bolsillos», y se
   apuntan gastos e ingresos en dos toques. Se guarda SOLO en este móvil y
   entra en las copias de seguridad (kv 'efectivo.datos').
   No es un banco: no mueve dinero ni se conecta a nada.
   ========================================================================= */
import { el, esc, toast } from './ui.js';
import * as store from './store.js';
import * as E from './efectivo-core.js';
import { A4, C, lit, limpiar, escribir } from './compra-pdf.js';

const CLAVE = 'efectivo.datos';
const cargar = async () => (await store.get('kv', CLAVE).catch(() => null))?.v || E.datosIniciales();
const guardar = (d) => store.put('kv', { id: CLAVE, v: d }).catch(() => {});
const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const OCULTO = '●●●● €';
const catDe = (id) => E.CATEGORIAS.find((c) => c.id === id) || E.CAT_INGRESO;
const fechaCorta = (ts) => new Date(ts).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export async function efectivoView() {
  let d = await cargar();
  let visible = !d.discreto;
  const n = el(`<div class="ef">
    <p class="muted">Si fallan los bancos y las tarjetas, el efectivo es lo único que funciona. Cuenta lo que tienes, apunta lo que gastas y sabrás siempre cuánto te queda. Se guarda solo en este móvil.</p>
    <section class="card ef-saldo" aria-labelledby="ef-t">
      <h3 id="ef-t">💶 Tienes en efectivo</h3>
      <button type="button" class="ef-grande" id="ef-total" aria-live="polite"></button>
      <p id="ef-dura"></p>
      <div id="ef-pres"></div>
    </section>

    <section class="card" aria-labelledby="ef-ap">
      <h3 id="ef-ap">✍️ Apuntar</h3>
      <div class="fieldrow">
        <div><label for="ef-imp">Importe (€)</label><input id="ef-imp" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00"></div>
        <div><label for="ef-bol">De qué bolsillo</label><select id="ef-bol"></select></div>
      </div>
      <label for="ef-nota">Nota (opcional)</label><input id="ef-nota" type="text" maxlength="80" placeholder="Ej.: pan y leche">
      <p class="muted ef-ayuda">Toca en qué lo has gastado y queda apuntado:</p>
      <div class="ef-cats">${E.CATEGORIAS.map((c) => `<button type="button" class="ef-cat" data-cat="${c.id}"><span aria-hidden="true">${c.ic}</span> ${esc(c.t)}</button>`).join('')}</div>
      <button type="button" class="btn ghost ef-ing" data-cat="ingreso">➕ Me ha entrado dinero</button>
      <p class="muted" id="ef-msg" role="status" aria-live="polite"></p>
    </section>

    <section class="card" aria-labelledby="ef-bt">
      <h3 id="ef-bt">👛 Bolsillos</h3>
      <p class="muted">Reparte el dinero en varios sitios. «Contar» pone el saldo exacto de ese bolsillo según los billetes y monedas que tengas.</p>
      <div id="ef-bols"></div>
      <div class="ef-nuevo"><label for="ef-nb">Nuevo bolsillo (por ejemplo, el nombre de una persona)</label>
        <div class="ef-fila"><input id="ef-nb" type="text" maxlength="30" placeholder="Ej.: Lo que lleva Marta"><button type="button" class="btn sm" id="ef-nb-ok">Añadir</button></div></div>
    </section>

    <section class="card" aria-labelledby="ef-mt">
      <h3 id="ef-mt">🧾 Movimientos</h3>
      <div id="ef-cats-res"></div>
      <ol class="ef-movs" id="ef-movs"></ol>
    </section>

    <section class="card" aria-labelledby="ef-at">
      <h3 id="ef-at">⚙️ Opciones</h3>
      <label for="ef-pd">Presupuesto diario (€) — déjalo vacío si no quieres límite</label>
      <div class="ef-fila"><input id="ef-pd" type="text" inputmode="decimal" placeholder="Ej.: 20"><button type="button" class="btn sm ghost" id="ef-pd-ok">Guardar</button></div>
      <label class="ef-check"><input type="checkbox" id="ef-disc"> Modo discreto: ocultar las cantidades hasta tocarlas</label>
      <button type="button" class="btn ghost" id="ef-pdf">📄 Descargar resumen en PDF</button>
    </section>

    <details class="card"><summary>💡 Consejos para el efectivo en una crisis</summary><div>
      <ul>
        <li>Ten <b>billetes pequeños y monedas</b> (5, 10 y 20 €): nadie tendrá cambio.</li>
        <li><b>Repártelo</b>: casa, cartera, mochila de emergencia y lo que lleve cada persona. Si pierdes uno, no lo pierdes todo.</li>
        <li><b>No enseñes</b> cuánto llevas. Saca solo lo que vas a pagar.</li>
        <li>Guárdalo seco (bolsa con cierre) y lejos de la vista.</li>
        <li>Las tarjetas y los pagos con el móvil dejan de funcionar sin luz ni internet; los cajeros también.</li>
      </ul>
    </div></details>
  </div>`);

  const $ = (s) => n.querySelector(s);
  const cant = (c) => (visible ? E.euros(c) : OCULTO);
  const msg = (t) => { $('#ef-msg').textContent = t; };
  const salvar = () => { guardar(d); pintar(); };

  function pintar() {
    const total = E.saldoTotal(d);
    const tot = $('#ef-total');
    tot.textContent = cant(total);
    tot.classList.toggle('neg', total < 0);
    tot.setAttribute('aria-label', visible ? `Saldo total: ${E.euros(total)}${d.discreto ? '. Toca para ocultar' : ''}` : 'Saldo oculto. Toca para verlo');

    const gd = E.gastoDiario(d.movs);
    const ritmo = gd || d.presupuesto;
    const dias = E.diasQueDura(total, ritmo);
    $('#ef-dura').innerHTML = total <= 0 ? (total < 0 ? '⚠ Has apuntado más gastos que dinero: vuelve a contar.' : 'Cuenta tu dinero en «Bolsillos» para empezar.')
      : dias == null ? '<span class="muted">Cuando apuntes gastos, verás para cuántos días te llega.</span>'
      : `Te dura unos <b>${dias} ${dias === 1 ? 'día' : 'días'}</b> <span class="muted">(${gd ? `gastas unos ${visible ? E.euros(gd) : '●●'} al día` : 'según tu presupuesto diario'})</span>`;

    const pres = $('#ef-pres');
    if (d.presupuesto) {
      const hoy = E.gastadoHoy(d.movs);
      const pct = Math.min(100, Math.round((hoy / d.presupuesto) * 100));
      const pasa = hoy > d.presupuesto;
      pres.innerHTML = `<p class="ef-pres-t">Hoy llevas <b>${cant(hoy)}</b> de ${cant(d.presupuesto)}${pasa ? ' · <span class="dp-aviso">te has pasado del presupuesto</span>' : ''}</p>
        <div class="ef-barra${pasa ? ' pasa' : ''}" role="progressbar" aria-label="Gastado hoy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>`;
    } else pres.innerHTML = '';

    const sel = $('#ef-bol'), elegido = sel.value;
    sel.innerHTML = d.bolsillos.map((b) => `<option value="${esc(b.id)}">${esc(b.t)}</option>`).join('');
    if (d.bolsillos.some((b) => b.id === elegido)) sel.value = elegido;

    $('#ef-bols').innerHTML = d.bolsillos.map((b) => `<details class="ef-bol" data-bol="${esc(b.id)}">
      <summary><span>${esc(b.t)}</span><b>${cant(E.saldoBolsillo(b, d.movs))}</b></summary>
      <div>
        <p class="muted">Contar: pon cuántos tienes de cada uno. ${b.baseTs ? `Último recuento: ${esc(fechaCorta(b.baseTs))}.` : 'Todavía sin contar.'}</p>
        <p class="ef-sub">Billetes</p>
        <div class="ef-den">${E.BILLETES.map((v) => fila(b, v)).join('')}</div>
        <p class="ef-sub">Monedas</p>
        <div class="ef-den">${E.MONEDAS.map((v) => fila(b, v)).join('')}</div>
        <p class="ef-suma">Suma del recuento: <b data-suma>${E.euros(E.totalConteo(b.conteo))}</b></p>
        <div class="ef-fila"><button type="button" class="btn sm" data-contar>✔ Guardar recuento</button>
        ${E.BOLSILLOS_INICIALES.some((x) => x.id === b.id) ? '' : '<button type="button" class="btn sm ghost" data-quitar>Quitar bolsillo</button>'}</div>
      </div></details>`).join('');

    const res = E.porCategoria(d.movs);
    $('#ef-cats-res').innerHTML = res.length ? `<div class="kv">${res.map(([c, v]) => `<div>${catDe(c).ic} ${esc(catDe(c).t)}</div><div>${cant(v)}</div>`).join('')}</div>` : '';
    const movs = d.movs.slice().sort((a, b) => b.ts - a.ts).slice(0, 50);
    $('#ef-movs').innerHTML = movs.length ? movs.map((m) => {
      const c = catDe(m.cat), bol = d.bolsillos.find((x) => x.id === m.bol);
      return `<li class="ef-mov ${m.tipo}"><span class="ef-mov-ic" aria-hidden="true">${c.ic}</span>
        <span class="ef-mov-t"><b>${esc(c.t)}</b>${m.nota ? ` · ${esc(m.nota)}` : ''}<small>${esc(fechaCorta(m.ts))}${bol ? ` · ${esc(bol.t)}` : ''}</small></span>
        <span class="ef-mov-imp">${m.tipo === 'gasto' ? '−' : '+'}${visible ? E.euros(m.imp) : '●●'}</span>
        <button type="button" class="btn sm ghost" data-borrar="${esc(m.id)}" aria-label="Borrar este movimiento">✕</button></li>`;
    }).join('') : '<li class="muted">Todavía no has apuntado nada.</li>';

    $('#ef-disc').checked = !!d.discreto;
    $('#ef-pd').value = d.presupuesto ? String(d.presupuesto / 100).replace('.', ',') : '';
  }

  function fila(b, v) {
    const nombre = v >= 100 ? `${v / 100} €` : `${v} cént.`;
    return `<label class="ef-den-f"><span>${nombre}</span><input type="number" inputmode="numeric" min="0" step="1" data-den="${v}" value="${b.conteo?.[v] || ''}" aria-label="Cantidad de ${v >= 500 ? 'billetes' : 'monedas'} de ${nombre}"></label>`;
  }

  function apuntar(cat) {
    const imp = E.aCentimos($('#ef-imp').value);
    if (!imp) { msg('Escribe primero el importe, por ejemplo 12,50.'); $('#ef-imp').focus(); return; }
    const tipo = cat === 'ingreso' ? 'ingreso' : 'gasto';
    const bol = $('#ef-bol').value || d.bolsillos[0]?.id;
    d.movs.push({ id: nuevoId(), ts: Date.now(), tipo, imp, cat, bol, nota: $('#ef-nota').value.trim().slice(0, 80) });
    $('#ef-imp').value = ''; $('#ef-nota').value = '';
    salvar();
    msg(`${tipo === 'gasto' ? 'Gasto' : 'Entrada'} de ${visible ? E.euros(imp) : 'dinero'} apuntado${tipo === 'gasto' ? ` en ${catDe(cat).t}` : 'a'}.`);
  }

  n.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'ef-total') {
      if (!d.discreto) return;
      visible = !visible; return pintar();
    }
    if (b.dataset.cat) return apuntar(b.dataset.cat);
    if (b.dataset.borrar) {
      if (!confirm('¿Borrar este movimiento?')) return;
      d.movs = d.movs.filter((m) => m.id !== b.dataset.borrar); return salvar();
    }
    const det = b.closest('[data-bol]');
    if (det && b.hasAttribute('data-contar')) {
      const bol = d.bolsillos.find((x) => x.id === det.dataset.bol);
      const conteo = {};
      for (const i of det.querySelectorAll('[data-den]')) { const k = Math.max(0, Math.floor(Number(i.value) || 0)); if (k) conteo[i.dataset.den] = k; }
      Object.assign(bol, { conteo, base: E.totalConteo(conteo), baseTs: Date.now() });
      salvar(); toast(`${bol.t}: ${visible ? E.euros(bol.base) : 'recuento guardado'}`);
      return;
    }
    if (det && b.hasAttribute('data-quitar')) {
      const bol = d.bolsillos.find((x) => x.id === det.dataset.bol);
      if (!confirm(`¿Quitar el bolsillo «${bol.t}»? Se borran también sus movimientos.`)) return;
      d.bolsillos = d.bolsillos.filter((x) => x !== bol); d.movs = d.movs.filter((m) => m.bol !== bol.id);
      return salvar();
    }
    if (b.id === 'ef-nb-ok') {
      const t = $('#ef-nb').value.trim().slice(0, 30);
      if (!t) { $('#ef-nb').focus(); return; }
      d.bolsillos.push({ id: `b${nuevoId()}`, t, base: 0, baseTs: 0, conteo: {} });
      $('#ef-nb').value = ''; salvar(); toast(`Bolsillo «${t}» añadido`);
      return;
    }
    if (b.id === 'ef-pd-ok') {
      const v = $('#ef-pd').value.trim();
      const c = v ? E.aCentimos(v) : null;
      if (v && !c) { toast('Importe no válido'); return; }
      d.presupuesto = c; salvar(); toast(c ? 'Presupuesto guardado' : 'Sin presupuesto diario');
      return;
    }
    if (b.id === 'ef-pdf') return descargar(d);
  });
  // La suma del recuento se ve mientras se escribe.
  n.addEventListener('input', (ev) => {
    const i = ev.target.closest('[data-den]');
    if (!i) return;
    const det = i.closest('[data-bol]'), conteo = {};
    for (const x of det.querySelectorAll('[data-den]')) conteo[x.dataset.den] = x.value;
    det.querySelector('[data-suma]').textContent = E.euros(E.totalConteo(conteo));
  });
  $('#ef-disc').addEventListener('change', (ev) => { d.discreto = ev.target.checked; visible = !d.discreto; salvar(); });
  $('#ef-imp').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); $('#ef-nota').focus(); } });

  pintar();
  return n;
}

/* ------------------------------- PDF ------------------------------- */
export function pdfEfectivo(d, ahora = Date.now()) {
  const ops = [];
  const fx = (v) => (Math.round(v * 100) / 100).toString();
  const col = (c) => `${c.map(fx).join(' ')} rg`;
  const texto = (s, x, y, tam = 10, neg = false, c = [0.1, 0.1, 0.1]) => ops.push(`BT /${neg ? 'F2' : 'F1'} ${tam} Tf ${col(c)} ${fx(x)} ${fx(y)} Td ${lit(limpiar(s))} Tj ET`);
  const paginas = [];
  let y = A4.h - 50;
  const salto = (h) => { y -= h; if (y < 50) { paginas.push(ops.splice(0).join('\n')); y = A4.h - 50; } };
  ops.push(`${col(C.olive)} 0 ${fx(A4.h - 30)} ${fx(A4.w)} 30 re f`);
  texto('MI EFECTIVO · Resumen', 36, A4.h - 20, 12, true, [1, 1, 1]);
  texto(`Generado el ${new Date(ahora).toLocaleString('es-ES')}`, 36, y, 9, false, [0.35, 0.35, 0.35]); salto(26);
  texto(`Saldo total: ${E.euros(E.saldoTotal(d))}`, 36, y, 16, true); salto(20);
  const gd = E.gastoDiario(d.movs, ahora);
  if (gd) { texto(`Gasto medio: ${E.euros(gd)} al día · te dura unos ${E.diasQueDura(E.saldoTotal(d), gd) ?? 0} días`, 36, y, 10); salto(16); }
  if (d.presupuesto) { texto(`Presupuesto diario: ${E.euros(d.presupuesto)}`, 36, y, 10); salto(16); }
  salto(8); texto('Bolsillos', 36, y, 12, true); salto(16);
  for (const b of d.bolsillos) { texto(b.t, 46, y, 10); texto(E.euros(E.saldoBolsillo(b, d.movs)), 400, y, 10, true); salto(14); }
  const cats = E.porCategoria(d.movs);
  if (cats.length) {
    salto(8); texto('Gastos por categoría', 36, y, 12, true); salto(16);
    for (const [c, v] of cats) { texto(catDe(c).t, 46, y, 10); texto(E.euros(v), 400, y, 10); salto(14); }
  }
  salto(8); texto('Movimientos', 36, y, 12, true); salto(16);
  const movs = d.movs.slice().sort((a, b) => b.ts - a.ts);
  if (!movs.length) { texto('Sin movimientos.', 46, y, 10); salto(14); }
  for (const m of movs) {
    const bol = d.bolsillos.find((x) => x.id === m.bol);
    texto(fechaCorta(m.ts), 46, y, 9, false, [0.35, 0.35, 0.35]);
    texto(`${catDe(m.cat).t}${m.nota ? ` · ${m.nota}` : ''}${bol ? ` (${bol.t})` : ''}`.slice(0, 70), 140, y, 9);
    texto(`${m.tipo === 'gasto' ? '-' : '+'}${E.euros(m.imp)}`, 470, y, 9, true);
    salto(13);
  }
  paginas.push(ops.join('\n'));
  return escribir(paginas.filter(Boolean), 'Mi efectivo');
}

function descargar(d) {
  const url = URL.createObjectURL(new Blob([pdfEfectivo(d)], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'mi-efectivo.pdf'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast('Resumen descargado');
}
