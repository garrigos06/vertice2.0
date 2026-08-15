import PublicLayout from "../components/layout/PublicLayout";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

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
    to: "/cadastro",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "R$ 25,90",
    period: "por mês",
    highlight: true,
    features: [
      "Tudo do plano grátis",
      "Bilhetes Pro",
      "Análises premium",
      "Chat com a IA do Vértice",
    ],
    cta: "Assinar Pro",
    to: "/cadastro",
  },
  {
    id: "FULL",
    name: "Full",
    price: "R$ 49,90",
    period: "por mês",
    features: [
      "Tudo do plano Pro",
      "Todos os bilhetes",
      "Conteúdo exclusivo",
      "Grupo Telegram FULL",
      "Feed interno do canal",
    ],
    cta: "Assinar Full",
    to: "/cadastro",
  },
];

export default function Planos() {
  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-3">Escolha seu nível</div>
          <h1 className="font-display text-4xl md:text-6xl">Planos Vértice</h1>
          <p className="text-white/60 mt-3 max-w-2xl mx-auto">
            Cancele quando quiser. Pagamentos processados de forma segura via Kiwify —
            nós não armazenamos dados de cartão.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div
              key={p.id}
              data-testid={`plan-${p.id.toLowerCase()}`}
              className={`vs-card p-8 relative ${p.highlight ? "vs-glow border-[#CCFF00]/30" : ""}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 right-6 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-[#CCFF00] text-black rounded-full flex items-center gap-1">
                  <Sparkles size={10} /> Mais popular
                </div>
              )}
              <h3 className="font-display text-2xl">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl">{p.price}</span>
                <span className="text-sm text-white/50">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                    <Check size={16} className="text-[#CCFF00] mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={p.to}
                data-testid={`plan-cta-${p.id.toLowerCase()}`}
                className={`mt-8 block text-center font-semibold py-3 rounded-md transition-colors ${
                  p.highlight
                    ? "bg-[#CCFF00] text-black hover:bg-[#e6ff4d]"
                    : "border border-white/15 text-white hover:bg-white/5"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
