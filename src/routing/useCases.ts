import type { Rol } from "../domain/types";

export interface CasoDeUso {
  codigo: string;
  nombre: string;
  roles: Rol[];
  ruta: string;
}

const VENTA: Rol = "Encargado de Ventas";
const CAJA: Rol = "Encargado de Caja";
const DEPOSITO: Rol = "Encargado de Depósito";
const COMPRAS: Rol = "Encargado de Compras";

/**
 * Registro interno de los 48 casos de uso.
 * Los códigos nunca se muestran en la interfaz.
 */
export const CASOS_DE_USO: CasoDeUso[] = [
  { codigo: "CU01", nombre: "Registrar cliente", roles: [VENTA], ruta: "/clientes/nuevo" },
  { codigo: "CU02", nombre: "Modificar cliente", roles: [VENTA], ruta: "/clientes/:id/editar" },
  { codigo: "CU03", nombre: "Consultar cliente", roles: [VENTA], ruta: "/clientes/:id" },
  { codigo: "CU04", nombre: "Registrar turno de atención", roles: [VENTA], ruta: "/turnos" },
  { codigo: "CU05", nombre: "Emitir lista de clientes", roles: [VENTA], ruta: "/clientes/lista-imprimible" },
  { codigo: "CU06", nombre: "Registrar obra social", roles: [VENTA], ruta: "/obras-sociales/nueva" },
  { codigo: "CU07", nombre: "Consultar obra social", roles: [VENTA], ruta: "/obras-sociales" },
  { codigo: "CU08", nombre: "Consultar stock", roles: [VENTA], ruta: "/stock" },
  { codigo: "CU09", nombre: "Registrar venta de medicamentos", roles: [VENTA], ruta: "/ventas/receta/nueva" },
  { codigo: "CU10", nombre: "Modificar venta con receta", roles: [VENTA], ruta: "/ventas/receta/:id/editar" },
  { codigo: "CU11", nombre: "Consultar venta con receta", roles: [VENTA], ruta: "/ventas/receta" },
  { codigo: "CU12", nombre: "Emitir lista de ventas con receta", roles: [VENTA], ruta: "/ventas/receta" },
  { codigo: "CU13", nombre: "Consultar productos de venta libre", roles: [VENTA], ruta: "/ventas-libres/catalogo" },
  { codigo: "CU14", nombre: "Consultar disponibilidad del producto", roles: [VENTA], ruta: "/disponibilidad" },
  { codigo: "CU15", nombre: "Registrar venta", roles: [VENTA], ruta: "/ventas-libres/nueva" },
  { codigo: "CU16", nombre: "Modificar venta", roles: [VENTA], ruta: "/ventas-libres/:id/editar" },
  { codigo: "CU17", nombre: "Consultar venta", roles: [VENTA], ruta: "/ventas-libres" },
  { codigo: "CU18", nombre: "Emitir lista de ventas libres", roles: [VENTA], ruta: "/ventas-libres" },
  { codigo: "CU19", nombre: "Registrar cobro", roles: [CAJA], ruta: "/caja/cobrar" },
  { codigo: "CU20", nombre: "Registrar detalles de cobro", roles: [CAJA], ruta: "/caja/cobrar" },
  { codigo: "CU21", nombre: "Emitir comprobante de pago", roles: [CAJA], ruta: "/caja/comprobante/:ventaId" },
  { codigo: "CU22", nombre: "Consultar cobro", roles: [CAJA], ruta: "/caja/cobros" },
  { codigo: "CU23", nombre: "Modificar cobro", roles: [CAJA], ruta: "/caja/cobros/:id" },
  { codigo: "CU24", nombre: "Emitir listado de cobros del día", roles: [CAJA], ruta: "/caja/cobros-dia" },
  { codigo: "CU25", nombre: "Registrar stock actual por sucursal", roles: [DEPOSITO], ruta: "/inventario/nuevo" },
  { codigo: "CU26", nombre: "Generar alerta de stock bajo", roles: [DEPOSITO], ruta: "/alertas-stock" },
  { codigo: "CU27", nombre: "Registrar salida de productos del depósito", roles: [DEPOSITO], ruta: "/movimientos" },
  { codigo: "CU28", nombre: "Registrar ingreso de mercadería al depósito", roles: [DEPOSITO], ruta: "/movimientos" },
  { codigo: "CU29", nombre: "Modificar inventario", roles: [DEPOSITO], ruta: "/inventario/:id/editar" },
  { codigo: "CU30", nombre: "Consultar inventario", roles: [DEPOSITO], ruta: "/inventario" },
  { codigo: "CU31", nombre: "Registrar pedido", roles: [DEPOSITO], ruta: "/pedidos/nuevo" },
  { codigo: "CU32", nombre: "Modificar pedido", roles: [DEPOSITO], ruta: "/pedidos/:id/editar" },
  { codigo: "CU33", nombre: "Eliminar pedido", roles: [DEPOSITO], ruta: "/pedidos/:id/editar" },
  { codigo: "CU34", nombre: "Generar orden de pedido", roles: [DEPOSITO], ruta: "/pedidos/:id/orden" },
  { codigo: "CU35", nombre: "Registrar estado del pedido", roles: [DEPOSITO], ruta: "/pedidos/:id" },
  { codigo: "CU36", nombre: "Modificar stock del depósito", roles: [DEPOSITO], ruta: "/movimientos" },
  { codigo: "CU37", nombre: "Consultar pedidos", roles: [DEPOSITO], ruta: "/pedidos" },
  { codigo: "CU38", nombre: "Emitir lista de pedidos", roles: [DEPOSITO], ruta: "/pedidos" },
  { codigo: "CU39", nombre: "Registrar compra", roles: [COMPRAS], ruta: "/compras/nueva" },
  { codigo: "CU40", nombre: "Registrar detalle de compra", roles: [COMPRAS], ruta: "/compras/nueva" },
  { codigo: "CU41", nombre: "Modificar compra", roles: [COMPRAS], ruta: "/compras/:id/editar" },
  { codigo: "CU42", nombre: "Consultar compras", roles: [COMPRAS], ruta: "/compras" },
  { codigo: "CU43", nombre: "Registrar recepción de mercadería", roles: [COMPRAS], ruta: "/compras/:id" },
  { codigo: "CU44", nombre: "Actualizar stock de productos recibidos", roles: [DEPOSITO], ruta: "/compras-recibidas" },
  { codigo: "CU45", nombre: "Emitir listado de compras", roles: [DEPOSITO], ruta: "/compras-recibidas" },
  { codigo: "CU46", nombre: "Registrar droguería", roles: [DEPOSITO], ruta: "/droguerias/nueva" },
  { codigo: "CU47", nombre: "Modificar droguería", roles: [DEPOSITO], ruta: "/droguerias/:id/editar" },
  { codigo: "CU48", nombre: "Consultar droguería", roles: [DEPOSITO], ruta: "/droguerias" },
];

export const CASOS_POR_CODIGO = new Map(
  CASOS_DE_USO.map((caso) => [caso.codigo, caso]),
);

export function casosDeRol(rol: Rol): CasoDeUso[] {
  return CASOS_DE_USO.filter((caso) => caso.roles.includes(rol));
}
