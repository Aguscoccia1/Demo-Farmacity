import type { Rol } from "../domain/types";
import { establecerActor } from "../lib/sessionActor";
import { leerBaseDatosSync, transaccion } from "../mock/api/db";
import { auditar } from "../mock/api/comun";
import { cambiarEstadoPedido, crearPedido } from "../mock/api/pedidos";

export const sucursalId = "sucursal-01";
export const productoId = "medicamento-01";
export const itemsCompra = [{ productoId, cantidad: 10, precioUnitario: 100 }];
export const datosVenta = { sucursalId, clienteId: "cliente-01", descuento: 0, items: [{ productoId, cantidad: 1 }] };
export const recetaVigente = { fecha: "2026-11-16", fechaVencimiento: "2026-12-16", medico: "Dra. Pérez", matriculaMedico: "MP123" };

export function como(rol: Rol): void {
  establecerActor("Prueba", rol);
}

export function stockDe(id = productoId): number {
  return leerBaseDatosSync().inventarios.find(i => i.productoId === id && i.sucursalId === sucursalId)!.stockActual;
}

export function estadoVenta(id: string): string {
  const db = leerBaseDatosSync();
  const venta = db.ventas.find(v => v.id === id)!;
  return db.estadosVenta.find(e => e.id === venta.estadoId)!.nombre;
}

export async function pedidoEnviado(conStockHistorico = false) {
  como("Encargado de Depósito");
  const pedido = await crearPedido({ sucursalId, items: itemsCompra });
  await cambiarEstadoPedido(pedido.pedido.id, { nuevoEstado: "Enviado" });
  if (conStockHistorico) await simularIngresoHistoricoPedido(pedido.pedido.id);
  return pedido.pedido.id;
}

// Datos persistidos por la versión anterior; esta acción ya no existe en la API.
export async function simularIngresoHistoricoPedido(pedidoId: string) {
  await transaccion((db) => {
    for (const detalle of db.detallesPedido.filter(d => d.pedidoId === pedidoId)) {
      db.inventarios.find(i => i.productoId === detalle.productoId && i.sucursalId === sucursalId)!.stockActual += detalle.cantidad;
    }
    auditar(db, {
      tipoOperacion: "Actualización de stock",
      descripcion: "Stock ajustado por mercadería recibida del pedido (versión anterior).",
      sucursalId,
      referenciaId: pedidoId,
    });
  });
}
