import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function AdminUsuarios() {
  const { user: me } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/admin/users", { params: q ? { q } : {} })
      .then((r) => setItems(r.data.items || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const updateUser = async (id, patch) => {
    try {
      await api.patch(`/admin/users/${id}`, patch);
      toast.success("Atualizado");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">Gerenciar</div>
          <h1 className="font-display text-4xl">Usuários</h1>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex items-center gap-2 vs-card px-3 py-2">
          <Search size={16} className="text-white/40" />
          <input
            data-testid="users-search-input"
            placeholder="Buscar por nome ou e-mail"
            value={q} onChange={(e) => setQ(e.target.value)}
            className="bg-transparent outline-none text-sm w-64"
          />
        </form>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="vs-skeleton h-14" />)}</div>
      ) : items.length === 0 ? (
        <div className="vs-card p-10 text-center text-white/50" data-testid="users-empty">Nenhum usuário encontrado.</div>
      ) : (
        <div className="vs-card overflow-x-auto">
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
                    <select value={u.plan} onChange={(e) => updateUser(u.id, { plan: e.target.value })}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs">
                      {["FREE", "PRO", "FULL"].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={me?.role !== "SUPER_ADMIN" && u.role !== "USER"}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                    >
                      <option>USER</option>
                      {me?.role === "SUPER_ADMIN" && <option>ADMIN</option>}
                      {me?.role === "SUPER_ADMIN" && <option>SUPER_ADMIN</option>}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={u.active} onChange={(e) => updateUser(u.id, { active: e.target.checked })} />
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
