import { beforeEach, describe, expect, it } from "vitest";
import { aplicarStockCompra, registrarRecepcionCompra } from "./compras";
import { leerBaseDatosSync } from "./db";

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

    await aplicarStockCompra("compra-03");
    expect(stockDe("medicamento-02", "sucursal-01")).toBe(stockAntes + 30);

    await expect(aplicarStockCompra("compra-03")).rejects.toThrow(
      "El stock de esta compra ya fue actualizado.",
    );
    expect(stockDe("medicamento-02", "sucursal-01")).toBe(stockAntes + 30);
  });
});
