import PublicLayout from "../components/layout/PublicLayout";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PLANS = [
  {
    id: "FREE",
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    features: [
      "Bilhetes gratuitos",
      "Conteúdo aberto",
      "Estatísticas públicas",
      "Acesso ao histórico",
    ],
    cta: "Criar conta grátis",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "R$ 25,90",
    period: "por mês",
    highlight: true,
    checkoutUrl: "https://pay.kiwify.com.br/NNf09HA",
    features: [
      "Tudo do plano grátis",
      "Bilhetes Pro",
      "Análises premium",
      "Inteligência Vértice",
      "Forma recente de 5, 10 e 15 jogos",
    ],
    cta: "Assinar Pro",
  },
  {
    id: "FULL",
    name: "Full",
    price: "R$ 49,90",
    period: "por mês",
    checkoutUrl: "https://pay.kiwify.com.br/7OEtoD1",
    features: [
      "Tudo do plano Pro",
      "Todos os bilhetes",
      "Conteúdo exclusivo",
      "Grupo Telegram FULL",
      "Feed interno do canal",
    ],
    cta: "Assinar Full",
  },
];

const PLAN_LEVEL = {
  FREE: 0,
  PRO: 1,
  FULL: 2,
};

export default function Planos() {
  const { user, loading } = useAuth();

  const currentPlan = user?.plan || "FREE";

  const getButtonState = (plan) => {
    if (loading) {
      return {
        type: "disabled",
        label: "Carregando...",
      };
    }

    if (!user) {
      return {
        type: "internal",
        label: plan.id === "FREE" ? "Criar conta grátis" : plan.cta,
        url: "/cadastro",
      };
    }

    if (plan.id === currentPlan) {
      return {
        type: "disabled",
        label: "Plano atual",
      };
    }

    if (
      PLAN_LEVEL[currentPlan] > PLAN_LEVEL[plan.id] &&
      plan.id !== "FREE"
    ) {
      return {
        type: "disabled",
        label: "Incluído no seu plano",
      };
    }

    if (plan.id === "FREE") {
      return {
        type: "disabled",
        label: "Incluído no seu plano",
      };
    }

    return {
      type: "external",
      label: plan.cta,
      url: plan.checkoutUrl,
    };
  };

  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-3">
            Escolha seu nível
          </div>

          <h1 className="font-display text-4xl md:text-6xl">
            Planos Vértice
          </h1>

          <p className="text-white/60 mt-3 max-w-2xl mx-auto">
            Cancele quando quiser. Pagamentos processados de forma segura via
            Kiwify — nós não armazenamos dados de cartão.
          </p>

          {user && (
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm">
              <span className="text-white/50">Seu plano:</span>
              <span className="font-bold text-[#CCFF00]">
                {currentPlan}
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => {
            const button = getButtonState(p);
            const isCurrentPlan = user && currentPlan === p.id;

            return (
              <div
                key={p.id}
                data-testid={`plan-${p.id.toLowerCase()}`}
                className={`vs-card p-8 relative ${
                  p.highlight
                    ? "vs-glow border-[#CCFF00]/30"
                    : ""
                } ${
                  isCurrentPlan
                    ? "border-[#CCFF00]/50"
                    : ""
                }`}
              >
                {p.highlight && !isCurrentPlan && (
                  <div className="absolute -top-3 right-6 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-[#CCFF00] text-black rounded-full flex items-center gap-1">
                    <Sparkles size={10} />
                    Mais popular
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-6 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-[#CCFF00] text-black rounded-full">
                    Seu plano
                  </div>
                )}

                <h3 className="font-display text-2xl">
                  {p.name}
                </h3>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-4xl">
                    {p.price}
                  </span>

                  <span className="text-sm text-white/50">
                    {p.period}
                  </span>
                </div>

                <ul className="mt-6 space-y-3">
                  {p.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-white/80"
                    >
                      <Check
                        size={16}
                        className="text-[#CCFF00] mt-0.5 shrink-0"
                      />

                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {button.type === "internal" && (
                  <Link
                    to={button.url}
                    data-testid={`plan-cta-${p.id.toLowerCase()}`}
                    className={`mt-8 block text-center font-semibold py-3 rounded-md transition-colors ${
                      p.highlight
                        ? "bg-[#CCFF00] text-black hover:bg-[#e6ff4d]"
                        : "border border-white/15 text-white hover:bg-white/5"
                    }`}
                  >
                    {button.label}
                  </Link>
                )}

                {button.type === "external" && (
                  <a
                    href={button.url}
                    data-testid={`plan-cta-${p.id.toLowerCase()}`}
                    className={`mt-8 block text-center font-semibold py-3 rounded-md transition-colors ${
                      p.highlight
                        ? "bg-[#CCFF00] text-black hover:bg-[#e6ff4d]"
                        : "border border-white/15 text-white hover:bg-white/5"
                    }`}
                  >
                    {button.label}
                  </a>
                )}

                {button.type === "disabled" && (
                  <button
                    type="button"
                    disabled
                    data-testid={`plan-cta-${p.id.toLowerCase()}`}
                    className="mt-8 w-full text-center font-semibold py-3 rounded-md border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                  >
                    {button.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </PublicLayout>
  );
}