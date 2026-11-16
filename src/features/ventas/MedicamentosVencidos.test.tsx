import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import { PaginaVentaLibre } from "./PaginaVentaLibre";
import { PaginaVentaConReceta } from "./PaginaVentaConReceta";
import { PaginaConsultaStock } from "../stock/PaginasStock";
import { transaccion } from "../../mock/api/db";
import { useSucursalStore } from "../../stores/sucursal";
import { como } from "../../test/fixtures";

beforeEach(async () => {
  useSucursalStore.setState({ sucursalId: "sucursal-01" });
  como("Encargado de Ventas");
  await transaccion(db => {
    for (const id of ["medicamento-03", "medicamento-05"]) {
      const medicamento = db.medicamentos.find(m => m.id === id)!;
      medicamento.fechaVencimiento = "2000-01-01";
      medicamento.laboratorio = "Laboratorio de prueba";
    }
  });
});

it("deshabilita un vencido en venta libre y muestra sus datos", async () => {
  render(<MemoryRouter><PaginaVentaLibre /></MemoryRouter>);
  const boton = await screen.findByLabelText("Agregar Ibuprofeno 400 mg");
  expect(boton).toBeDisabled();
  const fila = within(boton.closest("li")!);
  expect(fila.getByText("Vencido")).toBeInTheDocument();
  expect(fila.getByText(/Laboratorio de prueba/)).toHaveTextContent("01/01/2000");
});

it("deshabilita el vencido en venta con receta", async () => {
  const usuario = userEvent.setup();
  render(<MemoryRouter><PaginaVentaConReceta /></MemoryRouter>);
  await usuario.selectOptions(await screen.findByLabelText(/Cliente/), "cliente-01");
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  await usuario.selectOptions(screen.getByLabelText(/Obra social/), "sin-obra");
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(screen.getByLabelText(/Fecha de vencimiento/), { target: { value: "2026-12-16" } });
  fireEvent.change(screen.getByLabelText(/Médico/), { target: { value: "Dra. Pérez" } });
  fireEvent.change(screen.getByLabelText(/Matrícula/), { target: { value: "MP123" } });
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  expect(screen.getByLabelText("Agregar Amoxicilina 500 mg de Litoral")).toBeDisabled();
  expect(screen.getAllByText("Vencido")).toHaveLength(2);
  expect(screen.getAllByText(/Laboratorio de prueba/)[0]).toHaveTextContent("01/01/2000");
});

it("consulta de stock expone laboratorio, vencimiento y estado Vencido", async () => {
  render(<MemoryRouter><PaginaConsultaStock /></MemoryRouter>);
  const producto = await screen.findByText("Ibuprofeno 400 mg");
  const fila = within(producto.closest("tr")!);
  expect(fila.getByText("Laboratorio de prueba")).toBeInTheDocument();
  expect(fila.getByText("01/01/2000")).toBeInTheDocument();
  expect(fila.getByText("Vencido")).toBeInTheDocument();
});
