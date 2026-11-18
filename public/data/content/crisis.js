/* =========================================================================
   MODO CRISIS GUIADO — datos
   ---------------------------------------------------------------------------
   Si está pasando algo, la app lleva paso a paso: casillas que se marcan,
   temporizadores («revisa la nevera en 4 h») y el diario apuntándose solo.
   Los pasos resumen los protocolos de Emergencia (data/content/emergencias.js),
   que siguen siendo la referencia completa. Se añaden pasos según tu plan:
   bebé, medicación, medicación con frío, aparato eléctrico, mayores,
   movilidad reducida, mascotas, piso alto o bajo y coche.

   Paso: { id, t, timer?: { min, aviso } }
     timer → al marcarlo arranca un temporizador; al cumplirse, avisa.
   Extra: { si: condición del plan, fase, pasos: [...] }
   ========================================================================= */

export const CRISIS = [
  {
    id: 'apagon', t: 'Apagón', ic: '🔌', emg: 'apagon',
    fases: [
      { t: 'Ahora', pasos: [
        { id: 'luz', t: 'Linterna o frontal encendida (no velas)' },
        { id: 'cuadro', t: 'Mira el cuadro eléctrico: ¿es solo tu casa o todo el barrio?' },
        { id: 'radio', t: 'Radio a pilas encendida para oír a las autoridades' },
        { id: 'movil', t: 'Móvil en ahorro de batería y brillo mínimo' },
        { id: 'nevera', t: 'Nevera y congelador cerrados', timer: { min: 240, aviso: 'Revisa la nevera: ¿sigue fría? Si no, consume primero lo perecedero.' } },
        { id: 'desenchufa', t: 'Desenchufa los aparatos sensibles (picos al volver la luz)' },
      ] },
      { t: 'Primeras horas', pasos: [
        { id: 'agua', t: 'Llena garrafas o la bañera: el bombeo puede fallar' },
        { id: 'vecinos', t: 'Pregunta a los vecinos mayores o que viven solos' },
        { id: 'ascensor', t: 'Comprueba que no haya nadie atrapado en el ascensor' },
        { id: 'familia', t: 'Avisa a la familia: «Estamos bien»' },
        { id: 'bateria', t: 'Revisa la batería del móvil', timer: { min: 120, aviso: 'Revisa la batería: si baja del 30 %, apaga los datos y usa la batería externa.' } },
      ] },
      { t: 'Si dura más', pasos: [
        { id: 'perecedero', t: 'Cocina primero lo perecedero; hornillo solo con ventilación' },
        { id: 'efectivo', t: 'Ten a mano efectivo: no hay datáfonos ni cajeros' },
        { id: 'abrigo', t: 'Si hace frío: todos en una habitación, ropa por capas y mantas' },
      ] },
    ],
  },
  {
    id: 'inundacion', t: 'Inundación o DANA', ic: '🌊', emg: 'inundacion',
    fases: [
      { t: 'Ahora', pasos: [
        { id: 'subir', t: 'Subid a la planta más alta. Nunca al sótano ni al garaje' },
        { id: 'coche', t: 'No cojas el coche ni cruces agua en movimiento' },
        { id: 'luz', t: 'Corta la luz solo si puedes hacerlo sin pisar agua' },
        { id: 'esalert', t: 'Atiende a ES-Alert y a la radio' },
      ] },
      { t: 'Primeras horas', pasos: [
        { id: 'agua', t: 'Guarda agua potable antes de que la red se contamine' },
        { id: 'docs', t: 'Sube a lo alto los documentos, la medicación y el abrigo' },
        { id: 'senal', t: 'Si estáis aislados, señalizad la ventana (luz por la noche)' },
        { id: 'nivel', t: 'Vigila el nivel del agua', timer: { min: 30, aviso: 'Vigila el nivel del agua y escucha la radio. Si sube, más arriba.' } },
      ] },
      { t: 'Después', pasos: [
        { id: 'grifo', t: 'No bebas del grifo hasta que lo autoricen' },
        { id: 'fotos', t: 'Fotografía los daños para el seguro' },
      ] },
    ],
  },
  {
    id: 'ola-calor', t: 'Ola de calor', ic: '🌡', emg: 'ola-calor',
    fases: [
      { t: 'Hoy', pasos: [
        { id: 'persianas', t: 'Persianas bajadas y ventanas cerradas mientras fuera haga más calor' },
        { id: 'beber', t: 'Bebe agua aunque no tengas sed', timer: { min: 60, aviso: 'Hora de beber agua. Ofrece también a mayores y niños.' } },
        { id: 'fresca', t: 'Elige la habitación más fresca de la casa' },
        { id: 'horas', t: 'Nada de salir ni esforzarse de 12:00 a 18:00' },
        { id: 'coche', t: 'Nadie (ni animales) dentro de un coche aparcado' },
      ] },
      { t: 'Vigila', pasos: [
        { id: 'golpe', t: 'Conoce el golpe de calor: piel muy caliente, confusión → 112' },
        { id: 'noche', t: 'Ventila de noche y a primera hora', timer: { min: 480, aviso: 'Si ya refresca fuera, abre ventanas para ventilar la casa.' } },
      ] },
    ],
  },
  {
    id: 'evacuacion', t: 'Evacuación', ic: '🚶', emg: 'evacuacion',
    fases: [
      { t: 'Antes de salir', pasos: [
        { id: 'oficial', t: 'Confirma que la orden es oficial (ES-Alert, agentes, radio)' },
        { id: 'mochila', t: 'Coge la mochila: documentos, medicación, agua, cargador, llaves' },
        { id: 'ropa', t: 'Calzado cerrado y manga larga' },
        { id: 'cortar', t: 'Corta luz, gas y agua si te lo indican' },
        { id: 'nota', t: 'Deja una nota con la hora, el destino y un teléfono' },
      ] },
      { t: 'En camino', pasos: [
        { id: 'ruta', t: 'Sigue la ruta indicada, sin atajos' },
        { id: 'externo', t: 'Avisa a tu contacto de fuera de la zona' },
        { id: 'llegada', t: 'Al llegar, regístrate en el punto de acogida' },
      ] },
    ],
  },
  {
    id: 'nevada', t: 'Nevada u ola de frío', ic: '❄️', emg: 'nevada',
    fases: [
      { t: 'Ahora', pasos: [
        { id: 'quedate', t: 'No cojas el coche salvo necesidad real' },
        { id: 'habitacion', t: 'Concentraos en una habitación y cerrad las demás' },
        { id: 'capas', t: 'Ropa por capas, gorro y mantas' },
        { id: 'agua', t: 'Reserva agua por si se congelan las tuberías' },
      ] },
      { t: 'Calefacción segura', pasos: [
        { id: 'brasero', t: 'Nunca brasero, barbacoa ni generador dentro de casa' },
        { id: 'ventilar', t: 'Si usas estufa de gas o leña, ventila', timer: { min: 60, aviso: 'Ventila unos minutos: el monóxido de carbono no huele. Dolor de cabeza o mareo → aire libre y 112.' } },
      ] },
    ],
  },
  {
    id: 'incendio-forestal', t: 'Incendio forestal cerca', ic: '🔥', emg: 'incendio-forestal',
    fases: [
      { t: 'Ahora', pasos: [
        { id: '112', t: 'Si lo ves y nadie ha avisado: 112 con tu ubicación exacta' },
        { id: 'esalert', t: 'Atiende a ES-Alert, la radio y las órdenes de evacuación' },
        { id: 'cerrar', t: 'Puertas, ventanas y persianas cerradas; rendijas con paños húmedos' },
        { id: 'agua', t: 'Llena la bañera y cubos de agua' },
        { id: 'mochila', t: 'Mochila y coche listos, mirando hacia la salida' },
      ] },
      { t: 'Si os quedáis en casa', pasos: [
        { id: 'humo', t: 'Vigila el humo y la dirección del viento', timer: { min: 15, aviso: 'Revisa el humo y el viento. Ante la orden de salir, sal sin demora.' } },
        { id: 'exterior', t: 'Retira toldos y muebles de exterior que ardan' },
      ] },
    ],
  },
];

