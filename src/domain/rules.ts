import { format } from "date-fns";
import type {
  DetalleCobro,
  Medicamento,
  NombreEstadoCompra,
  NombreEstadoPedido,
  NombreEstadoVenta,
  Receta,
  TipoMedioPago,
} from "./types";

export const IVA_NO_APLICA = true;

export function redondearMonto(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularSubtotal(cantidad: number, precioUnitario: number): number {
  return redondearMonto(cantidad * precioUnitario);
}

export function calcularTotalVenta(
  subtotales: number[],
  descuento: number,
): number {
  const suma = redondearMonto(subtotales.reduce((acc, valor) => acc + valor, 0));
  if (descuento < 0 || descuento > suma) {
    throw new Error("El descuento debe estar entre 0 y el subtotal de la venta.");
  }
  return redondearMonto(suma - descuento);
}

export function calcularMontoCubierto(
  total: number,
  porcentajeCobertura: number | null,
): number {
  if (porcentajeCobertura === null) return 0;
  return redondearMonto((total * porcentajeCobertura) / 100);
}

export function calcularImporteCobro(total: number, montoCubierto: number): number {
  return redondearMonto(Math.max(0, total - montoCubierto));
}

export interface TotalesVenta {
  subtotal: number;
  total: number;
  montoCubierto: number;
  importeACobrar: number;
}

export function calcularTotalesVenta(
  items: Array<{ cantidad: number; precioUnitario: number }>,
  descuento: number,
  porcentajeCobertura: number | null,
): TotalesVenta {
  const subtotal = redondearMonto(
    items.reduce(
      (acc, item) => acc + calcularSubtotal(item.cantidad, item.precioUnitario),
      0,
    ),
  );
  const total = calcularTotalVenta([subtotal], descuento);
  const montoCubierto = calcularMontoCubierto(total, porcentajeCobertura);
  return {
    subtotal,
    total,
    montoCubierto,
    importeACobrar: calcularImporteCobro(total, montoCubierto),
  };
}

export function esRecetaValida(receta: Pick<Receta, "fechaVencimiento" | "medico" | "matriculaMedico">, hoy = new Date()): boolean {
  const hoyIso = format(hoy, "yyyy-MM-dd");
  return (
    receta.fechaVencimiento >= hoyIso &&
    receta.medico.trim().length > 0 &&
    receta.matriculaMedico.trim().length > 0
  );
}

export function buscarGenericoEquivalente(
  medicamento: Pick<Medicamento, "id" | "principioActivo">,
  medicamentos: Medicamento[],
  stockPorProducto: Map<string, number>,
  cantidadRequerida = 1,
): Medicamento | null {
  return (
    medicamentos.find(
      (candidato) =>
        candidato.id !== medicamento.id &&
        candidato.principioActivo.toLowerCase() ===
          medicamento.principioActivo.toLowerCase() &&
        (stockPorProducto.get(candidato.id) ?? 0) >= cantidadRequerida,
    ) ?? null
  );
}

export function stockSuficiente(
  stockDisponible: number,
  cantidadRequerida: number,
): boolean {
  return stockDisponible >= cantidadRequerida;
}

export function quedaBajoMinimo(
  stockActual: number,
  stockMinimo: number,
): boolean {
  return stockActual < stockMinimo;
}

export function pagoRechazado(
  tipo: TipoMedioPago,
  probabilidad: number,
  aleatorio: () => number = Math.random,
): boolean {
  if (tipo === "Efectivo") return false;
  return aleatorio() < probabilidad;
}

export function sumaDetallesCobro(
  detalles: Array<Pick<DetalleCobro, "importe">>,
): number {
  return redondearMonto(detalles.reduce((acc, detalle) => acc + detalle.importe, 0));
}

export function cobroCompleto(
  detalles: Array<Pick<DetalleCobro, "importe">>,
  importeEsperado: number,
): boolean {
  return Math.abs(sumaDetallesCobro(detalles) - importeEsperado) < 0.005;
}

export const TRANSICIONES_VENTA: Record<NombreEstadoVenta, NombreEstadoVenta[]> = {
  Registrada: ["Cobrada", "Anulada"],
  Cobrada: [],
  Anulada: [],
};

export const TRANSICIONES_PEDIDO: Record<
  NombreEstadoPedido,
  NombreEstadoPedido[]
> = {
  Registrado: ["Enviado", "Cancelado"],
  Enviado: ["Cancelado"],
  Cancelado: [],
};

export const TRANSICIONES_COMPRA: Record<
  NombreEstadoCompra,
  NombreEstadoCompra[]
> = {
  Registrada: ["Recibida", "Anulada"],
  Recibida: [],
  Anulada: [],
};

export function puedeTransicionar<T extends string>(
  transiciones: Record<T, T[]>,
  actual: T,
  siguiente: T,
): boolean {
  return transiciones[actual]?.includes(siguiente) ?? false;
}

export function puedeModificarVenta(nombreEstado: string): boolean {
  return nombreEstado === "Registrada";
}

export function puedeModificarPedido(nombreEstado: string): boolean {
  return nombreEstado === "Registrado";
}

export function puedeModificarCompra(nombreEstado: string): boolean {
  return nombreEstado === "Registrada";
}
