import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PaginaCobrar } from "./PaginaCobrar";
import { useSucursalStore } from "../../stores/sucursal";
import { useToastStore } from "../../stores/toasts";

beforeEach(() => {
  localStorage.clear();
  useSucursalStore.setState({ sucursalId: "sucursal-01" });
  useToastStore.setState({ toasts: [] });
});

describe("cobro de una venta", () => {
  it("registra un cobro en efectivo y habilita el comprobante de pago", async () => {
    const usuario = userEvent.setup();

    render(
      <MemoryRouter>
        <PaginaCobrar />
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

    expect(
      await screen.findByRole("heading", { name: "Cobro registrado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Emitir comprobante de pago/ }),
    ).toBeInTheDocument();

    await waitFor(() => {
      const tabla = screen.getByRole("table");
      expect(within(tabla).queryByText("López, Carlos")).not.toBeInTheDocument();
    });
  });
});
