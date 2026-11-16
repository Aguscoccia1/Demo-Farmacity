import { expect, it } from "vitest";
import { crearTurno } from "./clientes";
import { como } from "../../test/fixtures";
import { leerBaseDatosSync } from "./db";

it.each(["2026-11-15", "2026-02-30"])("rechaza turno pasado o inexistente: %s", async (fecha) => {
  como("Encargado de Ventas");
  const antes = leerBaseDatosSync();
  await expect(crearTurno({ clienteId: "cliente-01", fecha, hora: "12:00" })).rejects.toThrow();
  expect(leerBaseDatosSync()).toEqual(antes);
});

it.each(["2026-11-16", "2026-11-17"])("permite turno hoy o futuro: %s", async (fecha) => {
  como("Encargado de Ventas");
  await expect(crearTurno({ clienteId: "cliente-01", fecha, hora: "12:00" })).resolves.toMatchObject({ fecha });
});