/** Pasos que se añaden según tu plan. `si` recibe el perfil normalizado. */
export const EXTRAS = [
  { id: 'bebe', si: (p) => p.bebes > 0, pasos: [
    { id: 'bebe-agua', t: 'Agua embotellada para los biberones (no del grifo si hay dudas)' },
    { id: 'bebe-kit', t: 'Pañales, toallitas y leche localizados y a mano' },
    { id: 'bebe-temp', t: 'Comprueba que el bebé no tenga ni frío ni calor', timer: { min: 120, aviso: 'Revisa al bebé: nuca templada, ni sudado ni frío.' } },
  ] },
  { id: 'medicacion', si: (p) => p.medicacion, pasos: [
    { id: 'med-junta', t: 'Toda la medicación junta, con la lista de dosis' },
    { id: 'med-toma', t: 'Apunta la próxima toma', timer: { min: 480, aviso: 'Recuerda la toma de medicación.' } },
  ] },
  { id: 'frio', si: (p) => p.frio, crisis: ['apagon', 'evacuacion', 'ola-calor', 'inundacion'], pasos: [
    { id: 'frio-nevera', t: 'Medicación que necesita frío en la nevera portátil con acumuladores' },
    { id: 'frio-revisa', t: 'Revisa los acumuladores', timer: { min: 360, aviso: 'Revisa la nevera portátil de la medicación: cambia los acumuladores si se han calentado.' } },
  ] },
  { id: 'electro', si: (p) => p.electro, crisis: ['apagon', 'nevada', 'inundacion', 'evacuacion'], pasos: [
    { id: 'electro-bat', t: 'Comprueba la batería del aparato (oxígeno, CPAP…) y cuánto dura' },
    { id: 'electro-112', t: 'Si no llega a la vuelta de la luz: 112 o vete al hospital antes de que se agote', timer: { min: 60, aviso: 'Revisa la batería del aparato médico. Si se va a agotar, llama al 112.' } },
  ] },
  { id: 'mayores', si: (p) => p.mayores > 0, pasos: [
    { id: 'mayores-ver', t: 'Revisa cómo están los mayores: agua, abrigo o fresco, medicación', timer: { min: 180, aviso: 'Pásate a ver a los mayores: ¿beben, están bien abrigados o frescos?' } },
  ] },
  { id: 'movilidad', si: (p) => p.movilidad || (p.mayores > 0 && p.vivienda === 'piso-alto'), crisis: ['apagon', 'evacuacion', 'incendio-forestal', 'inundacion'], pasos: [
    { id: 'mov-ayuda', t: 'Avisa a quien os ayuda a bajar: puede no haber ascensor' },
  ] },
  { id: 'mascotas', si: (p) => p.mascotas > 0, pasos: [
    { id: 'masc-agua', t: 'Agua y comida para la mascota' },
    { id: 'masc-trans', t: 'Transportín o correa a mano' },
  ] },
  { id: 'piso-alto', si: (p) => p.vivienda === 'piso-alto', crisis: ['apagon'], pasos: [
    { id: 'alto-agua', t: 'Llena agua YA: en pisos altos se corta antes' },
  ] },
  { id: 'piso-bajo', si: (p) => p.vivienda === 'piso-bajo', crisis: ['inundacion'], pasos: [
    { id: 'bajo-salir', t: 'Vivís a pie de calle: subid a casa de un vecino de arriba' },
  ] },
  { id: 'coche', si: (p) => p.coche, crisis: ['evacuacion', 'incendio-forestal'], pasos: [
    { id: 'coche-dep', t: 'Coche: depósito, llaves y aparcado mirando a la salida' },
  ] },
];

/** Opciones rápidas del diario durante una crisis. */
export const NOTAS_RAPIDAS = ['Aviso de las autoridades', 'Hemos hablado con la familia', 'Ha vuelto la luz', 'Sin agua', 'Salimos de casa', 'Todos bien'];
