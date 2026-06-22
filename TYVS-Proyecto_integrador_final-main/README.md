# ParkControl - Testing y Validaciones (Actividad U5 - BDD | AAA | E2E | PERFORMANCE | INTEGRATION)
<img width="120" height="67" alt="image" src="https://github.com/user-attachments/assets/9ab50188-6712-4a50-ab1f-4dc684d6704a" /><br/>
Maestría en Arquitectura de Software <br/>
Hecho por: **Grupo 9** : <br/>

- Yerlinson Maturana Serna
- Brayan Estif Calderon Gomez
- Sadane Geronimo Miguel Santiago Acevedo Virgues
- Julian Camilo Corredor Rojas

<img width="2318" height="1718" alt="image" src="https://github.com/user-attachments/assets/f7c8ea8e-b4a6-4ecc-8586-40916ba53287" />


ParkControl es un proyecto Node.js para administrar la operacion basica de un parqueadero publico en Colombia: ingresos, salidas, disponibilidad por tipo de vehiculo, liquidacion, factura en COP e historial reciente.

## Funcionalidades

- Registro de ingreso por placa, tipo de vehiculo y propietario opcional.
- Control de cupos para automoviles, motocicletas y bicicletas.
- Bloqueo de placas duplicadas con tiquete abierto.
- Liquidacion por minutos, tarifa minima, tope diario e IVA del 19%.
- Generacion de factura basica en pesos colombianos.
- Dashboard web con ocupacion, tiquetes abiertos e historial.
- Pruebas unitarias automatizadas con `node:test`.
- Reporte de cobertura con `--experimental-test-coverage`.

## Requisitos

- Node.js 22 o superior.
- Ejecutar `npm install` para instalar las dependencias de desarrollo, incluyendo Playwright.

## Ejecucion

```bash
npm start
```

Luego abrir:

```text
http://localhost:3000
```

## Pruebas

```bash
npm test
```

## Cobertura

```bash
npm run coverage
```

## Pruebas de integracion

Las pruebas de integracion validan que dominio, calculo tarifario y persistencia JSON trabajen juntos. Cubren registro, recarga desde storage, liquidacion, factura persistida, bloqueo de duplicados, sobrecupo y consecutivos de factura.

```bash
npm run integration
```

## Pruebas e2e de navegador

ParkControl incluye pruebas e2e reales con Playwright. Estas abren Chromium, interactuan con la interfaz, registran una entrada, liquidan una salida, validan la factura de tirilla en modal y comprueban mensajes de error visibles.

```bash
npm run e2e
```

Para ver el navegador durante la ejecucion:

```bash
npm run e2e:headed
```

Para una demostracion mas lenta y facil de ver, con navegador visible y pausa aproximada de 1.2 segundos entre acciones:

```bash
npm run e2e:demo
```

Resultado verificado:

<img width="591" height="442" alt="image" src="https://github.com/user-attachments/assets/52fc1d0d-e44c-4357-9f77-5acbbfe7fb0c" /><br/>

```text
npm test: tests 33, pass 33, fail 0
npm run coverage: src 100% lineas, 100% ramas, 100% funciones
npm run e2e: 2 passed
```

## Integracion continua

El repositorio incluye GitHub Actions en `.github/workflows/ci.yml`. El pipeline se ejecuta en `push`, `pull_request` y manualmente con `workflow_dispatch`.

Checks del job principal:

```bash
npm test
npm run integration
npm run coverage
npm run e2e
```

Tambien hay un job de rendimiento que ejecuta `npm run perf` contra el servidor local y falla si algun escenario reporta errores.

## Rendimiento y carga

La entrega de Unidad 5 incluye pruebas de rendimiento para los flujos principales de ParkControl.

Equipo Unidad 05:

- Yerlinson Maturana Serna
- Brayan Estif Calderon Gomez
- Sadane Geronimo Miguel Santiago Acevedo Virgues
- Julian Camilo Corredor Rojas

```bash
npm run perf
```

Este comando genera resultados en `performance/results/`:

- `performance-summary.json`: metricas consolidadas.
- `performance-summary.md`: tabla resumen.
- `performance-results.csv`: muestras por solicitud.
- `throughput-chart.svg`: grafica de throughput.

