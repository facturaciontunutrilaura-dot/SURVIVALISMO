# PLAN DE EVACUACIÓN — DIAGNÓSTICO

Fecha: 25/10/2026 · Estado: **diagnóstico, sin implementar** (pendiente de aprobación)

Petición: un plan de evacuación para el domicilio de la propietaria en Ávila
capital, que distinga cada emergencia, catástrofe o colapso y cubra
horizontes de 72 horas a meses. Tiene que mostrar en el mapa del IGN el
trayecto hasta los puntos de refugio y evacuación, con los puntos bien
clasificados. Los escenarios prioritarios son el **colapso** y la **guerra**.

Datos de la propietaria:
- vivienda en el barrio de la Estación, CP 05001;
- medios para evacuar: **coche y a pie**;
- **sin destino fuera de la ciudad** por ahora;
- puntos de refugio: **los verificados, más candidatos marcados como «sin confirmar»**.

---

## 1. Qué hay y qué falta

| | Situación | Consecuencia |
|---|---|---|
| Plan municipal de emergencias de Ávila capital (lugares de albergue y evacuación designados) | **No está publicado**. La Diputación prepara los planes municipales de la provincia para 2027. El PLATEA provincial no lista albergues de la capital | Ningún punto puede presentarse como «refugio oficial designado». Se clasifican según su función y su fuente |
| Refugios antiaéreos públicos | **No existe en España una red pública** de refugios para la población | En guerra, el refugio inmediato es el sótano o garaje propio, o un aparcamiento subterráneo (candidato) |
| Mapa | IGN (ráster y vectorial) ya integrado en la app, con descarga offline | Se reutiliza |
| Coordenadas de los puntos | Las direcciones están verificadas (fuentes oficiales, apartado 4). **Las coordenadas no**: el entorno de desarrollo bloquea el acceso a los servicios de localización (CartoCiudad del IGN, OpenStreetMap) | **Bloqueante**. Sin coordenadas comprobadas no se pueden pintar los puntos sin inventarlos. Ver el apartado 6 |
| Trayectos | La app no tiene un motor de rutas offline | El cálculo de rutas por calle requiere un servicio en línea. Ver el apartado 5 |
| Política de datos del proyecto | `data/content/familia.js`: no se incluyen lugares con coordenadas no verificadas | Se respeta: cada punto lleva su fuente y su estado de verificación |
| Privacidad | La web es pública | **La dirección no se escribe en el código**. Casa se marca en el mapa o con el GPS estando en ella, y se guarda solo en el móvil (igual que Familia) |

---

## 2. Escenarios

### Tipo de respuesta, de menor a mayor movimiento

| Código | Respuesta | Qué significa |
|---|---|---|
| **C** | Confinamiento en casa | Quedarse dentro, sellar si procede. Es la respuesta por defecto en la mayoría de escenarios |
| **R** | Refugio inmediato | Ir en minutos a un lugar con protección física: sótano, garaje o aparcamiento subterráneo |
| **U** | Evacuación urbana | Desplazarse dentro de la ciudad a un albergue o a un punto de encuentro |
| **E** | Evacuación fuera de la ciudad | Salir hacia otra localidad por un corredor elegido según el escenario |
| **X** | Reubicación prolongada | Vivir semanas o meses fuera de casa, en un destino planificado |

### Horizontes

**72 h** · **1–2 semanas** · **1–3 meses** · **más de 3 meses**

### Matriz

