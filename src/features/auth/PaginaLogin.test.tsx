import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { useAuthStore } from "../../auth/store";
import { useSucursalStore } from "../../stores/sucursal";
import { useToastStore } from "../../stores/toasts";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ usuario: null });
  useSucursalStore.setState({ sucursalId: null });
  useToastStore.setState({ toasts: [] });
});

describe("inicio de sesión", () => {
  it("permite ingresar con un usuario demo y muestra el inicio de su rol", async () => {
    const usuario = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    await usuario.type(screen.getByLabelText(/Usuario/), "venta");
    await usuario.type(screen.getByLabelText(/Contraseña/), "venta123");
    await usuario.click(screen.getByRole("button", { name: /Ingresar/ }));

    expect(
      await screen.findByRole("heading", { name: "Hola, Lucía" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Accesos directos")).toBeInTheDocument();
    expect(useAuthStore.getState().usuario).toMatchObject({
      usuario: "venta",
      rol: "Encargado de Venta",
    });
  });
});
