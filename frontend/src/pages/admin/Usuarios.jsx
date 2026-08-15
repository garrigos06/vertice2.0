import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const roleBadge = {
  USER: "bg-white/5 text-white/70 border-white/10",
  ADMIN: "bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/30",
  SUPER_ADMIN: "bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/50",
};

const planBadge = {
  FREE: "bg-white/5 text-white/70 border-white/10",
  PRO: "bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/30",
  FULL: "bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/60",
};

function UserFields({ user, canGrantAdmin, onChange }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest text-white/40">Plano</span>
        <select
          value={user.plan}
          onChange={(e) => onChange({ plan: e.target.value })}
          data-testid={`user-plan-${user.id}`}
          className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs w-full"
        >
          {["FREE", "PRO", "FULL"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest text-white/40">Role</span>
        <select
          value={user.role}
          disabled={!canGrantAdmin && user.role !== "USER"}
          onChange={(e) => onChange({ role: e.target.value })}
          data-testid={`user-role-${user.id}`}
          className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs w-full disabled:opacity-60"
        >
          <option>USER</option>
          {canGrantAdmin && <option>ADMIN</option>}
          {canGrantAdmin && <option>SUPER_ADMIN</option>}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-white/80">
        <input
          type="checkbox"
          checked={user.active}
          onChange={(e) => onChange({ active: e.target.checked })}
          data-testid={`user-active-${user.id}`}
          className="accent-[#CCFF00]"
        />
        Ativo
      </label>
    </>
  );
}

export default function AdminUsuarios() {
  const { user: me } = useAuth();
  const canGrantAdmin = me?.role === "SUPER_ADMIN";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(
    async (searchTerm) => {
      setLoading(true);
      try {
        const params = searchTerm ? { q: searchTerm } : {};
        const r = await api.get("/admin/users", { params });
        setItems(r.data.items || []);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load("");
  }, [load]);

  const updateUser = async (id, patch) => {
    try {
      await api.patch(`/admin/users/${id}`, patch);
      toast.success("Usuário atualizado");
      load(q);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao atualizar");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">Gerenciar</div>
          <h1 className="font-display text-3xl sm:text-4xl">Usuários</h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
          className="flex items-center gap-2 vs-card px-3 py-2 w-full sm:w-auto"
        >
          <Search size={16} className="text-white/40 shrink-0" />
          <input
            data-testid="users-search-input"
            placeholder="Buscar por nome ou e-mail"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-transparent outline-none text-sm flex-1 sm:w-64"
          />
          <button
            type="submit"
            data-testid="users-search-submit"
            className="text-xs text-[#CCFF00] hover:underline shrink-0"
          >
            Buscar
          </button>
        </form>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="vs-skeleton h-20 sm:h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="vs-card p-10 text-center text-white/50" data-testid="users-empty">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3" data-testid="users-mobile-list">
            {items.map((u) => (
              <div
                key={u.id}
                data-testid={`user-card-${u.id}`}
                className="vs-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{u.name}</div>
                    <div className="text-xs text-white/60 truncate">{u.email}</div>
                    <div className="text-[10px] text-white/40 mt-1">
                      Desde {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        planBadge[u.plan] || planBadge.FREE
                      }`}
                    >
                      {u.plan}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        roleBadge[u.role] || roleBadge.USER
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                  <UserFields
                    user={u}
                    canGrantAdmin={canGrantAdmin}
                    onChange={(patch) => updateUser(u.id, patch)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block vs-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-left text-[11px] uppercase text-white/40">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Ativo</th>
                  <th className="px-4 py-3">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((u) => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`}>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3 text-white/70">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.plan}
                        onChange={(e) => updateUser(u.id, { plan: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                      >
                        {["FREE", "PRO", "FULL"].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={!canGrantAdmin && u.role !== "USER"}
                        onChange={(e) => updateUser(u.id, { role: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs disabled:opacity-60"
                      >
                        <option>USER</option>
                        {canGrantAdmin && <option>ADMIN</option>}
                        {canGrantAdmin && <option>SUPER_ADMIN</option>}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={u.active}
                        onChange={(e) => updateUser(u.id, { active: e.target.checked })}
                        className="accent-[#CCFF00]"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
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
