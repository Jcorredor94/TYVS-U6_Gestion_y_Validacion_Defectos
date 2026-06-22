# Matriz de trazabilidad de ParkControl

| Requisito | Componente | Pruebas relacionadas |
| --- | --- | --- |
| Registrar ingreso de vehiculos | `ParkingLot.registerEntry` | TC-07 |
| Normalizar y validar placa | `normalizePlate` | TC-01, TC-02 |
| Validar tipo de vehiculo | `validateVehicleType` | TC-03 |
| Controlar cupos por tipo de vehiculo | `ParkingLot.getOccupancy`, `ParkingLot.hasAvailability` | TC-07, TC-09 |
| Impedir tiquetes duplicados por placa | `ParkingLot.registerEntry` | TC-08 |
| Liquidar salida de vehiculo | `ParkingLot.closeTicket` | TC-10, TC-11 |
| Calcular tarifa por tiempo de permanencia | `calculateParkingCharge` | TC-04, TC-05, TC-06 |
| Generar factura en pesos colombianos | `ParkingLot.closeTicket` | TC-10 |
| Consultar historial operativo | `ParkingLot.getHistory` | TC-12 |
| Procesar solicitudes JSON | `readJsonBody` | TC-13, TC-14, TC-15 |


## Pruebas de integracion

- `test/parkingLot.integration.test.js`: valida integracion entre dominio, tarifas y persistencia JSON.
- `docs/evidencia-integracion.md`: documenta escenarios, comando y resultado verificado.