| Prioridad | Escenario | Respuesta inicial | Cuándo pasar a la siguiente | Horizonte |
|---|---|---|---|---|
| **1** | **Colapso social** (fallo del Estado, de los suministros y del orden público) | C. Casa abastecida, discreción, perfil bajo | Pasar a E cuando: falta agua más de 72 h, hay violencia en el barrio, incendio no controlado o no se puede mantener la casa | 72 h → meses (fases: shock, escasez, reorganización) |
| **1** | **Guerra o conflicto armado**: ataque aéreo o con misiles, sabotaje de infraestructuras, ocupación, movilización | R ante una alerta de ataque; C entre alertas | Pasar a E de forma temprana, siguiendo a las autoridades y antes de que se cierren los corredores. Alejarse de objetivos estratégicos | Horas → meses |
| 2 | Apagón prolongado o ciberataque a infraestructuras | C | Más de 5–7 días sin luz ni agua, o con frío extremo | 72 h → 2 semanas |
| 2 | Accidente nuclear o radiológico, o ataque nuclear | C reforzado (interior, sin ventanas) las primeras 24–48 h | Solo por orden oficial, por la ruta que se indique | 48 h → meses |
| 2 | Accidente químico (transporte por carretera o ferrocarril) | C sellado | Por orden oficial; salir en perpendicular al viento | Horas → 72 h |
| 2 | Pandemia grave | C | Rara vez se evacua | Semanas → meses |
| 3 | Incendio forestal en el entorno | C o E según la orden | Orden de desalojo (julio de 2026: hubo desalojos en la provincia) | 72 h → 2 semanas |
| 3 | Nevada extrema u ola de frío (Ávila: 1.130 m de altitud) | C | Sin calefacción y con riesgo de hipotermia | 72 h → 2 semanas |
| 3 | Ola de calor | C con medidas de frescor | Personas vulnerables, sin refrigeración | 72 h → 2 semanas |
| 3 | Inundación o DANA (río Adaja y Chico, pasos inferiores) | C en altura | Si la vivienda está en peligro u hay orden oficial | Horas → 1 semana |
| 3 | Terremoto (riesgo bajo en Ávila) | Fuera del edificio tras la sacudida si hay daños | Si el edificio queda dañado | 72 h → meses |
| 3 | Disturbios urbanos | C | Si afectan a la propia calle | Horas → días |
| 3 | Crisis de abastecimiento o económica prolongada (hiperinflación, desabastecimiento) | C, con autosuficiencia | Si no se puede sostener la vida en la ciudad | Meses |
| 3 | Corte de agua o sequía | C con agua almacenada | Más de 72 h sin suministro y sin cisternas | 72 h → semanas |

Para cada escenario la app mostrará:
- señales de alerta;
- respuesta inicial y desencadenantes para escalar;
- qué hacer en las primeras horas, a las 72 horas, a las 2 semanas y a los 3 meses o más;
- qué puntos del mapa usar, por orden;
- qué rutas evitar.

Se enlaza con lo que ya existe: SOS, la compra de colapso, la mochila de 72 h, Familia y las situaciones de ruta.

---

## 3. Clasificación de los puntos

| Clase | Uso | Ejemplos |
|---|---|---|
| 🛡️ **A · Refugio inmediato** | Protección física en minutos: guerra, radiológico, tormenta | Sótano o garaje propio (lo marca la propietaria); aparcamientos subterráneos públicos (candidatos) |
| 📍 **B · Punto de encuentro** | Reagruparse si os separáis y no hay comunicación | Lo eligen la propietaria y su pareja: uno cerca de casa y otro fuera del barrio |
| 🏟️ **C · Albergue o acogida** | Pasar la noche o días fuera de casa | Escuela Nacional de Policía (usada como albergue en los incendios de julio de 2026); pabellones municipales (candidatos) |
| 🏥 **D · Sanitario** | Urgencias y atención | Hospital y centros de salud |
| 🚓 **E · Seguridad y autoridad** | Información oficial, denuncias, ayuda | Policía Nacional, Guardia Civil, Policía Local, Bomberos |
| 🚉 **F · Salida y transporte** | Abandonar la ciudad | Estación de tren, estación de autobuses, carreteras de salida |
| 🏡 **G · Destino de reubicación** | Escenarios de meses | Pendiente: la propietaria no tiene destino. La app guiará la elección con criterios: agua propia, distancia de objetivos, red de apoyo, accesible con un depósito |

**Estado de verificación** de cada punto:
- 🟢 **Verificado**: dirección en una fuente oficial;
- 🟡 **Usado en emergencias reales**: fuente de prensa;
- ⚪ **Candidato**: no designado por las autoridades, mostrado en gris.

---

## 4. Puntos encontrados (direcciones; coordenadas pendientes)

