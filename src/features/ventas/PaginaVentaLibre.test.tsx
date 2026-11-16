import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { PaginaVentaLibre } from "./PaginaVentaLibre";
import { PaginaListaVentas } from "./PaginaListaVentas";
import { useSucursalStore } from "../../stores/sucursal";
import { como } from "../../test/fixtures";
import { leerBaseDatosSync } from "../../mock/api/db";

beforeEach(() => {
  useSucursalStore.setState({ sucursalId: "sucursal-01" });
  como("Encargado de Ventas");
});

it("permite elegir medicamentos sin receta y excluye los de receta obligatoria", async () => {
  render(<MemoryRouter><PaginaVentaLibre /></MemoryRouter>);
  expect(await screen.findByLabelText("Agregar Ibuprofeno 400 mg")).toBeEnabled();
  expect(screen.getByLabelText("Agregar Alcohol en gel 250 ml")).toBeEnabled();
  expect(screen.queryByText("Amoxicilina 500 mg")).not.toBeInTheDocument();
});

it("registra desde la pantalla una venta con medicamento sin receta", async () => {
  const usuario = userEvent.setup();
  const antes = new Set(leerBaseDatosSync().ventas.map(v => v.id));
  render(
    <MemoryRouter initialEntries={["/ventas-libres/nueva"]}>
      <Routes>
        <Route path="/ventas-libres/nueva" element={<PaginaVentaLibre />} />
        <Route path="/ventas-libres" element={<PaginaListaVentas tipoVenta="Venta libre" />} />
      </Routes>
    </MemoryRouter>,
  );
  await usuario.click(await screen.findByLabelText("Agregar Ibuprofeno 400 mg"));
  await usuario.selectOptions(screen.getByLabelText(/Cliente/), "cliente-15");
  await usuario.click(screen.getByRole("button", { name: "Registrar venta" }));
  await waitFor(() => expect(leerBaseDatosSync().ventas.length).toBe(antes.size + 1));
  const db = leerBaseDatosSync();
  const venta = db.ventas.find(v => !antes.has(v.id))!;
  expect(venta.tipoVenta).toBe("Venta libre");
  expect(db.detallesVenta.find(d => d.ventaId === venta.id)).toMatchObject({ productoId: "medicamento-03", cantidad: 1 });
});
