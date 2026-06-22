# U6 — Gestión y validación del ciclo de vida del defecto

Repositorio de entrega de la **Unidad 6 — Gestión de defectos y validación final**.

**Estudiante:** Julian Camilo Corredor Rojas
**Asignatura:** Testing y Validación de Software — Universidad de La Sabana
**Sistema bajo prueba:** servicio `POST /register` (registraduría) — proyecto TYVS de pruebas de carga y rendimiento (Apache JMeter)

Se gestiona el ciclo de vida completo de los **4 defectos de rendimiento reales** detectados en la fase de pruebas (DEF-PERF-01 a DEF-PERF-04): identificación → clasificación → priorización → seguimiento/validación → cierre.

---

## Estructura del repositorio

```
U6_Gestion_y_Validacion_Defectos/
│
├── README.md                         ← este índice
│
├── 01_reportes_defectos/             ← REQUISITO 1
│   └── Reporte_Defectos_Priorizados.xlsx
│
├── 02_dashboard/                     ← REQUISITO 2
│   └── dashboard_calidad.html
│
├── 03_informe_tecnico/               ← REQUISITO 3
│   └── Informe_Tecnico_Gestion_Defectos_U6.pdf
│
└── evidencias/                       ← gráficas de soporte
    ├── g_*.png                       (métricas generadas para esta unidad)
    └── repo_*.png                    (evidencia original de la ejecución JMeter)
```

---

## 1. Reportes de defectos priorizados con trazabilidad
📁 `01_reportes_defectos/Reporte_Defectos_Priorizados.xlsx`

Libro de Excel con tres hojas:

- **Defectos priorizados** — matriz con el modelo *Score = Severidad × Frecuencia × Impacto* y la prioridad (P1/P2) de cada defecto, ordenados por rango.
- **Ciclo de vida y trazabilidad** — ficha por defecto (tipo, componente, causa raíz, evidencia, criterio de cierre, disposición) con su **bitácora de seguimiento** fechada, que traza cada defecto desde su detección hasta su estado terminal.
- **Métricas de calidad** — indicadores por escenario y resumen, calculados con **fórmulas de Excel** (verificado: 0 errores).

La trazabilidad enlaza cada defecto con la evidencia de la carpeta `evidencias/` y con los datos reales de ejecución (`statistics.csv`, 11.104 muestras).

## 2. Dashboard con métricas de calidad visualizadas y analizadas
📁 `02_dashboard/dashboard_calidad.html`

Tablero **autocontenido** (se abre con doble clic en cualquier navegador moderno; no requiere internet). Consolida:

- **KPIs:** total de defectos, % P1, conformidad de SLO (80 %), tasa de errores (0 %), densidad de defectos, capacidad segura.
- **Latencia p95 por escenario** frente al umbral del SLO-1, y **throughput vs. concurrencia** (firma del cuello de botella).
- **Distribuciones** por severidad, prioridad, estado del ciclo de vida y tipo.
- **Matriz de cumplimiento de SLO** (escenario × SLO) con código de color y su análisis.
- **Tabla de defectos priorizados** con score y estado.

## 3. Informe técnico de hallazgos y conclusiones
📁 `03_informe_tecnico/Informe_Tecnico_Gestion_Defectos_U6.pdf`

Documento de 17 páginas que sintetiza todo el proceso de validación. Secciones: Introducción · Contexto y SLO · **Identificación** · **Clasificación** · **Análisis y priorización** · **Seguimiento y validación** (ficha + bitácora por defecto) · **Cierre** · Dashboard · **Reflexión final** · Conclusiones · Anexo de evidencia visual.

---

## Mapeo a la rúbrica

| Criterio (puntaje) | Dónde se evidencia |
|---|---|
| **1. Documentación del ciclo de vida del defecto** (2.0) | Informe §3, §4, §6, §7 · Excel hojas 1 y 2 |
| **2. Análisis y priorización de defectos** (1.5) | Informe §5 · Excel hojas 1 y 3 · Dashboard |
| **3. Informe técnico y comunicación de hallazgos** (1.5) | Informe completo (§9 Reflexión, §10 Conclusiones) · Dashboard |

---

## Hallazgos principales

- **Causa raíz (DEF-PERF-01, P1):** el throughput permanece plano en ~170–179 req/s pese a multiplicar la concurrencia ×20 → recurso de escritura serializado. Resolverlo corrige en cadena DEF-PERF-02.
- **Conformidad de SLO: 80 %** (12/15 chequeos). SLO-1 (p95<300 ms) falla en Stress y Spike; SLO-2 (p99<800 ms) solo en Spike; SLO-3 (errores<1 %) cumple en los 5 escenarios.
- **0 % de errores** en 11.104 muestras y **0 % de escape** a producción.
- **Capacidad operativa segura ≈ 40–50 usuarios concurrentes.**
- **Cierre honesto:** los P1 quedan en remediación (*must-fix*); los P2 se cierran como *Diferido/Aceptado con mitigación* (operar bajo la capacidad segura) con el riesgo residual registrado como deuda técnica.
