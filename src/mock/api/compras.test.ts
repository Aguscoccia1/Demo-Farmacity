import { establecerActor } from "../../lib/sessionActor";
import { beforeEach, describe, expect, it } from "vitest";
import { aplicarStockCompra, registrarRecepcionCompra, crearCompra, actualizarCompra, anularCompra } from "./compras";
import { leerBaseDatosSync } from "./db";
import { como, pedidoEnviado, sucursalId, itemsCompra } from "../../test/fixtures";

function stockDe(productoId: string, sucursalId: string): number {
  const db = leerBaseDatosSync();
  return (
    db.inventarios.find(
      (inventario) =>
        inventario.productoId === productoId &&
        inventario.sucursalId === sucursalId,
    )?.stockActual ?? 0
  );
}

beforeEach(() => {
  localStorage.clear();
  establecerActor("Compras", "Encargado de Compras");
});

describe("integridad de la compra vinculada", () => {
  it.each([false, true])("rechaza segunda compra vigente; primera recibida: %s", async (recibida) => {
    const pedidoId = await pedidoEnviado();
    como("Encargado de Compras");
    const primera = await crearCompra({ sucursalId, pedidoId, items: itemsCompra });
    if (recibida) await registrarRecepcionCompra(primera.compra.id);
    const antes = leerBaseDatosSync();
    await expect(crearCompra({ sucursalId, pedidoId, items: itemsCompra })).rejects.toMatchObject({ codigo: "COMPRA_DUPLICADA" });
    expect(leerBaseDatosSync()).toEqual(antes);
  });

  it.each([
    [{ ...itemsCompra[0], productoId: "medicamento-03" }],
  ])("rechaza reemplazar los productos del pedido: %j", async (...items) => {
    const pedidoId = await pedidoEnviado();
    como("Encargado de Compras");
    const antes = leerBaseDatosSync();
    await expect(crearCompra({ sucursalId, pedidoId, items })).rejects.toMatchObject({ codigo: "PRODUCTOS_PEDIDO_REQUERIDOS" });
    expect(leerBaseDatosSync()).toEqual(antes);
  });

  it("permite otra compra si la anterior está Anulada", async () => {
    const pedidoId = await pedidoEnviado();
    como("Encargado de Compras");
    const primera = await crearCompra({ sucursalId, pedidoId, items: itemsCompra });
    await anularCompra(primera.compra.id);
    const nueva = await crearCompra({ sucursalId, pedidoId, items: itemsCompra });
    expect(nueva.estado.nombre).toBe("Registrada");
    expect(nueva.compra.id).not.toBe(primera.compra.id);
  });

  it("admite cantidades distintas y productos adicionales; aplica las cantidades compradas una sola vez", async () => {
    const pedidoId = await pedidoEnviado();
    const antes = stockDe("medicamento-01", sucursalId);
    const antesAdicional = stockDe("medicamento-03", sucursalId);
    como("Encargado de Compras");
    const compra = await crearCompra({ sucursalId, pedidoId, items: [
      { ...itemsCompra[0], cantidad: 12 },
      { productoId: "medicamento-03", cantidad: 3, precioUnitario: 200 },
    ] });
    await registrarRecepcionCompra(compra.compra.id);
    como("Encargado de Depósito");
    await aplicarStockCompra(compra.compra.id);
    expect(stockDe("medicamento-01", sucursalId)).toBe(antes + 12);
    expect(stockDe("medicamento-03", sucursalId)).toBe(antesAdicional + 3);
    await expect(aplicarStockCompra(compra.compra.id)).rejects.toMatchObject({ codigo: "STOCK_YA_APLICADO" });
  });

  it("al modificar admite cantidades, precios y adicionales pero conserva los productos del pedido", async () => {
    const pedidoId = await pedidoEnviado();
    como("Encargado de Compras");
    const compra = await crearCompra({ sucursalId, pedidoId, items: itemsCompra });
    const modificada = await actualizarCompra(compra.compra.id, { items: [
      { ...itemsCompra[0], cantidad: 9, precioUnitario: 200 },
      { productoId: "medicamento-03", cantidad: 2, precioUnitario: 100 },
    ] });
    expect(modificada.compra.total).toBe(2000);
    for (const cambio of [{ productoId: "medicamento-03" }]) {
      const antes = leerBaseDatosSync();
      await expect(actualizarCompra(compra.compra.id, { items: [{ ...itemsCompra[0], ...cambio }] })).rejects.toMatchObject({ codigo: "PRODUCTOS_PEDIDO_REQUERIDOS" });
      expect(leerBaseDatosSync()).toEqual(antes);
    }
  });

  it("protege los pedidos antiguos que ya ingresaron stock ante cantidades distintas", async () => {
    const pedidoId = await pedidoEnviado(true);
    como("Encargado de Compras");
    const antes = leerBaseDatosSync();
    await expect(crearCompra({ sucursalId, pedidoId, items: [{ ...itemsCompra[0], cantidad: 12 }] }))
      .rejects.toMatchObject({ codigo: "DETALLES_NO_COINCIDEN" });
    expect(leerBaseDatosSync()).toEqual(antes);
  });
});

describe("recepción y aplicación de stock de compras", () => {
  it("registrar la recepción cambia el estado sin modificar el stock", async () => {
    const stockAntes = stockDe("medicamento-05", "sucursal-01");

    const compra = await registrarRecepcionCompra("compra-01");

    expect(compra.estado.nombre).toBe("Recibida");
    expect(stockDe("medicamento-05", "sucursal-01")).toBe(stockAntes);
  });

  it("aplica el stock una sola vez y rechaza una segunda aplicación", async () => {
    const stockAntes = stockDe("medicamento-02", "sucursal-01");

    establecerActor("Deposito", "Encargado de Depósito");
    await aplicarStockCompra("compra-03");
    expect(stockDe("medicamento-02", "sucursal-01")).toBe(stockAntes + 30);

    await expect(aplicarStockCompra("compra-03")).rejects.toThrow(
      "El stock de esta compra ya fue actualizado.",
    );
    expect(stockDe("medicamento-02", "sucursal-01")).toBe(stockAntes + 30);
  });
});
