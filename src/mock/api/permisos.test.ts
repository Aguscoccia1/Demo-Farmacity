import { expect, it } from "vitest";
import type { Rol } from "../../domain/types";
import { limpiarActor } from "../../lib/sessionActor";
import { ApiError } from "./comun";
import { crearCliente } from "./clientes";
import { crearPedido } from "./pedidos";
import { crearCompra, listarPedidosEnviados } from "./compras";
import { registrarMovimientoStock } from "./inventario";
import { anularVenta, obtenerVenta } from "./ventas";
import { listarAuditoria } from "./auditoria";
import { leerBaseDatosSync } from "./db";
import { como, sucursalId, itemsCompra, productoId } from "../../test/fixtures";

const casos: Array<[Rol, () => Promise<unknown>]> = [
  ["Encargado de Ventas", () => crearPedido({ sucursalId, items: itemsCompra })],
  ["Encargado de Caja", () => crearCliente({ nombre: "Ana", apellido: "Pérez", dni: "12345678", telefono: "111", email: "ana@example.com", direccion: "Calle 1" })],
  ["Encargado de Depósito", () => crearCompra({ sucursalId, pedidoId: null, items: itemsCompra })],
  ["Encargado de Compras", () => registrarMovimientoStock({ sucursalId, productoId, cantidad: 1, tipo: "ingreso" })],
  ["Administrador", () => anularVenta("venta-01")],
];

it.each(casos)("%s no puede modificar datos de otro rol", async (rol, accion) => {
  como(rol);
  const antes = leerBaseDatosSync();
  const error: unknown = await accion().catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ message: "No tenés permiso para realizar esta acción", codigo: "SIN_PERMISO" });
  expect(leerBaseDatosSync()).toEqual(antes);
});

it("sin sesión no se puede modificar una venta", async () => {
  limpiarActor();
  await expect(anularVenta("venta-01")).rejects.toThrow("No tenés permiso para realizar esta acción");
});

it("permite las lecturas compartidas de Caja y Compras y reserva auditoría a Admin", async () => {
  como("Encargado de Caja");
  expect((await obtenerVenta("venta-01")).venta.id).toBe("venta-01");
  como("Encargado de Compras");
  expect((await listarPedidosEnviados(sucursalId)).length).toBeGreaterThan(0);
  await expect(listarAuditoria()).rejects.toThrow("No tenés permiso para realizar esta acción");
  como("Administrador");
  await expect(listarAuditoria()).resolves.toBeInstanceOf(Array);
});
