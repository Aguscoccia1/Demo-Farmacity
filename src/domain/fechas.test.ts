import { describe, expect, it } from "vitest";
import { esFechaCalendario, medicamentoVencido } from "./fechas";
import { esRecetaValida, buscarGenericoEquivalente } from "./rules";
import { recetaSchema } from "./validation";
import { crearSeed } from "../mock/seed";
import { recetaVigente } from "../test/fixtures";

describe("fechas de calendario", () => {
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-01", "0000-01-01"])("rechaza %s", (fecha) => {
    expect(esFechaCalendario(fecha)).toBe(false);
    expect(recetaSchema.safeParse({ ...recetaVigente, fechaVencimiento: fecha }).success).toBe(false);
  });
  it("acepta días bisiestos válidos y rechaza 1900-02-29", () => {
    expect(esFechaCalendario("2028-02-29")).toBe(true);
    expect(esFechaCalendario("2000-02-29")).toBe(true);
    expect(esFechaCalendario("1900-02-29")).toBe(false);
    expect(esFechaCalendario("2026-04-30")).toBe(true);
  });
});

describe("vigencia de recetas y medicamentos", () => {
  it.each([
    { fecha: "2026-11-17", fechaVencimiento: "2026-12-16" },
    { fecha: "2026-11-16", fechaVencimiento: "2026-11-15" },
    { fecha: "2026-02-30", fechaVencimiento: "2026-12-16" },
  ])("rechaza receta con fechas inconsistentes: %j", (fechas) => {
    expect(esRecetaValida({ ...recetaVigente, ...fechas })).toBe(false);
    expect(recetaSchema.safeParse({ ...recetaVigente, ...fechas }).success).toBe(false);
  });
  it("admite emisión y vencimiento el día de la operación", () => {
    expect(esRecetaValida({ ...recetaVigente, fechaVencimiento: "2026-11-16" })).toBe(true);
    expect(medicamentoVencido({ fechaVencimiento: "2026-11-16" })).toBe(false);
    expect(medicamentoVencido({ fechaVencimiento: "2026-11-15" })).toBe(true);
  });
  it("omite genéricos vencidos aunque tengan stock", () => {
    const original = crearSeed().medicamentos[0];
    const vencido = { ...original, id: "vencido", fechaVencimiento: "2000-01-01" };
    const vigente = { ...original, id: "vigente", fechaVencimiento: "2099-01-01" };
    expect(buscarGenericoEquivalente(original, [vencido, vigente], new Map([[vencido.id, 10], [vigente.id, 10]]))).toEqual(vigente);
    expect(buscarGenericoEquivalente(original, [vencido], new Map([[vencido.id, 10]]))).toBeNull();
  });
});
