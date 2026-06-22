import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateParkingCharge, getVehicleLabel, normalizePlate, validateVehicleType } from '../src/domain/tariffCalculator.js';

describe('Tariff calculator - Given entradas y salidas de vehiculos', () => {
  it('Given una placa con espacios When se normaliza Then queda en mayusculas', () => {
    assert.equal(normalizePlate(' abc 123 '), 'ABC123');
  });

  it('Given una placa invalida When se normaliza Then falla la validacion', () => {
    assert.throws(() => normalizePlate('??'), /placa/i);
  });

  it('Given placa no textual When se normaliza Then exige placa obligatoria', () => {
    assert.throws(() => normalizePlate(null), /obligatoria/i);
  });

  it('Given fechas invalidas When se liquida Then reporta fechas no validas', () => {
    assert.throws(
      () => calculateParkingCharge({
        vehicleType: 'car',
        entryTime: 'fecha-mala',
        exitTime: '2026-06-08T11:00:00.000Z'
      }),
      /validas/i
    );
  });

  it('Given etiqueta desconocida When se consulta Then devuelve el tipo recibido', () => {
    assert.equal(getVehicleLabel('scooter'), 'scooter');
  });


  it('Given un tipo de vehiculo desconocido When se valida Then rechaza la operacion', () => {
    assert.throws(() => validateVehicleType('truck'), /no soportado/i);
  });

  it('Given una estadia corta When se liquida Then cobra el minimo e IVA', () => {
    const charge = calculateParkingCharge({
      vehicleType: 'car',
      entryTime: '2026-06-08T10:00:00.000Z',
      exitTime: '2026-06-08T10:10:00.000Z'
    });

    assert.equal(charge.chargedMinutes, 10);
    assert.equal(charge.billableMinutes, 30);
    assert.equal(charge.subtotal, 2850);
    assert.equal(charge.tax, 542);
    assert.equal(charge.total, 3392);
  });

  it('Given una estadia extensa When se liquida Then aplica tope diario', () => {
    const charge = calculateParkingCharge({
      vehicleType: 'motorcycle',
      entryTime: '2026-06-08T06:00:00.000Z',
      exitTime: '2026-06-08T20:00:00.000Z'
    });

    assert.equal(charge.chargedMinutes, 840);
    assert.equal(charge.subtotal, 12000);
    assert.equal(charge.total, 14280);
  });

  it('Given una salida anterior a la entrada When se liquida Then informa error', () => {
    assert.throws(
      () => calculateParkingCharge({
        vehicleType: 'bicycle',
        entryTime: '2026-06-08T12:00:00.000Z',
        exitTime: '2026-06-08T11:59:00.000Z'
      }),
      /posterior/i
    );
  });
});
