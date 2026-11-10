import type {
  BaseDatos,
  Cliente,
  CobroCompleto,
  CompraCompleta,
  DetalleCobro,
  DetalleCompra,
  DetallePedido,
  DetalleVenta,
  DrogueriaCentral,
  EstadoCompra,
  EstadoPedido,
  EstadoVenta,
  Inventario,
  MedioPago,
  ObraSocial,
  PedidoCompleto,
  ProductoConTipo,
  RegistroAuditoria,
  Sucursal,
  TipoOperacion,
  VentaCompleta,
} from "../../domain/types";
import { obtenerActor } from "../../lib/sessionActor";

export class ApiError extends Error {
  codigo: string;

  constructor(mensaje: string, codigo = "ERROR") {
    super(mensaje);
    this.name = "ApiError";
    this.codigo = codigo;
  }
}

export function generarId(prefijo: string): string {
  return `${prefijo}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function ahoraIso(): string {
  return new Date().toISOString();
}

export function buscarProducto(
  db: BaseDatos,
  productoId: string,
): ProductoConTipo | undefined {
  const medicamento = db.medicamentos.find((producto) => producto.id === productoId);
  if (medicamento) return { ...medicamento, tipoProducto: "Medicamento" };
  const ventaLibre = db.productosVentaLibre.find(
    (producto) => producto.id === productoId,
  );
  if (ventaLibre) return { ...ventaLibre, tipoProducto: "Venta libre" };
  return undefined;
}

export function listarProductosConTipo(db: BaseDatos): ProductoConTipo[] {
  return [
    ...db.medicamentos.map(
      (producto) => ({ ...producto, tipoProducto: "Medicamento" }) as const,
    ),
    ...db.productosVentaLibre.map(
      (producto) => ({ ...producto, tipoProducto: "Venta libre" }) as const,
    ),
  ];
}

export function buscarInventario(
  db: BaseDatos,
  productoId: string,
  sucursalId: string,
): Inventario | undefined {
  return db.inventarios.find(
    (inventario) =>
      inventario.productoId === productoId &&
      inventario.sucursalId === sucursalId,
  );
}

export function stockDisponible(
  db: BaseDatos,
  productoId: string,
  sucursalId: string,
): number {
  return buscarInventario(db, productoId, sucursalId)?.stockActual ?? 0;
}

export function buscarSucursal(db: BaseDatos, id: string): Sucursal {
  const sucursal = db.sucursales.find((item) => item.id === id);
  if (!sucursal) throw new ApiError("La sucursal no existe.");
  return sucursal;
}

export function buscarCliente(db: BaseDatos, id: string): Cliente {
  const cliente = db.clientes.find((item) => item.id === id);
  if (!cliente) throw new ApiError("El cliente no existe.");
  return cliente;
}

export function buscarObraSocial(
  db: BaseDatos,
  id: string | null,
): ObraSocial | null {
  if (!id) return null;
  return db.obrasSociales.find((item) => item.id === id) ?? null;
}

export function buscarEstadoVenta(db: BaseDatos, id: string): EstadoVenta {
  const estado = db.estadosVenta.find((item) => item.id === id);
  if (!estado) throw new ApiError("El estado de la venta no existe.");
  return estado;
}

export function buscarEstadoPedido(db: BaseDatos, id: string): EstadoPedido {
  const estado = db.estadosPedido.find((item) => item.id === id);
  if (!estado) throw new ApiError("El estado del pedido no existe.");
  return estado;
}

export function buscarEstadoCompra(db: BaseDatos, id: string): EstadoCompra {
  const estado = db.estadosCompra.find((item) => item.id === id);
  if (!estado) throw new ApiError("El estado de la compra no existe.");
  return estado;
}

export function buscarMedioPago(db: BaseDatos, id: string): MedioPago {
  const medio = db.mediosPago.find((item) => item.id === id);
  if (!medio) throw new ApiError("El medio de pago no existe.");
  return medio;
}

export function buscarDrogueria(db: BaseDatos, id: string): DrogueriaCentral {
  const drogueria = db.droguerias.find((item) => item.id === id);
  if (!drogueria) throw new ApiError("La droguería no existe.");
  return drogueria;
}

export function obtenerDrogueriaCentral(db: BaseDatos): DrogueriaCentral {
  const central = db.droguerias.find(
    (drogueria) => drogueria.nombre === "Droguería Central",
  );
  if (!central) {
    throw new ApiError(
      "No está configurada la Droguería Central en los datos de la farmacia.",
    );
  }
  return central;
}

export function enriquecerVenta(db: BaseDatos, ventaId: string): VentaCompleta {
  const venta = db.ventas.find((item) => item.id === ventaId);
  if (!venta) throw new ApiError("La venta no existe.");
  const detalles: Array<DetalleVenta & { producto: ProductoConTipo }> = [];
  for (const detalle of db.detallesVenta.filter(
    (item) => item.ventaId === venta.id,
  )) {
    const producto = buscarProducto(db, detalle.productoId);
    if (!producto) throw new ApiError("Un producto de la venta no existe.");
    detalles.push({ ...detalle, producto });
  }
  return {
    venta,
    cliente: buscarCliente(db, venta.clienteId),
    sucursal: buscarSucursal(db, venta.sucursalId),
    estado: buscarEstadoVenta(db, venta.estadoId),
    obraSocial: buscarObraSocial(db, venta.obraSocialId),
    receta: db.recetas.find((item) => item.id === venta.recetaId) ?? null,
    detalles,
  };
}

export function enriquecerCobro(db: BaseDatos, cobroId: string): CobroCompleto {
  const cobro = db.cobros.find((item) => item.id === cobroId);
  if (!cobro) throw new ApiError("El cobro no existe.");
  const detalles: Array<DetalleCobro & { medioPago: MedioPago }> = db.detallesCobro
    .filter((item) => item.cobroId === cobro.id)
    .map((detalle) => ({
      ...detalle,
      medioPago: buscarMedioPago(db, detalle.medioPagoId),
    }));
  return {
    cobro,
    venta: enriquecerVenta(db, cobro.ventaId),
    detalles,
  };
}

export function tieneOrdenGenerada(db: BaseDatos, pedidoId: string): boolean {
  return db.auditoria.some(
    (registro) =>
      registro.referenciaId === pedidoId &&
      registro.descripcion === "Orden de pedido generada.",
  );
}

export function enriquecerPedido(
  db: BaseDatos,
  pedidoId: string,
): PedidoCompleto {
  const pedido = db.pedidos.find((item) => item.id === pedidoId);
  if (!pedido) throw new ApiError("El pedido no existe.");
  const detalles: Array<DetallePedido & { producto: ProductoConTipo }> = [];
  for (const detalle of db.detallesPedido.filter(
    (item) => item.pedidoId === pedido.id,
  )) {
    const producto = buscarProducto(db, detalle.productoId);
    if (!producto) throw new ApiError("Un producto del pedido no existe.");
    detalles.push({ ...detalle, producto });
  }
  return {
    pedido,
    sucursal: buscarSucursal(db, pedido.sucursalId),
    drogueria: buscarDrogueria(db, pedido.drogueriaId),
    estado: buscarEstadoPedido(db, pedido.estadoId),
    detalles,
    ordenGenerada: tieneOrdenGenerada(db, pedido.id),
  };
}

export function tieneStockAplicado(db: BaseDatos, compraId: string): boolean {
  return db.auditoria.some(
    (registro) =>
      registro.referenciaId === compraId &&
      registro.tipoOperacion === "Actualización de stock" &&
      registro.descripcion.startsWith("Stock de compra aplicado"),
  );
}

export function enriquecerCompra(
  db: BaseDatos,
  compraId: string,
): CompraCompleta {
  const compra = db.compras.find((item) => item.id === compraId);
  if (!compra) throw new ApiError("La compra no existe.");
  const detalles: Array<DetalleCompra & { producto: ProductoConTipo }> = [];
  for (const detalle of db.detallesCompra.filter(
    (item) => item.compraId === compra.id,
  )) {
    const producto = buscarProducto(db, detalle.productoId);
    if (!producto) throw new ApiError("Un producto de la compra no existe.");
    detalles.push({ ...detalle, producto });
  }
  return {
    compra,
    sucursal: buscarSucursal(db, compra.sucursalId),
    drogueria: buscarDrogueria(db, compra.drogueriaId),
    estado: buscarEstadoCompra(db, compra.estadoId),
    pedido: db.pedidos.find((item) => item.id === compra.pedidoId) ?? null,
    detalles,
    stockAplicado: tieneStockAplicado(db, compra.id),
  };
}

export function auditar(
  db: BaseDatos,
  datos: {
    tipoOperacion: TipoOperacion;
    descripcion: string;
    sucursalId?: string | null;
    referenciaId?: string | null;
    usuario?: string;
    rol?: RegistroAuditoria["rol"];
  },
): void {
  const actor = obtenerActor();
  db.auditoria.unshift({
    id: generarId("auditoria"),
    fecha: ahoraIso(),
    usuario: datos.usuario ?? actor.usuario,
    rol: datos.rol ?? actor.rol,
    tipoOperacion: datos.tipoOperacion,
    descripcion: datos.descripcion,
    sucursalId: datos.sucursalId ?? null,
    referenciaId: datos.referenciaId ?? null,
  });
}

export function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new ApiError("La cantidad debe ser un número entero mayor que cero.");
  }
}

export function ordenarPorFechaDesc<T extends { fecha: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
}

export type InventarioConProducto = Inventario & {
  producto: ProductoConTipo;
};

export type ProductoConStock = ProductoConTipo & {
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  inventarioId: string | null;
};
