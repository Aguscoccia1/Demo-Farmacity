import { format } from "date-fns";
import { es } from "date-fns/locale";

export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatearFecha(fecha: string): string {
  if (!fecha) return "—";
  const soloFecha = fecha.slice(0, 10);
  const [anio, mes, dia] = soloFecha.split("-");
  if (!anio || !mes || !dia) return "—";
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaHora(fecha: string): string {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "—";
  return `${format(valor, "dd/MM/yyyy")} ${format(valor, "HH:mm")}`;
}

export function formatearFechaConDia(fecha: string): string {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "—";
  return format(valor, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

export function fechaHoyIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function soloFecha(fecha: string): string {
  return fecha.slice(0, 10);
}

export function iniciales(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}
