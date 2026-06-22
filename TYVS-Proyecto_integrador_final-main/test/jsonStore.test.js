import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { JsonStore } from '../src/storage/jsonStore.js';

let tempDir;

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

describe('JsonStore - persistencia local', () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'parkcontrol-store-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('Given archivo inexistente When se lee Then crea datos iniciales', async () => {
    const filePath = join(tempDir, 'nested', 'parking.json');
    const initialData = { capacity: { car: 1 }, tickets: [] };
    const store = new JsonStore(filePath, initialData);

    const data = await store.read();

    assert.deepEqual(data, initialData);
    assert.deepEqual(await readJson(filePath), initialData);
    assert.notEqual(data, initialData);
  });

  it('Given datos existentes When escribe Then reemplaza el JSON de forma atomica', async () => {
    const filePath = join(tempDir, 'parking.json');
    const store = new JsonStore(filePath, { tickets: [] });
    const nextData = { tickets: [{ plate: 'ABC123', status: 'open' }] };

    await store.write(nextData);

    assert.deepEqual(await store.read(), nextData);
    assert.deepEqual(await readJson(filePath), nextData);
  });

  it('Given JSON corrupto When se lee Then propaga el error de parseo', async () => {
    const filePath = join(tempDir, 'parking.json');
    await writeFile(filePath, '{bad json}', 'utf8');
    const store = new JsonStore(filePath, { tickets: [] });

    await assert.rejects(() => store.read(), SyntaxError);
  });
});
