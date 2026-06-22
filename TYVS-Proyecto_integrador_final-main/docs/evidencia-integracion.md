# Evidencia de pruebas de integracion - ParkControl

## Objetivo

Validar que los modulos internos de ParkControl trabajen correctamente en conjunto, sin depender de la interfaz grafica: reglas de dominio, calculo tarifario, facturacion y persistencia JSON.

## Archivo de prueba

- `test/parkingLot.integration.test.js`

## Componentes integrados

- `ParkingLot`: reglas de negocio de cupos, entradas, salidas e historial.
- `tariffCalculator`: calculo de minutos, subtotal, IVA, total y etiquetas de vehiculo.
- `JsonStore`: lectura, escritura y recarga del estado persistido.

## Escenarios cubiertos

| Escenario | Validacion |
| --- | --- |
| Registro, persistencia y liquidacion | Registra un vehiculo, guarda estado, recarga desde JSON, liquida salida, persiste factura y verifica historial. |
| Capacidad limitada y duplicados | Recarga estado desde storage y valida que no permita placa duplicada ni sobrecupo. |
| Consecutivo de facturas | Cierra multiples tiquetes y verifica que las facturas mantengan secuencia `FE-2026-1`, `FE-2026-2`. |

## Comando

```bash
npm run integration
```

## Resultado verificado

```text
tests 3
suites 1
pass 3
fail 0
```

## Relacion con otras pruebas

- `npm test`: ejecuta unitarias, integracion y pruebas HTTP de servidor.
- `npm run coverage`: exige 100% de lineas, ramas y funciones sobre `src/**/*.js`.
- `npm run e2e`: ejecuta pruebas reales de navegador con Playwright.
