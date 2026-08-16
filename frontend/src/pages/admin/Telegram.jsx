import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";
import { toast } from "sonner";
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Radio,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

const membershipLabels = {
  creator: "Proprietário",
  administrator: "Administrador",
  member: "Membro",
  restricted: "Restrito",
  left: "Saiu",
  kicked: "Banido",
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function AdminTelegram() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [silent, setSilent] = useState(false);
  const [sending, setSending] = useState(false);

  const loadStatus = useCallback(async (showToast = false) => {
    try {
      const { data } = await api.get("/telegram/health");

      setStatus(data);

      if (showToast) {
        if (data.connected) {
          toast.success("Telegram conectado");
        } else {
          toast.error(
            data.error || "Telegram não conectado"
          );
        }
      }
    } catch (err) {
      setStatus({
        configured: false,
        connected: false,
        error:
          err?.response?.data?.detail ||
          "Não foi possível verificar o Telegram",
      });

      if (showToast) {
        toast.error(
          err?.response?.data?.detail ||
            "Erro ao verificar integração"
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Libera a URL temporária usada na prévia do arquivo local.
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const refresh = async () => {
    setRefreshing(true);
    await loadStatus(true);
  };

  const selectImage = (file) => {
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Use uma imagem JPG, PNG ou WEBP");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("A imagem deve ter no máximo 10 MB");
      return;
    }

    const preview = URL.createObjectURL(file);

    setImageFile(file);
    setImagePreview(preview);

    // Arquivo local tem prioridade sobre URL externa.
    setImageUrl("");
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const clearForm = () => {
    setMessage("");
    setImageUrl("");
    removeImage();
    setSilent(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    const text = message.trim();
    const photoUrl = imageUrl.trim();
    const hasPhoto = Boolean(imageFile || photoUrl);

    if (!text && !hasPhoto) {
      toast.error(
        "Escreva uma mensagem ou selecione uma imagem"
      );
      return;
    }

    if (hasPhoto && text.length > 1024) {
      toast.error(
        "Com imagem, a legenda suporta até 1024 caracteres"
      );
      return;
    }

    if (!hasPhoto && text.length > 4096) {
      toast.error(
        "A mensagem passou de 4096 caracteres"
      );
      return;
    }

    setSending(true);

    try {
      /*
       * ARQUIVO LOCAL
       * Browser -> Worker -> Telegram
       */
      if (imageFile) {
        const { data } = await api.post(
          "/telegram/send-upload",
          imageFile,
          {
            params: {
              caption: text,
              filename: imageFile.name,
              silent,
            },
            headers: {
              "Content-Type": imageFile.type,
            },
          }
        );

        toast.success(
          `Imagem enviada para o FULL${
            data?.message_id
              ? ` • #${data.message_id}`
              : ""
          }`
        );

        clearForm();
        return;
      }

      /*
       * TEXTO PURO OU IMAGEM POR URL
       */
      const { data } = await api.post(
        "/telegram/send",
        {
          text,
          image_url: photoUrl || null,
          disable_notification: silent,
        }
      );

      toast.success(
        data?.type === "photo"
          ? `Imagem enviada para o FULL${
              data?.message_id
                ? ` • #${data.message_id}`
                : ""
            }`
          : `Mensagem enviada para o FULL${
              data?.message_id
                ? ` • #${data.message_id}`
                : ""
            }`
      );

      clearForm();
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
          "Erro ao enviar para o Telegram"
      );
    } finally {
      setSending(false);
    }
  };

  const connected = Boolean(status?.connected);
  const configured = Boolean(status?.configured);

  const bot = status?.bot;
  const channel = status?.channel;
  const membership = status?.membership;

  const canPost =
    membership?.status === "creator" ||
    (membership?.status === "administrator" &&
      membership?.can_post_messages !== false);

  const previewHasImage =
    Boolean(imageFile) ||
    imageUrl.trim().length > 0;

  const previewImage =
    imagePreview ||
    imageUrl.trim();

  const currentLimit = previewHasImage
    ? 1024
    : 4096;

  const canSend =
    connected &&
    !sending &&
    Boolean(
      message.trim() ||
      imageFile ||
      imageUrl.trim()
    );

  return (
    <AdminLayout>
      {/* CABEÇALHO */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#CCFF00] mb-2">
            Integração oficial
          </div>

          <h1 className="font-display text-3xl sm:text-4xl">
            Telegram
          </h1>

          <p className="text-white/50 mt-2 max-w-2xl text-sm sm:text-base">
            Gerencie o canal Vértice Sports | FULL
            diretamente pelo painel administrativo.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={refreshing}
          className="h-10 px-4 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          Atualizar conexão
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="vs-card h-32 vs-skeleton"
            />
          ))}
        </div>
      ) : (
        <>
          {/* STATUS DA CONEXÃO */}
          <div
            className={`mb-6 rounded-xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${
              connected
                ? "border-[#CCFF00]/25 bg-[#CCFF00]/[0.04]"
                : "border-red-500/20 bg-red-500/[0.04]"
            }`}
          >
            <div
              className={`h-12 w-12 rounded-xl grid place-items-center shrink-0 ${
                connected
                  ? "bg-[#CCFF00]/10 text-[#CCFF00]"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {connected ? (
                <Wifi size={23} />
              ) : (
                <WifiOff size={23} />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl">
                  {connected
                    ? "Telegram conectado"
                    : "Telegram desconectado"}
                </h2>

                {connected && (
                  <span className="h-2 w-2 rounded-full bg-[#CCFF00] shadow-[0_0_12px_#CCFF00]" />
                )}
              </div>

              <p className="text-sm text-white/50 mt-1">
                {connected
                  ? "Bot e canal responderam corretamente à API do Telegram."
                  : status?.error ||
                    (configured
                      ? "A configuração existe, mas a conexão falhou."
                      : "As credenciais do Telegram ainda não foram configuradas.")}
              </p>
            </div>

            <div
              className={`text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-1.5 rounded-full border self-start sm:self-auto ${
                connected
                  ? "text-[#CCFF00] border-[#CCFF00]/20 bg-[#CCFF00]/5"
                  : "text-red-400 border-red-500/20 bg-red-500/5"
              }`}
            >
              {connected ? "Online" : "Offline"}
            </div>
          </div>

          {/* CARDS */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
            {/* BOT */}
            <div className="vs-card p-5">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Bot
                </span>

                <Bot
                  size={18}
                  className="text-[#CCFF00]"
                />
              </div>

              <div className="font-display text-lg truncate">
                {bot?.name || "—"}
              </div>

              <div className="text-sm text-white/40 mt-1 truncate">
                {bot?.username
                  ? `@${bot.username}`
                  : "Não identificado"}
              </div>
            </div>

            {/* CANAL */}
            <div className="vs-card p-5">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Canal
                </span>

                <Radio
                  size={18}
                  className="text-[#CCFF00]"
                />
              </div>

              <div className="font-display text-lg truncate">
                {channel?.title || "—"}
              </div>

              <div className="text-sm text-white/40 mt-1">
                {channel?.type === "channel"
                  ? "Canal"
                  : channel?.type ||
                    "Não identificado"}
              </div>
            </div>

            {/* PERMISSÃO */}
            <div className="vs-card p-5">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Permissão
                </span>

                <ShieldCheck
                  size={18}
                  className={
                    canPost
                      ? "text-[#CCFF00]"
                      : "text-white/30"
                  }
                />
              </div>

              <div className="font-display text-lg">
                {membership
                  ? membershipLabels[
                      membership.status
                    ] ||
                    membership.status
                  : "—"}
              </div>

              <div
                className={`text-sm mt-1 ${
                  canPost
                    ? "text-[#CCFF00]/70"
                    : "text-white/40"
                }`}
              >
                {canPost
                  ? "Pode publicar"
                  : "Sem confirmação de postagem"}
              </div>
            </div>

            {/* INTEGRAÇÃO */}
            <div className="vs-card p-5">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Integração
                </span>

                {connected ? (
                  <CheckCircle2
                    size={18}
                    className="text-[#CCFF00]"
                  />
                ) : (
                  <CircleAlert
                    size={18}
                    className="text-red-400"
                  />
                )}
              </div>

              <div className="font-display text-lg">
                {connected
                  ? "Operacional"
                  : "Indisponível"}
              </div>

              <div className="text-sm text-white/40 mt-1">
                API Telegram
              </div>
            </div>
          </div>

          {/* COMPOSER + PREVIEW */}
          <div className="grid xl:grid-cols-[1.35fr_0.65fr] gap-6">
            <form
              onSubmit={sendMessage}
              className="vs-card p-5 sm:p-7"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-[#CCFF00] mb-2">
                    Nova publicação
                  </div>

                  <h2 className="font-display text-2xl">
                    Enviar para o FULL
                  </h2>

                  <p className="text-sm text-white/40 mt-1">
                    Publique texto, arte ou imagem
                    diretamente no canal.
                  </p>
                </div>

                <div className="h-10 w-10 rounded-lg bg-[#CCFF00]/10 text-[#CCFF00] grid place-items-center shrink-0">
                  <MessageCircle size={19} />
                </div>
              </div>

              {/* UPLOAD LOCAL */}
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                Imagem
              </label>

              {!imageFile ? (
                <label className="mb-5 min-h-[145px] border border-dashed border-white/15 hover:border-[#CCFF00]/50 bg-black/30 hover:bg-[#CCFF00]/[0.02] rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={
                      !connected || sending
                    }
                    onChange={(e) => {
                      const file =
                        e.target.files?.[0];

                      selectImage(file);

                      // Permite escolher o mesmo
                      // arquivo novamente depois.
                      e.target.value = "";
                    }}
                  />

                  <div className="h-11 w-11 rounded-xl bg-[#CCFF00]/10 text-[#CCFF00] grid place-items-center mb-3 group-hover:scale-105 transition-transform">
                    <Upload size={19} />
                  </div>

                  <div className="font-medium">
                    Selecionar imagem do computador
                  </div>

                  <div className="text-xs text-white/35 mt-1">
                    JPG, PNG ou WEBP • máximo 10 MB
                  </div>
                </label>
              ) : (
                <div className="mb-5 border border-[#CCFF00]/20 bg-[#CCFF00]/[0.03] rounded-xl p-3 flex items-center gap-4">
                  <img
                    src={imagePreview}
                    alt="Imagem selecionada"
                    className="h-20 w-20 rounded-lg object-cover border border-white/10 bg-black"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {imageFile.name}
                    </div>

                    <div className="text-xs text-white/40 mt-1">
                      {(
                        imageFile.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </div>

                    <div className="text-[10px] uppercase tracking-wider text-[#CCFF00] mt-2">
                      Pronta para envio
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={sending}
                    title="Remover imagem"
                    className="h-9 w-9 rounded-lg grid place-items-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}

              {/* URL EXTERNA */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                  ou
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                URL externa da imagem
              </label>

              <div className="relative mb-5">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) =>
                    setImageUrl(e.target.value)
                  }
                  disabled={
                    !connected ||
                    sending ||
                    Boolean(imageFile)
                  }
                  placeholder={
                    imageFile
                      ? "Remova o arquivo local para usar uma URL"
                      : "https://..."
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 pr-12 outline-none focus:border-[#CCFF00]/50 focus:ring-1 focus:ring-[#CCFF00]/10 transition-all placeholder:text-white/20 disabled:opacity-40"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25">
                  <ImageIcon size={18} />
                </div>
              </div>

              {/* TEXTO */}
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                Mensagem / legenda
              </label>

              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value.slice(
                        0,
                        currentLimit
                      )
                    )
                  }
                  disabled={
                    !connected || sending
                  }
                  placeholder={`🔥 VÉRTICE SPORTS | FULL

Escreva aqui a mensagem exclusiva para os assinantes...`}
                  className="w-full min-h-[260px] resize-y bg-black/40 border border-white/10 rounded-lg p-4 pb-10 outline-none focus:border-[#CCFF00]/50 focus:ring-1 focus:ring-[#CCFF00]/10 transition-all placeholder:text-white/20 disabled:opacity-50"
                />

                <span
                  className={`absolute bottom-3 right-3 text-[11px] font-mono ${
                    message.length >
                    currentLimit - 100
                      ? "text-amber-400"
                      : "text-white/30"
                  }`}
                >
                  {message.length}/{currentLimit}
                </span>
              </div>

              {previewHasImage && (
                <div className="mt-2 text-[11px] text-white/30">
                  Com imagem, o texto será enviado
                  como legenda.
                </div>
              )}

              {/* CONTROLES */}
              <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() =>
                      setSilent(
                        (value) => !value
                      )
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      silent
                        ? "bg-[#CCFF00]"
                        : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                        silent
                          ? "left-[22px] bg-black"
                          : "left-0.5 bg-white/60"
                      }`}
                    />
                  </button>

                  <div>
                    <div className="text-sm">
                      Envio silencioso
                    </div>

                    <div className="text-[11px] text-white/35">
                      Não dispara notificação sonora
                    </div>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={!canSend}
                  className="bg-[#CCFF00] hover:bg-[#e6ff4d] disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-black font-semibold h-11 px-6 rounded-md flex items-center gap-2 transition-colors"
                >
                  {sending ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Enviar para o FULL
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* PRÉ-VISUALIZAÇÃO */}
            <div className="vs-card p-5 sm:p-7 h-fit">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#CCFF00] mb-2">
                Pré-visualização
              </div>

              <h2 className="font-display text-xl mb-5">
                Como vai aparecer
              </h2>

              <div className="rounded-xl border border-white/10 overflow-hidden bg-[#101820]">
                {/* HEADER TELEGRAM */}
                <div className="px-4 py-3 bg-[#17212b] border-b border-white/5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-black border border-[#CCFF00]/30 grid place-items-center">
                    <span className="text-[#CCFF00] font-bold text-xs">
                      V
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {channel?.title ||
                        "Vértice Sports | FULL"}
                    </div>

                    <div className="text-[10px] text-white/40">
                      canal
                    </div>
                  </div>
                </div>

                {/* CONTEÚDO */}
                <div className="p-4 min-h-[220px] space-y-4">
                  {previewHasImage && (
                    <div className="rounded-lg overflow-hidden border border-white/10 bg-black/20">
                      <img
                        key={previewImage}
                        src={previewImage}
                        alt="Prévia da publicação"
                        className="w-full max-h-[420px] object-contain bg-black"
                      />
                    </div>
                  )}

                  {message.trim() ? (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-white/90">
                      {message}
                    </p>
                  ) : !previewHasImage ? (
                    <div className="h-full min-h-[180px] grid place-items-center text-center">
                      <div>
                        <Smartphone
                          size={28}
                          className="mx-auto text-white/15 mb-3"
                        />

                        <p className="text-xs text-white/30 max-w-[200px]">
                          Sua publicação aparecerá
                          aqui enquanto você monta o
                          post.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="px-4 pb-3 text-right">
                  <span className="text-[10px] text-white/30">
                    agora
                  </span>
                </div>
              </div>

              {/* DETALHES */}
              <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 flex items-center gap-2">
                    <Users size={13} />
                    Destino
                  </span>

                  <span className="text-white/70 truncate ml-3">
                    {channel?.title || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 flex items-center gap-2">
                    <Bot size={13} />
                    Enviado por
                  </span>

                  <span className="text-white/70">
                    {bot?.username
                      ? `@${bot.username}`
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 flex items-center gap-2">
                    <ImageIcon size={13} />
                    Mídia
                  </span>

                  <span className="text-white/70">
                    {imageFile
                      ? "Arquivo local"
                      : imageUrl.trim()
                        ? "URL externa"
                        : "Sem imagem"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 flex items-center gap-2">
                    <Wifi size={13} />
                    Status
                  </span>

                  <span
                    className={
                      connected
                        ? "text-[#CCFF00]"
                        : "text-red-400"
                    }
                  >
                    {connected
                      ? "Conectado"
                      : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
