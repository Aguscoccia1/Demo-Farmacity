import { describe, expect, it } from "vitest";
import type { Medicamento, Receta } from "./types";
import {
  TRANSICIONES_COMPRA,
  TRANSICIONES_PEDIDO,
  TRANSICIONES_VENTA,
  buscarGenericoEquivalente,
  calcularImporteCobro,
  calcularMontoCubierto,
  calcularSubtotal,
  calcularTotalVenta,
  calcularTotalesVenta,
  cobroCompleto,
  esRecetaValida,
  pagoRechazado,
  puedeModificarCompra,
  puedeModificarPedido,
  puedeModificarVenta,
  puedeTransicionar,
  quedaBajoMinimo,
  redondearMonto,
  stockSuficiente,
  sumaDetallesCobro,
} from "./rules";

function medicamento(overrides: Partial<Medicamento> = {}): Medicamento {
  return {
    id: "medicamento-01",
    nombre: "Paracetamol 500 mg",
    descripcion: "Analgésico",
    marca: "Andina",
    precio: 3200,
    codigoBarras: "7791234500011",
    principioActivo: "Paracetamol",
    requiereReceta: false,
    fechaVencimiento: "2027-06-30",
    laboratorio: "Laboratorios Andina",
    presentacion: "x 20 comprimidos",
    concentracion: "500 mg",
    ...overrides,
  };
}

describe("cálculos de venta", () => {
  it("redondea importes a dos decimales", () => {
    expect(redondearMonto(10.005)).toBe(10.01);
    expect(redondearMonto(10.004)).toBe(10);
    expect(redondearMonto(0.1 + 0.2)).toBe(0.3);
  });

  it("calcula el subtotal de un detalle", () => {
    expect(calcularSubtotal(3, 1250.5)).toBe(3751.5);
    expect(calcularSubtotal(1, 99.999)).toBe(100);
  });

  it("calcula el total aplicando el descuento", () => {
    expect(calcularTotalVenta([3200, 4500], 700)).toBe(7000);
    expect(calcularTotalVenta([1000], 0)).toBe(1000);
  });

  it("rechaza descuentos negativos o mayores al subtotal", () => {
    expect(() => calcularTotalVenta([1000], -1)).toThrow(
      "El descuento debe estar entre 0 y el subtotal de la venta.",
    );
    expect(() => calcularTotalVenta([1000], 1000.01)).toThrow(
      "El descuento debe estar entre 0 y el subtotal de la venta.",
    );
  });

  it("calcula el monto cubierto por una obra social", () => {
    expect(calcularMontoCubierto(5000, 40)).toBe(2000);
    expect(calcularMontoCubierto(3333.33, 35)).toBe(1166.67);
    expect(calcularMontoCubierto(5000, null)).toBe(0);
  });

  it("nunca genera un importe a cobrar negativo", () => {
    expect(calcularImporteCobro(1000, 600)).toBe(400);
    expect(calcularImporteCobro(1000, 1500)).toBe(0);
  });

  it("integra subtotal, total, cobertura e importe a cobrar", () => {
    const totales = calcularTotalesVenta(
      [
        { cantidad: 2, precioUnitario: 1000 },
        { cantidad: 1, precioUnitario: 500 },
      ],
      100,
      40,
    );
    expect(totales).toEqual({
      subtotal: 2500,
      total: 2400,
      montoCubierto: 960,
      importeACobrar: 1440,
    });
  });

  it("deja un importe a cobrar en cero cuando la cobertura es del 100%", () => {
    const totales = calcularTotalesVenta(
      [{ cantidad: 1, precioUnitario: 3200 }],
      0,
      100,
    );
    expect(totales.importeACobrar).toBe(0);
  });
});

describe("receta", () => {
  const hoy = new Date(2026, 4, 15, 12, 0, 0);
  const receta: Pick<Receta, "fechaVencimiento" | "medico" | "matriculaMedico"> = {
    fechaVencimiento: "2026-05-15",
    medico: "Dra. Laura Bianchi",
    matriculaMedico: "MP-12000",
  };

  it("acepta una receta que vence hoy con médico y matrícula", () => {
    expect(esRecetaValida(receta, hoy)).toBe(true);
  });

  it("acepta una receta con vencimiento futuro", () => {
    expect(
      esRecetaValida({ ...receta, fechaVencimiento: "2026-05-16" }, hoy),
    ).toBe(true);
  });

  it("rechaza una receta vencida", () => {
    expect(
      esRecetaValida({ ...receta, fechaVencimiento: "2026-05-14" }, hoy),
    ).toBe(false);
  });

  it("rechaza recetas sin médico o sin matrícula", () => {
    expect(esRecetaValida({ ...receta, medico: "   " }, hoy)).toBe(false);
    expect(
      esRecetaValida({ ...receta, matriculaMedico: "   " }, hoy),
    ).toBe(false);
  });
});

