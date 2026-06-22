# U6 — Ciclo de Vida del Defecto y Priorización

**Proyecto:** ParkControl · **Unidad:** Gestión de defectos y validación final

Este documento desarrolla el **ciclo de vida del defecto** aplicado a ParkControl:
identificación, clasificación, seguimiento/validación y cierre, junto con la
**priorización** basada en criterios técnicos y la **trazabilidad**
defecto ↔ requisito ↔ prueba. El registro completo está en
[`defectos.csv`](defectos.csv) (apto para Excel) y el tablero de métricas en
[`quality-dashboard/index.html`](../quality-dashboard/index.html).

---

## 1. Modelo de ciclo de vida adoptado

```
 Nuevo ─▶ Confirmado ─▶ Asignado ─▶ En progreso ─▶ Resuelto ─▶ Validado (regresión) ─▶ Cerrado
                            │                                         │
                            └────────────── Reabierto ◀──────────────┘
                                    Estados auxiliares: Diferido / Descartado
```

Cada etapa:

1. **Identificación.** Se detecta el defecto (prueba automatizada que falla,
   prueba de carga, revisión de código o análisis de límites) y se registra con
   un ID único `DEF-XX`, descripción, pasos de reproducción y resultado esperado
   vs. obtenido.
2. **Clasificación.** Se asigna tipo, severidad y prioridad (ver §3).
3. **Seguimiento y validación.** Se asigna responsable, se corrige y se crea o
   ajusta una prueba que **reproduce** el defecto; la corrección se da por buena
   solo cuando esa prueba (regresión) pasa en el pipeline.
4. **Cierre.** Con la prueba de regresión en verde dentro de CI y la cobertura
   intacta (100 %), el defecto se cierra. Queda la trazabilidad para auditoría.

Herramienta de registro sugerida: **GitHub Issues** con la plantilla
[`.github/ISSUE_TEMPLATE/defecto.md`](../.github/ISSUE_TEMPLATE/defecto.md) y la
etiqueta `defecto`; el estado se refleja con labels (`confirmado`, `en-progreso`,
`resuelto`, `cerrado`) y el cierre se enlaza al PR que lo corrige.

## 2. Criterios de clasificación

**Severidad** (impacto técnico):

| Severidad | Definición |
|-----------|------------|
| Crítica | Caída del sistema, corrupción de datos o pérdida de dinero generalizada. |
| Alta | Falla funcional importante o degradación seria de rendimiento bajo carga esperada. |
| Media | Falla acotada, dato incorrecto no monetario o validación incompleta. |
| Baja | Caso límite poco frecuente, sin impacto operativo real. |

**Prioridad** (urgencia de atención): **P1** (atender ya), **P2** (próximo
ciclo), **P3** (backlog/mejora).

## 3. Catálogo de defectos (clasificados y priorizados)

### Defectos cerrados (identificados y validados durante el desarrollo)

| ID | Defecto | Tipo | Sev. | Prio. | Validado por |
|----|---------|------|:----:|:----:|--------------|
| DEF-01 | Placa inválida o sin normalizar aceptada | Funcional | Media | P2 | TC-01, TC-02 |
| DEF-02 | Registro duplicado de placa con tiquete abierto | Funcional | Alta | P1 | TC-08 |
| DEF-03 | Sobrecupo por tipo de vehículo | Funcional | Alta | P1 | TC-09 |
| DEF-04 | Fechas inválidas / salida ≤ entrada | Funcional | Media | P2 | TC-05, TC-06 |
| DEF-05 | Cuerpo JSON malformado sin manejo | Robustez | Media | P2 | TC-13–15 |
| DEF-06 | Escritura no atómica (riesgo de corrupción) | Datos | Alta | P1 | Integración + e2e |

### Defectos abiertos (backlog priorizado de mejora)

| ID | Defecto | Tipo | Sev. | Prio. | Detectado en |
|----|---------|------|:----:|:----:|--------------|
| DEF-07 | Degradación de throughput por persistencia O(n) | Rendimiento | Alta | P1 | Carga U5 (timeline Stress) |
| DEF-08 | Escritura serializada limita la concurrencia | Rendimiento | Alta | P2 | Carga U5 (concurrencia) |
| DEF-10 | Consecutivo de factura no se reinicia por año | Funcional/Contable | Media | P2 | Revisión + repro |
| DEF-11 | Historial del dashboard sin paginar | Rendimiento | Media | P3 | Carga U5 / revisión |
| DEF-09 | Placa de solo guiones aceptada (`----`) | Validación | Baja | P3 | Análisis de límites + repro |

### Detalle de los defectos abiertos (ficha técnica)

**DEF-07 — Degradación de throughput por persistencia O(n)**
*Identificación:* en la prueba de carga U5, la latencia de escritura **crece de
forma sostenida** durante el escenario Stress (ver `03_timeline_latencia.png`) y
el throughput de escritura **decrece** entre escenarios (186→93→72→65 req/s).
*Causa raíz:* `JsonStore.write` serializa y reescribe **todo** el archivo JSON en
cada operación; como el historial nunca se purga, el costo por escritura es O(n)
y n crece. *Reproducción:* `./performance/run_jmeter.sh` y observar la línea de
tiempo. *Severidad Alta / P1.* *Propuesta:* persistencia transaccional con
escritura incremental (BD).

**DEF-08 — Escritura serializada limita la concurrencia**
*Identificación:* la latencia de escritura crece de forma proporcional a la
concurrencia mientras la lectura escala a ~2.000 req/s (`04_concurrencia_vs_latencia.png`).
*Causa raíz:* la cola única `lotOperation` en `app.js` procesa una escritura a la
vez. *Severidad Alta / P2.* *Propuesta:* control de concurrencia por
transacción/fila en lugar de una cola global.

