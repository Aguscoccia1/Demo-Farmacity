import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { PaginaVentaConReceta } from "./PaginaVentaConReceta";
import { PaginaListaVentas } from "./PaginaListaVentas";
import { PaginaCobrar } from "../caja/PaginaCobrar";
import { PaginaComprobante } from "../caja/PaginaComprobante";
import { useSucursalStore } from "../../stores/sucursal";
import { useToastStore } from "../../stores/toasts";
import { leerBaseDatosSync } from "../../mock/api/db";
import { como, stockDe, estadoVenta } from "../../test/fixtures";

it("registra venta con receta y cobertura, cobra en Caja y abre comprobante descontando stock una sola vez", async () => {
  const usuario = userEvent.setup();
  useSucursalStore.setState({ sucursalId: "sucursal-01" });
  useToastStore.setState({ toasts: [] });
  como("Encargado de Ventas");
  const anteriores = new Set(leerBaseDatosSync().ventas.map(v => v.id));
  const stockInicial = stockDe("medicamento-07");
  render(
    <MemoryRouter initialEntries={["/ventas/receta/nueva"]}>
      <Routes>
        <Route path="/ventas/receta/nueva" element={<PaginaVentaConReceta />} />
        <Route path="/ventas/receta" element={<PaginaListaVentas tipoVenta="Con receta" />} />
      </Routes>
    </MemoryRouter>,
  );
  await usuario.selectOptions(await screen.findByLabelText(/Cliente/), "cliente-15");
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  await usuario.selectOptions(screen.getByLabelText(/Obra social/), "obra-social-02");
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(screen.getByLabelText(/Fecha de vencimiento/), { target: { value: "2026-12-16" } });
  fireEvent.change(screen.getByLabelText(/Médico/), { target: { value: "Dra. Pérez" } });
  fireEvent.change(screen.getByLabelText(/Matrícula/), { target: { value: "MP123" } });
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  await usuario.click(screen.getByLabelText("Agregar Enalapril 10 mg de Delta Salud"));
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  await usuario.click(screen.getByRole("button", { name: "Registrar venta" }));
  await waitFor(() => expect(leerBaseDatosSync().ventas.length).toBe(anteriores.size + 1));
  const venta = leerBaseDatosSync().ventas.find(v => !anteriores.has(v.id))!;
  expect(venta).toMatchObject({ tipoVenta: "Con receta", total: 5600, montoCubierto: 2240 });
  expect(estadoVenta(venta.id)).toBe("Registrada");
  expect(stockDe("medicamento-07")).toBe(stockInicial);
  cleanup();

  como("Encargado de Caja");
  render(
    <MemoryRouter initialEntries={["/caja/cobrar"]}>
      <Routes>
        <Route path="/caja/cobrar" element={<PaginaCobrar />} />
        <Route path="/caja/comprobante/:ventaId" element={<PaginaComprobante />} />
      </Routes>
    </MemoryRouter>,
  );
  const celda = await screen.findByText("Vera, Carolina");
  await usuario.click(within(celda.closest("tr")!).getByRole("button", { name: "Cobrar" }));
  expect(screen.getByLabelText(/Importe/)).toHaveValue(3360);
  await usuario.click(screen.getByRole("button", { name: /Confirmar cobro/ }));
  expect(await screen.findByRole("button", { name: "Imprimir comprobante" })).toBeInTheDocument();
  expect(estadoVenta(venta.id)).toBe("Cobrada");
  expect(stockDe("medicamento-07")).toBe(stockInicial - 1);
  const db = leerBaseDatosSync();
  expect(db.cobros.filter(c => c.ventaId === venta.id)).toHaveLength(1);
  expect(db.auditoria.some(r => r.tipoOperacion === "Cobro" && r.rol === "Encargado de Caja")).toBe(true);
});
