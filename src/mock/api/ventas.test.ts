import { beforeEach, expect, it } from "vitest";
import { crearVentaLibre, crearVentaConReceta, actualizarVentaLibre } from "./ventas";
import { confirmarCobro } from "./caja";
import { leerBaseDatosSync, transaccion } from "./db";
import { como, datosVenta, recetaVigente, productoId } from "../../test/fixtures";

beforeEach(() => como("Encargado de Ventas"));

it("venta libre admite medicamento sin receta y producto de venta libre", async () => {
  const venta = await crearVentaLibre({ ...datosVenta, items: [...datosVenta.items, { productoId: "pvl-01", cantidad: 2 }] });
  expect(venta.detalles.map(d => d.productoId)).toEqual([productoId, "pvl-01"]);
  expect(venta.venta.tipoVenta).toBe("Venta libre");
});

it("venta libre rechaza medicamento que requiere receta", async () => {
  const antes = leerBaseDatosSync();
  await expect(crearVentaLibre({ ...datosVenta, items: [{ productoId: "medicamento-05", cantidad: 1 }] })).rejects.toMatchObject({ codigo: "REQUIERE_RECETA" });
  expect(leerBaseDatosSync()).toEqual(antes);
});

it("venta con receta rechaza productos que no son medicamentos", async () => {
  await expect(crearVentaConReceta({ ...datosVenta, obraSocialId: null, receta: recetaVigente, items: [{ productoId: "pvl-01", cantidad: 1 }] })).rejects.toThrow("solo puede incluir medicamentos");
});

it.each(["libre", "receta"])("rechaza medicamento vencido en venta %s sin efectos parciales", async (tipo) => {
  await transaccion(db => { db.medicamentos[0].fechaVencimiento = "2026-11-15"; });
  const antes = leerBaseDatosSync();
  const accion = tipo === "libre" ? crearVentaLibre(datosVenta) : crearVentaConReceta({ ...datosVenta, obraSocialId: null, receta: recetaVigente });
  await expect(accion).rejects.toMatchObject({ codigo: "MEDICAMENTO_VENCIDO" });
  expect(leerBaseDatosSync()).toEqual(antes);
});

it("rechaza incorporar un vencido al modificar una venta", async () => {
  const venta = await crearVentaLibre(datosVenta);
  await transaccion(db => { db.medicamentos[0].fechaVencimiento = "2026-11-15"; });
  const antes = leerBaseDatosSync();
  await expect(actualizarVentaLibre(venta.venta.id, datosVenta)).rejects.toMatchObject({ codigo: "MEDICAMENTO_VENCIDO" });
  expect(leerBaseDatosSync()).toEqual(antes);
});

it.each(["libre", "receta"])("revalida vencimiento en Caja para venta %s sin cobrar ni descontar stock", async (tipo) => {
  const venta = tipo === "libre" ? await crearVentaLibre(datosVenta) : await crearVentaConReceta({ ...datosVenta, obraSocialId: null, receta: recetaVigente });
  await transaccion(db => { db.medicamentos[0].fechaVencimiento = "2026-11-15"; });
  como("Encargado de Caja");
  const antes = leerBaseDatosSync();
  const efectivo = antes.mediosPago.find(m => m.tipo === "Efectivo")!;
  await expect(confirmarCobro(venta.venta.id, [{ medioPagoId: efectivo.id, importe: venta.venta.total }])).rejects.toMatchObject({ codigo: "MEDICAMENTO_VENCIDO" });
  expect(leerBaseDatosSync()).toEqual(antes);
});

it.each([
  { fecha: "2026-11-17", fechaVencimiento: "2026-12-16" },
  { fecha: "2026-11-16", fechaVencimiento: "2026-11-15" },
  { fecha: "2026-02-30", fechaVencimiento: "2026-12-16" },
])("rechaza receta inválida en la API: %j", async (fechas) => {
  const antes = leerBaseDatosSync();
  await expect(crearVentaConReceta({ ...datosVenta, obraSocialId: null, receta: { ...recetaVigente, ...fechas } })).rejects.toThrow();
  expect(leerBaseDatosSync()).toEqual(antes);
});
