import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { PaginaListaVentas } from "./ventas/PaginaListaVentas";
import { PaginaPedidos } from "./pedidos/PaginaPedidos";
import { PaginaCompras } from "./compras/PaginaCompras";
import { PaginaComprasRecibidas } from "./deposito/PaginaComprasRecibidas";
import { PaginaCobrosDelDia } from "./caja/PaginaCobrosDia";
import { useSucursalStore } from "../stores/sucursal";
import type { Rol } from "../domain/types";
import { como } from "../test/fixtures";

beforeEach(() => useSucursalStore.setState({ sucursalId: "sucursal-01" }));

const listas: Array<[string, Rol, ReactElement]> = [
  ["Ventas con receta", "Encargado de Ventas", <PaginaListaVentas tipoVenta="Con receta" />],
  ["Ventas libres", "Encargado de Ventas", <PaginaListaVentas tipoVenta="Venta libre" />],
  ["Pedidos a droguería", "Encargado de Depósito", <PaginaPedidos />],
  ["Compras", "Encargado de Compras", <PaginaCompras />],
  ["Compras de Depósito", "Encargado de Depósito", <PaginaComprasRecibidas />],
  ["Cobros del día", "Encargado de Caja", <PaginaCobrosDelDia />],
];

it.each(listas)("%s ofrece vista imprimible y permite cerrarla", async (_nombre, rol, pagina) => {
  como(rol);
  const usuario = userEvent.setup();
  const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
  render(<MemoryRouter>{pagina}</MemoryRouter>);
  await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" })).toBeEnabled());
  await usuario.click(screen.getByRole("button", { name: "Imprimir" }));
  const vista = within(screen.getByRole("dialog", { name: "Vista imprimible" }));
  expect(vista.getByRole("table")).toBeInTheDocument();
  expect(vista.getByText(/Emitido el/)).toBeInTheDocument();
  await usuario.click(vista.getByRole("button", { name: "Imprimir listado" }));
  expect(imprimir).toHaveBeenCalledOnce();
  await usuario.click(vista.getByText("Cerrar", { selector: "button" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.body).not.toHaveClass("imprimir-listado");
});

it("la impresión respeta el filtro de ventas", async () => {
  como("Encargado de Ventas");
  const usuario = userEvent.setup();
  render(<MemoryRouter><PaginaListaVentas tipoVenta="Venta libre" /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" })).toBeEnabled());
  await usuario.selectOptions(screen.getByLabelText("Estado"), "estado-venta-registrada");
  const filas = screen.getByRole("table").querySelectorAll("tbody tr").length;
  expect(filas).toBeGreaterThan(0);
  await usuario.click(screen.getByRole("button", { name: "Imprimir" }));
  const vista = within(screen.getByRole("dialog"));
  expect(vista.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(filas);
  expect(vista.getAllByText("Registrada")).toHaveLength(filas);
  expect(vista.queryByText("Cobrada")).not.toBeInTheDocument();
});
