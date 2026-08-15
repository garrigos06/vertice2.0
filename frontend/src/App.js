import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Bilhetes from "./pages/Bilhetes";
import Historico from "./pages/Historico";
import AoVivo from "./pages/AoVivo";
import Calendario from "./pages/Calendario";
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

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" theme="dark" richColors />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bilhetes" element={<Bilhetes />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/ao-vivo" element={<AoVivo />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/conta" element={<Conta />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/bilhetes" element={<AdminBilhetes />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/inteligencia" element={<AdminPlaceholder title="Inteligência Vértice" description="Scanner, Comparador, Todas as partidas e Salvos. Disponível na Fase 6 — assim que as APIs esportivas estiverem configuradas." />} />
            <Route path="/admin/planos" element={<AdminPlaceholder title="Planos" description="Configuração dos planos, integração Kiwify e histórico de assinaturas. Configure KIWIFY_WEBHOOK_SECRET no .env para ativar." />} />
            <Route path="/admin/telegram" element={<AdminPlaceholder title="Telegram" description="Canal Vértice Sports | FULL — feed, mensagens e mídia. Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHANNEL_ID no .env para ativar." />} />
            <Route path="/admin/configuracoes" element={<AdminPlaceholder title="Configurações" description="Preferências gerais da plataforma e logs de auditoria." />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
