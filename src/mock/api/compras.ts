import { exigirRol } from "./comun";
import type { CompraCompleta, DetalleCompra } from "../../domain/types";
import {
  puedeModificarCompra,
  TRANSICIONES_COMPRA,
  calcularSubtotal,
} from "../../domain/rules";
import {
  ApiError,
  auditar,
  buscarDrogueria,
  buscarInventario,
  buscarProducto,
  buscarSucursal,
  enriquecerCompra,
  generarId,
  obtenerDrogueriaCentral,
  ordenarPorFechaDesc,
  tieneStockAjustadoPorPedido,
  tieneStockAplicado,
  validarCantidad,
} from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export interface ItemCompraInput {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

interface DetalleCompraPreparado extends ItemCompraInput {
  subtotal: number;
}

function normalizarDetalles(
  db: Parameters<typeof buscarProducto>[0],
  items: ItemCompraInput[],
): DetalleCompraPreparado[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError("Agregá al menos un producto a la compra.");
  }
  const agrupados = new Map<string, { cantidad: number; precioUnitario: number }>();
  items.forEach((item) => {
    validarCantidad(item.cantidad);
    if (!buscarProducto(db, item.productoId)) {
      throw new ApiError("Uno de los productos de la compra no existe.");
    }
    if (!Number.isFinite(item.precioUnitario) || item.precioUnitario <= 0) {
      throw new ApiError("El precio unitario debe ser mayor que cero.");
    }
    const anterior = agrupados.get(item.productoId);
    agrupados.set(item.productoId, {
      cantidad: (anterior?.cantidad ?? 0) + item.cantidad,
      precioUnitario: item.precioUnitario,
    });
  });
  return [...agrupados.entries()].map(([productoId, item]) => ({
    productoId,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    subtotal: calcularSubtotal(item.cantidad, item.precioUnitario),
  }));
}

function validarPedidoOrigen(
  db: Parameters<typeof buscarProducto>[0],
  pedidoId: string | null,
  sucursalId: string,
  items: DetalleCompraPreparado[],
  compraId?: string,
): void {
  if (!pedidoId) return;
  const pedido = db.pedidos.find((item) => item.id === pedidoId);
  if (!pedido) throw new ApiError("El pedido seleccionado no existe.");
  if (pedido.sucursalId !== sucursalId) {
    throw new ApiError("El pedido seleccionado pertenece a otra sucursal.");
  }
  const estado = db.estadosPedido.find((item) => item.id === pedido.estadoId);
  if (!estado || estado.nombre !== "Enviado") {
    throw new ApiError(
      "Solo se puede crear una compra a partir de un pedido Enviado.",
    );
  }
  const tieneCompra = db.compras.some((compra) =>
    compra.pedidoId === pedidoId && compra.id !== compraId &&
    db.estadosCompra.find((e) => e.id === compra.estadoId)?.nombre !== "Anulada",
  );
  if (tieneCompra) {
    throw new ApiError("El pedido ya tiene una compra asociada vigente.", "COMPRA_DUPLICADA");
  }
  const cantidades = new Map<string, number>();
  db.detallesPedido.filter((d) => d.pedidoId === pedidoId).forEach((d) => {
    cantidades.set(d.productoId, (cantidades.get(d.productoId) ?? 0) + d.cantidad);
  });
  if ([...cantidades.keys()].some(productoId => !items.some(item => item.productoId === productoId))) {
    throw new ApiError("La compra debe conservar los productos del pedido de origen.", "PRODUCTOS_PEDIDO_REQUERIDOS");
  }
  // Los pedidos nuevos no ingresan stock. Los antiguos que ya lo ingresaron
  // requieren coincidencia exacta para que el no-op no oculte diferencias.
  if (tieneStockAjustadoPorPedido(db, pedidoId) &&
      (items.length !== cantidades.size || items.some((item) => cantidades.get(item.productoId) !== item.cantidad))) {
    throw new ApiError("Los productos y cantidades de la compra deben coincidir con los del pedido.", "DETALLES_NO_COINCIDEN");
  }
}

export async function listarCompras(sucursalId: string) {
  const db = await leerBaseDatos();
  return ordenarPorFechaDesc(
    db.compras.filter((compra) => compra.sucursalId === sucursalId),
  ).map((compra) => enriquecerCompra(db, compra.id));
}

export async function obtenerCompra(compraId: string) {
  const db = await leerBaseDatos();
  return enriquecerCompra(db, compraId);
}

