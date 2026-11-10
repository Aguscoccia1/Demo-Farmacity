import type { Rol } from "../domain/types";

export interface CasoDeUso {
  codigo: string;
  nombre: string;
  roles: Rol[];
  ruta: string;
}

const VENTA: Rol = "Encargado de Venta";
const CAJA: Rol = "Encargado de Caja";
const DEPOSITO: Rol = "Encargado de Depósito";
const COMPRAS: Rol = "Encargado de Compras";

/**
 * Registro interno de los 48 casos de uso.
 * Los códigos nunca se muestran en la interfaz.
 */
export const CASOS_DE_USO: CasoDeUso[] = [
  { codigo: "CU01", nombre: "Alta de cliente", roles: [VENTA], ruta: "/clientes/nuevo" },
  { codigo: "CU02", nombre: "Modificación de cliente", roles: [VENTA], ruta: "/clientes/:id/editar" },
  { codigo: "CU03", nombre: "Consulta de cliente y ficha", roles: [VENTA], ruta: "/clientes/:id" },
  { codigo: "CU04", nombre: "Registro de turno", roles: [VENTA], ruta: "/turnos" },
  { codigo: "CU05", nombre: "Lista de clientes imprimible", roles: [VENTA], ruta: "/clientes/lista-imprimible" },
  { codigo: "CU06", nombre: "Alta de obra social", roles: [VENTA], ruta: "/obras-sociales/nueva" },
  { codigo: "CU07", nombre: "Consulta de obras sociales", roles: [VENTA], ruta: "/obras-sociales" },
  { codigo: "CU08", nombre: "Consulta de stock", roles: [VENTA], ruta: "/stock" },
  { codigo: "CU09", nombre: "Registrar venta con receta", roles: [VENTA], ruta: "/ventas/receta/nueva" },
  { codigo: "CU10", nombre: "Modificar venta con receta", roles: [VENTA], ruta: "/ventas/receta/:id/editar" },
  { codigo: "CU11", nombre: "Anular venta con receta", roles: [VENTA], ruta: "/ventas/receta/:id/editar" },
  { codigo: "CU12", nombre: "Consultar y listar ventas con receta", roles: [VENTA], ruta: "/ventas/receta" },
  { codigo: "CU13", nombre: "Consultar catálogo de venta libre", roles: [VENTA], ruta: "/ventas-libres/catalogo" },
  { codigo: "CU14", nombre: "Consultar disponibilidad de producto", roles: [VENTA], ruta: "/disponibilidad" },
  { codigo: "CU15", nombre: "Registrar venta libre", roles: [VENTA], ruta: "/ventas-libres/nueva" },
  { codigo: "CU16", nombre: "Modificar venta libre", roles: [VENTA], ruta: "/ventas-libres/:id/editar" },
  { codigo: "CU17", nombre: "Anular venta libre", roles: [VENTA], ruta: "/ventas-libres/:id/editar" },
  { codigo: "CU18", nombre: "Consultar y listar ventas libres", roles: [VENTA], ruta: "/ventas-libres" },
  { codigo: "CU19", nombre: "Cobrar venta", roles: [CAJA], ruta: "/caja/cobrar" },
  { codigo: "CU20", nombre: "Registrar medios de pago", roles: [CAJA], ruta: "/caja/cobrar" },
  { codigo: "CU21", nombre: "Emitir comprobante de pago", roles: [CAJA], ruta: "/caja/comprobante/:ventaId" },
  { codigo: "CU22", nombre: "Consultar cobros", roles: [CAJA], ruta: "/caja/cobros" },
  { codigo: "CU23", nombre: "Modificar cobro", roles: [CAJA], ruta: "/caja/cobros/:id" },
  { codigo: "CU24", nombre: "Listado de cobros del día", roles: [CAJA], ruta: "/caja/cobros-dia" },
  { codigo: "CU25", nombre: "Alta de inventario", roles: [DEPOSITO], ruta: "/inventario/nuevo" },
  { codigo: "CU26", nombre: "Alertas de stock bajo", roles: [DEPOSITO], ruta: "/alertas-stock" },
  { codigo: "CU27", nombre: "Salida de productos del depósito", roles: [DEPOSITO], ruta: "/movimientos" },
  { codigo: "CU28", nombre: "Ingreso manual de mercadería", roles: [DEPOSITO], ruta: "/movimientos" },
  { codigo: "CU29", nombre: "Modificación de inventario", roles: [DEPOSITO], ruta: "/inventario/:id/editar" },
  { codigo: "CU30", nombre: "Consulta de inventario", roles: [DEPOSITO], ruta: "/inventario" },
  { codigo: "CU31", nombre: "Nuevo pedido", roles: [DEPOSITO], ruta: "/pedidos/nuevo" },
  { codigo: "CU32", nombre: "Generar orden de pedido", roles: [DEPOSITO], ruta: "/pedidos/:id/orden" },
  { codigo: "CU33", nombre: "Modificar pedido", roles: [DEPOSITO], ruta: "/pedidos/:id/editar" },
  { codigo: "CU34", nombre: "Eliminar pedido", roles: [DEPOSITO], ruta: "/pedidos/:id/editar" },
  { codigo: "CU35", nombre: "Enviar pedido", roles: [DEPOSITO], ruta: "/pedidos/:id" },
  { codigo: "CU36", nombre: "Cancelar pedido", roles: [DEPOSITO], ruta: "/pedidos/:id" },
  { codigo: "CU37", nombre: "Ajustar stock por mercadería recibida", roles: [DEPOSITO], ruta: "/pedidos/:id" },
  { codigo: "CU38", nombre: "Consultar y listar pedidos", roles: [DEPOSITO], ruta: "/pedidos" },
  { codigo: "CU39", nombre: "Nueva compra", roles: [COMPRAS], ruta: "/compras/nueva" },
  { codigo: "CU40", nombre: "Modificar compra", roles: [COMPRAS], ruta: "/compras/:id/editar" },
  { codigo: "CU41", nombre: "Consultar y listar compras", roles: [COMPRAS], ruta: "/compras" },
  { codigo: "CU42", nombre: "Registrar recepción de compra", roles: [COMPRAS], ruta: "/compras/:id" },
  { codigo: "CU43", nombre: "Anular compra", roles: [COMPRAS], ruta: "/compras/:id" },
  { codigo: "CU44", nombre: "Aplicar stock de compras recibidas", roles: [DEPOSITO], ruta: "/compras-recibidas" },
  { codigo: "CU45", nombre: "Listado de compras", roles: [DEPOSITO], ruta: "/compras-recibidas" },
  { codigo: "CU46", nombre: "Alta de droguería", roles: [DEPOSITO], ruta: "/droguerias/nueva" },
  { codigo: "CU47", nombre: "Modificación de droguería", roles: [DEPOSITO], ruta: "/droguerias/:id/editar" },
  { codigo: "CU48", nombre: "Consulta de droguerías", roles: [DEPOSITO], ruta: "/droguerias" },
];

export const CASOS_POR_CODIGO = new Map(
  CASOS_DE_USO.map((caso) => [caso.codigo, caso]),
);

export function casosDeRol(rol: Rol): CasoDeUso[] {
  return CASOS_DE_USO.filter((caso) => caso.roles.includes(rol));
}
