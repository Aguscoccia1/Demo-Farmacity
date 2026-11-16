import { format } from "date-fns";

export function fechaDeHoy(hoy = new Date()): string {
  return format(hoy, "yyyy-MM-dd");
}

/** Comprueba el calendario sin normalizar días inexistentes ni usar UTC. */
export function esFechaCalendario(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  if (anio < 1 || mes < 1 || mes > 12 || dia < 1) return false;
  const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
  const dias = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dia <= dias[mes - 1];
}

export function medicamentoVencido(
  medicamento: { fechaVencimiento: string },
  hoy = new Date(),
): boolean {
  return !esFechaCalendario(medicamento.fechaVencimiento) ||
    medicamento.fechaVencimiento < fechaDeHoy(hoy);
}
