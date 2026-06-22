import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const DATA_PATH = resolve('data/parking-lot.json');
const RESULTS_DIR = resolve('performance/results');
const SUMMARY_PATH = resolve(RESULTS_DIR, 'performance-summary.json');
const CSV_PATH = resolve(RESULTS_DIR, 'performance-results.csv');
const MD_PATH = resolve(RESULTS_DIR, 'performance-summary.md');
const SVG_PATH = resolve(RESULTS_DIR, 'throughput-chart.svg');

const scenarios = [
  {
    name: 'Dashboard baseline',
    users: 5,
    rampUpSeconds: 5,
    durationSeconds: 8,
    run: async () => request('GET', '/api/dashboard')
  },
  {
    name: 'Flujo ingreso salida',
    users: 8,
    rampUpSeconds: 8,
    durationSeconds: 8,
    run: async (worker, iteration) => {
      const plate = `P${String(worker).padStart(2, '0')}${String(iteration).padStart(3, '0')}`;
      const entryTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
      const exitTime = new Date().toISOString();
      await request('POST', '/api/entries', { plate, vehicleType: 'car', ownerName: 'Carga automatica', entryTime });
      return request('POST', '/api/exits', { plate, exitTime });
    }
  },
  {
    name: 'Pico consultas dashboard',
    users: 20,
    rampUpSeconds: 5,
    durationSeconds: 8,
    run: async () => request('GET', '/api/dashboard')
  }
];

async function request(method, path, body) {
  const start = process.hrtime.bigint();
  let status = 0;
  let ok = false;
  let error = '';

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    status = response.status;
    const data = await response.json().catch(() => ({}));
    ok = response.ok && data.ok !== false;
    if (!ok) {
      error = data.error ?? response.statusText;
    }
  } catch (requestError) {
    error = requestError.message;
  }

  const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  return { method, path, status, ok, error, durationMs };
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function runScenario(scenario) {
  const records = [];
  const startedAt = Date.now();
  const durationMs = scenario.durationSeconds * 1000;

  async function worker(id) {
    const rampDelay = scenario.users <= 1 ? 0 : (id / scenario.users) * scenario.rampUpSeconds * 1000;
    await new Promise((resolve) => setTimeout(resolve, rampDelay));
    let iteration = 0;
    while (Date.now() - startedAt < durationMs) {
      iteration += 1;
      const result = await scenario.run(id, iteration);
      records.push({
        scenario: scenario.name,
        worker: id,
        iteration,
        timestamp: new Date().toISOString(),
        ...result
      });
    }
  }

  await Promise.all(Array.from({ length: scenario.users }, (_, index) => worker(index + 1)));
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const durations = records.map((record) => record.durationMs);
  const errors = records.filter((record) => !record.ok).length;

  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  const minDuration = durations.reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
  const maxDuration = durations.reduce((max, value) => Math.max(max, value), 0);

  return {
    name: scenario.name,
    users: scenario.users,
    rampUpSeconds: scenario.rampUpSeconds,
    durationSeconds: scenario.durationSeconds,
    samples: records.length,
    errors,
    errorRate: records.length ? errors / records.length : 0,
    throughput: records.length / elapsedSeconds,
    averageMs: totalDuration / Math.max(1, durations.length),
    minMs: durations.length ? minDuration : 0,
    maxMs: durations.length ? maxDuration : 0,
    p90Ms: percentile(durations, 90),
    p95Ms: percentile(durations, 95),
    records
  };
}

function round(value) {
  return Number(value.toFixed(2));
}

function csvEscape(value) {
  const text = String(value ?? '');
  return text.includes(',') || text.includes('"') ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeOutputs(summary) {
  await mkdir(RESULTS_DIR, { recursive: true });
  const allRecords = summary.scenarios.flatMap((scenario) => scenario.records);
  const csv = [
    'scenario,worker,iteration,timestamp,method,path,status,ok,durationMs,error',
    ...allRecords.map((record) => [
      record.scenario,
      record.worker,
      record.iteration,
      record.timestamp,
      record.method,
      record.path,
      record.status,
      record.ok,
      round(record.durationMs),
      record.error
    ].map(csvEscape).join(','))
  ].join('\n');

  const slimSummary = {
    ...summary,
    scenarios: summary.scenarios.map(({ records, ...scenario }) => ({
      ...scenario,
      throughput: round(scenario.throughput),
      averageMs: round(scenario.averageMs),
      minMs: round(scenario.minMs),
      maxMs: round(scenario.maxMs),
      p90Ms: round(scenario.p90Ms),
      p95Ms: round(scenario.p95Ms),
      errorRate: round(scenario.errorRate * 100)
    }))
  };

  const mdRows = slimSummary.scenarios.map((scenario) => `| ${scenario.name} | ${scenario.users} | ${scenario.rampUpSeconds}s | ${scenario.durationSeconds}s | ${scenario.samples} | ${scenario.throughput} req/s | ${scenario.averageMs} ms | ${scenario.p95Ms} ms | ${scenario.errorRate}% |`).join('\n');
  const md = `# Resultados de rendimiento ParkControl\n\nFecha: ${summary.executedAt}\nBase URL: ${BASE_URL}\n\n| Escenario | Usuarios | Ramp-up | Duracion | Muestras | Throughput | Promedio | P95 | Error |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${mdRows}\n`;

  const maxThroughput = Math.max(...slimSummary.scenarios.map((scenario) => scenario.throughput), 1);
  const bars = slimSummary.scenarios.map((scenario, index) => {
    const width = Math.max(8, (scenario.throughput / maxThroughput) * 360);
    const y = 54 + index * 54;
    return `<text x="24" y="${y}" font-size="13" fill="#1d1d1f">${scenario.name}</text><rect x="220" y="${y - 15}" width="${width}" height="20" rx="4" fill="#146c5f"/><text x="${230 + width}" y="${y}" font-size="12" fill="#1d1d1f">${scenario.throughput} req/s</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="230" viewBox="0 0 680 230"><rect width="680" height="230" fill="#f5f5f7"/><text x="24" y="30" font-size="18" font-family="Arial" font-weight="700" fill="#1d1d1f">Throughput por escenario - ParkControl</text>${bars}</svg>`;

  await writeFile(SUMMARY_PATH, `${JSON.stringify(slimSummary, null, 2)}\n`);
  await writeFile(CSV_PATH, `${csv}\n`);
  await writeFile(MD_PATH, md);
  await writeFile(SVG_PATH, svg);
}

async function main() {
  await mkdir(dirname(SUMMARY_PATH), { recursive: true });
  const originalData = existsSync(DATA_PATH) ? await readFile(DATA_PATH, 'utf8') : null;
  const executedAt = new Date().toISOString();
  const scenarioResults = [];

  try {
    await request('GET', '/api/dashboard');
    for (const scenario of scenarios) {
      console.log(`Running: ${scenario.name}`);
      scenarioResults.push(await runScenario(scenario));
    }
  } finally {
    if (originalData !== null) {
      await writeFile(DATA_PATH, originalData);
    }
  }

  const summary = {
    executedAt,
    baseUrl: BASE_URL,
    scenarios: scenarioResults
  };
  await writeOutputs(summary);
  console.log(`Summary: ${SUMMARY_PATH}`);
  console.log(`CSV: ${CSV_PATH}`);
  console.log(`Chart: ${SVG_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
