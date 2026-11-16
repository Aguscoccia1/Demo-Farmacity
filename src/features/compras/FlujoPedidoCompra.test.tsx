import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { PaginaFormularioPedido } from "../pedidos/PaginaFormularioPedido";
import { PaginaOrdenPedido } from "../pedidos/PaginaOrdenPedido";
import { PaginaDetallePedido } from "../pedidos/PaginaDetallePedido";
import { PaginaFormularioCompra } from "./PaginaFormularioCompra";
import { PaginaDetalleCompra } from "./PaginaDetalleCompra";
import { PaginaComprasRecibidas } from "../deposito/PaginaComprasRecibidas";
import { aplicarStockCompra } from "../../mock/api/compras";
import { leerBaseDatosSync } from "../../mock/api/db";
import { useSucursalStore } from "../../stores/sucursal";
import { useToastStore } from "../../stores/toasts";
import { como, stockDe } from "../../test/fixtures";

it.each([false, true])("pedido → orden → compra → recepción → stock; ajustado al enviar: %s", async (recibido) => {
  const usuario = userEvent.setup();
  useSucursalStore.setState({ sucursalId: "sucursal-01" });
  useToastStore.setState({ toasts: [] });
  como("Encargado de Depósito");
  const pedidosAntes = new Set(leerBaseDatosSync().pedidos.map(p => p.id));
  const stockInicial = stockDe();
  render(
    <MemoryRouter initialEntries={["/pedidos/nuevo"]}>
      <Routes>
        <Route path="/pedidos/nuevo" element={<PaginaFormularioPedido />} />
        <Route path="/pedidos/:id/orden" element={<PaginaOrdenPedido />} />
        <Route path="/pedidos/:id" element={<PaginaDetallePedido />} />
      </Routes>
    </MemoryRouter>,
  );
  await usuario.selectOptions(await screen.findByLabelText("Producto 1"), "medicamento-01");
  fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "5" } });
  await usuario.click(screen.getByRole("button", { name: "Registrar pedido" }));
  expect(await screen.findByRole("button", { name: "Imprimir orden" })).toBeInTheDocument();
  const pedido = leerBaseDatosSync().pedidos.find(p => !pedidosAntes.has(p.id))!;
  expect(stockDe()).toBe(stockInicial);
  await usuario.click(screen.getByRole("button", { name: "Volver al pedido" }));
  await usuario.click(await screen.findByRole("button", { name: "Enviar pedido" }));
  const envio = within(screen.getByRole("dialog"));
  if (recibido) await usuario.click(envio.getByRole("checkbox"));
  await usuario.click(envio.getByRole("button", { name: "Enviar pedido" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(stockDe()).toBe(stockInicial + (recibido ? 5 : 0));
  cleanup();

  como("Encargado de Compras");
  const comprasAntes = new Set(leerBaseDatosSync().compras.map(c => c.id));
  render(
    <MemoryRouter initialEntries={["/compras/nueva"]}>
      <Routes>
        <Route path="/compras/nueva" element={<PaginaFormularioCompra />} />
        <Route path="/compras/:id" element={<PaginaDetalleCompra />} />
      </Routes>
    </MemoryRouter>,
  );
  await usuario.selectOptions(await screen.findByLabelText("Pedido de origen"), pedido.id);
  await usuario.click(screen.getByRole("button", { name: "Registrar compra" }));
  await usuario.click(await screen.findByRole("button", { name: "Registrar recepción" }));
  await usuario.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Registrar recepción" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  const compra = leerBaseDatosSync().compras.find(c => !comprasAntes.has(c.id))!;
  expect(leerBaseDatosSync().estadosCompra.find(e => e.id === compra.estadoId)!.nombre).toBe("Recibida");
  expect(stockDe()).toBe(stockInicial + (recibido ? 5 : 0));
  cleanup();

  como("Encargado de Depósito");
  if (recibido) {
    const resultado = await aplicarStockCompra(compra.id);
    expect(resultado.mensaje).toContain("Stock ya ajustado desde el pedido");
  } else {
    render(<MemoryRouter><PaginaComprasRecibidas /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Aplicar stock" })).toHaveLength(2));
    // La compra nueva tiene un solo producto; la compra recibida del seed tiene dos.
    const filas = screen.getAllByRole("row");
    const fila = filas.find(f => within(f).queryByText(/Pedido del/) && within(f).queryByRole("button", { name: "Aplicar stock" }))!;
    await usuario.click(within(fila).getByRole("button", { name: "Aplicar stock" }));
    await usuario.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Aplicar stock" }));
    await waitFor(() => expect(stockDe()).toBe(stockInicial + 5));
  }
  expect(stockDe()).toBe(stockInicial + 5);
  const antes = leerBaseDatosSync();
  await expect(aplicarStockCompra(compra.id)).rejects.toThrow("ya fue actualizado");
  expect(leerBaseDatosSync()).toEqual(antes);
});
