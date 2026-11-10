import { expect, test, type Page } from '@playwright/test';
import { pokemonDetail, pokemonList } from './fixtures/pokemon';

interface ApiOptions {
  failListOnce?: boolean;
  failDetailOnce?: boolean;
}

async function mockApi(page: Page, options: ApiOptions = {}) {
  let failList = options.failListOnce ?? false;
  let failDetail = options.failDetailOnce ?? false;
  const calls: string[] = [];
  await page.route('https://pokeapi.co/api/v2/pokemon**', async (route) => {
    const url = new URL(route.request().url());
    calls.push(url.pathname + url.search);
    const identifier = url.pathname.replace(/^\/api\/v2\/pokemon\/?/, '').replace(/\/$/, '');
    if ((!identifier && failList) || (identifier && failDetail)) {
      failList = false;
      failDetail = false;
      await route.fulfill({ status: 503, body: 'Service unavailable' });
      return;
    }
    const data = identifier
      ? pokemonDetail(decodeURIComponent(identifier))
      : pokemonList(Number(url.searchParams.get('offset') ?? 0), Number(url.searchParams.get('limit') ?? 25));
    await route.fulfill({
      status: data ? 200 : 404,
      contentType: data ? 'application/json' : 'text/plain',
      body: data ? JSON.stringify(data) : 'Not Found',
    });
  });
  // El recurso local conserva la URL oficial que debe escoger la aplicación.
  await page.route('https://raw.githubusercontent.com/PokeAPI/sprites/**', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="36" fill="#9ac980"/></svg>',
  }));
  return calls;
}

const visiblePage = (page: Page) => page.locator('app-detail:not(.ion-page-hidden)');

test('carga 25 Pokémon y añade una segunda página sin duplicados', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/pokemon');
  const rows = page.locator('ion-item.pokemon-item');
  await expect(rows).toHaveCount(25);
  await expect(rows.first()).toContainText('Bulbasaur');
  await expect(rows.last()).toContainText('Pikachu');
  await page.getByRole('button', { name: 'Cargar 25 más' }).click();
  await expect(rows).toHaveCount(50);
  await expect(rows.last()).toContainText('Diglett');
  const labels = await rows.allTextContents();
  expect(new Set(labels).size).toBe(50);
  expect(calls.some((call) => call.includes('offset=25'))).toBe(true);
});

test('abre una ficha, convierte las unidades y muestra las seis estadísticas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const calls = await mockApi(page);
  await page.goto('/pokemon');
  await page.locator('ion-item.pokemon-item').filter({ hasText: 'Bulbasaur' }).click();
  await expect(page).toHaveURL(/\/detail\/1$/);
  const detail = visiblePage(page);
  await expect(detail.getByRole('heading', { name: 'Bulbasaur', exact: true })).toBeVisible();
  await expect(detail.locator('ion-badge').filter({ hasText: 'Planta' })).toBeVisible();
  await expect(detail.locator('ion-badge').filter({ hasText: 'Veneno' })).toBeVisible();
  await expect(detail).toContainText(/0[,.]7\s*m/);
  await expect(detail).toContainText(/6[,.]9\s*kg/);
  await expect(detail.locator('img.pokemon-artwork')).toHaveAttribute('src', /official-artwork\/1\.png$/);
  await expect(detail.locator('ion-progress-bar')).toHaveCount(6);
  const progress = await detail.locator('ion-progress-bar').first().evaluate((element) => (element as HTMLElement & { value: number }).value);
  expect(progress).toBeCloseTo(45 / 255, 5);
  expect(calls.some((call) => /\/pokemon\/1\/?$/.test(call))).toBe(true);
  await detail.locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/pokemon$/);
  await expect(page.locator('ion-item.pokemon-item')).toHaveCount(25);
  expect(errors).toEqual([]);
});

test('admite un detalle por URL directa y el regreso al listado', async ({ page }) => {
  await mockApi(page);
  await page.goto('/detail/25');
  const detail = visiblePage(page);
  await expect(detail.getByRole('heading', { name: 'Pikachu', exact: true })).toBeVisible();
  await expect(detail).toContainText(/0[,.]4\s*m/);
  await expect(detail).toContainText(/6(?:[,.]0)?\s*kg/);
  await detail.locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/pokemon$/);
  await expect(page.locator('ion-item.pokemon-item')).toHaveCount(25);
});

test('busca por número y permite restaurar el listado', async ({ page }) => {
  await mockApi(page);
  await page.goto('/pokemon');
  await expect(page.locator('ion-item.pokemon-item')).toHaveCount(25);
  await page.locator('ion-searchbar input').fill('25');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.locator('ion-item.pokemon-item')).toHaveCount(1);
  await expect(page.locator('ion-item.pokemon-item')).toContainText('Pikachu');
  await page.getByRole('button', { name: 'Ver todos', exact: true }).click();
  await expect(page.locator('ion-item.pokemon-item')).toHaveCount(25);
});

test('reintenta una petición de listado fallida', async ({ page }) => {
  await mockApi(page, { failListOnce: true });
  await page.goto('/pokemon');
  await page.getByRole('button', { name: /reintentar/i }).click();
  await expect(page.locator('ion-item.pokemon-item')).toHaveCount(25);
});

test('reintenta una ficha después de un error temporal', async ({ page }) => {
  await mockApi(page, { failDetailOnce: true });
  await page.goto('/detail/1');
  const detail = visiblePage(page);
  await detail.getByRole('button', { name: /reintentar/i }).click();
  await expect(detail.getByRole('heading', { name: 'Bulbasaur', exact: true })).toBeVisible();
});

test('un ID inexistente no produce una ficha incompleta', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mockApi(page);
  await page.goto('/detail/999999');
  const detail = visiblePage(page);
  await expect(detail.getByRole('heading', { name: 'Esta ficha no existe', exact: true })).toBeVisible();
  await expect(detail.locator('ion-progress-bar')).toHaveCount(0);
  await detail.locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/pokemon$/);
  expect(errors).toEqual([]);
});
