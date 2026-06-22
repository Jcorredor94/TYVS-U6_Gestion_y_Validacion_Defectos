import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ParkingLot, DEFAULT_CAPACITY } from '../domain/parkingLot.js';
import { DEFAULT_TARIFFS } from '../domain/tariffCalculator.js';
import { JsonStore } from '../storage/jsonStore.js';
import { readJsonBody, sendError, sendJson } from './httpUtils.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '../..');
const publicDir = join(rootDir, 'public');
const dataPath = join(rootDir, 'data', 'parking-lot.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const store = new JsonStore(dataPath, {
  capacity: DEFAULT_CAPACITY,
  tariffs: DEFAULT_TARIFFS,
  tickets: []
});

async function loadLot() {
  return new ParkingLot(await store.read());
}

async function saveLot(lot) {
  await store.write(lot.toJSON());
}

let lotOperation = Promise.resolve();

async function updateLot(action) {
  const operation = lotOperation.then(async () => {
    const lot = await loadLot();
    const result = action(lot);
    await saveLot(lot);
    return result;
  });

  lotOperation = operation.catch(() => {});
  return operation;
}

export function resolveStaticFilePath(pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(publicDir, `.${requestedPath}`);

  if (!filePath.startsWith(publicDir)) {
    const error = new Error('Ruta no permitida.');
    error.statusCode = 403;
    throw error;
  }

  return filePath;
}

async function serveStatic(request, response) {
  const url = new URL(request.url, 'http://localhost');

  try {
    const filePath = resolveStaticFilePath(url.pathname);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error('No encontrado.');
    }

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream'
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendError(response, new Error('Recurso no encontrado.'), 404);
  }
}

async function handleApi(request, response) {
  const url = new URL(request.url, 'http://localhost');

  if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    const lot = await loadLot();
    sendJson(response, 200, {
      ok: true,
      occupancy: lot.getOccupancy(),
      openTickets: lot.getOpenTickets(),
      history: lot.getHistory().slice(0, 20),
      tariffs: lot.tariffs
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/entries') {
    const payload = await readJsonBody(request);
    const ticket = await updateLot((currentLot) => currentLot.registerEntry(payload));
    sendJson(response, 201, { ok: true, ticket });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/exits') {
    const payload = await readJsonBody(request);
    const ticket = await updateLot((currentLot) => currentLot.closeTicket(payload));
    sendJson(response, 200, { ok: true, ticket });
    return;
  }

  sendError(response, new Error('Endpoint no encontrado.'), 404);
}

export function createParkingServer() {
  return createServer(async (request, response) => {
    try {
      if (request.url.startsWith('/api/')) {
        await handleApi(request, response);
        return;
      }

      await serveStatic(request, response);
    } catch (error) {
      sendError(response, error);
    }
  });
}
