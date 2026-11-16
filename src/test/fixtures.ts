import type { Rol } from "../domain/types";
import { establecerActor } from "../lib/sessionActor";
import { leerBaseDatosSync } from "../mock/api/db";
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

export async function pedidoEnviado(recibido = false) {
  como("Encargado de Depósito");
  const pedido = await crearPedido({ sucursalId, items: itemsCompra });
  await cambiarEstadoPedido(pedido.pedido.id, { nuevoEstado: "Enviado", mercaderiaRecibida: recibido });
  return pedido.pedido.id;
}
