import type { DetalleCompra } from "../../domain/types";
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
    buscarSucursal(db, datos.sucursalId);
    const central = obtenerDrogueriaCentral(db);
    validarPedidoOrigen(db, datos.pedidoId, datos.sucursalId);
    const items = normalizarDetalles(db, datos.items);
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
    const compra = db.compras.find((item) => item.id === compraId);
    if (!compra) throw new ApiError("La compra no existe.");
    const estado = db.estadosCompra.find((item) => item.id === compra.estadoId);
    if (!estado || !puedeModificarCompra(estado.nombre)) {
      throw new ApiError("Solo se puede modificar una compra Registrada.");
    }
    const items = normalizarDetalles(db, datos.items);
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
      descripcion: "Recepción de mercadería registrada. El stock se actualiza desde Compras recibidas.",
      sucursalId: compra.sucursalId,
      referenciaId: compra.id,
    });
    return enriquecerCompra(db, compra.id);
  });
}

export async function anularCompra(compraId: string) {
  return transaccion((db) => {
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

export async function aplicarStockCompra(compraId: string) {
  return transaccion((db) => {
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
    return enriquecerCompra(db, compra.id);
  });
}
