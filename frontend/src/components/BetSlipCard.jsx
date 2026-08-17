import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ExternalLink,
  LockKeyhole,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";

const statusBadge = {
  PENDENTE: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  GREEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  RED: "bg-red-500/10 text-red-400 border-red-500/30",
  VOID: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  CANCELADO: "bg-white/5 text-white/40 border-white/10",
};

const statusLabel = {
  PENDENTE: "Pendente",
  GREEN: "Green",
  RED: "Red",
  VOID: "Void",
  CANCELADO: "Cancelado",
};

const planLabel = {
  FREE: "Grátis",
  PRO: "PRO",
  FULL: "FULL",
};

const planColor = {
  FREE: "text-white/60 border-white/10 bg-white/[0.02]",
  PRO: "text-[#CCFF00] border-[#CCFF00]/30 bg-[#CCFF00]/[0.04]",
  FULL: "text-[#CCFF00] border-[#CCFF00]/50 bg-[#CCFF00]/[0.07]",
};

function LockedFreeContent({ bet }) {
  const location = useLocation();

  /*
   * O usuário volta exatamente para o bilhete
   * que tentou desbloquear.
   *
   * Também preservamos a query atual, incluindo
   * UTMs que vieram do anúncio.
   */
  const returnPath = `/bilhetes/${bet.id}${location.search || ""}`;

  const signupUrl = `/cadastro?redirect=${encodeURIComponent(returnPath)}`;

  const loginUrl = `/login?redirect=${encodeURIComponent(returnPath)}`;

  return (
    <div
      className="relative mt-4 overflow-hidden rounded-xl border border-[#CCFF00]/20 bg-[#080A08]"
      data-testid={`free-lock-${bet.id}`}
    >
      {/* Glow superior muito sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#CCFF00]/[0.07] to-transparent"
      />

      {/* Linha neon */}
      <div
        aria-hidden="true"
        className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#CCFF00]/70 to-transparent"
      />

      <div className="relative px-5 py-6 sm:px-6 sm:py-7">
        <div className="flex flex-col items-center text-center">
          {/* Ícone */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-[#CCFF00]/20 blur-xl" />

            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/[0.08]">
              <LockKeyhole
                size={20}
                strokeWidth={1.8}
                className="text-[#CCFF00]"
              />
            </div>
          </div>

          {/* Micro label */}
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#CCFF00]">
            <Sparkles size={11} />
            Acesso Free
          </div>

          <h4 className="max-w-sm font-display text-xl leading-tight text-white sm:text-[22px]">
            Desbloqueie os bilhetes gratuitos de hoje
          </h4>

          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">
            Crie sua conta Free para acessar mercados, análises e histórico
            completo.
          </p>

          {/* Benefícios discretos */}
          <div className="mt-5 grid w-full grid-cols-3 gap-2">
            {[
              "Mercados",
              "Análises",
              "Histórico",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-2.5"
              >
                <div className="mx-auto mb-1 h-1 w-1 rounded-full bg-[#CCFF00]" />
                <span className="text-[10px] uppercase tracking-wider text-white/50">
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            to={signupUrl}
            data-testid={`free-signup-${bet.id}`}
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#CCFF00] px-4 py-3.5 text-sm font-bold tracking-wide text-black transition-all hover:bg-[#e3ff4d] focus:outline-none focus:ring-2 focus:ring-[#CCFF00] focus:ring-offset-2 focus:ring-offset-black active:scale-[0.99]"
          >
            <UserPlus size={17} />
            CRIAR CONTA GRÁTIS
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          <div className="mt-3 text-[11px] text-white/40">
            Cadastro gratuito. Sem compromisso.
          </div>

          <div className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-white/40 w-full">
            Já possui uma conta?{" "}
            <Link
              to={loginUrl}
              className="font-medium text-white/70 transition-colors hover:text-[#CCFF00]"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockedPlanContent({ bet }) {
  const requiredPlan = planLabel[bet.required_plan] || bet.required_plan;

  return (
    <div
      className="relative mt-4 overflow-hidden rounded-xl border border-[#CCFF00]/15 bg-[#080A08]"
      data-testid={`plan-lock-${bet.id}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[#CCFF00]/[0.05] blur-3xl"
      />

      <div className="relative p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#CCFF00]/20 bg-[#CCFF00]/[0.06]">
            <LockKeyhole
              size={18}
              className="text-[#CCFF00]"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#CCFF00]">
              Vértice {requiredPlan}
            </div>

            <h4 className="mt-1 font-display text-lg text-white">
              Conteúdo exclusivo
            </h4>

            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Este bilhete faz parte do plano {requiredPlan}. Conheça os planos
              para acessar o conteúdo completo.
            </p>

            <Link
              to="/planos"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#CCFF00] transition-colors hover:text-[#e3ff4d]"
            >
              Conhecer planos
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BetSlipCard({ bet }) {
  const kickoff = bet.scheduled_at
    ? new Date(bet.scheduled_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const locked = Boolean(
    bet.locked ?? bet.isLocked
  );

  const signupRequired =
    locked &&
    bet.lock_reason === "SIGNUP_REQUIRED";

  const planRequired =
    locked &&
    bet.lock_reason === "PLAN_REQUIRED";

  const isPublicSample =
    bet.required_plan === "FREE" &&
    bet.is_public_preview &&
    !locked;

  const publicMatches =
    Array.isArray(bet.public_matches)
      ? bet.public_matches
      : [];

  const description =
    locked
      ? bet.description_preview
      : bet.description;

  return (
    <article
      data-testid={`bet-card-${bet.id}`}
      className="vs-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15"
    >
      {/* detalhe de luz Vértice */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#CCFF00]/[0.025] blur-3xl transition-opacity group-hover:bg-[#CCFF00]/[0.04]"
      />

      {/* Destaque */}
      {bet.featured && (
        <div className="absolute -top-px right-4 rounded-b bg-[#CCFF00] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-black">
          Destaque
        </div>
      )}

      <div className="relative">
        {/* CABEÇALHO */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                {bet.category}
              </span>

              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                  planColor[bet.required_plan] || planColor.FREE
                }`}
              >
                {planLabel[bet.required_plan] || bet.required_plan}
              </span>

              {isPublicSample && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#CCFF00]/25 bg-[#CCFF00]/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#CCFF00]">
                  <Sparkles size={9} />
                  Amostra pública
                </span>
              )}
            </div>

            <h3 className="font-display text-xl leading-tight text-white">
              {bet.title}
            </h3>

            {bet.competition && (
              <p className="mt-1 text-xs text-white/45">
                {bet.competition}
              </p>
            )}
          </div>

          {bet.status && (
            <span
              className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold ${
                statusBadge[bet.status] || statusBadge.PENDENTE
              }`}
            >
              {statusLabel[bet.status] || bet.status}
            </span>
          )}
        </div>

        {/* INFORMAÇÕES PÚBLICAS DA PARTIDA */}
        {locked && publicMatches.length > 0 && (
          <div className="mt-4 space-y-2">
            {publicMatches.slice(0, 3).map((item, index) => (
              <div
                key={`${item.match}-${index}`}
                className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3.5 py-3"
              >
                <div className="text-sm font-medium text-white/90">
                  {item.match}
                </div>

                {item.competition && (
                  <div className="mt-0.5 text-[11px] text-white/40">
                    {item.competition}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PREVIEW PÚBLICO */}
        {locked && description && (
          <div className="mt-3">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">
              Prévia
            </div>

            <p className="line-clamp-3 text-sm leading-relaxed text-white/55">
              {description}
            </p>
          </div>
        )}

        {/* CONTEÚDO PROTEGIDO FREE */}
        {signupRequired && (
          <LockedFreeContent bet={bet} />
        )}

        {/* CONTEÚDO PRO/FULL */}
        {planRequired && (
          <LockedPlanContent bet={bet} />
        )}

        {/* CONTEÚDO DESBLOQUEADO */}
        {!locked && (
          <>
            {bet.selections?.length > 0 && (
              <ul className="mt-4 space-y-2">
                {bet.selections.map((selection, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white/90">
                        {selection.match}
                      </div>

                      <div className="mt-0.5 text-[11px] text-white/45">
                        {selection.market}
                      </div>
                    </div>

                    {selection.odd != null && (
                      <span className="shrink-0 font-mono-data text-sm font-semibold text-[#CCFF00]">
                        {Number(selection.odd).toFixed(2)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {bet.rationale && (
              <div className="mt-4 border-l-2 border-[#CCFF00]/40 pl-3">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#CCFF00]/70">
                  Análise Vértice
                </div>

                <p className="line-clamp-4 text-sm leading-relaxed text-white/55">
                  {bet.rationale}
                </p>
              </div>
            )}
          </>
        )}

        {/* RODAPÉ */}
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/[0.06] pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3">
            {/* Só mostramos a odd se a API realmente liberou */}
            {!locked && bet.total_odd != null && (
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/35">
                  Odd total
                </div>

                <div className="font-mono-data text-lg font-semibold text-[#CCFF00]">
                  {Number(bet.total_odd).toFixed(2)}
                </div>
              </div>
            )}

            {!locked && bet.probability != null && (
              <div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/35">
                  <TrendingUp size={10} />
                  Prob.
                </div>

                <div className="font-mono-data text-sm text-white/80">
                  {bet.probability}%
                </div>
              </div>
            )}

            {kickoff && (
              <div>
                <div className="text-[9px] uppercase tracking-wider text-white/35">
                  Horário
                </div>

                <div className="text-xs text-white/70">
                  {kickoff}
                </div>
              </div>
            )}
          </div>

          {!locked && bet.external_url && (
            <a
              href={bet.external_url}
              target="_blank"
              rel="noreferrer nofollow"
              data-testid={`bet-external-${bet.id}`}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#CCFF00] px-3.5 py-2.5 text-xs font-bold text-black transition-colors hover:bg-[#e3ff4d]"
            >
              Abrir
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
