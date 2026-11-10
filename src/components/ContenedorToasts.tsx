import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore } from "../stores/toasts";

export function ContenedorToasts() {
  const toasts = useToastStore((estado) => estado.toasts);
  const quitar = useToastStore((estado) => estado.quitar);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 no-imprimir"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const Icono =
          toast.tipo === "exito"
            ? CheckCircle2
            : toast.tipo === "error"
              ? AlertCircle
              : Info;
        const clases =
          toast.tipo === "exito"
            ? "border-brand-200 bg-white text-brand-900"
            : toast.tipo === "error"
              ? "border-red-200 bg-white text-red-900"
              : "border-sky-200 bg-white text-sky-900";
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${clases}`}
            role="status"
          >
            <Icono className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="flex-1 text-sm">{toast.mensaje}</p>
            <button
              type="button"
              className="rounded p-0.5 opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              onClick={() => quitar(toast.id)}
              aria-label="Cerrar mensaje"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
