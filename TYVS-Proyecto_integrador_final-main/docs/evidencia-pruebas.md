# Evidencia de ejecucion de pruebas de ParkControl

Fecha de verificacion: 2026-06-17

## Pruebas automatizadas Node

```bash
npm test
```

Resultado verificado:

```text
tests 33
suites 6
pass 33
fail 0
cancelled 0
skipped 0
todo 0
```

Estas pruebas cubren reglas de negocio, calculo tarifario, persistencia JSON, pruebas de integracion entre dominio/storage, utilidades HTTP y flujos e2e a nivel servidor/API.

## Pruebas de integracion

```bash
npm run integration
```

Resultado verificado:

```text
tests 3
suites 1
pass 3
fail 0
```

La evidencia detallada esta en `docs/evidencia-integracion.md`.

## Cobertura estricta de codigo fuente

```bash
npm run coverage
```

Resultado verificado sobre `src/**/*.js`:

```text
file                  | line % | branch % | funcs %
src/domain            | 100.00 | 100.00   | 100.00
src/server            | 100.00 | 100.00   | 100.00
src/storage           | 100.00 | 100.00   | 100.00
all files             | 100.00 | 100.00   | 100.00
```

El script de cobertura exige umbrales de 100% en lineas, ramas y funciones. Si baja cualquier metrica, el comando falla.

## Pruebas e2e reales de navegador

```bash
npm run e2e
```

Resultado verificado:

```text
2 passed
```

Para una demostracion visible y lenta:

```bash
npm run e2e:demo
```

Esta variante abre Chromium y ejecuta el flujo con pausa aproximada de 1.2 segundos entre acciones.

## Interpretacion

ParkControl cuenta con cuatro niveles de verificacion: pruebas unitarias de dominio, pruebas de integracion, cobertura estricta del codigo fuente y e2e visuales de navegador. Esto permite demostrar tanto calidad interna como comportamiento observable desde la interfaz.
