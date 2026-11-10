import { format } from "date-fns";
import type { CobroCompleto, DetalleCobro } from "../../domain/types";
import {
  cobroCompleto,
  esRecetaValida,
  pagoRechazado,
} from "../../domain/rules";
import { CONFIG } from "../../config";
import {
  ApiError,
  auditar,
  buscarInventario,
  buscarMedioPago,
  enriquecerCobro,
  enriquecerVenta,
  generarId,
  ordenarPorFechaDesc,
} from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export interface PagoCobroInput {
  medioPagoId: string;
  importe: number;
}

export interface ResultadoCobro {
  cobro: CobroCompleto;
  mensajes: string[];
  alertasStock: string[];
}

function validarPagos(
  pagos: PagoCobroInput[],
  importeEsperado: number,
): void {
  if (!Array.isArray(pagos) || pagos.length === 0) {
    throw new ApiError("Agregá al menos un medio de pago.");
  }
  pagos.forEach((pago) => {
    if (!Number.isFinite(pago.importe) || pago.importe < 0) {
      throw new ApiError("Los importes de los medios de pago no pueden ser negativos.");
    }
  });
  if (importeEsperado === 0) {
    if (pagos.length !== 1 || pagos[0].importe !== 0) {
      throw new ApiError(
        "Con cobertura del 100%, el cobro se confirma con un único detalle de importe 0.",
        "COBRO_INCOMPLETO",
      );
    }
    return;
  }
  if (pagos.some((pago) => pago.importe <= 0)) {
    throw new ApiError("Cada medio de pago debe tener un importe mayor que cero.");
  }
  if (!cobroCompleto(pagos, importeEsperado)) {
    throw new ApiError(
      `Los medios de pago deben sumar exactamente el importe a cobrar.`,
      "COBRO_INCOMPLETO",
    );
  }
}

export async function listarVentasPendientesDeCobro(sucursalId: string) {
  const db = await leerBaseDatos();
  const estadoRegistrada = db.estadosVenta.find(
    (estado) => estado.nombre === "Registrada",
  );
  if (!estadoRegistrada) return [];
  return ordenarPorFechaDesc(
    db.ventas.filter(
      (venta) =>
        venta.sucursalId === sucursalId &&
        venta.estadoId === estadoRegistrada.id,
    ),
  ).map((venta) => enriquecerVenta(db, venta.id));
}

