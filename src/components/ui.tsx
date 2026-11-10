import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";

type VarianteBoton = "primario" | "secundario" | "peligro" | "fantasma" | "suave";
type TamanoBoton = "sm" | "md";

const variantesBoton: Record<VarianteBoton, string> = {
  primario:
    "bg-brand-700 text-white shadow-sm hover:bg-brand-800 focus-visible:ring-brand-500 disabled:bg-brand-300",
  secundario:
    "border border-ink-200 bg-white text-ink-700 shadow-sm hover:bg-ink-50 focus-visible:ring-brand-500 disabled:text-ink-300",
  peligro:
    "bg-red-700 text-white shadow-sm hover:bg-red-800 focus-visible:ring-red-500 disabled:bg-red-300",
  fantasma:
    "text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-brand-500",
  suave:
    "bg-brand-50 text-brand-800 hover:bg-brand-100 focus-visible:ring-brand-500 disabled:text-brand-300",
};

export function Boton({
  variante = "primario",
  tamano = "md",
  cargando = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  cargando?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
        tamano === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"
      } ${variantesBoton[variante]} ${className}`}
      {...props}
    >
      {cargando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(function Input({ className = "", error, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={`campo-base ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(function Select({ className = "", error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={error || undefined}
      className={`campo-base ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(function Textarea({ className = "", error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={error || undefined}
      className={`campo-base min-h-20 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
      {...props}
    />
  );
});

export function Campo({
  etiqueta,
  htmlFor,
  error,
  ayuda,
  requerido,
  children,
  className = "",
}: {
  etiqueta: string;
  htmlFor?: string;
  error?: string;
  ayuda?: string;
  requerido?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">
        {etiqueta}
        {requerido && (
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="flex items-start gap-1 text-xs text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-xs text-ink-500">{ayuda}</p>
      ) : null}
    </div>
  );
}

export function Tarjeta({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-ink-200 bg-white shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
            {descripcion}
          </p>
        )}
      </div>
      {acciones && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>
      )}
    </div>
  );
}

export type TonoBadge = "verde" | "amarillo" | "rojo" | "azul" | "gris";

const tonosBadge: Record<TonoBadge, string> = {
  verde: "bg-brand-50 text-brand-700 ring-brand-200",
  amarillo: "bg-amber-50 text-amber-700 ring-amber-200",
  rojo: "bg-red-50 text-red-700 ring-red-200",
  azul: "bg-sky-50 text-sky-700 ring-sky-200",
  gris: "bg-ink-100 text-ink-600 ring-ink-200",
};

export function Badge({
  tono = "gris",
  children,
}: {
  tono?: TonoBadge;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tonosBadge[tono]}`}
    >
      {children}
    </span>
  );
}

export function Vacio({
  titulo,
  descripcion,
  icono: Icono = Info,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  icono?: LucideIcon;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-ink-100 p-3 text-ink-400">
        <Icono className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-ink-800">{titulo}</h3>
      {descripcion && (
        <p className="mt-1 max-w-md text-sm text-ink-500">{descripcion}</p>
      )}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 px-6 py-14 text-sm text-ink-500"
      role="status"
    >
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
      {texto}
    </div>
  );
}

export function Alerta({
  tono = "info",
  titulo,
  children,
  className = "",
}: {
  tono?: "exito" | "error" | "info" | "advertencia";
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  const estilos = {
    exito: "border-brand-200 bg-brand-50 text-brand-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
    advertencia: "border-amber-200 bg-amber-50 text-amber-900",
  }[tono];
  const Icono = {
    exito: CheckCircle2,
    error: AlertCircle,
    info: Info,
    advertencia: AlertCircle,
  }[tono];
  return (
    <div className={`flex gap-2 rounded-lg border px-3.5 py-3 text-sm ${estilos} ${className}`}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className={titulo ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}

export function Buscador({
  valor,
  onChange,
  placeholder = "Buscar…",
  etiqueta = "Buscar",
  className = "",
}: {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  etiqueta?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        aria-hidden
      />
      <Input
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={etiqueta}
        className="pl-9"
      />
    </div>
  );
}

export function Modal({
  abierto,
  titulo,
  descripcion,
  onCerrar,
  children,
  pie,
  ancho = "md",
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: "sm" | "md" | "lg" | "xl";
}) {
  const tituloId = useId();

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPresionar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const anchoClase = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  }[ancho];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`max-h-[92vh] w-full ${anchoClase} overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <div>
            <h2 id={tituloId} className="text-lg font-semibold text-ink-950">
              {titulo}
            </h2>
            {descripcion && (
              <p className="mt-1 text-sm text-ink-500">{descripcion}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {pie && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3">
            {pie}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmarDialogo({
  abierto,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  peligro = false,
  cargando = false,
  onConfirmar,
  onCerrar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  textoConfirmar?: string;
  peligro?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal
      abierto={abierto}
      titulo={titulo}
      descripcion={descripcion}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton
            variante={peligro ? "peligro" : "primario"}
            onClick={onConfirmar}
            cargando={cargando}
          >
            {textoConfirmar}
          </Boton>
        </>
      }
    >
      {children}
    </Modal>
  );
}

export function Pestanas({
  pestanas,
  activa,
  onCambiar,
}: {
  pestanas: Array<{ id: string; etiqueta: string }>;
  activa: string;
  onCambiar: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-ink-200" role="tablist">
      {pestanas.map((pestana) => (
        <button
          key={pestana.id}
          type="button"
          role="tab"
          aria-selected={activa === pestana.id}
          onClick={() => onCambiar(pestana.id)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            activa === pestana.id
              ? "border-brand-600 text-brand-800"
              : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800"
          }`}
        >
          {pestana.etiqueta}
        </button>
      ))}
    </div>
  );
}
