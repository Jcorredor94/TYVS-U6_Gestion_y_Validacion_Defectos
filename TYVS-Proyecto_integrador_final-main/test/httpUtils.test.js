import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import { readJsonBody } from '../src/server/httpUtils.js';

describe('HTTP utilities - Lectura de JSON', () => {
  it('Given una solicitud sin cuerpo When se lee JSON Then retorna objeto vacio', async () => {
    const body = await readJsonBody(Readable.from([]));

    assert.deepEqual(body, {});
  });

  it('Given un cuerpo JSON valido When se lee Then retorna el objeto parseado', async () => {
    const body = await readJsonBody(Readable.from(['{"plate":"ABC123"}']));

    assert.deepEqual(body, { plate: 'ABC123' });
  });

  it('Given un cuerpo invalido When se lee Then reporta JSON no valido', async () => {
    await assert.rejects(
      () => readJsonBody(Readable.from(['{bad json}'])),
      /JSON valido/i
    );
  });
});
