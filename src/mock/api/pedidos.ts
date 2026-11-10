import type { DetallePedido } from "../../domain/types";
import { puedeModificarPedido, TRANSICIONES_PEDIDO } from "../../domain/rules";
import {
  ApiError,
  auditar,
  buscarInventario,
  buscarProducto,
  buscarSucursal,
  enriquecerPedido,
  generarId,
  obtenerDrogueriaCentral,
  ordenarPorFechaDesc,
  tieneOrdenGenerada,
  validarCantidad,
} from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export interface ItemPedidoInput {
  productoId: string;
  cantidad: number;
}

function normalizarDetalles(
  db: Parameters<typeof buscarProducto>[0],
  items: ItemPedidoInput[],
): Array<{ productoId: string; cantidad: number }> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError("Agregá al menos un producto al pedido.");
  }
  const agrupados = new Map<string, number>();
  items.forEach((item) => {
    validarCantidad(item.cantidad);
    if (!buscarProducto(db, item.productoId)) {
      throw new ApiError("Uno de los productos del pedido no existe.");
    }
    agrupados.set(item.productoId, (agrupados.get(item.productoId) ?? 0) + item.cantidad);
  });
  return [...agrupados.entries()].map(([productoId, cantidad]) => ({
    productoId,
    cantidad,
  }));
}

export async function listarPedidos(sucursalId: string) {
  const db = await leerBaseDatos();
  return ordenarPorFechaDesc(
    db.pedidos.filter((pedido) => pedido.sucursalId === sucursalId),
  ).map((pedido) => enriquecerPedido(db, pedido.id));
}

export async function obtenerPedido(pedidoId: string) {
  const db = await leerBaseDatos();
  return enriquecerPedido(db, pedidoId);
}

export async function crearPedido(datos: {
  sucursalId: string;
  items: ItemPedidoInput[];
}) {
  return transaccion((db) => {
    buscarSucursal(db, datos.sucursalId);
    const central = obtenerDrogueriaCentral(db);
    const estado = db.estadosPedido.find((item) => item.nombre === "Registrado");
    if (!estado) throw new ApiError("No está configurado el estado Registrado.");
    const items = normalizarDetalles(db, datos.items);
    const pedido = {
      id: generarId("pedido"),
      sucursalId: datos.sucursalId,
      drogueriaId: central.id,
      estadoId: estado.id,
      fecha: new Date().toISOString(),
    };
    db.pedidos.push(pedido);
    items.forEach((item) => {
      const detalle: DetallePedido = {
        id: generarId("detalle-pedido"),
        pedidoId: pedido.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
      };
      db.detallesPedido.push(detalle);
    });
    const sucursal = buscarSucursal(db, datos.sucursalId);
    auditar(db, {
      tipoOperacion: "Pedido",
      descripcion: `Pedido registrado para ${sucursal.nombre} con ${items.length} producto(s).`,
      sucursalId: datos.sucursalId,
      referenciaId: pedido.id,
    });
    return enriquecerPedido(db, pedido.id);
  });
}

export async function actualizarPedido(
  pedidoId: string,
  datos: { items: ItemPedidoInput[] },
) {
  return transaccion((db) => {
    const pedido = db.pedidos.find((item) => item.id === pedidoId);
    if (!pedido) throw new ApiError("El pedido no existe.");
    const estado = db.estadosPedido.find((item) => item.id === pedido.estadoId);
    if (!estado || !puedeModificarPedido(estado.nombre)) {
      throw new ApiError("Solo se puede modificar un pedido Registrado.");
    }
    const items = normalizarDetalles(db, datos.items);
    db.detallesPedido = db.detallesPedido.filter(
      (detalle) => detalle.pedidoId !== pedido.id,
    );
    items.forEach((item) => {
      db.detallesPedido.push({
        id: generarId("detalle-pedido"),
        pedidoId: pedido.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
      });
    });
    auditar(db, {
      tipoOperacion: "Modificación",
      descripcion: `Pedido modificado con ${items.length} producto(s).`,
      sucursalId: pedido.sucursalId,
      referenciaId: pedido.id,
    });
    return enriquecerPedido(db, pedido.id);
  });
}