export async function listarPedidosEnviados(sucursalId: string) {
  const db = await leerBaseDatos();
  const estadoEnviado = db.estadosPedido.find(
    (estado) => estado.nombre === "Enviado",
  );
  if (!estadoEnviado) return [];
  return ordenarPorFechaDesc(
    db.pedidos.filter(
      (pedido) =>
        pedido.sucursalId === sucursalId &&
        pedido.estadoId === estadoEnviado.id,
    ),
  ).map((pedido) => {
    const detalles = db.detallesPedido
      .filter((detalle) => detalle.pedidoId === pedido.id)
      .map((detalle) => {
        const producto = buscarProducto(db, detalle.productoId);
        if (!producto) throw new ApiError("Un producto del pedido no existe.");
        return { ...detalle, producto };
      });
    return { pedido, detalles };
  });
}

export async function crearCompra(datos: {
  sucursalId: string;
  pedidoId: string | null;
  items: ItemCompraInput[];
}) {
  return transaccion((db) => {
    exigirRol("Encargado de Compras");
    buscarSucursal(db, datos.sucursalId);
    const central = obtenerDrogueriaCentral(db);
    const items = normalizarDetalles(db, datos.items);
    validarPedidoOrigen(db, datos.pedidoId, datos.sucursalId, items);
    const estado = db.estadosCompra.find((item) => item.nombre === "Registrada");
    if (!estado) throw new ApiError("No está configurado el estado Registrada.");
    const total = items.reduce((acc, item) => acc + item.subtotal, 0);
    const compra = {
      id: generarId("compra"),
      sucursalId: datos.sucursalId,
      drogueriaId: central.id,
      pedidoId: datos.pedidoId,
      estadoId: estado.id,
      fecha: new Date().toISOString(),
      total: Math.round(total * 100) / 100,
    };
    db.compras.push(compra);
    items.forEach((item) => {
      const detalle: DetalleCompra = {
        id: generarId("detalle-compra"),
        compraId: compra.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      };
      db.detallesCompra.push(detalle);
    });
    auditar(db, {
      tipoOperacion: "Compra",
      descripcion: `Compra registrada a ${central.nombre} por ${new Intl.NumberFormat(
        "es-AR",
        { style: "currency", currency: "ARS" },
      ).format(compra.total)}.`,
      sucursalId: datos.sucursalId,
      referenciaId: compra.id,
    });
    return enriquecerCompra(db, compra.id);
  });
}

export async function actualizarCompra(
  compraId: string,
  datos: { items: ItemCompraInput[] },
) {
  return transaccion((db) => {
    exigirRol("Encargado de Compras");
    const compra = db.compras.find((item) => item.id === compraId);
    if (!compra) throw new ApiError("La compra no existe.");
    const estado = db.estadosCompra.find((item) => item.id === compra.estadoId);
    if (!estado || !puedeModificarCompra(estado.nombre)) {
      throw new ApiError("Solo se puede modificar una compra Registrada.");
    }
    const items = normalizarDetalles(db, datos.items);
    validarPedidoOrigen(db, compra.pedidoId, compra.sucursalId, items, compra.id);
    const total = items.reduce((acc, item) => acc + item.subtotal, 0);
    db.detallesCompra = db.detallesCompra.filter(
      (detalle) => detalle.compraId !== compra.id,
    );
    items.forEach((item) => {
      db.detallesCompra.push({
        id: generarId("detalle-compra"),
        compraId: compra.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      });
    });
    compra.total = Math.round(total * 100) / 100;
    auditar(db, {
      tipoOperacion: "Modificación",
      descripcion: `Compra modificada por ${new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(compra.total)}.`,
      sucursalId: compra.sucursalId,
      referenciaId: compra.id,
    });
    return enriquecerCompra(db, compra.id);
  });
}

export async function registrarRecepcionCompra(compraId: string) {
  return transaccion((db) => {
    exigirRol("Encargado de Compras");
    const compra = db.compras.find((item) => item.id === compraId);
    if (!compra) throw new ApiError("La compra no existe.");
    const estado = db.estadosCompra.find((item) => item.id === compra.estadoId);
    if (!estado) throw new ApiError("El estado de la compra no existe.");
    if (
      !TRANSICIONES_COMPRA[
        estado.nombre as keyof typeof TRANSICIONES_COMPRA
      ]?.includes("Recibida")
    ) {
      throw new ApiError("Solo se puede recepcionar una compra Registrada.");
    }
    const estadoRecibida = db.estadosCompra.find(
      (item) => item.nombre === "Recibida",
    );
    if (!estadoRecibida) throw new ApiError("No está configurado el estado Recibida.");
    compra.estadoId = estadoRecibida.id;
    auditar(db, {
      tipoOperacion: "Recepción",
      descripcion: "Recepción de mercadería registrada. El stock se actualiza desde Compras de Depósito.",
      sucursalId: compra.sucursalId,
      referenciaId: compra.id,
    });
    return enriquecerCompra(db, compra.id);
  });
}

