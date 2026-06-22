> **Nota (entrega final U5):** este documento corresponde al *runner* Node (`npm run perf`) y sus cifras no provienen de JMeter. El **reporte autoritativo de la Unidad 5**, con ejecución real de JMeter (25.462 muestras, 0 % de error) y evidencia verificable, es [`U5-reporte-ejecucion-analisis.md`](U5-reporte-ejecucion-analisis.md).

---

# Reporte de pruebas de rendimiento y carga - ParkControl

## Equipo Unidad 05

- Yerlinson Maturana Serna
- Brayan Estif Calderon Gomez
- Julian Camilo Corredor Rojas
- Sadane Geronimo Miguel Santiago Acevedo Virgues




## Contexto

ParkControl es un sistema Node.js para gestion operativa de parqueaderos publicos en Colombia. Las pruebas se enfocan en los flujos principales de la aplicacion: consulta de tablero, registro de ingreso, liquidacion de salida y consulta bajo pico de usuarios.

- Fecha de ejecucion: 2026-06-17T00:47:14.332Z
- URL base: `http://127.0.0.1:3000`
- Herramientas incluidas: plan JMeter `.jmx` y runner automatizado Node.js.
- Datos de prueba: placas generadas automaticamente y restauracion del archivo `data/parking-lot.json` al finalizar.

## Escenarios evaluados

| Escenario | Objetivo | Carga aplicada |
| --- | --- | --- |
| Dashboard baseline | Medir la respuesta normal del endpoint `GET /api/dashboard`. | 5 usuarios, ramp-up de 5 s, duracion de 8 s. |
| Flujo ingreso salida | Validar el flujo transaccional `POST /api/entries` + `POST /api/exits`. | 8 usuarios, ramp-up de 8 s, duracion de 8 s. |
| Pico consultas dashboard | Simular consulta concurrente del tablero operativo. | 20 usuarios, ramp-up de 5 s, duracion de 8 s. |

## Resultados

| Escenario | Usuarios | Ramp-up | Duracion | Muestras | Throughput | Promedio | P95 | Error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dashboard baseline | 5 | 5 s | 8 s | 54489 | 6810.27 req/s | 0.46 ms | 0.81 ms | 0% |
| Flujo ingreso salida | 8 | 8 s | 8 s | 1408 | 175.26 req/s | 10.01 ms | 27.84 ms | 0% |
| Pico consultas dashboard | 20 | 5 s | 8 s | 2670 | 330.81 req/s | 40.53 ms | 75.83 ms | 0% |

## Analisis de metricas

El tablero base obtuvo el mayor throughput porque solo consulta estado y no modifica persistencia. El flujo de ingreso y salida fue mas exigente porque realiza escritura, lectura posterior y calculo de factura por cada ciclo. Aun asi, mantuvo 0% de error, con tiempo promedio bajo y percentil 95 inferior a 28 ms.

El pico de consultas al dashboard redujo el throughput frente al baseline porque se ejecuto con 20 usuarios concurrentes y despues del escenario transaccional, mientras el sistema consultaba un archivo JSON con historial. El resultado sigue siendo estable: no hubo errores y el percentil 95 se mantuvo alrededor de 76 ms.

## Cuellos de botella identificados

- La persistencia actual usa archivo JSON local. Es suficiente para el prototipo academico, pero no es ideal para alta concurrencia sostenida.
- Las operaciones de ingreso y salida requieren escritura serializada para evitar condiciones de carrera.
- El historial crece en el mismo archivo de datos; a largo plazo puede impactar las consultas del dashboard.

## Mejoras aplicadas

- Se agrego ejecucion automatizada de rendimiento con `npm run perf`.
- Se incorporo un plan JMeter en `performance/ParkControl_LoadTest.jmx`.
- Se serializaron las operaciones de escritura del parqueadero para proteger el estado ante solicitudes concurrentes.
- Se cambio la escritura JSON a reemplazo atomico mediante archivo temporal y `rename`.
- Se separaron los scripts de pruebas funcionales y rendimiento para que `npm test` no ejecute carga accidentalmente.

## Recomendaciones

- Migrar la persistencia a una base de datos transaccional si el sistema pasa de prototipo a produccion.
- Agregar indices por placa y estado cuando exista base de datos.
- Mantener historicos paginados para no cargar todo el archivo en cada consulta.
- Ejecutar pruebas mas largas, por ejemplo 5, 15 y 30 minutos, para observar degradacion sostenida.
