import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Info,
  Layers3,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

import PublicLayout from "../components/layout/PublicLayout";
import { api } from "../lib/api";

const PERIODS = [
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
];

function numberPt(value, digits = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function signedUnits(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const sign = number > 0 ? "+" : "";

  return `${sign}${numberPt(number, 2)}u`;
}

function signedPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const sign = number > 0 ? "+" : "";

  return `${sign}${numberPt(number, 1)}%`;
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  highlight = false,
}) {
  return (
    <div className="vs-card p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-white/35">
          {label}
        </div>

        <Icon
          size={15}
          className={
            highlight
              ? "text-[#CCFF00]"
              : "text-white/30"
          }
        />
      </div>

      <div
        className={`font-display text-3xl mt-2 ${
          highlight
            ? "text-[#CCFF00]"
            : ""
        }`}
      >
        {value}
      </div>

      <div className="text-[10px] text-white/25 mt-1">
        {helper}
      </div>
    </div>
  );
}

function EquityChart({ points }) {
  const width = 720;
  const height = 220;
  const padding = 18;

  const values = points.map(
    (point) =>
      Number(point.profit_units) || 0
  );

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x =
        points.length <= 1
          ? padding
          : padding +
            (index / (points.length - 1)) *
              (width - padding * 2);

      const value =
        Number(point.profit_units) || 0;

      const y =
        padding +
        (1 - (value - min) / range) *
          (height - padding * 2);

      return `${
        index === 0 ? "M" : "L"
      } ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const zeroY =
    padding +
    (1 - (0 - min) / range) *
      (height - padding * 2);

  const lastValue =
    values.length > 0
      ? values[values.length - 1]
      : 0;

  return (
    <div className="vs-card p-5 md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
            <Activity size={12} />
            Curva flat
          </div>

          <h2 className="font-display text-2xl mt-1">
            Evolução em unidades
          </h2>
        </div>

        <div
          className={`font-display text-2xl ${
            lastValue >= 0
              ? "text-[#CCFF00]"
              : "text-red-400"
          }`}
        >
          {signedUnits(lastValue)}
        </div>
      </div>

      {points.length > 1 ? (
        <div className="mt-5 rounded-xl border border-white/[0.05] bg-black/20 overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            role="img"
            aria-label="Curva de performance em unidades"
          >
            <line
              x1="0"
              x2={width}
              y1={zeroY}
              y2={zeroY}
              stroke="currentColor"
              className="text-white/10"
              strokeWidth="1"
            />

            <path
              d={path}
              fill="none"
              stroke="currentColor"
              className={
                lastValue >= 0
                  ? "text-[#CCFF00]"
                  : "text-red-400"
              }
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : (
        <div className="mt-5 py-12 text-center text-sm text-white/35">
          Ainda não há amostra suficiente
          para desenhar a curva.
        </div>
      )}
    </div>
  );
}

function Breakdown({
  title,
  eyebrow,
  icon: Icon,
  items,
  limit,
}) {
  const visible =
    limit
      ? items.slice(0, limit)
      : items;

  return (
    <div className="vs-card p-5 md:p-6">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
        <Icon size={12} />
        {eyebrow}
      </div>

      <h2 className="font-display text-2xl mt-1 mb-5">
        {title}
      </h2>

      {!visible.length ? (
        <div className="py-8 text-center text-sm text-white/35">
          Sem dados neste período.
        </div>
      ) : (
        <div>
          {visible.map((item) => {
            const hit =
              Number(item.hit_rate) || 0;

            return (
              <div
                key={item.label}
                className="py-3 border-b border-white/[0.05] last:border-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/80 truncate">
                      {item.label}
                    </div>

                    <div className="text-[10px] text-white/30 mt-1">
                      {item.total} bilhetes · odd média{" "}
                      {numberPt(
                        item.average_odd,
                        2
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono-data text-[#CCFF00]">
                      {numberPt(
                        item.hit_rate,
                        1
                      )}
                      %
                    </div>

                    <div
                      className={`text-[10px] mt-1 ${
                        Number(
                          item.profit_units
                        ) >= 0
                          ? "text-white/35"
                          : "text-red-400/70"
                      }`}
                    >
                      {signedUnits(
                        item.profit_units
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mt-2.5">
                  <div
                    className="h-full rounded-full bg-[#CCFF00]"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, hit)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Performance() {
  const [period, setPeriod] =
    useState("all");

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    api
      .get("/performance", {
        params: { period },
      })
      .then((response) => {
        if (!active) return;

        setData(response.data);
      })
      .catch((err) => {
        if (!active) return;

        setData(null);

        setError(
          err?.response?.data?.detail ||
            "Não foi possível carregar a performance."
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [period]);

  const summary =
    data?.summary || {};

  const breakdown =
    data?.breakdown || {};

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#CCFF00]">
            <Trophy size={13} />
            Transparência
          </div>

          <h1 className="font-display text-4xl md:text-6xl mt-2 leading-tight">
            Central de{" "}
            <span className="text-[#CCFF00]">
              Performance
            </span>
          </h1>

          <p className="text-sm md:text-base text-white/50 mt-4 leading-relaxed max-w-2xl">
            Desempenho dos bilhetes publicados
            com uma metodologia padronizada e
            auditável, mantendo greens, reds e
            voids no histórico.
          </p>
        </div>

        <div className="flex gap-2 mt-7 overflow-x-auto no-scrollbar">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setPeriod(item.key)
              }
              className={`px-4 py-2 rounded-full text-sm border whitespace-nowrap transition-colors ${
                period === item.key
                  ? "bg-[#CCFF00] text-black border-[#CCFF00]"
                  : "border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(
                (item) => (
                  <div
                    key={item}
                    className="vs-skeleton h-28"
                  />
                )
              )}
            </div>

            <div className="vs-skeleton h-72" />
          </div>
        ) : error ? (
          <div className="vs-card mt-6 p-8 text-center text-white/45">
            {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
              <SummaryCard
                label="Liquidados"
                value={
                  summary.total ?? 0
                }
                helper="GREEN + RED + VOID"
                icon={Target}
              />

              <SummaryCard
                label="Taxa de acerto"
                value={`${numberPt(
                  summary.hit_rate,
                  1
                )}%`}
                helper="VOID fora da taxa"
                icon={CheckCircle2}
                highlight
              />

              <SummaryCard
                label="Resultado flat"
                value={signedUnits(
                  summary.profit_units
                )}
                helper="1 unidade por bilhete"
                icon={CircleDollarSign}
                highlight={
                  Number(
                    summary.profit_units
                  ) >= 0
                }
              />

              <SummaryCard
                label="ROI flat"
                value={signedPercent(
                  summary.roi_flat_pct
                )}
                helper="lucro ÷ unidades"
                icon={TrendingUp}
              />

              <SummaryCard
                label="Odd média"
                value={numberPt(
                  summary.average_odd,
                  2
                )}
                helper="GREEN e RED"
                icon={BarChart3}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="vs-card p-4">
                <div className="text-[9px] uppercase tracking-[0.17em] text-white/30">
                  Greens
                </div>

                <div className="font-display text-2xl text-[#CCFF00] mt-1">
                  {summary.green ?? 0}
                </div>
              </div>

              <div className="vs-card p-4">
                <div className="text-[9px] uppercase tracking-[0.17em] text-white/30">
                  Reds
                </div>

                <div className="font-display text-2xl text-red-400 mt-1">
                  {summary.red ?? 0}
                </div>
              </div>

              <div className="vs-card p-4">
                <div className="text-[9px] uppercase tracking-[0.17em] text-white/30">
                  Voids
                </div>

                <div className="font-display text-2xl text-white/60 mt-1">
                  {summary.void ?? 0}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <EquityChart
                points={
                  data?.equity_curve || []
                }
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mt-5">
              <Breakdown
                title="Por categoria"
                eyebrow="Tipo de bilhete"
                icon={Layers3}
                items={
                  breakdown.category || []
                }
              />

              <Breakdown
                title="Por plano"
                eyebrow="Nível de acesso"
                icon={Trophy}
                items={
                  breakdown.plan || []
                }
              />

              <Breakdown
                title="Por faixa de odd"
                eyebrow="Preço publicado"
                icon={Target}
                items={
                  breakdown.odd_range || []
                }
              />

              <Breakdown
                title="Por competição"
                eyebrow="Ligas e torneios"
                icon={BarChart3}
                items={
                  breakdown.competition || []
                }
                limit={8}
              />
            </div>

            <div className="vs-card mt-5 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <Info
                  size={18}
                  className="text-[#CCFF00] shrink-0 mt-0.5"
                />

                <div>
                  <h3 className="font-display text-lg">
                    Como calculamos
                  </h3>

                  <p className="text-xs md:text-sm text-white/45 leading-relaxed mt-2">
                    Cada bilhete publicado e
                    liquidado recebe stake teórica
                    de 1 unidade. GREEN soma a odd
                    total menos 1, RED desconta
                    1 unidade e VOID não altera o
                    resultado. O ROI flat é o
                    lucro acumulado dividido pelo
                    total de unidades apostadas.
                    Essa métrica mede o histórico
                    publicado do Vértice e não
                    representa o retorno real de
                    qualquer usuário.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  );
}
