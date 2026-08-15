import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Eye,
  EyeOff,
} from "lucide-react";

const emptyForm = {
  title: "",
  description: "",
  category: "SIMPLES",
  sport: "Futebol",
  competition: "",
  total_odd: 1.5,
  risk: "MEDIO",
  required_plan: "FREE",
  rationale: "",
  external_url: "",
  featured: false,
  published: true,
  selections: [{ match: "", market: "", odd: 1.5 }],
};

const statusBadge = {
  PENDENTE: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  GREEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  RED: "bg-red-500/10 text-red-400 border-red-500/30",
  VOID: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  CANCELADO: "bg-white/5 text-white/40 border-white/10",
};

const planBadge = {
  FREE: "bg-white/5 text-white/70 border-white/10",
  PRO: "bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/30",
  FULL: "bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/60",
};

export default function AdminBilhetes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = () =>
    api
      .get("/bets/admin/all")
      .then((r) => setItems(r.data.items || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Abre form automaticamente quando vier de "Ações rápidas" do Dashboard
  useEffect(() => {
    if (params.get("new") === "1") {
      setShowForm(true);
      // limpa o param para permitir toggle manual depois
      const p = new URLSearchParams(params);
      p.delete("new");
      setParams(p, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...form,
        total_odd: parseFloat(form.total_odd),
        selections: form.selections
          .filter((s) => s.match && s.market)
          .map((s) => ({ ...s, odd: parseFloat(s.odd) })),
      };
      await api.post("/bets/admin", payload);
      toast.success("Bilhete criado");
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro");
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/bets/admin/${id}`, { status });
      toast.success(`Marcado como ${status}`);
      load();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const togglePublished = async (bet) => {
    try {
      await api.patch(`/bets/admin/${bet.id}`, { published: !bet.published });
      toast.success(bet.published ? "Despublicado" : "Publicado");
      load();
    } catch {
      toast.error("Erro ao alterar publicação");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir este bilhete?")) return;
    try {
      await api.delete(`/bets/admin/${id}`);
      toast.success("Excluído");
      load();
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const ActionButtons = ({ bet, compact = false }) => (
    <div className={`flex items-center gap-1 ${compact ? "flex-wrap" : ""}`}>
      <button
        title="Marcar Green"
        aria-label="Marcar como Green"
        onClick={() => setStatus(bet.id, "GREEN")}
        data-testid={`bet-action-green-${bet.id}`}
        className="p-2 rounded hover:bg-emerald-500/10 text-emerald-400"
      >
        <CheckCircle2 size={16} />
      </button>
      <button
        title="Marcar Red"
        aria-label="Marcar como Red"
        onClick={() => setStatus(bet.id, "RED")}
        data-testid={`bet-action-red-${bet.id}`}
        className="p-2 rounded hover:bg-red-500/10 text-red-400"
      >
        <XCircle size={16} />
      </button>
      <button
        title="Marcar Void"
        aria-label="Marcar como Void"
        onClick={() => setStatus(bet.id, "VOID")}
        data-testid={`bet-action-void-${bet.id}`}
        className="p-2 rounded hover:bg-amber-500/10 text-amber-400"
      >
        <MinusCircle size={16} />
      </button>
      <button
        title={bet.published ? "Despublicar" : "Publicar"}
        aria-label={bet.published ? "Despublicar" : "Publicar"}
        onClick={() => togglePublished(bet)}
        data-testid={`bet-action-toggle-pub-${bet.id}`}
        className="p-2 rounded hover:bg-white/10 text-white/70"
      >
        {bet.published ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button
        title="Excluir"
        aria-label="Excluir"
        onClick={() => remove(bet.id)}
        data-testid={`bet-action-delete-${bet.id}`}
        className="p-2 rounded hover:bg-white/10 text-white/60"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">
            Gerenciar
          </div>
          <h1 className="font-display text-3xl sm:text-4xl">Bilhetes</h1>
        </div>
        <button
          data-testid="admin-new-bet"
          onClick={() => setShowForm((s) => !s)}
          className="bg-[#CCFF00] text-black font-semibold px-4 py-2.5 rounded-md flex items-center justify-center gap-2 hover:bg-[#e6ff4d] w-full sm:w-auto"
        >
          <Plus size={16} /> {showForm ? "Fechar" : "Novo bilhete"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="vs-card p-4 sm:p-6 mb-6 space-y-4"
          data-testid="admin-bet-form"
        >
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs uppercase text-white/50">Título</label>
              <input
                required
                data-testid="bet-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-white/50">Competição</label>
              <input
                value={form.competition}
                onChange={(e) => setForm({ ...form, competition: e.target.value })}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-white/50">Categoria</label>
              <select
                data-testid="bet-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
              >
                {["SIMPLES", "COMBINADO", "MULTIPLO", "SUPERODD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-white/50">Plano necessário</label>
              <select
                data-testid="bet-plan"
                value={form.required_plan}
                onChange={(e) => setForm({ ...form, required_plan: e.target.value })}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
              >
                {["FREE", "PRO", "FULL"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-white/50">Odd total</label>
              <input
                required
                type="number"
                step="0.01"
                inputMode="decimal"
                data-testid="bet-odd"
                value={form.total_odd}
                onChange={(e) => setForm({ ...form, total_odd: e.target.value })}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-white/50">Risco</label>
              <select
                value={form.risk}
                onChange={(e) => setForm({ ...form, risk: e.target.value })}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
              >
                {["BAIXO", "MEDIO", "ALTO"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase text-white/50">Seleções</label>
            {form.selections.map((s, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-1">
                <input
                  placeholder="Partida"
                  value={s.match}
                  onChange={(e) => {
                    const arr = [...form.selections];
                    arr[i].match = e.target.value;
                    setForm({ ...form, selections: arr });
                  }}
                  className="sm:col-span-5 bg-black/40 border border-white/10 rounded-md px-3 py-2"
                />
                <input
                  placeholder="Mercado"
                  value={s.market}
                  onChange={(e) => {
                    const arr = [...form.selections];
                    arr[i].market = e.target.value;
                    setForm({ ...form, selections: arr });
                  }}
                  className="sm:col-span-5 bg-black/40 border border-white/10 rounded-md px-3 py-2"
                />
                <input
                  placeholder="Odd"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={s.odd}
                  onChange={(e) => {
                    const arr = [...form.selections];
                    arr[i].odd = e.target.value;
                    setForm({ ...form, selections: arr });
                  }}
                  className="sm:col-span-2 bg-black/40 border border-white/10 rounded-md px-3 py-2"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  selections: [...form.selections, { match: "", market: "", odd: 1.5 }],
                })
              }
              className="mt-2 text-xs text-[#CCFF00] hover:underline"
            >
              + Adicionar seleção
            </button>
          </div>
          <div>
            <label className="text-xs uppercase text-white/50">Análise / justificativa</label>
            <textarea
              rows={3}
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-white/50">
              Link externo (casa autorizada)
            </label>
            <input
              value={form.external_url}
              onChange={(e) => setForm({ ...form, external_url: e.target.value })}
              placeholder="https://..."
              type="url"
              inputMode="url"
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="accent-[#CCFF00]"
              />
              Destaque
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="accent-[#CCFF00]"
              />
              Publicado
            </label>
          </div>
          <button
            type="submit"
            disabled={creating}
            data-testid="bet-submit"
            className="bg-[#CCFF00] text-black font-semibold px-6 py-2.5 rounded-md hover:bg-[#e6ff4d] disabled:opacity-50 w-full sm:w-auto"
          >
            {creating ? "Criando..." : "Criar bilhete"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="vs-skeleton h-24 sm:h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="vs-card p-10 text-center text-white/50" data-testid="admin-bets-empty">
          Nenhum bilhete criado ainda.
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3" data-testid="admin-bets-mobile-list">
            {items.map((b) => (
              <div
                key={b.id}
                data-testid={`admin-bet-card-${b.id}`}
                className="vs-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{b.title}</div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      {b.category} · Odd {b.total_odd?.toFixed(2)}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                      statusBadge[b.status] || statusBadge.PENDENTE
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      planBadge[b.required_plan] || planBadge.FREE
                    }`}
                  >
                    {b.required_plan}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      b.published
                        ? "bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/30"
                        : "bg-white/5 text-white/50 border-white/10"
                    }`}
                  >
                    {b.published ? "Publicado" : "Rascunho"}
                  </span>
                  {b.featured && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/40">
                      Destaque
                    </span>
                  )}
                </div>
                <div className="pt-3 border-t border-white/5">
                  <ActionButtons bet={b} compact />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block vs-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-left text-[11px] uppercase text-white/40">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Cat.</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Odd</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Publicado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((b) => (
                  <tr key={b.id} data-testid={`admin-bet-row-${b.id}`}>
                    <td className="px-4 py-3">{b.title}</td>
                    <td className="px-4 py-3 text-xs text-white/60">{b.category}</td>
                    <td className="px-4 py-3 text-xs text-[#CCFF00]">{b.required_plan}</td>
                    <td className="px-4 py-3 font-mono-data">{b.total_odd?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs">{b.status}</td>
                    <td className="px-4 py-3 text-xs">{b.published ? "Sim" : "Não"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ActionButtons bet={b} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
