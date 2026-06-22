import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createParkingServer, resolveStaticFilePath } from '../src/server/app.js';

const DATA_PATH = resolve('data/parking-lot.json');

let server;
let baseUrl;
let originalData;

function listen(app) {
  return new Promise((resolveListen) => {
    app.listen(0, '127.0.0.1', () => resolveListen(app));
  });
}

function close(app) {
  return new Promise((resolveClose, reject) => {
    app.close((error) => error ? reject(error) : resolveClose());
  });
}

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  return { response, body };
}

describe('ParkControl e2e - servidor HTTP', () => {
  before(async () => {
    originalData = existsSync(DATA_PATH) ? await readFile(DATA_PATH, 'utf8') : null;
    server = await listen(createParkingServer());
    const address = server.address();
    baseUrl = `http://${address.address}:${address.port}`;
  });

  after(async () => {
    if (server) {
      await close(server);
    }

    if (originalData !== null) {
      await writeFile(DATA_PATH, originalData, 'utf8');
    }
  });



  it('Given ruta estatica fuera de public When se resuelve Then rechaza traversal', () => {
    assert.throws(
      () => resolveStaticFilePath('/../../data/parking-lot.json'),
      (error) => error.message.includes('Ruta no permitida') && error.statusCode === 403
    );
  });

  it('Given la app web When se abre la raiz Then sirve la interfaz ParkControl', async () => {
    const { response, body } = await request('/');

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(body, /ParkControl/);
  });

  it('Given recursos estaticos When se solicitan CSS JS imagen y directorio Then responde correctamente', async () => {
    await mkdir(resolve('public/e2e-directory'), { recursive: true });

    const css = await request('/styles.css');
    const js = await request('/app.js');
    const image = await request('/parking-hero.png');
    const directory = await request('/e2e-directory');
    const missing = await request('/missing.css');

    assert.equal(css.response.status, 200);
    assert.match(css.response.headers.get('content-type'), /text\/css/);
    assert.equal(js.response.status, 200);
    assert.match(js.response.headers.get('content-type'), /text\/javascript/);
    assert.equal(image.response.status, 200);
    assert.equal(image.response.headers.get('content-type'), 'application/octet-stream');
    assert.equal(directory.response.status, 404);
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.ok, false);

    await rm(resolve('public/e2e-directory'), { recursive: true, force: true });
  });

  it('Given flujo operativo When registra y liquida Then actualiza tablero y genera factura', async () => {
    const plate = `E2E${Date.now().toString().slice(-6)}`;
    const entryTime = '2026-06-08T10:00:00.000Z';
    const exitTime = '2026-06-08T11:15:00.000Z';

    const entry = await request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plate: ` ${plate.toLowerCase()} `, vehicleType: 'car', ownerName: ' Yerlinson ', entryTime })
    });

    assert.equal(entry.response.status, 201);
    assert.equal(entry.body.ok, true);
    assert.equal(entry.body.ticket.plate, plate);
    assert.equal(entry.body.ticket.ownerName, 'Yerlinson');

    const openDashboard = await request('/api/dashboard');
    assert.equal(openDashboard.response.status, 200);
    assert.equal(openDashboard.body.ok, true);
    assert.ok(openDashboard.body.openTickets.some((ticket) => ticket.plate === plate));
    assert.equal(openDashboard.body.tariffs.car.minuteRate, 95);

    const exit = await request('/api/exits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plate: plate.toLowerCase(), exitTime })
    });

    assert.equal(exit.response.status, 200);
    assert.equal(exit.body.ok, true);
    assert.equal(exit.body.ticket.status, 'closed');
    assert.equal(exit.body.ticket.invoice.currency, 'COP');
    assert.equal(exit.body.ticket.invoice.chargedMinutes, 75);
    assert.equal(exit.body.ticket.invoice.total, 8479);

    const closedDashboard = await request('/api/dashboard');
    assert.ok(closedDashboard.body.history.some((ticket) => ticket.plate === plate && ticket.status === 'closed'));
  });

  it('Given errores de API When envia datos invalidos Then responde JSON de error', async () => {
    const invalidJson = await request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json}'
    });
    const unsupportedEndpoint = await request('/api/unknown');
    const unsupportedVehicle = await request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plate: 'BAD123', vehicleType: 'truck' })
    });

    assert.equal(invalidJson.response.status, 400);
    assert.equal(invalidJson.body.ok, false);
    assert.match(invalidJson.body.error, /JSON valido/);
    assert.equal(unsupportedEndpoint.response.status, 404);
    assert.equal(unsupportedEndpoint.body.ok, false);
    assert.equal(unsupportedVehicle.response.status, 400);
    assert.match(unsupportedVehicle.body.error, /no soportado/i);
  });

  it('Given error inesperado When el servidor falla Then responde error controlado', async () => {
    const failingServer = createServer(async (incoming, outgoing) => {
      const brokenRequest = { url: null };
      const app = createParkingServer();
      app.emit('request', brokenRequest, outgoing);
      incoming.resume();
    });
    await listen(failingServer);
    const address = failingServer.address();

    try {
      const response = await fetch(`http://${address.address}:${address.port}/api/dashboard`);
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.ok, false);
    } finally {
      await close(failingServer);
    }
  });
});
