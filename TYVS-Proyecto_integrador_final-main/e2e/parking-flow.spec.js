import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_PATH = resolve('data/parking-lot.json');
let originalData = null;

test.beforeAll(async () => {
  originalData = existsSync(DATA_PATH) ? await readFile(DATA_PATH, 'utf8') : null;
});

test.afterAll(async () => {
  if (originalData !== null) {
    await writeFile(DATA_PATH, originalData, 'utf8');
  }
});

test('operador registra entrada, liquida salida y ve la factura de tirilla', async ({ page }) => {
  const plate = `PW${Date.now().toString().slice(-6)}`;

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ParkControl' })).toBeVisible();
  await expect(page.getByText('Grupo 09')).toBeVisible();

  const entryForm = page.locator('#entry-form');
  await entryForm.locator('input[name="plate"]').fill(plate.toLowerCase());
  await entryForm.getByText('Moto', { exact: true }).click();
  await entryForm.locator('input[name="ownerName"]').fill('Prueba Playwright');
  await entryForm.getByRole('button', { name: 'Registrar entrada' }).click();

  await expect(page.locator('#toast')).toContainText('Ingreso registrado correctamente');
  await expect(page.locator('#open-tickets')).toContainText(plate);
  await expect(page.locator('#open-tickets')).toContainText('Prueba Playwright');
  await expect(page.locator('#history')).toContainText(plate);

  const exitForm = page.locator('#exit-form');
  await exitForm.locator('input[name="plate"]').fill(plate);
  await exitForm.getByRole('button', { name: 'Liquidar y cerrar' }).click();

  const receipt = page.getByRole('dialog', { name: 'Tirilla de salida' });
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText('Factura POS');
  await expect(receipt).toContainText(plate);
  await expect(receipt).toContainText('Motocicleta');
  await expect(receipt).toContainText('Total');
  await expect(page.locator('#toast')).toContainText('Salida liquidada correctamente');

  await receipt.getByRole('button', { name: 'Cerrar' }).click();
  await expect(receipt).toBeHidden();

  await page.locator('#view-receipt').click();
  await expect(receipt).toBeVisible();
});

test('operador intenta liquidar una placa inexistente y recibe error visible', async ({ page }) => {
  await page.goto('/');

  const exitForm = page.locator('#exit-form');
  await exitForm.locator('input[name="plate"]').fill(`NO${Date.now().toString().slice(-6)}`);
  await exitForm.getByRole('button', { name: 'Liquidar y cerrar' }).click();

  await expect(page.locator('#toast')).toHaveClass(/error/);
  await expect(page.locator('#toast')).toContainText('No existe un tiquete abierto');
});
