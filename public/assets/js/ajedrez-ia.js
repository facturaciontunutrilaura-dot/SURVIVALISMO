/* =========================================================================
   ajedrez-ia.js — Web Worker del rival de ajedrez
   Piensa en segundo plano para que la pantalla no se congele mientras la
   app busca su jugada. Recibe { id, fen, nivel, ms } y responde { id, m }.
   ========================================================================= */
import { desdeFEN, mejorJugada } from './ajedrez.js';

self.onmessage = ({ data }) => {
  const m = mejorJugada(desdeFEN(data.fen), { nivel: data.nivel, ms: data.ms });
  self.postMessage({ id: data.id, m });
};
