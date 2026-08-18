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
  selections: [
    {
      match: "",
      market: "",
      odd: 1.5,
    },
  ],
};

const statusBadge = {
  PENDENTE:
    "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  GREEN:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  RED:
    "bg-red-500/10 text-red-400 border-red-500/30",
  VOID:
    "bg-amber-500/10 text-amber-400 border-amber-500/30",
  CANCELADO:
    "bg-white/5 text-white/40 border-white/10",
};

const planBadge = {
  FREE:
    "bg-white/5 text-white/70 border-white/10",
  PRO:
    "bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/30",
  FULL:
    "bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/60",
};

const inputClass =
  "mt-1.5 w-full min-w-0 bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-[16px] sm:text-sm text-white outline-none focus:border-[#CCFF00]/60 focus:ring-1 focus:ring-[#CCFF00]/10 transition-colors";

const labelClass =
  "block text-[11px] sm:text-xs uppercase tracking-[0.08em] text-white/45";

const cloneEmptyForm = () => ({
  ...emptyForm,
  selections: emptyForm.selections.map(
    (selection) => ({
      ...selection,
    })
  ),
});

export default function AdminBilhetes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [form, setForm] =
    useState(cloneEmptyForm());
  const [creating, setCreating] =
    useState(false);
  const [showForm, setShowForm] =
    useState(false);
  const [editingId, setEditingId] =
    useState(null);

  const [params, setParams] =
    useSearchParams();

  const editing = Boolean(editingId);

  const load = () =>
    api
      .get("/bets/admin/all")
      .then((response) =>
        setItems(
          response.data.items || []
        )
      )
      .finally(() =>
        setLoading(false)
      );

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (
      params.get("new") === "1"
    ) {
      setEditingId(null);
      setForm(
        cloneEmptyForm()
      );
      setShowForm(true);

      const next =
        new URLSearchParams(
          params
        );

      next.delete("new");

      setParams(
        next,
        {
          replace: true,
        }
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNewForm = () => {
    setEditingId(null);
    setForm(
      cloneEmptyForm()
    );
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(
      cloneEmptyForm()
    );
    setShowForm(false);
  };

  const startEdit = (bet) => {
    const selections =
      Array.isArray(
        bet.selections
      ) &&
      bet.selections.length > 0
        ? bet.selections.map(
            (selection) => ({
              match:
                selection?.match ||
                "",
              market:
                selection?.market ||
                "",
              odd:
                selection?.odd ??
                1.5,
              ...(selection?.competition
                ? {
                    competition:
                      selection.competition,
                  }
                : {}),
              ...(selection?.kickoff
                ? {
                    kickoff:
                      selection.kickoff,
                  }
                : {}),
            })
          )
        : [
            {
              match: "",
              market: "",
              odd: 1.5,
            },
          ];

    setForm({
      title:
        bet.title || "",
      description:
        bet.description || "",
      category:
        bet.category ||
        "SIMPLES",
      sport:
        bet.sport ||
        "Futebol",
      competition:
        bet.competition || "",
      total_odd:
        bet.total_odd ?? 1.5,
      risk:
        bet.risk ||
        "MEDIO",
      required_plan:
        bet.required_plan ||
        "FREE",
      rationale:
        bet.rationale || "",
      external_url:
        bet.external_url ||
        "",
      featured:
        Boolean(
          bet.featured
        ),
      published:
        Boolean(
          bet.published
        ),
      selections,
    });

    setEditingId(
      bet.id
    );
    setShowForm(true);

    window.setTimeout(
      () => {
        document
          .getElementById(
            "admin-bet-form"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block: "start",
          });
      },
      50
    );
  };

  const updateSelection = (
    index,
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        selections:
          current.selections.map(
            (
              selection,
              selectionIndex
            ) =>
              selectionIndex ===
              index
                ? {
                    ...selection,
                    [field]:
                      value,
                  }
                : selection
          ),
      })
    );
  };

  const addSelection = () => {
    setForm(
      (current) => ({
        ...current,
        selections: [
          ...current.selections,
          {
            match: "",
            market: "",
            odd: 1.5,
          },
        ],
      })
    );
  };

  const removeSelection = (
    index
  ) => {
    setForm(
      (current) => {
        const next =
          current.selections.filter(
            (
              _,
              selectionIndex
            ) =>
              selectionIndex !==
              index
          );

        return {
          ...current,
          selections:
            next.length > 0
              ? next
              : [
                  {
                    match: "",
                    market: "",
                    odd: 1.5,
                  },
                ],
        };
      }
    );
  };

  const submit = async (
    event
  ) => {
    event.preventDefault();
    setCreating(true);

    try {
      const selections =
        form.selections
          .filter(
            (selection) =>
              selection.match &&
              selection.market
          )
          .map(
            (selection) => ({
              ...selection,
              odd:
                parseFloat(
                  selection.odd
                ),
            })
          );

      if (
        !selections.length
      ) {
        toast.error(
          "Adicione pelo menos uma seleÃ§Ã£o vÃ¡lida"
        );
        return;
      }

      const payload = {
        ...form,
        total_odd:
          parseFloat(
            form.total_odd
          ),
        selections,
      };

      if (editingId) {
        await api.patch(
          `/bets/admin/${editingId}`,
          payload
        );

        toast.success(
          "Bilhete atualizado"
        );
      } else {
        await api.post(
          "/bets/admin",
          payload
        );

        toast.success(
          "Bilhete criado"
        );
      }

      closeForm();
      load();
    } catch (error) {
      toast.error(
        error?.response?.data
          ?.detail ||
          "Erro ao salvar bilhete"
      );
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (
    id,
    status
  ) => {
    try {
      await api.patch(
        `/bets/admin/${id}`,
        { status }
      );

      toast.success(
        `Marcado como ${status}`
      );

      load();
    } catch {
      toast.error(
        "Erro ao atualizar status"
      );
    }
  };

  const togglePublished =
    async (bet) => {
      try {
        await api.patch(
          `/bets/admin/${bet.id}`,
          {
            published:
              !bet.published,
          }
        );

        toast.success(
          bet.published
            ? "Bilhete despublicado"
            : "Bilhete publicado"
        );

        load();
      } catch {
        toast.error(
          "Erro ao alterar publicaÃ§Ã£o"
        );
      }
    };

  const remove = async (
    id
  ) => {
    if (
      !window.confirm(
        "Excluir este bilhete?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/bets/admin/${id}`
      );

      toast.success(
        "Bilhete excluÃ­do"
      );

      if (
        editingId === id
      ) {
        closeForm();
      }

      load();
    } catch {
      toast.error(
        "Erro ao excluir"
      );
    }
  };

  const ActionButtons = ({
    bet,
  }) => (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        title="Editar bilhete"
        aria-label="Editar bilhete"
        onClick={() =>
          startEdit(bet)
        }
        className="p-2.5 rounded-lg hover:bg-[#CCFF00]/10 text-[#CCFF00]"
      >
        <Pencil
          size={17}
        />
      </button>

      <button
        type="button"
        title="Marcar Green"
        onClick={() =>
          setStatus(
            bet.id,
            "GREEN"
          )
        }
        className="p-2.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400"
      >
        <CheckCircle2
          size={17}
        />
      </button>

      <button
        type="button"
        title="Marcar Red"
        onClick={() =>
          setStatus(
            bet.id,
            "RED"
          )
        }
        className="p-2.5 rounded-lg hover:bg-red-500/10 text-red-400"
      >
        <XCircle
          size={17}
        />
      </button>

      <button
        type="button"
        title="Marcar Void"
        onClick={() =>
          setStatus(
            bet.id,
            "VOID"
          )
        }
        className="p-2.5 rounded-lg hover:bg-amber-500/10 text-amber-400"
      >
        <MinusCircle
          size={17}
        />
      </button>

      <button
        type="button"
        title={
          bet.published
            ? "Despublicar"
            : "Publicar"
        }
        onClick={() =>
          togglePublished(
            bet
          )
        }
        className="p-2.5 rounded-lg hover:bg-white/10 text-white/70"
      >
        {bet.published ? (
          <EyeOff
            size={17}
          />
        ) : (
          <Eye
            size={17}
          />
        )}
      </button>

      <button
        type="button"
        title="Excluir"
        onClick={() =>
          remove(bet.id)
        }
        className="p-2.5 rounded-lg hover:bg-red-500/10 text-white/55 hover:text-red-400"
      >
        <Trash2
          size={17}
        />
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

          <h1 className="font-display text-3xl sm:text-4xl">
            Bilhetes
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              closeForm();
            } else {
              openNewForm();
            }
          }}
          className="bg-[#CCFF00] text-black font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#e6ff4d] w-full sm:w-auto"
        >
          {showForm ? (
            <>
              <X size={17} />
              Fechar
            </>
          ) : (
            <>
              <Plus size={17} />
              Novo bilhete
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          id="admin-bet-form"
          onSubmit={submit}
          className={`vs-card overflow-hidden mb-6 ${
            editing
              ? "border-[#CCFF00]/30"
              : ""
          }`}
        >
          <div className="px-4 sm:px-6 py-5 border-b border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#CCFF00]">
                  {editing
                    ? "EdiÃ§Ã£o"
                    : "Novo"}
                </div>

                <h2 className="font-display text-2xl sm:text-3xl mt-1">
                  {editing
                    ? "Editar bilhete"
                    : "Criar bilhete"}
                </h2>

                {editing && (
                  <p className="text-xs text-white/40 mt-2">
                    As alteraÃ§Ãµes serÃ£o refletidas no bilhete jÃ¡ publicado.
                  </p>
                )}
              </div>

              {editing && (
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  className="text-xs text-white/45 hover:text-white inline-flex items-center gap-1.5 self-start"
                >
                  <X
                    size={14}
                  />
                  Cancelar ediÃ§Ã£o
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  TÃ­tulo
                </label>

                <input
                  required
                  value={
                    form.title
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      title:
                        event
                          .target
                          .value,
                    })
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  CompetiÃ§Ã£o
                </label>

                <input
                  value={
                    form.competition
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      competition:
                        event
                          .target
                          .value,
                    })
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Categoria
                </label>

                <select
                  value={
                    form.category
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      category:
                        event
                          .target
                          .value,
                    })
                  }
                  className={inputClass}
                >
                  {[
                    "SIMPLES",
                    "COMBINADO",
                    "MULTIPLO",
                    "SUPERODD",
                  ].map(
                    (item) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {
                          item
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Plano necessÃ¡rio
                </label>

                <select
                  value={
                    form.required_plan
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      required_plan:
                        event
                          .target
                          .value,
                    })
                  }
                  className={inputClass}
                >
                  {[
                    "FREE",
                    "PRO",
                    "FULL",
                  ].map(
                    (item) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {
                          item
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Odd total
                </label>

                <input
                  required
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={
                    form.total_odd
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      total_odd:
                        event
                          .target
                          .value,
                    })
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Risco
                </label>

                <select
                  value={
                    form.risk
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      risk:
                        event
                          .target
                          .value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="BAIXO">
                    BAIXO
                  </option>
                  <option value="MEDIO">
                    MÃDIO
                  </option>
                  <option value="ALTO">
                    ALTO
                  </option>
                </select>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-white/50">
                    SeleÃ§Ãµes
                  </div>

                  <div className="text-[10px] text-white/25 mt-1">
                    {form.selections.length}{" "}
                    {form.selections.length ===
                    1
                      ? "seleÃ§Ã£o"
                      : "seleÃ§Ãµes"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    addSelection
                  }
                  className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#CCFF00] border border-[#CCFF00]/20 bg-[#CCFF00]/[0.04] rounded-lg px-3 py-2.5 hover:bg-[#CCFF00]/10"
                >
                  <Plus
                    size={14}
                  />
                  Adicionar
                </button>
              </div>

              <div className="space-y-3 mt-4">
                {form.selections.map(
                  (
                    selection,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#CCFF00]">
                          SeleÃ§Ã£o{" "}
                          {index +
                            1}
                        </div>

                        <button
                          type="button"
                          aria-label="Remover seleÃ§Ã£o"
                          onClick={() =>
                            removeSelection(
                              index
                            )
                          }
                          className="h-9 w-9 rounded-lg border border-red-400/15 text-red-400/70 hover:bg-red-400/10 hover:text-red-400 grid place-items-center"
                        >
                          <Trash2
                            size={
                              15
                            }
                          />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_120px] gap-3">
                        <div>
                          <label className={labelClass}>
                            Partida
                          </label>

                          <input
                            placeholder="Ex.: Flamengo x Palmeiras"
                            value={
                              selection.match
                            }
                            onChange={(
                              event
                            ) =>
                              updateSelection(
                                index,
                                "match",
                                event
                                  .target
                                  .value
                              )
                            }
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Mercado
                          </label>

                          <input
                            placeholder="Ex.: Mais de 1.5 gols"
                            value={
                              selection.market
                            }
                            onChange={(
                              event
                            ) =>
                              updateSelection(
                                index,
                                "market",
                                event
                                  .target
                                  .value
                              )
                            }
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            Odd
                          </label>

                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={
                              selection.odd
                            }
                            onChange={(
                              event
                            ) =>
                              updateSelection(
                                index,
                                "odd",
                                event
                                  .target
                                  .value
                              )
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            <div>
              <label className={labelClass}>
                AnÃ¡lise / justificativa
              </label>

              <textarea
                rows={4}
                value={
                  form.rationale
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    rationale:
                      event
                        .target
                        .value,
                  })
                }
                className={`${inputClass} resize-y min-h-[120px]`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Link externo
              </label>

              <input
                type="url"
                inputMode="url"
                placeholder="https://..."
                value={
                  form.external_url
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    external_url:
                      event
                        .target
                        .value,
                  })
                }
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="text-sm text-white/80">
                    Destaque
                  </div>

                  <div className="text-[10px] text-white/30 mt-1">
                    Destacar bilhete na plataforma
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={
                    form.featured
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      featured:
                        event
                          .target
                          .checked,
                    })
                  }
                  className="h-5 w-5 accent-[#CCFF00] shrink-0"
                />
              </label>

              <label className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="text-sm text-white/80">
                    Publicado
                  </div>

                  <div className="text-[10px] text-white/30 mt-1">
                    Disponibilizar para usuÃ¡rios
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={
                    form.published
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      published:
                        event
                          .target
                          .checked,
                    })
                  }
                  className="h-5 w-5 accent-[#CCFF00] shrink-0"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              {editing && (
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    creating
                  }
                  className="w-full sm:w-auto border border-white/10 text-white/60 font-medium px-5 py-3 rounded-xl hover:bg-white/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                disabled={
                  creating
                }
                className="w-full sm:w-auto bg-[#CCFF00] text-black font-semibold px-6 py-3 rounded-xl hover:bg-[#e6ff4d] disabled:opacity-50"
              >
                {creating
                  ? editing
                    ? "Salvando..."
                    : "Criando..."
                  : editing
                  ? "Salvar alteraÃ§Ãµes"
                  : "Criar bilhete"}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(
            (item) => (
              <div
                key={
                  item
                }
                className="vs-skeleton h-24 sm:h-16"
              />
            )
          )}
        </div>
      ) : items.length === 0 ? (
        <div className="vs-card p-10 text-center text-white/50">
          Nenhum bilhete criado ainda.
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {items.map(
              (bet) => (
                <div
                  key={
                    bet.id
                  }
                  className={`vs-card p-4 ${
                    editingId ===
                    bet.id
                      ? "border-[#CCFF00]/30"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm break-words">
                        {
                          bet.title
                        }
                      </div>

                      <div className="text-[11px] text-white/40 mt-1">
                        {
                          bet.category
                        }{" "}
                        Â· Odd{" "}
                        {Number(
                          bet.total_odd
                        ).toFixed(
                          2
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[9px] px-2 py-1 rounded-full border shrink-0 ${
                        statusBadge[
                          bet
                            .status
                        ] ||
                        statusBadge.PENDENTE
                      }`}
                    >
                      {
                        bet.status
                      }
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span
                      className={`text-[9px] px-2 py-1 rounded-full border ${
                        planBadge[
                          bet
                            .required_plan
                        ] ||
                        planBadge.FREE
                      }`}
                    >
                      {
                        bet.required_plan
                      }
                    </span>

                    <span className="text-[9px] px-2 py-1 rounded-full border border-white/10 text-white/50">
                      {bet.published
                        ? "Publicado"
                        : "Rascunho"}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <ActionButtons
                      bet={
                        bet
                      }
                    />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="hidden md:block vs-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-left text-[11px] uppercase text-white/40">
                <tr>
                  <th className="px-4 py-3">
                    TÃ­tulo
                  </th>
                  <th className="px-4 py-3">
                    Categoria
                  </th>
                  <th className="px-4 py-3">
                    Plano
                  </th>
                  <th className="px-4 py-3">
                    Odd
                  </th>
                  <th className="px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3">
                    Publicado
                  </th>
                  <th className="px-4 py-3 text-right">
                    AÃ§Ãµes
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {items.map(
                  (bet) => (
                    <tr
                      key={
                        bet.id
                      }
                      className={
                        editingId ===
                        bet.id
                          ? "bg-[#CCFF00]/[0.025]"
                          : ""
                      }
                    >
                      <td className="px-4 py-3">
                        {
                          bet.title
                        }
                      </td>

                      <td className="px-4 py-3 text-xs text-white/60">
                        {
                          bet.category
                        }
                      </td>

                      <td className="px-4 py-3 text-xs text-[#CCFF00]">
                        {
                          bet.required_plan
                        }
                      </td>

                      <td className="px-4 py-3 font-mono-data">
                        {Number(
                          bet.total_odd
                        ).toFixed(
                          2
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {
                          bet.status
                        }
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {bet.published
                          ? "Sim"
                          : "NÃ£o"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <ActionButtons
                            bet={
                              bet
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