Tambien se incluye el plan JMeter `performance/ParkControl_LoadTest.jmx` y el reporte `docs/reporte-rendimiento-carga.md`.

## Estructura

```text
src/domain/              Reglas de negocio y calculo tarifario
src/server/              Servidor HTTP y utilidades API
src/storage/             Persistencia JSON local
public/                  Interfaz web
test/                    Pruebas unitarias, integracion e integracion HTTP
e2e/                     Pruebas e2e reales de navegador con Playwright
docs/                    Plan, trazabilidad y evidencia de pruebas
data/                    Archivo JSON generado por la aplicacion
```

## Componentes principales

- `ParkingLot`: administra cupos, tiquetes abiertos, cierres e historial.
- `tariffCalculator`: normaliza placas, valida tipos de vehiculo y calcula cobros.
- `JsonStore`: guarda y lee el estado del parqueadero en `data/parking-lot.json`.
- `app.js`: expone API HTTP y sirve la interfaz web.

## Factura de tirilla

Al liquidar una salida, ParkControl muestra una factura tipo tirilla con formato de recibo termico. El boton `Imprimir tirilla` abre una ventana de impresion optimizada para papel de 80 mm, incluyendo placa, tipo de vehiculo, entrada, salida, tiempo, subtotal, IVA y total.

## Endpoints

- `GET /api/dashboard`: ocupacion, tiquetes abiertos, historial y tarifas.
- `POST /api/entries`: registra entrada.
- `POST /api/exits`: liquida y cierra salida.

Ejemplo de entrada:

```json
{
  "plate": "ABC123",
  "vehicleType": "car",
  "ownerName": "Ana Perez"
}
```

Ejemplo de salida:

```json
{
  "plate": "ABC123"
}
```

---

## Entregas de Validación — Unidades 4, 5 y 6

Esta sección mapea los entregables evaluativos de cada unidad a su ubicación en
el repositorio.

### Unidad 4 — Pruebas de integración y CI/CD
- **Pruebas automatizadas:** `test/` → `npm test` (33 pruebas) y `npm run integration` (3).
- **Pipeline CI/CD:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (corre en cada push y PR).
- **Métricas de cobertura:** `npm run coverage` (100 % líneas/ramas/funciones, usado como gate).
- **Reporte de ejecución:** [`docs/U4-reporte-integracion-cicd.md`](docs/U4-reporte-integracion-cicd.md).
- **Restricción de merge (pruebas antes de integrar):** [`docs/U4-configurar-branch-protection.md`](docs/U4-configurar-branch-protection.md).
- Evidencia: [`docs/evidencias-u4/`](docs/evidencias-u4/).

### Unidad 5 — Pruebas de carga y rendimiento (JMeter)
- **Plan `.jmx`:** [`performance/ParkControl_LoadTest.jmx`](performance/ParkControl_LoadTest.jmx) (5 escenarios parametrizados).
- **Ejecución reproducible:** `./performance/run_jmeter.sh` (perfil `demo` o `full`).
- **Reporte de ejecución y análisis:** [`docs/U5-reporte-ejecucion-analisis.md`](docs/U5-reporte-ejecucion-analisis.md).
- **Evidencia visual y datos:** [`performance/evidencias/`](performance/evidencias/) y [`performance/results/`](performance/results/).

### Unidad 6 — Gestión de defectos y validación final
- **Ciclo de vida y priorización + trazabilidad:** [`docs/U6-ciclo-vida-defectos.md`](docs/U6-ciclo-vida-defectos.md) y registro [`docs/defectos.csv`](docs/defectos.csv).
- **Dashboard de calidad:** [`quality-dashboard/index.html`](quality-dashboard/index.html) (captura: `quality-dashboard/dashboard.png`).
- **Informe técnico final:** [`docs/U6-informe-tecnico-final.md`](docs/U6-informe-tecnico-final.md).

### Cómo reproducir todo
```bash
npm ci                      # instalar dependencias
npm test                    # 33 pruebas (unitarias + integración + servicio HTTP)
npm run integration         # 3 pruebas de integración
npm run coverage            # cobertura 100 % (falla si baja)
./performance/run_jmeter.sh # pruebas de carga JMeter + gráficas (requiere JMeter 5.x)
# Dashboard: abrir quality-dashboard/index.html en el navegador
```
