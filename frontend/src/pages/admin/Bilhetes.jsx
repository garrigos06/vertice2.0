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
  Pencil,
  X,
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

const cloneEmptyForm = () => ({
  ...emptyForm,
  selections: emptyForm.selections.map((selection) => ({ ...selection })),
});

export default function AdminBilhetes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(cloneEmptyForm());
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [params, setParams] = useSearchParams();

  const editing = Boolean(editingId);

  const load = () =>
    api
      .get("/bets/admin/all")
      .then((r) => setItems(r.data.items || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditingId(null);
      setForm(cloneEmptyForm());
      setShowForm(true);

      const p = new URLSearchParams(params);
      p.delete("new");
      setParams(p, { replace: true });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNewForm = () => {
    setEditingId(null);
    setForm(cloneEmptyForm());
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(cloneEmptyForm());
    setShowForm(false);
  };

  const startEdit = (bet) => {
    const selections =
      Array.isArray(bet.selections) && bet.selections.length > 0
        ? bet.selections.map((selection) => ({
            match: selection?.match || "",
            market: selection?.market || "",
            odd: selection?.odd ?? 1.5,
            ...(selection?.competition ? { competition: selection.competition } : {}),
            ...(selection?.kickoff ? { kickoff: selection.kickoff } : {}),
          }))
        : [{ match: "", market: "", odd: 1.5 }];

    setForm({
      title: bet.title || "",
      description: bet.description || "",
      category: bet.category || "SIMPLES",
      sport: bet.sport || "Futebol",
      competition: bet.competition || "",
      total_odd: bet.total_odd ?? 1.5,
      risk: bet.risk || "MEDIO",
      required_plan: bet.required_plan || "FREE",
      rationale: bet.rationale || "",
      external_url: bet.external_url || "",
      featured: Boolean(bet.featured),
      published: Boolean(bet.published),
      selections,
    });

    setEditingId(bet.id);
    setShowForm(true);

    window.setTimeout(() => {
      document
        .getElementById("admin-bet-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const updateSelection = (index, field, value) => {
    setForm((current) => ({
      ...current,
      selections: current.selections.map((selection, selectionIndex) =>
        selectionIndex === index
          ? { ...selection, [field]: value }
          : selection
      ),
    }));
  };

  const addSelection = () => {
    setForm((current) => ({
      ...current,
      selections: [
        ...current.selections,
        { match: "", market: "", odd: 1.5 },
      ],
    }));
  };

  const removeSelection = (index) => {
    setForm((current) => {
      const nextSelections = current.selections.filter(
        (_, selectionIndex) => selectionIndex !== index
      );

      return {
        ...current,
        selections:
          nextSelections.length > 0
            ? nextSelections
            : [{ match: "", market: "", odd: 1.5 }],
      };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const selections = form.selections
        .filter((s) => s.match && s.market)
        .map((s) => ({ ...s, odd: parseFloat(s.odd) }));

      if (!selections.length) {
        toast.error("Adicione pelo menos uma seleÃ§Ã£o vÃ¡lida");
        setCreating(false);
        return;
      }

      const payload = {
        ...form,
        total_odd: parseFloat(form.total_odd),
        selections,
      };

      if (editingId) {
        await api.patch(`/bets/admin/${editingId}`, payload);
        toast.success("Bilhete atualizado");
      } else {
        await api.post("/bets/admin", payload);
        toast.success("Bilhete criado");
      }

      closeForm();
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
      await api.patch(`/bets/admin/${bet.id}`, {
        published: !bet.published,
      });
      toast.success(bet.published ? "Despublicado" : "Publicado");
      load();
    } catch {
      toast.error("Erro ao alterar publicaÃ§Ã£o");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir este bilhete?")) return;

    try {
      await api.delete(`/bets/admin/${id}`);
      toast.success("ExcluÃ­do");

      if (editingId === id) {
        closeForm();
      }

      load();
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const ActionButtons = ({ bet, compact = false }) => (
    <div className={`flex items-center gap-1 ${compact ? "flex-wrap" : ""}`}>
      <button
        title="Editar bilhete"
        aria-label="Editar bilhete"
        onClick={() => startEdit(bet)}
        data-testid={`bet-action-edit-${bet.id}`}
        className="p-2 rounded hover:bg-[#CCFF00]/10 text-[#CCFF00]"
      >
        <Pencil size={16} />
      </button>

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
          onClick={() => {
            if (showForm) closeForm();
            else openNewForm();
          }}
          className="bg-[#CCFF00] text-black font-semibold px-4 py-2.5 rounded-md flex items-center justify-center gap-2 hover:bg-[#e6ff4d] w-full sm:w-auto"
        >
          {showForm ? (
            <>
              <X size={16} /> Fechar
            </>
          ) : (
            <>
              <Plus size={16} /> Novo bilhete
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          id="admin-bet-form"
          onSubmit={submit}
          className={`vs-card p-4 sm:p-6 mb-6 space-y-4 ${
            editing ? "border-[#CCFF00]/30" : ""
          }`}
          data-testid="admin-bet-form"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
                {editing ? "EdiÃ§Ã£o" : "Novo"}
              </div>
              <h2 className="font-display text-xl sm:text-2xl mt-1">
                {editing ? "Editar bilhete" : "Criar bilhete"}
              </h2>
              {editing && (
                <p className="text-xs text-white/40 mt-1">
                  As alteraÃ§Ãµes serÃ£o refletidas no bilhete jÃ¡ publicado.
                </p>
              )}
            </div>

            {editing && (
              <button
                type="button"
                onClick={closeForm}
                className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 self-start sm:self-auto"
              >
                <X size={14} /> Cancelar ediÃ§Ã£o
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs uppercase text-white/50">TÃ­tulo</label>
              <input
                required
                data-testid="bet-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-white/50">CompetiÃ§Ã£o</label>
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
              <label className="text-xs uppercase text-white/50">Plano necessÃ¡rio</label>
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
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs uppercase text-white/50">SeleÃ§Ãµes</label>
              <span className="text-[10px] text-white/30">
                {form.selections.length} {form.selections.length === 1 ? "seleÃ§Ã£o" : "seleÃ§Ãµes"}
              </span>
            </div>

            <div className="space-y-2 mt-1">
              {form.selections.map((s, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    placeholder="Partida"
                    value={s.match}
                    onChange={(e) => updateSelection(i, "match", e.target.value)}
                    className="sm:col-span-5 bg-black/40 border border-white/10 rounded-md px-3 py-2"
                  />
                  <input
                    placeholder="Mercado"
                    value={s.market}
                    onChange={(e) => updateSelection(i, "market", e.target.value)}
                    className="sm:col-span-4 bg-black/40 border border-white/10 rounded-md px-3 py-2"
                  />
                  <input
                    placeholder="Odd"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={s.odd}
                    onChange={(e) => updateSelection(i, "odd", e.target.value)}
                    className="sm:col-span-2 bg-black/40 border border-white/10 rounded-md px-3 py-2"
                  />
                  <button
                    type="button"
                    title="Remover seleÃ§Ã£o"
                    aria-label="Remover seleÃ§Ã£o"
                    onClick={() => removeSelection(i)}
                    className="sm:col-span-1 min-h-[40px] rounded-md border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/20 hover:bg-red-400/5 flex items-center justify-center"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSelection}
              className="mt-2 text-xs text-[#CCFF00] hover:underline"
            >
              + Adicionar seleÃ§Ã£o
            </button>
          </div>

          <div>
            <label className="text-xs uppercase text-white/50">AnÃ¡lise / justificativa</label>
            <textarea
              rows={3}
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="text-xs uppercase text-white/50">Link externo (casa autorizada)</label>
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

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={creating}
              data-testid="bet-submit"
              className="bg-[#CCFF00] text-black font-semibold px-6 py-2.5 rounded-md hover:bg-[#e6ff4d] disabled:opacity-50 w-full sm:w-auto"
            >
              {creating
                ? editing
                  ? "Salvando..."
                  : "Criando..."
                : editing
                ? "Salvar alteraÃ§Ãµes"
                : "Criar bilhete"}
            </button>

            {editing && (
              <button
                type="button"
                onClick={closeForm}
                disabled={creating}
                className="border border-white/10 text-white/60 font-medium px-5 py-2.5 rounded-md hover:bg-white/5 disabled:opacity-50 w-full sm:w-auto"
              >
                Cancelar
              </button>
            )}
          </div>
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
          <div className="md:hidden space-y-3" data-testid="admin-bets-mobile-list">
            {items.map((b) => (
              <div
                key={b.id}
                data-testid={`admin-bet-card-${b.id}`}
                className={`vs-card p-4 space-y-3 ${
                  editingId === b.id ? "border-[#CCFF00]/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{b.title}</div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      {b.category} Â· Odd {b.total_odd?.toFixed(2)}
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

          <div className="hidden md:block vs-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-left text-[11px] uppercase text-white/40">
                <tr>
                  <th className="px-4 py-3">TÃ­tulo</th>
                  <th className="px-4 py-3">Cat.</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Odd</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Publicado</th>
                  <th className="px-4 py-3 text-right">AÃ§Ãµes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {items.map((b) => (
                  <tr
                    key={b.id}
                    data-testid={`admin-bet-row-${b.id}`}
                    className={editingId === b.id ? "bg-[#CCFF00]/[0.025]" : ""}
                  >
                    <td className="px-4 py-3">{b.title}</td>
                    <td className="px-4 py-3 text-xs text-white/60">{b.category}</td>
                    <td className="px-4 py-3 text-xs text-[#CCFF00]">{b.required_plan}</td>
                    <td className="px-4 py-3 font-mono-data">{b.total_odd?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs">{b.status}</td>
                    <td className="px-4 py-3 text-xs">{b.published ? "Sim" : "NÃ£o"}</td>
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
