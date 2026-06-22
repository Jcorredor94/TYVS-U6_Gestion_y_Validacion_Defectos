#!/usr/bin/env python3
"""Analiza performance/results/results.jtl (JMeter) -> estadisticas + graficas.

Agrupa por escenario (prefijo de la etiqueta antes de ' - ').
Salidas: results/statistics.{csv,json} y evidencias/*.png
"""
import csv
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERF = os.path.join(ROOT, "performance")
JTL = os.path.join(PERF, "results", "results.jtl")
RES = os.path.join(PERF, "results")
EVI = os.path.join(PERF, "evidencias")
os.makedirs(EVI, exist_ok=True)

ORDER = ["Baseline", "Load", "Stress", "Spike", "Soak"]
SLO_P95 = 300.0
SLO_P99 = 800.0
SLO_ERR = 1.0
C = {"Baseline": "#2563eb", "Load": "#0d9488", "Stress": "#d97706",
     "Spike": "#dc2626", "Soak": "#7c3aed"}


def pct(vals, p):
    if not vals:
        return 0.0
    k = (len(vals) - 1) * (p / 100.0)
    f = int(k); c = min(f + 1, len(vals) - 1)
    if f == c:
        return float(vals[f])
    return vals[f] + (vals[c] - vals[f]) * (k - f)


def scenario_of(label):
    return label.split(" - ")[0].strip()


def has_header(path):
    with open(path) as f:
        first = f.readline()
    return first.startswith("timeStamp")


def load():
    rows = {s: [] for s in ORDER}
    cols = None
    with open(JTL) as f:
        reader = csv.reader(f)
        for i, r in enumerate(reader):
            if i == 0 and r and r[0] == "timeStamp":
                cols = {name: idx for idx, name in enumerate(r)}
                continue
            if len(r) < 8:
                continue
            try:
                if cols:
                    ts = int(r[cols["timeStamp"]]); el = int(r[cols["elapsed"]])
                    lbl = r[cols["label"]]; ok = r[cols["success"]].lower() == "true"
                    allt = int(r[cols.get("allThreads", 10)]) if "allThreads" in cols else 0
                else:
                    ts = int(r[0]); el = int(r[1]); lbl = r[2]
                    ok = r[7].lower() == "true"; allt = int(r[10]) if len(r) > 10 else 0
            except (ValueError, IndexError, KeyError):
                continue
            scn = scenario_of(lbl)
            if scn in rows:
                rows[scn].append((ts, el, ok, allt))
    return rows


def compute(rows):
    out = []
    for s in ORDER:
        d = rows.get(s, [])
        if not d:
            continue
        els = sorted(e for _, e, _, _ in d)
        ts0 = min(t for t, _, _, _ in d); ts1 = max(t + e for t, e, _, _ in d)
        dur = max((ts1 - ts0) / 1000.0, 0.001)
        n = len(d); errs = sum(1 for _, _, ok, _ in d if not ok)
        maxc = max((a for _, _, _, a in d), default=0)
        out.append({
            "scenario": s, "samples": n, "errors": errs,
            "error_pct": round(100.0 * errs / n, 2),
            "avg_ms": round(sum(els) / n, 1), "min_ms": els[0], "max_ms": els[-1],
            "median_ms": round(pct(els, 50), 1), "p90_ms": round(pct(els, 90), 1),
            "p95_ms": round(pct(els, 95), 1), "p99_ms": round(pct(els, 99), 1),
            "throughput_rps": round(n / dur, 1), "max_concurrency": maxc,
            "duration_s": round(dur, 1),
            "slo_p95_ok": pct(els, 95) < SLO_P95,
            "slo_p99_ok": pct(els, 99) < SLO_P99,
            "slo_err_ok": (100.0 * errs / n) < SLO_ERR,
        })
    return out


