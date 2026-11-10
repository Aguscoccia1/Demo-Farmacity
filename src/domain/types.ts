export type Rol =
  | "Encargado de Venta"
  | "Encargado de Caja"
  | "Encargado de Depósito"
  | "Encargado de Compras"
  | "Administrador";

export type TipoVenta = "Con receta" | "Venta libre";

export type TipoMedioPago = "Efectivo" | "Débito" | "Crédito" | "Transferencia";

export type NombreEstadoVenta = "Registrada" | "Cobrada" | "Anulada";
export type NombreEstadoPedido = "Registrado" | "Enviado" | "Cancelado";
export type NombreEstadoCompra = "Registrada" | "Recibida" | "Anulada";

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface Turno {
  id: string;
  clienteId: string;
  fecha: string;
  hora: string;
}

export interface Venta {
  id: string;
  sucursalId: string;
  clienteId: string;
  estadoId: string;
  obraSocialId: string | null;
  recetaId: string | null;
  tipoVenta: TipoVenta;
  descuento: number;
  montoCubierto: number;
  total: number;
  fecha: string;
}

export interface DetalleVenta {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Receta {
  id: string;
  fecha: string;
  fechaVencimiento: string;
  medico: string;
  matriculaMedico: string;
}

export interface EstadoVenta {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Cobro {
  id: string;
  ventaId: string;
  fecha: string;
  importe: number;
}

export interface DetalleCobro {
  id: string;
  cobroId: string;
  medioPagoId: string;
  importe: number;
}

export interface MedioPago {
  id: string;
  tipo: TipoMedioPago;
}

export interface ObraSocial {
  id: string;
  nombre: string;
  sigla: string;
  telefono: string;
  porcentajeCobertura: number;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  marca: string;
  precio: number;
  codigoBarras: string;
}

export interface Medicamento extends Producto {
  principioActivo: string;
  requiereReceta: boolean;
  fechaVencimiento: string;
  laboratorio: string;
  presentacion: string;
  concentracion: string;
}

export interface ProductoVentaLibre extends Producto {
  categoria: string;
}

export interface Inventario {
  id: string;
  productoId: string;
  sucursalId: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
}

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
}

export interface Pedido {
  id: string;
  sucursalId: string;
  drogueriaId: string;
  estadoId: string;
  fecha: string;
}

export interface DetallePedido {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: number;
}

export interface EstadoPedido {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Compra {
  id: string;
  sucursalId: string;
  drogueriaId: string;
  pedidoId: string | null;
  estadoId: string;
  fecha: string;
  total: number;
}

export interface DetalleCompra {
  id: string;
  compraId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface EstadoCompra {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface DrogueriaCentral {
  id: string;
  nombre: string;
  cuit: string;
  telefono: string;
  direccion: string;
  email: string;
}

export type TipoOperacion =
  | "Alta"
  | "Modificación"
  | "Anulación"
  | "Cobro"
  | "Pedido"
  | "Compra"
  | "Movimiento de stock"
  | "Recepción"
  | "Actualización de stock"
  | "Login"
  | "Bloqueo"
  | "Cierre de sesión";

export interface RegistroAuditoria {
  id: string;
  fecha: string;
  usuario: string;
  rol: Rol | "Sistema";
  tipoOperacion: TipoOperacion;
  descripcion: string;
  sucursalId: string | null;
  /** Referencia técnica para vincular el registro con una operación. */
  referenciaId: string | null;
}

export interface BaseDatos {
  clientes: Cliente[];
  turnos: Turno[];
  ventas: Venta[];
  detallesVenta: DetalleVenta[];
  recetas: Receta[];
  estadosVenta: EstadoVenta[];
  cobros: Cobro[];
  detallesCobro: DetalleCobro[];
  mediosPago: MedioPago[];
  obrasSociales: ObraSocial[];
  medicamentos: Medicamento[];
  productosVentaLibre: ProductoVentaLibre[];
  inventarios: Inventario[];
  sucursales: Sucursal[];
  pedidos: Pedido[];
  detallesPedido: DetallePedido[];
  estadosPedido: EstadoPedido[];
  compras: Compra[];
  detallesCompra: DetalleCompra[];
  estadosCompra: EstadoCompra[];
  droguerias: DrogueriaCentral[];
  auditoria: RegistroAuditoria[];
}

/** Producto unificado para catálogos y búsquedas. El tipo es derivado, no persistido. */
export type ProductoConTipo =
  | (Medicamento & { tipoProducto: "Medicamento" })
  | (ProductoVentaLibre & { tipoProducto: "Venta libre" });

export interface VentaCompleta {
  venta: Venta;
  cliente: Cliente;
  sucursal: Sucursal;
  estado: EstadoVenta;
  obraSocial: ObraSocial | null;
  receta: Receta | null;
  detalles: Array<DetalleVenta & { producto: ProductoConTipo }>;
}

export interface CobroCompleto {
  cobro: Cobro;
  venta: VentaCompleta;
  detalles: Array<DetalleCobro & { medioPago: MedioPago }>;
}

export interface PedidoCompleto {
  pedido: Pedido;
  sucursal: Sucursal;
  drogueria: DrogueriaCentral;
  estado: EstadoPedido;
  detalles: Array<DetallePedido & { producto: ProductoConTipo }>;
  ordenGenerada: boolean;
}

export interface CompraCompleta {
  compra: Compra;
  sucursal: Sucursal;
  drogueria: DrogueriaCentral;
  estado: EstadoCompra;
  pedido: Pedido | null;
  detalles: Array<DetalleCompra & { producto: ProductoConTipo }>;
  stockAplicado: boolean;
}
