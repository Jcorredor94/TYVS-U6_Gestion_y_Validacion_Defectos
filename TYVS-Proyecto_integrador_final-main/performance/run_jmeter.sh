#!/usr/bin/env bash
###############################################################################
# run_jmeter.sh - Ejecucion reproducible de las pruebas de carga (ParkControl)
#
#   1. Respalda data/parking-lot.json y siembra capacidad alta (aisla el
#      cuello de botella de escritura serializada, no el de cupos).
#   2. Levanta el servidor Node (src/server/start.js).
#   3. Ejecuta los 5 escenarios JMeter (no-GUI) -> results/results.jtl
#   4. Genera estadisticas y graficas (analyze.py).
#   5. Restaura el archivo de datos original y detiene el servidor.
#
# Uso:
#   ./performance/run_jmeter.sh            # perfil demo (rapido)
#   PROFILE=full ./performance/run_jmeter.sh
#
# Requisitos: Apache JMeter 5.x en PATH, Node.js 22+, Python 3 (matplotlib, numpy)
###############################################################################
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
PROFILE="${PROFILE:-demo}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3000}"
PERF="${ROOT}/performance"
RESULTS="${PERF}/results"
DATA="${ROOT}/data/parking-lot.json"
mkdir -p "${RESULTS}"

echo ">> Perfil: ${PROFILE} | Objetivo: http://${HOST}:${PORT}"

# --- 1. Respaldo + semilla de capacidad alta -------------------------------
BACKUP="$(mktemp)"
[ -f "${DATA}" ] && cp "${DATA}" "${BACKUP}" || true
cat > "${DATA}" <<'JSON'
{
  "capacity": { "car": 1000000, "motorcycle": 1000000, "bicycle": 1000000 },
  "tariffs": {
    "car": { "minimumMinutes": 30, "minimumAmount": 2500, "minuteRate": 95, "dailyCap": 28000 },
    "motorcycle": { "minimumMinutes": 30, "minimumAmount": 1200, "minuteRate": 45, "dailyCap": 12000 },
    "bicycle": { "minimumMinutes": 30, "minimumAmount": 800, "minuteRate": 20, "dailyCap": 6000 }
  },
  "tickets": []
}
JSON

# --- 2. Servidor Node ------------------------------------------------------
echo ">> Iniciando servidor Node ..."
( PORT="${PORT}" HOST="${HOST}" node src/server/start.js ) > "${RESULTS}/server.log" 2>&1 &
SRV_PID=$!
restore() {
  kill "${SRV_PID}" 2>/dev/null || true
  [ -f "${BACKUP}" ] && cp "${BACKUP}" "${DATA}" && rm -f "${BACKUP}" || true
}
trap restore EXIT

for _ in $(seq 1 40); do
  curl -sf "http://${HOST}:${PORT}/api/dashboard" >/dev/null 2>&1 && break
  sleep 0.5
done
curl -sf "http://${HOST}:${PORT}/api/dashboard" >/dev/null || { echo "Servidor no responde"; exit 1; }
echo ">> Servidor listo."

# --- 3. Parametros por perfil ---------------------------------------------
if [ "${PROFILE}" = "full" ]; then
  P=( -Jbaseline.threads=20  -Jbaseline.rampup=5   -Jbaseline.duration=120
      -Jload.threads=100     -Jload.rampup=30      -Jload.duration=300
      -Jstress.threads=300   -Jstress.rampup=60    -Jstress.duration=240
      -Jspike.threads=400    -Jspike.rampup=5      -Jspike.duration=120
      -Jsoak.threads=60      -Jsoak.rampup=30      -Jsoak.duration=900 )
else
  P=( -Jbaseline.threads=10  -Jbaseline.rampup=2   -Jbaseline.duration=10
      -Jload.threads=40      -Jload.rampup=5       -Jload.duration=14
      -Jstress.threads=120   -Jstress.rampup=8     -Jstress.duration=14
      -Jspike.threads=160    -Jspike.rampup=2      -Jspike.duration=10
      -Jsoak.threads=16      -Jsoak.rampup=3       -Jsoak.duration=14 )
fi

# --- 4. JMeter -------------------------------------------------------------
echo ">> Ejecutando JMeter (no-GUI) ..."
rm -f "${RESULTS}/results.jtl" "${RESULTS}/jmeter.log"
jmeter -n -t performance/ParkControl_LoadTest.jmx \
       -l "${RESULTS}/results.jtl" -j "${RESULTS}/jmeter.log" \
       -Jhost="${HOST}" -Jport="${PORT}" "${P[@]}" \
       | tee "${RESULTS}/jmeter-console.txt"

# --- 5. Analisis -----------------------------------------------------------
echo ">> Generando estadisticas y graficas ..."
python3 performance/analyze.py

echo ">> Listo. Revisa performance/results/ y performance/evidencias/."
