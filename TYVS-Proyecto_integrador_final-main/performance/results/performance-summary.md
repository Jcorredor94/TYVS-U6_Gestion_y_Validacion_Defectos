# Resultados de rendimiento ParkControl

Fecha: 2026-06-17T00:47:14.332Z
Base URL: http://127.0.0.1:3000

| Escenario | Usuarios | Ramp-up | Duracion | Muestras | Throughput | Promedio | P95 | Error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dashboard baseline | 5 | 5s | 8s | 54489 | 6810.27 req/s | 0.46 ms | 0.81 ms | 0% |
| Flujo ingreso salida | 8 | 8s | 8s | 1408 | 175.26 req/s | 10.01 ms | 27.84 ms | 0% |
| Pico consultas dashboard | 20 | 5s | 8s | 2670 | 330.81 req/s | 40.53 ms | 75.83 ms | 0% |
