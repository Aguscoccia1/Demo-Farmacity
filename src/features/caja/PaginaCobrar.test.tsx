import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PaginaCobrar } from "./PaginaCobrar";
import { useSucursalStore } from "../../stores/sucursal";
import { useToastStore } from "../../stores/toasts";
import { establecerActor } from "../../lib/sessionActor";
import { PaginaComprobante } from "./PaginaComprobante";
import { leerBaseDatosSync } from "../../mock/api/db";

beforeEach(() => {
  localStorage.clear();
  useSucursalStore.setState({ sucursalId: "sucursal-01" });
  useToastStore.setState({ toasts: [] });
  establecerActor("Caja", "Encargado de Caja");
});

describe("cobro de una venta", () => {
  it("registra un cobro en efectivo y habilita el comprobante de pago", async () => {
    const usuario = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/caja/cobrar"]}>
        <Routes>
          <Route path="/caja/cobrar" element={<PaginaCobrar />} />
          <Route path="/caja/comprobante/:ventaId" element={<PaginaComprobante />} />
        </Routes>
      </MemoryRouter>,
    );

    const cliente = await screen.findByText("López, Carlos");
    const fila = cliente.closest("tr");
    expect(fila).not.toBeNull();

    await usuario.click(
      within(fila as HTMLTableRowElement).getByRole("button", {
        name: "Cobrar",
      }),
    );

    expect(screen.getByLabelText(/Importe/)).toHaveValue(5700);
    await usuario.click(
      screen.getByRole("button", { name: /Confirmar cobro/ }),
    );

    expect(await screen.findByRole("button", { name: "Imprimir comprobante" })).toBeInTheDocument();
    expect(screen.getByText("López, Carlos")).toBeInTheDocument();
    expect(leerBaseDatosSync().auditoria.some((r) => r.tipoOperacion === "Cobro" && r.rol === "Encargado de Caja")).toBe(true);
  });
});