export async function anularCompra(compraId: string) {
  return transaccion((db) => {
    exigirRol("Encargado de Compras");
    const compra = db.compras.find((item) => item.id === compraId);
    if (!compra) throw new ApiError("La compra no existe.");
    const estado = db.estadosCompra.find((item) => item.id === compra.estadoId);
    if (!estado) throw new ApiError("El estado de la compra no existe.");
    if (
      !TRANSICIONES_COMPRA[
        estado.nombre as keyof typeof TRANSICIONES_COMPRA
      ]?.includes("Anulada")
    ) {
      throw new ApiError("Solo se puede anular una compra Registrada.");
    }
    const estadoAnulada = db.estadosCompra.find(
      (item) => item.nombre === "Anulada",
    );
    if (!estadoAnulada) throw new ApiError("No está configurado el estado Anulada.");
    compra.estadoId = estadoAnulada.id;
    auditar(db, {
      tipoOperacion: "Anulación",
      descripcion: "Compra anulada.",
      sucursalId: compra.sucursalId,
      referenciaId: compra.id,
    });
    return enriquecerCompra(db, compra.id);
  });
}

/**
 * Aplica el stock de una compra Recibida. Si el pedido de origen ya ajustó el
 * stock al registrar la mercadería recibida, la operación es un no-op que
 * marca la compra como aplicada para evitar el doble conteo.
 */
export async function aplicarStockCompra(compraId: string): Promise<{
  compra: CompraCompleta;
  mensaje: string;
}> {
  return transaccion((db) => {
    exigirRol("Encargado de Depósito");
    const compra = db.compras.find((item) => item.id === compraId);
    if (!compra) throw new ApiError("La compra no existe.");
    const estado = db.estadosCompra.find((item) => item.id === compra.estadoId);
    if (!estado || estado.nombre !== "Recibida") {
      throw new ApiError(
        "Solo se puede actualizar el stock de una compra Recibida.",
      );
    }
    if (tieneStockAplicado(db, compra.id)) {
      throw new ApiError(
        "El stock de esta compra ya fue actualizado.",
        "STOCK_YA_APLICADO",
      );
    }
    if (compra.pedidoId && tieneStockAjustadoPorPedido(db, compra.pedidoId)) {
      auditar(db, {
        tipoOperacion: "Actualización de stock",
        descripcion: "Stock ya ajustado desde el pedido.",
        sucursalId: compra.sucursalId,
        referenciaId: compra.id,
      });
      return {
        compra: enriquecerCompra(db, compra.id),
        mensaje:
          "Stock ya ajustado desde el pedido. No se aplicaron cambios para evitar el doble conteo.",
      };
    }
    const detalles = db.detallesCompra.filter(
      (detalle) => detalle.compraId === compra.id,
    );
    if (detalles.length === 0) {
      throw new ApiError("La compra no tiene productos para actualizar.");
    }
    for (const detalle of detalles) {
      const inventario = buscarInventario(
        db,
        detalle.productoId,
        compra.sucursalId,
      );
      if (!inventario) {
        const producto = buscarProducto(db, detalle.productoId);
        throw new ApiError(
          `No hay inventario de ${producto?.nombre ?? "un producto"} en la sucursal.`,
        );
      }
    }
    for (const detalle of detalles) {
      const inventario = buscarInventario(
        db,
        detalle.productoId,
        compra.sucursalId,
      );
      if (!inventario) continue;
      inventario.stockActual += detalle.cantidad;
    }
    const drogueria = buscarDrogueria(db, compra.drogueriaId);
    auditar(db, {
      tipoOperacion: "Actualización de stock",
      descripcion: `Stock de compra aplicado (${detalles.length} producto(s) recibidos de ${drogueria.nombre}).`,
      sucursalId: compra.sucursalId,
      referenciaId: compra.id,
    });
    return {
      compra: enriquecerCompra(db, compra.id),
      mensaje: "Stock de la compra aplicado.",
    };
  });
}
