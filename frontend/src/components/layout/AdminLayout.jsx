import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Brain,
  BadgeCheck,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { LOGO_ICON } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "../ui/sheet";

const items = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, testid: "admin-nav-overview", end: true },
  { to: "/admin/bilhetes", label: "Bilhetes", icon: Ticket, testid: "admin-nav-bilhetes" },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, testid: "admin-nav-usuarios" },
  { to: "/admin/inteligencia", label: "Inteligência", icon: Brain, testid: "admin-nav-inteligencia" },
  { to: "/admin/planos", label: "Planos", icon: BadgeCheck, testid: "admin-nav-planos" },
  { to: "/admin/telegram", label: "Telegram", icon: MessageCircle, testid: "admin-nav-telegram" },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, testid: "admin-nav-configuracoes" },
];

function NavItems({ role, onNavigate, testidPrefix = "" }) {
  return (
    <>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={onNavigate}
            data-testid={`${testidPrefix}${it.testid}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[#CCFF00]/10 text-[#CCFF00] border-l-2 border-[#CCFF00]"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Icon size={18} />
            <span>{it.label}</span>
          </NavLink>
        );
      })}
    </>
  );
}

export default function AdminLayout({ children }) {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o drawer ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) {
      navigate("/login?redirect=/admin", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="vs-skeleton w-40 h-6" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) */}
      <aside
        data-testid="admin-sidebar"
        className="hidden md:flex w-64 flex-col border-r border-white/5 bg-[#0b0b0b] sticky top-0 h-screen"
      >
        <div className="px-6 py-6 flex items-center gap-3 border-b border-white/5">
          <img src={LOGO_ICON} alt="Vértice" className="h-8 w-8" />
          <div>
            <div className="font-display text-lg leading-none">Vértice</div>
            <div className="text-[10px] uppercase tracking-widest text-[#CCFF00]">
              {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          <NavItems role={user.role} />
        </nav>
        <button
          data-testid="admin-logout-btn"
          onClick={handleLogout}
          className="mx-3 mb-4 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={18} /> Sair
        </button>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/60 border-b border-white/5">
          <div className="px-4 sm:px-6 md:px-10 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger (mobile) */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button
                    data-testid="admin-mobile-menu-btn"
                    aria-label="Abrir menu administrativo"
                    className="md:hidden h-10 w-10 grid place-items-center rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <Menu size={20} />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  data-testid="admin-mobile-drawer"
                  className="w-[280px] max-w-[85vw] bg-[#0b0b0b] border-white/5 text-white p-0 flex flex-col"
                >
                  <SheetTitle className="sr-only">Menu administrativo</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navegação do painel administrativo do Vértice Sports
                  </SheetDescription>
                  <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
                    <img src={LOGO_ICON} alt="Vértice" className="h-8 w-8" />
                    <div>
                      <div className="font-display text-lg leading-none">Vértice</div>
                      <div className="text-[10px] uppercase tracking-widest text-[#CCFF00]">
                        {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                      </div>
                    </div>
                  </div>
                  <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
                    <NavItems
                      role={user.role}
                      onNavigate={() => setMobileOpen(false)}
                      testidPrefix="mobile-"
                    />
                  </nav>
                  <button
                    data-testid="admin-mobile-logout-btn"
                    onClick={handleLogout}
                    className="mx-3 mb-5 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <LogOut size={18} /> Sair
                  </button>
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  Painel administrativo
                </div>
                <div className="font-display text-base sm:text-lg truncate">Vértice Sports</div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-[11px] text-[#CCFF00] uppercase tracking-wider">
                  {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#CCFF00] text-black grid place-items-center font-bold">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