describe("genéricos y stock", () => {
  const base = medicamento();
  const equivalente = medicamento({
    id: "medicamento-02",
    nombre: "Paracetamol 500 mg NovaFarma",
    principioActivo: "paracetamol",
    marca: "NovaFarma",
  });

  it("encuentra un equivalente con el mismo principio activo y stock suficiente", () => {
    const stock = new Map([["medicamento-02", 5]]);
    expect(
      buscarGenericoEquivalente(base, [base, equivalente], stock, 3),
    ).toBe(equivalente);
  });

  it("no devuelve el mismo medicamento ni equivalentes sin stock suficiente", () => {
    expect(
      buscarGenericoEquivalente(base, [base], new Map([[base.id, 100]]), 1),
    ).toBeNull();
    expect(
      buscarGenericoEquivalente(
        base,
        [base, equivalente],
        new Map([["medicamento-02", 2]]),
        3,
      ),
    ).toBeNull();
  });

  it("no encuentra equivalentes de otro principio activo", () => {
    const otro = medicamento({
      id: "medicamento-03",
      principioActivo: "Ibuprofeno",
    });
    expect(
      buscarGenericoEquivalente(
        base,
        [otro],
        new Map([[otro.id, 99]]),
        1,
      ),
    ).toBeNull();
  });

  it("evalúa stock suficiente en el límite exacto", () => {
    expect(stockSuficiente(5, 5)).toBe(true);
    expect(stockSuficiente(4, 5)).toBe(false);
  });

  it("considera stock bajo cuando está por debajo del mínimo", () => {
    expect(quedaBajoMinimo(9, 10)).toBe(true);
    expect(quedaBajoMinimo(10, 10)).toBe(false);
    expect(quedaBajoMinimo(11, 10)).toBe(false);
  });
});

describe("medios de pago y cobro", () => {
  it("nunca rechaza un pago en efectivo", () => {
    expect(pagoRechazado("Efectivo", 0.1, () => 0)).toBe(false);
  });

  it("rechaza pagos electrónicos cuando el valor aleatorio es menor a la probabilidad", () => {
    expect(pagoRechazado("Débito", 0.1, () => 0.05)).toBe(true);
    expect(pagoRechazado("Crédito", 0.1, () => 0.1)).toBe(false);
    expect(pagoRechazado("Transferencia", 0.1, () => 0.9)).toBe(false);
  });

  it("suma los detalles de un cobro", () => {
    expect(
      sumaDetallesCobro([{ importe: 100.1 }, { importe: 200.2 }]),
    ).toBe(300.3);
  });

  it("valida que los medios cubran exactamente el importe esperado", () => {
    expect(cobroCompleto([{ importe: 1000 }], 1000)).toBe(true);
    expect(
      cobroCompleto([{ importe: 400 }, { importe: 600 }], 1000),
    ).toBe(true);
    expect(cobroCompleto([{ importe: 999.99 }], 1000)).toBe(false);
    expect(cobroCompleto([{ importe: 0 }], 0)).toBe(true);
  });
});

describe("estados de venta, pedido y compra", () => {
  it("permite cobrar o anular una venta registrada", () => {
    expect(
      puedeTransicionar(TRANSICIONES_VENTA, "Registrada", "Cobrada"),
    ).toBe(true);
    expect(
      puedeTransicionar(TRANSICIONES_VENTA, "Registrada", "Anulada"),
    ).toBe(true);
    expect(
      puedeTransicionar(TRANSICIONES_VENTA, "Cobrada", "Anulada"),
    ).toBe(false);
    expect(
      puedeTransicionar(TRANSICIONES_VENTA, "Anulada", "Cobrada"),
    ).toBe(false);
  });

  it("permite enviar o cancelar un pedido registrado y cancelar uno enviado", () => {
    expect(
      puedeTransicionar(TRANSICIONES_PEDIDO, "Registrado", "Enviado"),
    ).toBe(true);
    expect(
      puedeTransicionar(TRANSICIONES_PEDIDO, "Registrado", "Cancelado"),
    ).toBe(true);
    expect(
      puedeTransicionar(TRANSICIONES_PEDIDO, "Enviado", "Cancelado"),
    ).toBe(true);
    expect(
      puedeTransicionar(TRANSICIONES_PEDIDO, "Enviado", "Registrado"),
    ).toBe(false);
    expect(
      puedeTransicionar(TRANSICIONES_PEDIDO, "Cancelado", "Enviado"),
    ).toBe(false);
  });

  it("permite recibir o anular una compra registrada", () => {
    expect(
      puedeTransicionar(TRANSICIONES_COMPRA, "Registrada", "Recibida"),
    ).toBe(true);
    expect(
      puedeTransicionar(TRANSICIONES_COMPRA, "Registrada", "Anulada"),
    ).toBe(true);
    expect(
      puedeTransicionar(TRANSICIONES_COMPRA, "Recibida", "Anulada"),
    ).toBe(false);
    expect(
      puedeTransicionar(TRANSICIONES_COMPRA, "Anulada", "Recibida"),
    ).toBe(false);
  });

  it("solo permite modificar documentos en estado inicial", () => {
    expect(puedeModificarVenta("Registrada")).toBe(true);
    expect(puedeModificarVenta("Cobrada")).toBe(false);
    expect(puedeModificarVenta("Anulada")).toBe(false);

    expect(puedeModificarPedido("Registrado")).toBe(true);
    expect(puedeModificarPedido("Enviado")).toBe(false);
    expect(puedeModificarPedido("Cancelado")).toBe(false);

    expect(puedeModificarCompra("Registrada")).toBe(true);
    expect(puedeModificarCompra("Recibida")).toBe(false);
    expect(puedeModificarCompra("Anulada")).toBe(false);
  });
});
