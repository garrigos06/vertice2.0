import {
  NavLink,
  useLocation,
} from "react-router-dom";

import {
  Calendar,
  Home,
  LayoutDashboard,
  Radio,
  Ticket,
  User,
} from "lucide-react";

import {
  LOGO_HORIZONTAL,
} from "../../lib/api";

import {
  useAuth,
} from "../../context/AuthContext";


const STANDARD_NAV_ITEMS = [
  {
    to: "/",
    label: "Início",
    icon: Home,
    testid: "nav-home",
  },
  {
    to: "/bilhetes",
    label: "Bilhetes",
    icon: Ticket,
    testid: "nav-bilhetes",
  },
  {
    to: "/ao-vivo",
    label: "Ao vivo",
    icon: Radio,
    testid: "nav-aovivo",
  },
  {
    to: "/calendario",
    label: "Calendário",
    icon: Calendar,
    testid: "nav-calendario",
  },
  {
    to: "/conta",
    label: "Perfil",
    icon: User,
    testid: "nav-perfil",
  },
];


const PREMIUM_NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Painel",
    icon: LayoutDashboard,
    testid: "nav-dashboard",
  },
  {
    to: "/bilhetes",
    label: "Bilhetes",
    icon: Ticket,
    testid: "nav-bilhetes",
  },
  {
    to: "/ao-vivo",
    label: "Ao vivo",
    icon: Radio,
    testid: "nav-aovivo",
  },
  {
    to: "/calendario",
    label: "Calendário",
    icon: Calendar,
    testid: "nav-calendario",
  },
  {
    to: "/conta",
    label: "Perfil",
    icon: User,
    testid: "nav-perfil",
  },
];


export default function PublicLayout({
  children,
}) {
  const {
    user,
  } = useAuth();

  const location =
    useLocation();


  const isStaff =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  const hasPremiumAccess =
    Boolean(
      user &&
        (
          isStaff ||
          (
            ["PRO", "FULL"].includes(
              user.plan
            ) &&
            user.subscription_status ===
              "ACTIVE"
          )
        )
    );


  const navItems =
    hasPremiumAccess
      ? PREMIUM_NAV_ITEMS
      : STANDARD_NAV_ITEMS;

  const brandTarget =
    hasPremiumAccess
      ? "/dashboard"
      : "/";


  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Top bar */}
      <header
        data-testid="public-header"
        className="sticky top-0 z-40 backdrop-blur-xl bg-black/70 border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <NavLink
            to={brandTarget}
            data-testid="brand-logo"
            className="flex items-center gap-3"
          >
            <img
              src={LOGO_HORIZONTAL}
              alt="Vértice Sports"
              className="h-8 md:h-9"
            />
          </NavLink>

          <nav className="hidden md:flex items-center gap-8">
            {navItems
              .slice(0, 4)
              .map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  data-testid={`desktop-${it.testid}`}
                  className={({
                    isActive,
                  }) =>
                    `text-sm font-medium tracking-wide transition-colors ${
                      isActive
                        ? "text-[#CCFF00]"
                        : "text-white/70 hover:text-white"
                    }`
                  }
                >
                  {it.label}
                </NavLink>
              ))}

            <NavLink
              to="/historico"
              data-testid="desktop-nav-historico"
              className={({
                isActive,
              }) =>
                `text-sm font-medium tracking-wide transition-colors ${
                  isActive
                    ? "text-[#CCFF00]"
                    : "text-white/70 hover:text-white"
                }`
              }
            >
              Histórico
            </NavLink>

            <NavLink
              to="/planos"
              data-testid="desktop-nav-planos"
              className={({
                isActive,
              }) =>
                `text-sm font-medium tracking-wide transition-colors ${
                  isActive
                    ? "text-[#CCFF00]"
                    : "text-white/70 hover:text-white"
                }`
              }
            >
              Planos
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <NavLink
                to="/conta"
                data-testid="header-account-link"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white"
              >
                <span className="hidden sm:inline">
                  {
                    user.name.split(
                      " "
                    )[0]
                  }
                </span>

                <span className="h-8 w-8 rounded-full bg-[#CCFF00] text-black grid place-items-center text-xs font-bold">
                  {user.name
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  data-testid="header-login-link"
                  className="hidden sm:inline text-sm text-white/70 hover:text-white"
                >
                  Entrar
                </NavLink>

                <NavLink
                  to="/cadastro"
                  data-testid="header-register-link"
                  className="bg-[#CCFF00] text-black text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#e6ff4d] transition-colors"
                >
                  Cadastrar
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="hidden md:block border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img
              src={LOGO_HORIZONTAL}
              alt="Vértice Sports"
              className="h-8 mb-3"
            />

            <p className="text-sm text-white/50 max-w-sm">
              Inteligência esportiva, análises e bilhetes transparentes. Vértice Sports
              não é uma casa de apostas.
            </p>
          </div>

          <div>
            <h4 className="font-display text-white/90 mb-3">
              Plataforma
            </h4>

            <ul className="space-y-2 text-sm text-white/60">
              {hasPremiumAccess && (
                <li>
                  <NavLink
                    to="/dashboard"
                    className="hover:text-white"
                  >
                    Meu painel
                  </NavLink>
                </li>
              )}

              <li>
                <NavLink
                  to="/bilhetes"
                  className="hover:text-white"
                >
                  Bilhetes
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/historico"
                  className="hover:text-white"
                >
                  Histórico
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/planos"
                  className="hover:text-white"
                >
                  Planos
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/calendario"
                  className="hover:text-white"
                >
                  Calendário
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-white/90 mb-3">
              Conta
            </h4>

            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <NavLink
                  to="/login"
                  className="hover:text-white"
                >
                  Login
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/cadastro"
                  className="hover:text-white"
                >
                  Cadastro
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/recuperar-senha"
                  className="hover:text-white"
                >
                  Recuperar senha
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 py-4 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Vértice Sports. Todos os direitos reservados.
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        data-testid="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10"
      >
        <ul className="grid grid-cols-5">
          {navItems.map((it) => {
            const Icon = it.icon;

            const active =
              location.pathname ===
              it.to;

            return (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  data-testid={`mobile-${it.testid}`}
                  className={`flex flex-col items-center justify-center py-2 gap-1 text-[11px] ${
                    active
                      ? "text-[#CCFF00]"
                      : "text-white/60"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={
                      active
                        ? 2.5
                        : 2
                    }
                  />

                  <span>
                    {it.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