export async function confirmarCobro(
  ventaId: string,
  pagos: PagoCobroInput[],
  aleatorio: () => number = Math.random,
): Promise<ResultadoCobro> {
  return transaccion((db) => {
    const venta = db.ventas.find((item) => item.id === ventaId);
    if (!venta) throw new ApiError("La venta no existe.");
    const estado = db.estadosVenta.find((item) => item.id === venta.estadoId);
    if (!estado || estado.nombre !== "Registrada") {
      throw new ApiError("Solo se puede cobrar una venta Registrada.");
    }
    if (venta.tipoVenta === "Con receta") {
      const receta = db.recetas.find((item) => item.id === venta.recetaId);
      if (!receta || !esRecetaValida(receta)) {
        throw new ApiError(
          "La venta no puede cobrarse porque la receta no es válida.",
          "RECETA_INVALIDA",
        );
      }
    }

    const detallesVenta = db.detallesVenta.filter(
      (detalle) => detalle.ventaId === venta.id,
    );
    const cantidades = new Map<string, number>();
    detallesVenta.forEach((detalle) => {
      cantidades.set(
        detalle.productoId,
        (cantidades.get(detalle.productoId) ?? 0) + detalle.cantidad,
      );
    });
    for (const [productoId, cantidad] of cantidades.entries()) {
      const inventario = buscarInventario(db, productoId, venta.sucursalId);
      if (!inventario || inventario.stockActual < cantidad) {
        const producto =
          db.medicamentos.find((item) => item.id === productoId) ??
          db.productosVentaLibre.find((item) => item.id === productoId);
        throw new ApiError(
          `No hay stock suficiente de ${producto?.nombre ?? "un producto"} para completar el cobro.`,
          "SIN_STOCK",
        );
      }
    }

    const importeEsperado = Math.round((venta.total - venta.montoCubierto) * 100) / 100;
    validarPagos(pagos, importeEsperado);

    if (importeEsperado > 0) {
      for (const pago of pagos) {
        const medio = buscarMedioPago(db, pago.medioPagoId);
        if (
          pagoRechazado(
            medio.tipo,
            CONFIG.probabilidadRechazoPago,
            aleatorio,
          )
        ) {
          throw new ApiError(
            `El pago con ${medio.tipo} fue rechazado. Reintentá con el mismo u otro medio de pago.`,
            "PAGO_RECHAZADO",
          );
        }
      }
    }

    const estadoCobrada = db.estadosVenta.find(
      (item) => item.nombre === "Cobrada",
    );
    if (!estadoCobrada) throw new ApiError("No está configurado el estado Cobrada.");
    venta.estadoId = estadoCobrada.id;

    const cobroId = generarId("cobro");
    db.cobros.push({
      id: cobroId,
      ventaId: venta.id,
      fecha: new Date().toISOString(),
      importe: importeEsperado,
    });
    pagos.forEach((pago) => {
      buscarMedioPago(db, pago.medioPagoId);
      const detalle: DetalleCobro = {
        id: generarId("detalle-cobro"),
        cobroId,
        medioPagoId: pago.medioPagoId,
        importe: Math.round(pago.importe * 100) / 100,
      };
      db.detallesCobro.push(detalle);
    });

    const alertasStock: string[] = [];
    for (const [productoId, cantidad] of cantidades.entries()) {
      const inventario = buscarInventario(db, productoId, venta.sucursalId);
      if (!inventario) continue;
      inventario.stockActual -= cantidad;
      const producto =
        db.medicamentos.find((item) => item.id === productoId) ??
        db.productosVentaLibre.find((item) => item.id === productoId);
      auditar(db, {
        tipoOperacion: "Movimiento de stock",
        descripcion: `Salida de stock por venta: ${producto?.nombre ?? "producto"}, ${cantidad} unidad(es). Stock restante: ${inventario.stockActual}.`,
        sucursalId: venta.sucursalId,
        referenciaId: venta.id,
      });
      if (
        inventario.stockActual < inventario.stockMinimo &&
        !alertasStock.includes(producto?.nombre ?? "")
      ) {
        alertasStock.push(producto?.nombre ?? "Producto");
      }
    }

    const cliente = db.clientes.find((item) => item.id === venta.clienteId);
    auditar(db, {
      tipoOperacion: "Cobro",
      descripcion: `Cobro registrado para ${cliente?.apellido ?? "cliente"}, ${cliente?.nombre ?? ""} por ${new Intl.NumberFormat(
        "es-AR",
        { style: "currency", currency: "ARS" },
      ).format(importeEsperado)}.`,
      sucursalId: venta.sucursalId,
      referenciaId: cobroId,
    });

    const mensajes =
      venta.tipoVenta === "Con receta"
        ? ["Receta sellada", "Medicamento entregado"]
        : ["Productos entregados"];

    return {
      cobro: enriquecerCobro(db, cobroId),
      mensajes,
      alertasStock,
    };
  });
}

export async function listarCobros(sucursalId: string): Promise<CobroCompleto[]> {
  const db = await leerBaseDatos();
  const cobros = db.cobros.filter((cobro) => {
    const venta = db.ventas.find((item) => item.id === cobro.ventaId);
    return venta?.sucursalId === sucursalId;
  });
  return ordenarPorFechaDesc(cobros).map((cobro) =>
    enriquecerCobro(db, cobro.id),
  );
}

export async function listarCobrosDelDia(
  sucursalId: string,
): Promise<CobroCompleto[]> {
  const cobros = await listarCobros(sucursalId);
  const hoy = format(new Date(), "yyyy-MM-dd");
  return cobros.filter(
    (cobro) => format(new Date(cobro.cobro.fecha), "yyyy-MM-dd") === hoy,
  );
}

export async function obtenerCobro(cobroId: string): Promise<CobroCompleto> {
  const db = await leerBaseDatos();
  return enriquecerCobro(db, cobroId);
}

export async function modificarCobro(
  cobroId: string,
  pagos: PagoCobroInput[],
): Promise<CobroCompleto> {
  return transaccion((db) => {
    const cobro = db.cobros.find((item) => item.id === cobroId);
    if (!cobro) throw new ApiError("El cobro no existe.");
    validarPagos(pagos, cobro.importe);
    pagos.forEach((pago) => buscarMedioPago(db, pago.medioPagoId));
    db.detallesCobro = db.detallesCobro.filter(
      (detalle) => detalle.cobroId !== cobro.id,
    );
    pagos.forEach((pago) => {
      db.detallesCobro.push({
        id: generarId("detalle-cobro"),
        cobroId,
        medioPagoId: pago.medioPagoId,
        importe: Math.round(pago.importe * 100) / 100,
      });
    });
    const venta = db.ventas.find((item) => item.id === cobro.ventaId);
    auditar(db, {
      tipoOperacion: "Modificación",
      descripcion: `Reparto de medios de pago corregido para un cobro de ${new Intl.NumberFormat(
        "es-AR",
        { style: "currency", currency: "ARS" },
      ).format(cobro.importe)}.`,
      sucursalId: venta?.sucursalId ?? null,
      referenciaId: cobro.id,
    });
    return enriquecerCobro(db, cobro.id);
  });
}
