# Plan de pruebas unitarias de ParkControl

## Objetivo

Verificar y validar las reglas centrales de ParkControl: normalizacion de placas, validacion de vehiculos, disponibilidad de cupos, apertura y cierre de tiquetes, calculo tarifario y lectura de cuerpos JSON.

## Alcance

Las pruebas cubren componentes de dominio y utilidades de servidor:

- `src/domain/tariffCalculator.js`
- `src/domain/parkingLot.js`
- `src/server/httpUtils.js`

## Enfoque TDD

El proyecto usa pruebas automatizadas con el ciclo:

1. Definir comportamiento esperado.
2. Implementar la regla minima.
3. Refactorizar manteniendo la suite en verde.

## Patron AAA

Las pruebas estan redactadas con estructura:

- Arrange: preparar datos, instancia o escenario.
- Act: ejecutar la accion del sistema.
- Assert: validar resultado o error esperado.

## Given-When-Then

Los nombres de las pruebas usan el formato:

```text
Given <contexto> When <accion> Then <resultado>
```

## Casos cubiertos

| ID | Componente | Escenario | Resultado esperado |
| --- | --- | --- | --- |
| TC-01 | TariffCalculator | Normalizar placa con espacios | Placa en mayusculas sin espacios |
| TC-02 | TariffCalculator | Placa invalida | Error de validacion |
| TC-03 | TariffCalculator | Tipo de vehiculo desconocido | Error de tipo no soportado |
| TC-04 | TariffCalculator | Estadia corta | Cobro minimo e IVA |
| TC-05 | TariffCalculator | Estadia extensa | Aplicacion de tope diario |
| TC-06 | TariffCalculator | Salida anterior a entrada | Error de fecha |
| TC-07 | ParkingLot | Registrar ingreso con cupo | Tiquete abierto y cupo ocupado |
| TC-08 | ParkingLot | Placa duplicada | Rechazo de ingreso |
| TC-09 | ParkingLot | Cupos agotados | Rechazo por disponibilidad |
| TC-10 | ParkingLot | Cierre de tiquete | Factura COP y estado cerrado |
| TC-11 | ParkingLot | Cierre sin tiquete | Error de tiquete inexistente |
| TC-12 | ParkingLot | Historial de movimientos | Orden descendente por entrada |
| TC-13 | HttpUtils | Solicitud sin cuerpo | Objeto vacio |
| TC-14 | HttpUtils | JSON valido | Objeto parseado |
| TC-15 | HttpUtils | JSON invalido | Error de JSON |

## Criterio de aceptacion

- Todas las pruebas deben pasar.
- La cobertura global debe ser superior al 75%.
- Las pruebas deben ser reproducibles con comandos de `npm`.
