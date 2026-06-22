import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { ParkingLot } from '../src/domain/parkingLot.js';
import { DEFAULT_TARIFFS } from '../src/domain/tariffCalculator.js';
import { JsonStore } from '../src/storage/jsonStore.js';

let tempDir;

async function createStore(initialData) {
  const filePath = join(tempDir, 'parking-lot.json');
  return new JsonStore(filePath, initialData);
}

describe('Integracion - dominio, tarifas y persistencia', () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'parkcontrol-integration-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('Given estado persistido When registra y liquida Then conserva historial e invoice al recargar', async () => {
    const store = await createStore({
      capacity: { car: 2, motorcycle: 1, bicycle: 1 },
      tariffs: DEFAULT_TARIFFS,
      tickets: []
    });

    const lot = new ParkingLot(await store.read());
    const entry = lot.registerEntry({
      plate: 'int123',
      vehicleType: 'car',
      ownerName: 'Integracion Persistente',
      entryTime: '2026-06-08T07:00:00.000Z'
    });
    await store.write(lot.toJSON());

    assert.equal(entry.plate, 'INT123');
    assert.equal(lot.getOccupancy().car.occupied, 1);

    const lotAfterEntry = new ParkingLot(await store.read());
    assert.equal(lotAfterEntry.getOpenTickets().length, 1);
    assert.equal(lotAfterEntry.getOpenTickets()[0].ownerName, 'Integracion Persistente');

    const closedTicket = lotAfterEntry.closeTicket({
      plate: 'INT123',
      exitTime: '2026-06-08T08:05:00.000Z'
    });
    await store.write(lotAfterEntry.toJSON());

    assert.equal(closedTicket.status, 'closed');
    assert.equal(closedTicket.invoice.currency, 'COP');
    assert.equal(closedTicket.invoice.vehicleLabel, 'Automovil');
    assert.equal(closedTicket.invoice.chargedMinutes, 65);
    assert.equal(closedTicket.invoice.total, 7348);

    const persisted = JSON.parse(await readFile(store.filePath, 'utf8'));
    assert.equal(persisted.tickets[0].status, 'closed');
    assert.equal(persisted.tickets[0].invoice.number, 'FE-2026-1');

    const lotAfterExit = new ParkingLot(await store.read());
    assert.equal(lotAfterExit.getOpenTickets().length, 0);
    assert.equal(lotAfterExit.getHistory()[0].plate, 'INT123');
    assert.equal(lotAfterExit.getOccupancy().car.available, 2);
  });

  it('Given capacidad limitada When se recarga desde storage Then evita sobrecupo y duplicados', async () => {
    const store = await createStore({
      capacity: { car: 1 },
      tariffs: { car: DEFAULT_TARIFFS.car },
      tickets: []
    });

    const lot = new ParkingLot(await store.read());
    lot.registerEntry({ plate: 'AAA111', vehicleType: 'car' });
    await store.write(lot.toJSON());

    const reloadedLot = new ParkingLot(await store.read());

    assert.throws(
      () => reloadedLot.registerEntry({ plate: 'AAA111', vehicleType: 'car' }),
      /tiquete abierto/i
    );
    assert.throws(
      () => reloadedLot.registerEntry({ plate: 'BBB222', vehicleType: 'car' }),
      /No hay cupos/i
    );
  });

  it('Given multiples cierres When persiste movimientos Then incrementa consecutivo de factura', async () => {
    const store = await createStore({
      capacity: { motorcycle: 2 },
      tariffs: { motorcycle: DEFAULT_TARIFFS.motorcycle },
      tickets: []
    });

    const lot = new ParkingLot(await store.read());
    lot.registerEntry({ plate: 'MOT111', vehicleType: 'motorcycle', entryTime: '2026-06-08T09:00:00.000Z' });
    lot.closeTicket({ plate: 'MOT111', exitTime: '2026-06-08T09:45:00.000Z' });
    lot.registerEntry({ plate: 'MOT222', vehicleType: 'motorcycle', entryTime: '2026-06-08T10:00:00.000Z' });
    lot.closeTicket({ plate: 'MOT222', exitTime: '2026-06-08T10:45:00.000Z' });
    await store.write(lot.toJSON());

    const reloadedLot = new ParkingLot(await store.read());
    const invoices = reloadedLot.getHistory().map((ticket) => ticket.invoice.number).sort();

    assert.deepEqual(invoices, ['FE-2026-1', 'FE-2026-2']);
  });
});
