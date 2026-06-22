# Evidencia e2e de navegador - ParkControl

## Objetivo

Validar ParkControl como lo usaria un operador real desde el navegador: abrir la app, llenar formularios, seleccionar tipo de vehiculo, registrar entrada, liquidar salida, revisar la tirilla POS en modal y confirmar errores visibles.

## Herramienta

Se usa Playwright con Chromium. A diferencia de las pruebas HTTP de `test/app.e2e.test.js`, estas pruebas si abren un navegador y ejecutan acciones sobre la interfaz grafica.

## Archivos

- `playwright.config.js`: configuracion de Playwright, servidor local y reportes.
- `e2e/parking-flow.spec.js`: escenarios automatizados de navegador.
- `outputs/playwright-report/`: reporte HTML generado localmente cuando se ejecutan las pruebas.
- `test-results/`: trazas, capturas y videos cuando una prueba falla.

## Escenarios cubiertos

| Escenario | Acciones automatizadas | Validaciones |
| --- | --- | --- |
| Registro y salida completa | Abre la app, escribe placa, selecciona Moto, escribe propietario, registra entrada, liquida salida y reabre la tirilla. | Titulo visible, autor visible, tiquete abierto, historial, modal de factura, placa, tipo, total y cierre del modal. |
| Error de liquidacion | Abre la app, escribe una placa inexistente y presiona Liquidar y cerrar. | Toast visible con estilo de error y mensaje `No existe un tiquete abierto`. |

## Comandos

Ejecucion rapida/headless para verificacion automatica:

```bash
npm run e2e
```

Ejecucion visible normal:

```bash
npm run e2e:headed
```

Ejecucion visible para demostracion o grabacion, con pausa aproximada de 1.2 segundos entre acciones:

```bash
npm run e2e:demo
```

## Resultado verificado

```text
npm run e2e:demo
2 passed
```

## Notas de uso

- Playwright levanta ParkControl automaticamente con `npm start` si no hay servidor activo.
- Si ya existe un servidor en `http://127.0.0.1:3000`, Playwright lo reutiliza.
- La prueba guarda una copia del archivo `data/parking-lot.json` y lo restaura al terminar para no dejar datos de prueba permanentes.
- Para presentar la evidencia en clase, usar `npm run e2e:demo` porque el navegador se abre visible y el flujo se percibe mejor.
