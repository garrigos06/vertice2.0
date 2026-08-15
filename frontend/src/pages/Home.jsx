import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import PublicLayout from "../components/layout/PublicLayout";
import BetSlipCard from "../components/BetSlipCard";
import { api } from "../lib/api";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [f, h] = await Promise.all([
          api.get("/bets", { params: { featured: true, limit: 3 } }),
          api.get("/bets/history", { params: { limit: 100 } }),
        ]);
        setFeatured(f.data.items || []);
        setStats(h.data.stats || null);
      } catch (e) {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.95)), url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?crop=entropy&cs=srgb&fm=jpg&q=85')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-6">
              <Sparkles size={12} /> Inteligência esportiva de precisão
            </span>
            <h1
              data-testid="home-hero-title"
              className="font-display text-4xl sm:text-5xl lg:text-7xl leading-[0.95] tracking-tight"
            >
              Análises que <span className="text-[#CCFF00]">encontram valor</span>
              <br />
              antes do apito inicial.
            </h1>
            <p className="mt-6 text-lg text-white/70 max-w-2xl">
              Bilhetes transparentes, estatísticas profundas e um scanner inteligente
              para identificar oportunidades. Somos análise esportiva — não uma casa
              de apostas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/cadastro"
                data-testid="hero-cta-register"
                className="bg-[#CCFF00] text-black font-semibold px-6 py-3 rounded-md hover:bg-[#e6ff4d] transition-colors flex items-center gap-2"
              >
                Criar conta grátis <ArrowRight size={16} />
              </Link>
              <Link
                to="/bilhetes"
                data-testid="hero-cta-bilhetes"
                className="border border-white/20 text-white px-6 py-3 rounded-md hover:bg-white/5 transition-colors"
              >
                Ver bilhetes
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: "Bilhetes publicados", v: stats?.total ?? "—", icon: Target },
              { l: "Greens", v: stats?.green ?? "—", icon: TrendingUp, hl: true },
              { l: "Reds", v: stats?.red ?? "—", icon: Zap },
              { l: "Taxa de acerto", v: stats ? `${stats.hit_rate}%` : "—", icon: Sparkles, hl: true },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  data-testid={`home-stat-${i}`}
                  className="vs-card p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-white/40">
                      {s.l}
                    </span>
                    <Icon size={14} className={s.hl ? "text-[#CCFF00]" : "text-white/40"} />
                  </div>
                  <div
                    className={`font-display text-3xl mt-2 ${s.hl ? "text-[#CCFF00]" : ""}`}
                  >
                    {s.v}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured bets */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">
              Em destaque
            </div>
            <h2 className="font-display text-3xl md:text-4xl">Bilhetes selecionados</h2>
          </div>
          <Link
            to="/bilhetes"
            data-testid="home-see-all-bets"
            className="text-sm text-white/60 hover:text-white flex items-center gap-1"
          >
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="grid md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="vs-skeleton h-48" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="vs-card p-10 text-center text-white/50" data-testid="home-empty-bets">
            Nenhum bilhete em destaque no momento. Novas análises são publicadas todos os dias.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {featured.map((b) => (
              <BetSlipCard key={b.id} bet={b} />
            ))}
          </div>
        )}
      </section>

      {/* Plans CTA */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-24">
        <div className="vs-card vs-glow p-10 md:p-14 relative overflow-hidden">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-3">
              Vértice Full
            </div>
            <h3 className="font-display text-3xl md:text-5xl leading-tight">
              Toda a nossa inteligência,
              <br /> em um único plano.
            </h3>
            <p className="mt-4 text-white/70 max-w-lg">
              Acesso a todos os bilhetes, análises premium, IA analítica e o canal
              exclusivo do Telegram por apenas R$ 49,90/mês.
            </p>
            <Link
              to="/planos"
              data-testid="home-cta-plans"
              className="mt-6 inline-flex items-center gap-2 bg-[#CCFF00] text-black font-semibold px-6 py-3 rounded-md hover:bg-[#e6ff4d]"
            >
              Ver planos <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