**DEF-10 — Consecutivo de factura no se reinicia por año fiscal**
*Identificación/repro:* al cerrar un tiquete en 2026 y otro en 2027, los números
salen `FE-2026-1` y `FE-2027-2` (se esperaría `FE-2027-1`). *Causa raíz:*
`invoiceSequence` usa el **conteo global** de tiquetes cerrados, no uno por año.
*Severidad Media / P2* (impacto contable/trazabilidad). *Propuesta:* numerar por
año: `closed.filter(año === añoSalida).length + 1`.

**DEF-11 — Historial del dashboard sin paginar**
*Identificación:* `GET /api/dashboard` devuelve solo 20 registros pero **carga
todo** el archivo en memoria en cada consulta; a medida que crece el historial,
la lectura se encarece. *Severidad Media / P3.* *Propuesta:* paginación y
archivado del histórico.

**DEF-09 — Placa de solo guiones aceptada**
*Identificación/repro:* `normalizePlate("----")` retorna `"----"`. La expresión
`^[A-Z0-9-]{4,10}$` admite cadenas compuestas únicamente por guiones, que no son
placas válidas. *Severidad Baja / P3* (caso límite). *Propuesta:* exigir al menos
un carácter alfanumérico, p. ej. `^(?=.*[A-Z0-9])[A-Z0-9-]{4,10}$`.

## 4. Matriz de trazabilidad (defecto ↔ requisito ↔ prueba)

| Defecto | Requisito | Componente | Prueba / Evidencia | Estado |
|---------|-----------|-----------|--------------------|:------:|
| DEF-01 | Normalizar y validar placa | `normalizePlate` | TC-01, TC-02 | ✅ Cerrado |
| DEF-02 | Impedir tiquetes duplicados | `registerEntry` | TC-08 | ✅ Cerrado |
| DEF-03 | Controlar cupos | `hasAvailability` | TC-09 | ✅ Cerrado |
| DEF-04 | Calcular tarifa | `calculateParkingCharge` | TC-05, TC-06 | ✅ Cerrado |
| DEF-05 | Procesar solicitudes JSON | `readJsonBody` | TC-13, TC-14, TC-15 | ✅ Cerrado |
| DEF-06 | Persistencia confiable | `jsonStore.write` | Integración + e2e | ✅ Cerrado |
| DEF-07 | Escalabilidad de escritura | `jsonStore.write` | U5: `results.jtl`, timeline | 🟠 Abierto |
| DEF-08 | Concurrencia de operaciones | `app.updateLot` | U5: concurrencia, statistics | 🟠 Abierto |
| DEF-09 | Normalizar y validar placa | `normalizePlate` | Repro documentado | 🟠 Abierto |
| DEF-10 | Generar factura | `closeTicket` | Repro: `FE-2027-2` | 🟠 Abierto |
| DEF-11 | Consultar historial | `handleApi(dashboard)` | U5: throughput | 🟠 Abierto |

*(La matriz base de requisitos ↔ pruebas está en [`trazabilidad.md`](trazabilidad.md).)*

## 5. Métricas de calidad (resumen)

| Métrica | Valor |
|---------|------:|
| Cobertura de código (líneas/ramas/funciones) | 100 % |
| Pruebas automatizadas (verdes / total) | 33 / 33 |
| Pruebas de integración | 3 / 3 |
| Defectos totales | 11 |
| Defectos cerrados | 6 (55 %) |
| Defectos abiertos (backlog) | 5 (45 %) |
| Defectos de severidad Alta | 5 |
| Tasa de error en pruebas de carga | 0 % |
| Detectados por pruebas automatizadas | 6 |
| Detectados por pruebas de carga (U5) | 3 |
| Detectados por revisión/análisis de límites | 2 |

El tablero interactivo con estas métricas visualizadas está en
[`quality-dashboard/index.html`](../quality-dashboard/index.html)
(ver también la captura `quality-dashboard/dashboard.png`).

## 6. Reflexión final sobre el proceso de pruebas

- **Lo efectivo.** La estrategia multinivel (unitarias + integración + servicio
  HTTP + E2E + carga) con cobertura del 100 % como **gate** del pipeline detectó
  y cerró los defectos funcionales y de datos **antes** de la integración
  (DEF-01 a DEF-06). El enfoque ágil/continuo evitó que regresiones llegaran a
  `main`.
- **Lo que aportaron las pruebas de carga.** Tres defectos de rendimiento
  (DEF-07, DEF-08, DEF-11) **no eran visibles** con pruebas funcionales: solo
  emergieron bajo concurrencia y volumen. Esto confirma que validación funcional
  y de rendimiento son complementarias.
- **Lo que aportó la revisión de código.** Dos defectos (DEF-09 validación de
  placa, DEF-10 consecutivo de factura) se hallaron por análisis de límites y
  lectura del código, no por las pruebas existentes: señala dónde **ampliar** la
  suite.
- **Oportunidades de mejora del propio testing:**
  1. Agregar casos de borde de `normalizePlate` (DEF-09) y numeración de factura
     por año (DEF-10) como pruebas de regresión.
  2. Incorporar una **prueba de rendimiento de regresión** en CI que falle si el
     throughput de escritura cae de un umbral.
  3. Sembrar el archivo con historial grande para medir el efecto O(n) de forma
     controlada y repetible.

En conjunto, el proceso fue **efectivo para lo funcional** y **revelador para lo
no funcional**: el sistema es correcto, y los defectos abiertos constituyen un
backlog técnico claro, priorizado y trazable para la siguiente iteración.
