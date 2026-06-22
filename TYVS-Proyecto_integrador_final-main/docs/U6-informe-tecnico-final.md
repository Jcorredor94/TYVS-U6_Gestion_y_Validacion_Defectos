# U6 — Informe Técnico Final del Proceso de Validación

**Proyecto:** ParkControl — sistema de gestión de parqueaderos (Node.js)
**Equipo:** Grupo 9 — Universidad de La Sabana
**Alcance:** síntesis del proceso de validación de las Unidades 4 (integración y
CI/CD), 5 (carga y rendimiento) y 6 (gestión de defectos).

---

## 1. Resumen ejecutivo

ParkControl fue sometido a una estrategia de validación multinivel: pruebas
unitarias, de integración, de servicio HTTP, E2E de interfaz y pruebas de carga
con JMeter, todo integrado en un pipeline de CI/CD que **bloquea merges** si las
pruebas fallan o si la cobertura baja del 100 %.

**Conclusión principal:** el sistema es **funcionalmente correcto y robusto**
(100 % de cobertura, 33/33 pruebas verdes, 0 % de error bajo carga), pero
presenta una **limitación de escalabilidad en escritura** cuya causa raíz es la
persistencia en archivo JSON completo (O(n)) combinada con una cola de escritura
serializada. Se documentan 11 defectos (6 cerrados, 5 abiertos) priorizados y
trazables.

## 2. Estrategia y cobertura de pruebas (U4)

| Nivel | Qué valida | Resultado |
|-------|-----------|-----------|
| Unitario | Dominio, tarifas, utilidades, persistencia | ✅ |
| Integración | Dominio + tarifas + storage en conjunto | ✅ 3/3 |
| Servicio HTTP | Endpoints reales `/api/*` y errores | ✅ |
| E2E (Playwright) | Flujo de usuario en la interfaz | ✅ |
| Carga (JMeter) | Rendimiento bajo concurrencia | ✅ 0 % error |

- **Cobertura:** 100 % en líneas, ramas y funciones (gate del pipeline).
- **CI/CD:** GitHub Actions ejecuta la suite en cada push y PR; el check
  `quality` es obligatorio para integrar (ver `U4-reporte-integracion-cicd.md`).
- **Automatización:** un solo comando por nivel (`npm test`,
  `npm run integration`, `npm run coverage`, `npm run e2e`).

## 3. Hallazgos de rendimiento (U5)

Ejecución real con JMeter: **25.462 muestras, 5 escenarios, 0 % de error.**

| Escenario | Throughput | p95 | Diagnóstico |
|-----------|-----------:|----:|-------------|
| Baseline (lectura) | 2.018,8 req/s | 11 ms | La lectura escala muy bien. |
| Load (escritura) | 186,7 req/s | 446 ms | Ya incumple p95<300 con 40 usuarios. |
| Stress (escritura) | 92,7 req/s | 1.506 ms | Throughput cae; latencia crece en el tiempo. |
| Spike (escritura) | 71,8 req/s | 2.280 ms | Pico hunde la latencia. |
| Soak (escritura) | 65,4 req/s | 264 ms | Bajo throughput por archivo ya grande. |

**Causa raíz (dos cuellos de botella compuestos):**
1. **Persistencia O(n)** — cada escritura reescribe todo el archivo JSON, que
   crece con el historial → el costo por operación aumenta con el tiempo.
2. **Escritura serializada** — la cola global procesa una operación a la vez →
   la latencia crece con la concurrencia mientras la lectura escala.

Evidencia: `performance/evidencias/` (throughput, línea de tiempo con la rampa de
Stress, concurrencia vs latencia) y `performance/results/statistics.json`.

## 4. Gestión de defectos (U6)

Se gestionaron **11 defectos** con ciclo de vida completo (ver
`U6-ciclo-vida-defectos.md` y `defectos.csv`):

- **6 cerrados** durante el desarrollo, cada uno validado por una prueba
  automatizada (placa, duplicados, sobrecupo, fechas, JSON malformado, escritura
  atómica).
- **5 abiertos** como backlog técnico priorizado:
  - **P1:** DEF-07 (persistencia O(n)).
  - **P2:** DEF-08 (serialización), DEF-10 (consecutivo de factura por año).
  - **P3:** DEF-11 (historial sin paginar), DEF-09 (placa de solo guiones).

Distribución por severidad: 5 Alta, 5 Media, 1 Baja. Origen de detección: 6 por
pruebas automatizadas, 3 por pruebas de carga, 2 por revisión de código. Tablero
visual en `quality-dashboard/index.html` (captura en
`quality-dashboard/dashboard.png`).

## 5. Priorización y recomendaciones

Orden recomendado de atención del backlog, por impacto/esfuerzo:

1. **DEF-07 / DEF-08 (rendimiento, P1–P2):** migrar la persistencia a una base de
   datos transaccional con escritura incremental y permitir concurrencia
   controlada. Es la mejora de mayor impacto: elimina la causa raíz del cuello de
   botella de escritura.
2. **DEF-11 (P3):** paginar/archivar el historial para sostener el alto
   throughput de lectura aun con datos grandes.
3. **DEF-10 (P2):** numerar facturas por año fiscal (corrección contable simple).
4. **DEF-09 (P3):** endurecer la validación de placa (al menos un alfanumérico).

Cada corrección debe acompañarse de su **prueba de regresión** en el pipeline; se
recomienda además una prueba de rendimiento de regresión que falle si el
throughput de escritura cae de un umbral.

## 6. Reflexión sobre la efectividad del proceso

- La validación **funcional** fue muy efectiva: el gate de cobertura y CI evitó
  regresiones y cerró 6 defectos antes de integrarse.
- La validación de **rendimiento** fue reveladora: 3 defectos solo emergieron
  bajo carga, confirmando que las pruebas funcionales no bastan.
- La **revisión de código** complementó a ambas, hallando 2 defectos de borde
  que las pruebas no cubrían — y que ahora son candidatos a nuevas pruebas.

El proceso demostró el valor de combinar enfoques (ágil/continuo) y niveles de
prueba: correctitud comprobada, límites de escalabilidad cuantificados y un
backlog de mejora claro, priorizado y trazable.

## 7. Mapa de entregables

| Unidad | Entregable | Ubicación |
|--------|-----------|-----------|
| U4 | Pruebas automatizadas | `test/`, `npm test` / `npm run integration` |
| U4 | Pipeline CI/CD | `.github/workflows/ci.yml` |
| U4 | Métricas de cobertura + reporte | `docs/U4-reporte-integracion-cicd.md`, `docs/evidencias-u4/` |
| U4 | Restricción de merge | `docs/U4-configurar-branch-protection.md` |
| U5 | Plan `.jmx` | `performance/ParkControl_LoadTest.jmx` |
| U5 | Reporte de ejecución y análisis | `docs/U5-reporte-ejecucion-analisis.md` |
| U5 | Evidencia visual y datos | `performance/evidencias/`, `performance/results/` |
| U6 | Ciclo de vida y priorización | `docs/U6-ciclo-vida-defectos.md`, `docs/defectos.csv` |
| U6 | Dashboard de calidad | `quality-dashboard/index.html` (+ `dashboard.png`) |
| U6 | Informe técnico final | este documento |