export async function eliminarPedido(pedidoId: string): Promise<void> {
  await transaccion((db) => {
    const pedido = db.pedidos.find((item) => item.id === pedidoId);
    if (!pedido) throw new ApiError("El pedido no existe.");
    const estado = db.estadosPedido.find((item) => item.id === pedido.estadoId);
    if (!estado || !puedeModificarPedido(estado.nombre)) {
      throw new ApiError("Solo se puede eliminar un pedido Registrado.");
    }
    const teniaOrden = tieneOrdenGenerada(db, pedido.id);
    db.pedidos = db.pedidos.filter((item) => item.id !== pedido.id);
    db.detallesPedido = db.detallesPedido.filter(
      (detalle) => detalle.pedidoId !== pedido.id,
    );
    auditar(db, {
      tipoOperacion: "Anulación",
      descripcion: `Pedido eliminado${teniaOrden ? " junto con su orden de pedido" : ""}.`,
      sucursalId: pedido.sucursalId,
      referenciaId: pedido.id,
    });
  });
}

export async function generarOrdenPedido(pedidoId: string) {
  return transaccion((db) => {
    const pedido = db.pedidos.find((item) => item.id === pedidoId);
    if (!pedido) throw new ApiError("El pedido no existe.");
    const estado = db.estadosPedido.find((item) => item.id === pedido.estadoId);
    if (!estado || estado.nombre === "Cancelado") {
      throw new ApiError("No se puede generar la orden de un pedido cancelado.");
    }
    if (!tieneOrdenGenerada(db, pedido.id)) {
      auditar(db, {
        tipoOperacion: "Pedido",
        descripcion: "Orden de pedido generada.",
        sucursalId: pedido.sucursalId,
        referenciaId: pedido.id,
      });
    }
    return enriquecerPedido(db, pedido.id);
  });
}

export async function cambiarEstadoPedido(
  pedidoId: string,
  datos: {
    nuevoEstado: "Enviado" | "Cancelado";
    mercaderiaRecibida?: boolean;
  },
) {
  return transaccion((db) => {
    const pedido = db.pedidos.find((item) => item.id === pedidoId);
    if (!pedido) throw new ApiError("El pedido no existe.");
    const estadoActual = db.estadosPedido.find(
      (item) => item.id === pedido.estadoId,
    );
    if (!estadoActual) throw new ApiError("El estado del pedido no existe.");
    if (
      !TRANSICIONES_PEDIDO[
        estadoActual.nombre as keyof typeof TRANSICIONES_PEDIDO
      ]?.includes(datos.nuevoEstado)
    ) {
      throw new ApiError(
        `No se puede pasar un pedido de ${estadoActual.nombre} a ${datos.nuevoEstado}.`,
      );
    }
    const estadoNuevo = db.estadosPedido.find(
      (item) => item.nombre === datos.nuevoEstado,
    );
    if (!estadoNuevo) {
      throw new ApiError(`No está configurado el estado ${datos.nuevoEstado}.`);
    }

    if (datos.nuevoEstado === "Enviado" && !tieneOrdenGenerada(db, pedido.id)) {
      throw new ApiError(
        "Para enviar el pedido primero tenés que generar la orden de pedido.",
        "ORDEN_REQUERIDA",
      );
    }

    let productosAjustados = 0;
    if (datos.nuevoEstado === "Enviado" && datos.mercaderiaRecibida) {
      const detalles = db.detallesPedido.filter(
        (detalle) => detalle.pedidoId === pedido.id,
      );
      for (const detalle of detalles) {
        const inventario = buscarInventario(
          db,
          detalle.productoId,
          pedido.sucursalId,
        );
        if (!inventario) {
          const producto = buscarProducto(db, detalle.productoId);
          throw new ApiError(
            `No hay inventario de ${producto?.nombre ?? "un producto"} en la sucursal para ajustar el stock.`,
          );
        }
      }
      for (const detalle of detalles) {
        const inventario = buscarInventario(
          db,
          detalle.productoId,
          pedido.sucursalId,
        );
        if (!inventario) continue;
        inventario.stockActual += detalle.cantidad;
        productosAjustados += 1;
      }
      if (productosAjustados > 0) {
        auditar(db, {
          tipoOperacion: "Actualización de stock",
          descripcion: `Stock ajustado por mercadería recibida del pedido (${productosAjustados} producto(s)).`,
          sucursalId: pedido.sucursalId,
          referenciaId: pedido.id,
        });
      }
    }

    pedido.estadoId = estadoNuevo.id;
    auditar(db, {
      tipoOperacion: "Pedido",
      descripcion: `Pedido ${datos.nuevoEstado.toLowerCase()}${productosAjustados > 0 ? " con mercadería recibida" : ""}.`,
      sucursalId: pedido.sucursalId,
      referenciaId: pedido.id,
    });
    return enriquecerPedido(db, pedido.id);
  });
}
