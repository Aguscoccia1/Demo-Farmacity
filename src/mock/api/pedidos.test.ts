import { expect, it } from "vitest";
import { crearPedido, cambiarEstadoPedido, obtenerPedido } from "./pedidos";
import { crearCompra, anularCompra, registrarRecepcionCompra } from "./compras";
import { registrarMovimientoStock } from "./inventario";
import { leerBaseDatosSync } from "./db";
import { como, simularIngresoHistoricoPedido, stockDe, pedidoEnviado, sucursalId, itemsCompra, productoId } from "../../test/fixtures";

it("el alta incluye una orden generada y sus detalles", async () => {
  como("Encargado de Depósito");
  const pedido = await crearPedido({ sucursalId, items: itemsCompra });
  expect(pedido.ordenGenerada).toBe(true);
  expect(pedido.detalles).toHaveLength(1);
  expect(pedido.detalles[0]).toMatchObject({ productoId, cantidad: 10 });
});

it.each([false, true])("no cancela con compra asociada vigente; recibida: %s", async (recibida) => {
  const pedidoId = await pedidoEnviado(true);
  como("Encargado de Compras");
  const compra = await crearCompra({ sucursalId, pedidoId, items: itemsCompra });
  if (recibida) await registrarRecepcionCompra(compra.compra.id);
  como("Encargado de Depósito");
  const antes = leerBaseDatosSync();
  await expect(cambiarEstadoPedido(pedidoId, { nuevoEstado: "Cancelado" })).rejects.toThrow("El pedido tiene una compra asociada");
  expect(leerBaseDatosSync()).toEqual(antes);
});

it("permite cancelar un pedido antiguo si la compra fue anulada y revierte el stock completo", async () => {
  const antes = stockDe();
  const pedidoId = await pedidoEnviado(true);
  expect(stockDe()).toBe(antes + 10);
  como("Encargado de Compras");
  const compra = await crearCompra({ sucursalId, pedidoId, items: itemsCompra });
  await anularCompra(compra.compra.id);
  como("Encargado de Depósito");
  await cambiarEstadoPedido(pedidoId, { nuevoEstado: "Cancelado" });
  expect(stockDe()).toBe(antes);
  expect((await obtenerPedido(pedidoId)).estado.nombre).toBe("Cancelado");
});

it("si falta stock para revertir un producto no modifica ningún producto ni el estado", async () => {
  como("Encargado de Depósito");
  const pedido = await crearPedido({ sucursalId, items: [...itemsCompra, { productoId: "medicamento-03", cantidad: 10 }] });
  await cambiarEstadoPedido(pedido.pedido.id, { nuevoEstado: "Enviado" });
  await simularIngresoHistoricoPedido(pedido.pedido.id);
  await registrarMovimientoStock({ tipo: "salida", productoId: "medicamento-03", sucursalId, cantidad: stockDe("medicamento-03") - 3 });
  const antes = leerBaseDatosSync();
  await expect(cambiarEstadoPedido(pedido.pedido.id, { nuevoEstado: "Cancelado" })).rejects.toMatchObject({ codigo: "STOCK_INSUFICIENTE_PARA_REVERTIR", message: expect.stringContaining("insuficiente para revertir") });
  expect(leerBaseDatosSync()).toEqual(antes);
});

it("cancelar sin recepción no altera stock", async () => {
  const antes = stockDe();
  const pedidoId = await pedidoEnviado();
  como("Encargado de Depósito");
  await cambiarEstadoPedido(pedidoId, { nuevoEstado: "Cancelado" });
  expect(stockDe()).toBe(antes);
});

it("enviar no ingresa stock aunque un cliente antiguo mande la casilla", async () => {
  como("Encargado de Depósito");
  const pedido = await crearPedido({ sucursalId, items: itemsCompra });
  const antes = leerBaseDatosSync();
  const datosAntiguos = { nuevoEstado: "Enviado" as const, mercaderiaRecibida: true };
  const enviado = await cambiarEstadoPedido(pedido.pedido.id, datosAntiguos);
  expect(enviado.pedido.estado.nombre).toBe("Enviado");
  const despues = leerBaseDatosSync();
  expect(despues.inventarios).toEqual(antes.inventarios);
  expect(despues.auditoria.slice(antes.auditoria.length)).not.toContainEqual(
    expect.objectContaining({ tipoOperacion: "Actualización de stock" }),
  );
});
