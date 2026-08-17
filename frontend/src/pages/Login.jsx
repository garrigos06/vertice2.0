import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import PublicLayout from "../components/layout/PublicLayout";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";


export default function Login() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const {
    login,
  } = useAuth();

  const navigate =
    useNavigate();

  const [params] =
    useSearchParams();


  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const u =
        await login(
          email,
          password
        );

      toast.success(
        "Bem-vindo de volta!"
      );

      const redirect =
        params.get("redirect");

      if (redirect) {
        navigate(
          redirect
        );

        return;
      }

      if (
        u.role === "ADMIN" ||
        u.role === "SUPER_ADMIN"
      ) {
        navigate(
          "/admin"
        );

        return;
      }

      const hasPremiumAccess =
        ["PRO", "FULL"].includes(
          u.plan
        ) &&
        u.subscription_status ===
          "ACTIVE";

      if (hasPremiumAccess) {
        navigate(
          "/dashboard"
        );

        return;
      }

      navigate(
        "/conta"
      );
    } catch (err) {
      toast.error(
        err?.response?.data
          ?.detail ||
          "Falha no login"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <PublicLayout>
      <section className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-display text-4xl mb-2">
          Entrar
        </h1>

        <p className="text-white/60 mb-8">
          Acesse sua conta VÃ©rtice Sports.
        </p>

        <form
          onSubmit={submit}
          className="space-y-4"
          data-testid="login-form"
        >
          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">
              E-mail
            </label>

            <input
              type="email"
              required
              autoComplete="email"
              data-testid="login-email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-[#CCFF00] outline-none"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/50">
              Senha
            </label>

            <input
              type="password"
              required
              autoComplete="current-password"
              data-testid="login-password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-md px-3 py-3 focus:border-[#CCFF00] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-[#CCFF00] text-black font-semibold py-3 rounded-md hover:bg-[#e6ff4d] disabled:opacity-50 transition-colors"
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <Link
            to="/recuperar-senha"
            data-testid="login-forgot-link"
            className="text-white/60 hover:text-white"
          >
            Esqueci minha senha
          </Link>

          <Link
            to="/cadastro"
            data-testid="login-register-link"
            className="text-[#CCFF00] hover:text-[#e6ff4d]"
          >
            Criar conta
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
