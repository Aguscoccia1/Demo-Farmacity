import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { PaginaComprasRecibidas } from "./PaginaComprasRecibidas";
import { useSucursalStore } from "../../stores/sucursal";
import { como, stockDe } from "../../test/fixtures";

beforeEach(() => {
  useSucursalStore.setState({ sucursalId: "sucursal-01" });
  como("Encargado de Depósito");
});

it("lista compras de todos los estados y filtra por Recibida", async () => {
  const usuario = userEvent.setup();
  render(<MemoryRouter><PaginaComprasRecibidas /></MemoryRouter>);
  expect(await screen.findByText(/Pedido del/)).toBeInTheDocument();
  expect(screen.getByText("Sin pedido")).toBeInTheDocument();
  await usuario.selectOptions(screen.getByLabelText("Estado"), "Recibida");
  expect(screen.queryByText(/Pedido del/)).not.toBeInTheDocument();
  const fila = within(screen.getByText("Sin pedido").closest("tr")!);
  expect(fila.getByText("Recibida")).toBeInTheDocument();
  expect(fila.getByRole("button", { name: "Aplicar stock" })).toBeEnabled();
});

it("aplica el stock recibido y elimina la acción para evitar doble conteo", async () => {
  const usuario = userEvent.setup();
  const antes = stockDe("medicamento-02");
  render(<MemoryRouter><PaginaComprasRecibidas /></MemoryRouter>);
  await usuario.click(await screen.findByRole("button", { name: "Aplicar stock" }));
  await usuario.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Aplicar stock" }));
  await waitFor(() => expect(stockDe("medicamento-02")).toBe(antes + 30));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Aplicar stock" })).not.toBeInTheDocument());
});