def save_tables(stats):
    with open(os.path.join(RES, "statistics.json"), "w") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    cols = ["scenario", "samples", "errors", "error_pct", "avg_ms", "min_ms",
            "median_ms", "p90_ms", "p95_ms", "p99_ms", "max_ms",
            "throughput_rps", "max_concurrency", "duration_s"]
    with open(os.path.join(RES, "statistics.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for s in stats:
            w.writerow(s)


def md_table(stats):
    h = ("| Escenario | Muestras | Error % | Avg (ms) | p50 | p90 | p95 | p99 |"
         " Max | Throughput (req/s) | Concurrencia |")
    lines = [h, "|" + "---|" * 12]
    for s in stats:
        lines.append("| {scenario} | {samples} | {error_pct} | {avg_ms} | "
                     "{median_ms} | {p90_ms} | {p95_ms} | {p99_ms} | {max_ms} | "
                     "{throughput_rps} | {max_concurrency} |".format(**s))
    return "\n".join(lines)


def _ax(ax):
    ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
    ax.grid(axis="y", alpha=0.25, lw=0.7)


def chart_latency(stats):
    import numpy as np
    names = [s["scenario"] for s in stats]
    x = np.arange(len(names)); w = 0.27
    fig, ax = plt.subplots(figsize=(9, 4.8))
    ax.bar(x - w, [s["avg_ms"] for s in stats], w, label="Avg", color="#94a3b8")
    ax.bar(x, [s["p95_ms"] for s in stats], w, label="p95", color="#2563eb")
    ax.bar(x + w, [s["p99_ms"] for s in stats], w, label="p99", color="#dc2626")
    ax.axhline(SLO_P95, color="#2563eb", ls="--", lw=1, alpha=.7)
    ax.axhline(SLO_P99, color="#dc2626", ls="--", lw=1, alpha=.7)
    ax.text(len(names)-.5, SLO_P95+8, "SLO p95=300ms", color="#2563eb", ha="right", fontsize=8)
    ax.text(len(names)-.5, SLO_P99+8, "SLO p99=800ms", color="#dc2626", ha="right", fontsize=8)
    ax.set_xticks(x); ax.set_xticklabels(names); ax.set_ylabel("ms")
    ax.set_title("Latencia por escenario (Avg / p95 / p99) vs SLO")
    ax.legend(frameon=False); _ax(ax); fig.tight_layout()
    fig.savefig(os.path.join(EVI, "01_latencia_por_escenario.png"), dpi=130); plt.close(fig)


def chart_throughput(stats):
    names = [s["scenario"] for s in stats]; vals = [s["throughput_rps"] for s in stats]
    fig, ax = plt.subplots(figsize=(9, 4.4))
    b = ax.bar(names, vals, color=[C[n] for n in names])
    for bar, v in zip(b, vals):
        ax.text(bar.get_x()+bar.get_width()/2, v, f"{v:.0f}", ha="center", va="bottom", fontsize=9)
    ax.set_ylabel("Throughput (req/s)")
    ax.set_title("Throughput por escenario (lectura escala; escritura se estanca)")
    _ax(ax); fig.tight_layout()
    fig.savefig(os.path.join(EVI, "02_throughput_por_escenario.png"), dpi=130); plt.close(fig)


def chart_timeline(rows):
    fig, ax = plt.subplots(figsize=(11, 4.8))
    avail = [s for s in ORDER if rows.get(s)]
    t0 = min(min(t for t, _, _, _ in rows[s]) for s in avail)
    for s in avail:
        xs = [(t - t0)/1000.0 for t, _, _, _ in rows[s]]
        ys = [e for _, e, _, _ in rows[s]]
        ax.scatter(xs, ys, s=4, alpha=.25, color=C[s], label=s)
    ax.axhline(SLO_P95, color="#1e293b", ls="--", lw=1, alpha=.6)
    ax.text(0, SLO_P95+10, "SLO p95=300ms", fontsize=8)
    ax.set_xlabel("Tiempo de ejecucion (s)"); ax.set_ylabel("Tiempo de respuesta (ms)")
    ax.set_title("Linea de tiempo del tiempo de respuesta por fase")
    ax.legend(frameon=False, markerscale=3, loc="upper left"); _ax(ax); fig.tight_layout()
    fig.savefig(os.path.join(EVI, "03_timeline_latencia.png"), dpi=130); plt.close(fig)


def chart_conc(rows):
    fig, ax = plt.subplots(figsize=(9, 4.8))
    for s in ORDER:
        d = rows.get(s, [])
        if not d:
            continue
        ax.scatter([a for _, _, _, a in d], [e for _, e, _, _ in d],
                   s=5, alpha=.18, color=C[s], label=s)
    ax.set_xlabel("Hilos concurrentes activos"); ax.set_ylabel("Tiempo de respuesta (ms)")
    ax.set_title("Concurrencia vs Latencia (evidencia de encolamiento)")
    ax.legend(frameon=False, markerscale=3); _ax(ax); fig.tight_layout()
    fig.savefig(os.path.join(EVI, "04_concurrencia_vs_latencia.png"), dpi=130); plt.close(fig)


def chart_slo(stats):
    names = [s["scenario"] for s in stats]; p95 = [s["p95_ms"] for s in stats]
    fig, ax = plt.subplots(figsize=(9, 4.4))
    colors = ["#16a34a" if v < SLO_P95 else "#dc2626" for v in p95]
    b = ax.bar(names, p95, color=colors)
    ax.axhline(SLO_P95, color="#1e293b", ls="--", lw=1.2)
    ax.text(len(names)-.5, SLO_P95+8, "Umbral SLO p95=300ms", ha="right", fontsize=8)
    for bar, v in zip(b, p95):
        ax.text(bar.get_x()+bar.get_width()/2, v, "CUMPLE" if v < SLO_P95 else "INCUMPLE",
                ha="center", va="bottom", fontsize=8,
                color="#16a34a" if v < SLO_P95 else "#dc2626")
    ax.set_ylabel("p95 (ms)"); ax.set_title("Cumplimiento de SLO p95 por escenario")
    _ax(ax); fig.tight_layout()
    fig.savefig(os.path.join(EVI, "05_cumplimiento_slo_p95.png"), dpi=130); plt.close(fig)


def main():
    rows = load(); stats = compute(rows); save_tables(stats)
    chart_latency(stats); chart_throughput(stats); chart_timeline(rows)
    chart_conc(rows); chart_slo(stats)
    print(md_table(stats))
    print("\nGraficas en performance/evidencias/:")
    for fn in sorted(os.listdir(EVI)):
        print("  -", fn)


if __name__ == "__main__":
    main()
