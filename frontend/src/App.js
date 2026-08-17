import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import { Toaster } from "sonner";

import "./App.css";

import { AuthProvider } from "./context/AuthContext";

import Home from "./pages/Home";
import DashboardUsuario from "./pages/DashboardUsuario";
import Bilhetes from "./pages/Bilhetes";
import Historico from "./pages/Historico";
import AoVivo from "./pages/AoVivo";
import Calendario from "./pages/Calendario";
import Partida from "./pages/Partida";
import Planos from "./pages/Planos";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Conta from "./pages/Conta";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminBilhetes from "./pages/admin/Bilhetes";
import AdminUsuarios from "./pages/admin/Usuarios";
import AdminPlaceholder from "./pages/admin/Placeholder";
import AdminTelegram from "./pages/admin/Telegram";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            theme="dark"
            richColors
          />

          <Routes>
            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/dashboard"
              element={<DashboardUsuario />}
            />

            <Route
              path="/bilhetes"
              element={<Bilhetes />}
            />

            <Route
              path="/historico"
              element={<Historico />}
            />

            <Route
              path="/ao-vivo"
              element={<AoVivo />}
            />

            <Route
              path="/calendario"
              element={<Calendario />}
            />

            <Route
              path="/partida/:matchId"
              element={<Partida />}
            />

            <Route
              path="/planos"
              element={<Planos />}
            />

            <Route
              path="/conta"
              element={<Conta />}
            />

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/cadastro"
              element={<Cadastro />}
            />

            <Route
              path="/recuperar-senha"
              element={<RecuperarSenha />}
            />

            <Route
              path="/redefinir-senha"
              element={<RedefinirSenha />}
            />

            <Route
              path="/admin"
              element={<AdminDashboard />}
            />

            <Route
              path="/admin/bilhetes"
              element={<AdminBilhetes />}
            />

            <Route
              path="/admin/usuarios"
              element={<AdminUsuarios />}
            />

            <Route
              path="/admin/inteligencia"
              element={
                <AdminPlaceholder
                  title="InteligÃªncia VÃ©rtice"
                  description="Scanner, Comparador, Todas as partidas e Salvos. DisponÃ­vel na Fase 6 â assim que as APIs esportivas estiverem configuradas."
                />
              }
            />

            <Route
              path="/admin/planos"
              element={
                <AdminPlaceholder
                  title="Planos"
                  description="ConfiguraÃ§Ã£o dos planos, integraÃ§Ã£o Kiwify e histÃ³rico de assinaturas. Configure KIWIFY_WEBHOOK_SECRET no .env para ativar."
                />
              }
            />

            <Route
              path="/admin/telegram"
              element={<AdminTelegram />}
            />

            <Route
              path="/admin/configuracoes"
              element={
                <AdminPlaceholder
                  title="ConfiguraÃ§Ãµes"
                  description="PreferÃªncias gerais da plataforma e logs de auditoria."
                />
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
