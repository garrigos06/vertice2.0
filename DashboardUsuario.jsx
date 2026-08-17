import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  History,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";

import PublicLayout from "../components/layout/PublicLayout";
import BetSlipCard from "../components/BetSlipCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";


function isSameLocalDay(value, reference = new Date()) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}


function formatKickoff(value) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}


function DashboardStat({
  label,
  value,
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
            : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}


function QuickLink({
  to,
  icon: Icon,
  title,
  description,
}) {
  return (
    <Link
      to={to}
      className="vs-card group p-4 flex items-center gap-3 hover:border-[#CCFF00]/25 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl border border-[#CCFF00]/15 bg-[#CCFF00]/[0.05] flex items-center justify-center shrink-0">
        <Icon
          size={18}
          className="text-[#CCFF00]"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">
          {title}
        </div>

        <div className="text-[11px] text-white/35 mt-0.5 truncate">
          {description}
        </div>
      </div>

      <ArrowRight
        size={15}
        className="text-white/25 group-hover:text-[#CCFF00] group-hover:translate-x-0.5 transition-all"
      />
    </Link>
  );
}


function MatchRow({ match }) {
  const kickoff = formatKickoff(
    match.kickoff
  );

  const status =
    match.status === "LIVE"
      ? "Ao vivo"
      : match.status === "HALFTIME"
      ? "Intervalo"
      : match.status === "FINISHED"
      ? "Encerrado"
      : match.status === "POSTPONED"
      ? "Adiado"
      : "Agendado";

  const live =
    match.status === "LIVE" ||
    match.status === "HALFTIME";

  const hasScore =
    match.score_home != null ||
    match.score_away != null;

  return (
    <Link
      to={`/partida/${match.id}?from=today`}
      state={{ match }}
      className="group flex items-center gap-3 py-3.5 border-b border-white/[0.05] last:border-0"
    >
      <div className="w-11 shrink-0">
        <div className="font-mono-data text-xs text-[#CCFF00]">
          {kickoff}
        </div>

        <div
          className={`mt-1 text-[8px] uppercase tracking-wide ${
            live
              ? "text-red-400"
              : "text-white/25"
          }`}
        >
          {status}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {match.home_logo && (
            <img
              src={match.home_logo}
              alt=""
              className="w-4 h-4 object-contain shrink-0"
            />
          )}

          <span className="text-xs md:text-sm text-white/75 truncate">
            {match.home}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          {match.away_logo && (
            <img
              src={match.away_logo}
              alt=""
              className="w-4 h-4 object-contain shrink-0"
            />
          )}

          <span className="text-xs md:text-sm text-white/75 truncate">
            {match.away}
          </span>
        </div>
      </div>

      {hasScore && (
        <div className="font-display text-base leading-5 text-right">
          <div>
            {match.score_home ?? "-"}
          </div>

          <div>
            {match.score_away ?? "-"}
          </div>
        </div>
      )}

      <ArrowRight
        size={15}
        className="shrink-0 text-white/20 group-hover:text-[#CCFF00] transition-colors"
      />
    </Link>
  );
}


export default function DashboardUsuario() {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const navigate = useNavigate();

  const [bets, setBets] =
    useState([]);

  const [historyStats, setHistoryStats] =
    useState(null);

  const [matches, setMatches] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const isStaff =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  const hasPremiumAccess =
    Boolean(
      user &&
        (
          isStaff ||
          (
            ["PRO", "FULL"].includes(
              user.plan
            ) &&
            user.subscription_status ===
              "ACTIVE"
          )
        )
    );


  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate(
        "/login?redirect=/dashboard",
        {
          replace: true,
        }
      );
      return;
    }

    if (!hasPremiumAccess) {
      navigate(
        "/planos",
        {
          replace: true,
        }
      );
    }
  }, [
    authLoading,
    user,
    hasPremiumAccess,
    navigate,
  ]);


  useEffect(() => {
    if (
      authLoading ||
      !hasPremiumAccess
    ) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          betsResponse,
          historyResponse,
          matchesResponse,
        ] = await Promise.all([
          api.get(
            "/bets",
            {
              params: {
                limit: 100,
              },
            }
          ),

          api.get(
            "/bets/history",
            {
              params: {
                limit: 100,
              },
            }
          ),

          api.get(
            "/matches",
            {
              params: {
                when: "today",
              },
            }
          ),
        ]);

        if (!active) {
          return;
        }

        setBets(
          betsResponse.data
            ?.items || []
        );

        setHistoryStats(
          historyResponse.data
            ?.stats || null
        );

        setMatches(
          matchesResponse.data
            ?.items || []
        );
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err?.response?.data
            ?.detail ||
            "NÃ£o foi possÃ­vel carregar seu painel agora."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [
    authLoading,
    hasPremiumAccess,
  ]);


  const accessibleBets =
    useMemo(
      () =>
        [...bets]
          .filter(
            (bet) =>
              !bet.locked &&
              !bet.isLocked
          )
          .sort(
            (a, b) =>
              new Date(
                b.created_at || 0
              ) -
              new Date(
                a.created_at || 0
              )
          ),
      [bets]
    );


  const todayBets =
    useMemo(
      () =>
        accessibleBets.filter(
          (bet) =>
            isSameLocalDay(
              bet.created_at
            )
        ),
      [accessibleBets]
    );


  const activeBets =
    useMemo(
      () =>
        accessibleBets.filter(
          (bet) =>
            bet.status ===
            "PENDENTE"
        ),
      [accessibleBets]
    );


  const betsForDisplay =
    todayBets.length
      ? todayBets.slice(0, 3)
      : activeBets.slice(0, 3);


  const sortedMatches =
    useMemo(
      () =>
        [...matches]
          .sort(
            (a, b) =>
              new Date(
                a.kickoff || 0
              ) -
              new Date(
                b.kickoff || 0
              )
          )
          .slice(0, 6),
      [matches]
    );


  if (
    authLoading ||
    !user ||
    !hasPremiumAccess
  ) {
    return null;
  }


  const firstName =
    user.name
      ?.split(" ")
      .filter(Boolean)[0] ||
    "usuÃ¡rio";

  const planLabel =
    isStaff
      ? "ADMIN"
      : user.plan;

  const accessItems =
    user.plan === "FULL" ||
    isStaff
      ? [
          "Todos os bilhetes",
          "InteligÃªncia VÃ©rtice",
          "Forma recente 5/10/15",
          "ConteÃºdo FULL",
        ]
      : [
          "Bilhetes FREE + PRO",
          "InteligÃªncia VÃ©rtice",
          "Forma recente 5/10/15",
          "AnÃ¡lises premium",
        ];


  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12">
        {/* HERO */}
        <div className="vs-card relative overflow-hidden p-5 md:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#CCFF00]/[0.065] to-transparent"
          />

          <div
            aria-hidden="true"
            className="absolute -top-28 right-[-70px] w-72 h-72 rounded-full bg-[#CCFF00]/[0.035] blur-3xl"
          />

          <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#CCFF00]">
                <LayoutDashboard
                  size={13}
                />

                Seu painel
              </div>

              <h1 className="font-display text-3xl md:text-5xl mt-2 leading-tight">
                {getGreeting()},{" "}
                <span className="text-[#CCFF00]">
                  {firstName}
                </span>
                .
              </h1>

              <p className="text-sm md:text-base text-white/45 mt-3 max-w-2xl leading-relaxed">
                Tudo que vocÃª precisa para acompanhar
                as anÃ¡lises e partidas de hoje em um
                Ãºnico lugar.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#CCFF00]/15 bg-[#CCFF00]/[0.04] p-4 min-w-[220px]">
              <div className="w-10 h-10 rounded-xl bg-[#CCFF00] text-black flex items-center justify-center">
                <ShieldCheck
                  size={20}
                />
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                  Seu plano
                </div>

                <div className="font-display text-xl text-[#CCFF00]">
                  VÃ©rtice {planLabel}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* RESUMO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <DashboardStat
            label="Bilhetes hoje"
            value={
              loading
                ? "â"
                : todayBets.length
            }
            icon={Ticket}
            highlight
          />

          <DashboardStat
            label="Partidas hoje"
            value={
              loading
                ? "â"
                : matches.length
            }
            icon={
              CalendarDays
            }
          />

          <DashboardStat
            label="Bilhetes ativos"
            value={
              loading
                ? "â"
                : activeBets.length
            }
            icon={Trophy}
          />

          <DashboardStat
            label="Taxa histÃ³rica"
            value={
              historyStats
                ? `${historyStats.hit_rate}%`
                : "â"
            }
            icon={TrendingUp}
            highlight
          />
        </div>


        {/* ACESSOS RÃPIDOS */}
        <section className="mt-7">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
            <Sparkles
              size={12}
            />

            Acesso rÃ¡pido
          </div>

          <h2 className="font-display text-2xl md:text-3xl mt-1 mb-4">
            Continue de onde quiser
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink
              to="/bilhetes"
              icon={Ticket}
              title="Bilhetes"
              description="Veja as anÃ¡lises disponÃ­veis"
            />

            <QuickLink
              to="/calendario"
              icon={CalendarDays}
              title="CalendÃ¡rio"
              description="Abra os confrontos de hoje"
            />

            <QuickLink
              to="/historico"
              icon={History}
              title="HistÃ³rico"
              description="Confira os resultados publicados"
            />

            <QuickLink
              to="/conta"
              icon={User}
              title="Minha conta"
              description="Plano, perfil e assinatura"
            />
          </div>
        </section>


        {/* GRID PRINCIPAL */}
        <div className="grid lg:grid-cols-[1.45fr_0.75fr] gap-5 mt-7">
          {/* BILHETES */}
          <section>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
                  <Ticket
                    size={12}
                  />

                  Para vocÃª
                </div>

                <h2 className="font-display text-2xl md:text-3xl mt-1">
                  {todayBets.length
                    ? "Bilhetes liberados hoje"
                    : "Bilhetes disponÃ­veis"}
                </h2>
              </div>

              <Link
                to="/bilhetes"
                className="text-xs text-white/40 hover:text-[#CCFF00] flex items-center gap-1 shrink-0"
              >
                Ver todos
                <ArrowRight
                  size={13}
                />
              </Link>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={item}
                      className="vs-skeleton h-60"
                    />
                  )
                )}
              </div>
            ) : betsForDisplay.length ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {betsForDisplay.map(
                  (bet) => (
                    <BetSlipCard
                      key={bet.id}
                      bet={bet}
                    />
                  )
                )}
              </div>
            ) : (
              <div className="vs-card p-8 text-center">
                <Ticket
                  size={25}
                  className="mx-auto text-white/20"
                />

                <div className="text-sm text-white/45 mt-3">
                  Nenhum bilhete ativo disponÃ­vel para
                  o seu plano neste momento.
                </div>
              </div>
            )}
          </section>


          {/* AGENDA */}
          <section>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
                  <Clock3
                    size={12}
                  />

                  Agenda
                </div>

                <h2 className="font-display text-2xl md:text-3xl mt-1">
                  Partidas de hoje
                </h2>
              </div>

              <Link
                to="/calendario"
                className="text-xs text-white/40 hover:text-[#CCFF00] flex items-center gap-1 shrink-0"
              >
                CalendÃ¡rio
                <ArrowRight
                  size={13}
                />
              </Link>
            </div>

            <div className="vs-card p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(
                    (item) => (
                      <div
                        key={item}
                        className="vs-skeleton h-14"
                      />
                    )
                  )}
                </div>
              ) : sortedMatches.length ? (
                sortedMatches.map(
                  (match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                    />
                  )
                )
              ) : (
                <div className="py-10 text-center">
                  <CalendarDays
                    size={25}
                    className="mx-auto text-white/20"
                  />

                  <div className="text-sm text-white/40 mt-3">
                    Nenhuma partida encontrada para
                    hoje.
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>


        {/* PERFORMANCE + PLANO */}
        <div className="grid lg:grid-cols-2 gap-5 mt-7">
          <section className="vs-card p-5 md:p-6">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
              <BarChart3
                size={12}
              />

              Performance VÃ©rtice
            </div>

            <h2 className="font-display text-2xl mt-1">
              HistÃ³rico publicado
            </h2>

            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <div className="font-display text-2xl text-[#CCFF00]">
                  {historyStats
                    ?.green ?? "â"}
                </div>

                <div className="text-[9px] uppercase tracking-wider text-white/30 mt-1">
                  Greens
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <div className="font-display text-2xl">
                  {historyStats
                    ?.red ?? "â"}
                </div>

                <div className="text-[9px] uppercase tracking-wider text-white/30 mt-1">
                  Reds
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <div className="font-display text-2xl">
                  {historyStats
                    ?.void ?? "â"}
                </div>

                <div className="text-[9px] uppercase tracking-wider text-white/30 mt-1">
                  Voids
                </div>
              </div>
            </div>

            <Link
              to="/historico"
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-[#CCFF00]"
            >
              Ver histÃ³rico completo
              <ArrowRight
                size={13}
              />
            </Link>
          </section>


          <section className="vs-card p-5 md:p-6">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
              <ShieldCheck
                size={12}
              />

              Seu acesso
            </div>

            <h2 className="font-display text-2xl mt-1">
              VÃ©rtice {planLabel}
            </h2>

            <div className="grid grid-cols-2 gap-2 mt-5">
              {accessItems.map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[11px] text-white/55 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] shrink-0" />

                    {item}
                  </div>
                )
              )}
            </div>

            {!isStaff &&
              user.plan === "PRO" && (
                <Link
                  to="/planos"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#CCFF00] hover:text-[#e6ff4d]"
                >
                  Conhecer o FULL
                  <ArrowRight
                    size={13}
                  />
                </Link>
              )}
          </section>
        </div>


        {error && (
          <div className="mt-5 text-[10px] text-white/25 text-center">
            {error}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