| Clase | Punto | Dirección | Fuente | Estado |
|---|---|---|---|---|
| D | Hospital Nuestra Señora de Sonsoles (Complejo Asistencial de Ávila) | Avda. Juan Carlos I, s/n. Tel. 920 358 000 | Ministerio de Sanidad (registro de centros); Portal de Salud de Castilla y León | 🟢 |
| D | Centro de salud Ávila Estación (**el de vuestro barrio**) | Paseo de la Estación, 24 o 28 (las fuentes oficiales no coinciden) | Portal de Salud de Castilla y León | 🟢, número por confirmar |
| D | Centro de salud Ávila Norte | C/ Arturo Duperier, 4 | Portal de Salud de Castilla y León | 🟢 |
| D | Centro de salud Ávila Sur | C/ Fray Gil, 10 | Directorios | 🟡 por confirmar |
| E | Comisaría Provincial, Policía Nacional | Paseo de San Roque, 34. Tel. 920 353 910 | Sede electrónica de la Policía Nacional | 🟢 |
| E | Comandancia de la Guardia Civil | Ctra. del Espinar, 4 (AV-500). Tel. 920 224 400 | Guardia Civil (direcciones de comandancias) | 🟢 |
| E | Jefatura de la Policía Local | C/ Molino del Carril, 1. Tel. 920 352 424 | Ayuntamiento de Ávila | 🟢 |
| E | Parque de Bomberos | C/ Jorge Ruiz de Santayana, s/n. Tel. 920 211 080 | Ayuntamiento de Ávila | 🟢 |
| C | Escuela Nacional de Policía | Ávila | Prensa: albergó a más de 1.000 evacuados en julio de 2026 | 🟡 |
| C | Pabellón polideportivo de San Antonio | Parque de San Antonio | Ayuntamiento (instalaciones deportivas) | ⚪ candidato |
| C | Centro Deportivo Municipal Carlos Sastre | C/ Óbila, s/n | Ayuntamiento | ⚪ candidato |
| C | Ciudad Deportiva Municipal | Avda. de la Juventud, s/n | Directorio | ⚪ candidato |
| C | Centro de Congresos Lienzo Norte | C/ López Mezquita (junto a la Policía Local) | Directorios | ⚪ candidato |
| A | Aparcamiento subterráneo El Grande | Pza. de Santa Teresa (Mercado Grande) | Ayuntamiento (aparcamientos subterráneos) | ⚪ candidato |
| A | Aparcamiento subterráneo El Rastro | Entorno de C/ Constitución / Pza. Beata M.ª Teresa de Jornet | Ayuntamiento | ⚪ candidato |
| F | Estación de tren de Ávila (**junto a vuestro barrio**) | Barrio de la Estación | Adif | 🟢, dirección por confirmar |
| F | Estación de autobuses | Avda. de Madrid / Ctra. Villacastín-Vigo (según la fuente) | Directorios | 🟡 por confirmar |

Teléfonos alternativos publicados por Emergencias Ávila para cuando **el 112 no funcione** (apagón de abril de 2025):
- Policía Local: 920 352 424;
- Bomberos: 920 211 080.

**Carreteras de salida** (corredor F): A-50 hacia Salamanca, AP-51/A-6 hacia Madrid, N-110 hacia Segovia y Plasencia, N-403 hacia Toledo, N-501 y AV-500.

Cada corredor tendrá su indicación según el escenario. Por ejemplo, en guerra:
- evitar el eje de Madrid y los nudos de comunicación;
- priorizar valles rurales con agua.

---

## 5. Trayectos en el mapa

| Opción | Cómo | Pros | Contras |
|---|---|---|---|
| **1 (recomendada)** | Rutas calculadas una vez, con conexión, mediante el servicio oficial **CartoCiudad (IGN)**, y guardadas para usarlas sin red. Coche y a pie | Siguen las calles reales, son oficiales y funcionan offline una vez guardadas | Requiere añadir `www.cartociudad.es` a la CSP, `connect-src`. Es un cambio de configuración: se documentará y probará |
| 2 | Trazar la ruta tocando el mapa, o **grabarla con el GPS** en un recorrido de reconocimiento a pie | Todo offline; el reconocimiento es la práctica profesional | Más trabajo para vosotros |
| 3 | Importar un GPX hecho en Iberpix o en otra app (ya soportado) | Ya existe | Manual |

Siempre se mostrará la línea recta con **rumbo, distancia y tiempo estimado** a pie y en coche, que funciona sin nada más. La opción 1 es la base y la 2 y la 3 se mantienen como complemento.

Aviso permanente (ya existente, `AVISO_RUTAS`): las rutas son una referencia de planificación. Prevalecen las órdenes oficiales y los cortes.

---

## 6. Qué necesito para implementarlo

1. **Aprobación de este diseño.**
2. **Acceso de red en el entorno de desarrollo** al dominio `www.cartociudad.es` (geocodificador y rutas oficiales del IGN).
   - Sirve para obtener las coordenadas reales de los puntos del apartado 4 y comprobar que la app calcula bien las rutas.
   - Sin ese acceso, los puntos tendrían que colocarse a mano en el mapa, y no voy a inventar coordenadas.
3. **Aprobación del cambio de CSP**: `connect-src` + `https://www.cartociudad.es`. Solo hace falta para calcular las rutas desde el móvil.
4. Cambio de versión (1.9.0) al final, para que llegue a las apps instaladas.

**No se cambian:**
- datos existentes;
- cachés (salvo por el número de versión);
- Supabase;
- SOS;
- 112;
- backups.

Lo nuevo se guarda en `kv` con el prefijo `evac.`, que cuenta como dato propio.
