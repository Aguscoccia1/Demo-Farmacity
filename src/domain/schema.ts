/**
 * Atributos de negocio de las 22 entidades.
 * Los identificadores y las claves relacionales (por ejemplo, clienteId) son
 * técnicos y no forman parte de esta lista.
 *
 * Medicamento y Producto de Venta Libre incluyen los atributos heredados de
 * Producto, tal como se observan en los datos persistidos.
 */
export const ENTITY_ATTRIBUTES = {
  Cliente: ["nombre", "apellido", "dni", "telefono", "email", "direccion"],
  Turno: ["fecha", "hora"],
  Venta: [
    "fecha",
    "tipoVenta",
    "descuento",
    "montoCubierto",
    "total",
  ],
  DetalleVenta: ["cantidad", "precioUnitario", "subtotal"],
  Receta: ["fecha", "fechaVencimiento", "medico", "matriculaMedico"],
  EstadoVenta: ["nombre", "descripcion"],
  Cobro: ["fecha", "importe"],
  DetalleCobro: ["importe"],
  MedioPago: ["tipo"],
  ObraSocial: ["nombre", "sigla", "telefono", "porcentajeCobertura"],
  Producto: ["nombre", "descripcion", "marca", "precio", "codigoBarras"],
  Medicamento: [
    "nombre",
    "descripcion",
    "marca",
    "precio",
    "codigoBarras",
    "principioActivo",
    "requiereReceta",
    "fechaVencimiento",
    "laboratorio",
    "presentacion",
    "concentracion",
  ],
  ProductoVentaLibre: [
    "nombre",
    "descripcion",
    "marca",
    "precio",
    "codigoBarras",
    "categoria",
  ],
  Inventario: ["stockActual", "stockMinimo", "stockMaximo"],
  Sucursal: ["nombre", "direccion", "telefono"],
  Pedido: ["fecha"],
  DetallePedido: ["cantidad"],
  EstadoPedido: ["nombre", "descripcion"],
  Compra: ["fecha", "total"],
  DetalleCompra: ["cantidad", "precioUnitario", "subtotal"],
  EstadoCompra: ["nombre", "descripcion"],
  DrogueriaCentral: ["nombre", "cuit", "telefono", "direccion", "email"],
} as const;

export type NombreEntidad = keyof typeof ENTITY_ATTRIBUTES;

export const ENTIDADES: NombreEntidad[] = Object.keys(
  ENTITY_ATTRIBUTES,
) as NombreEntidad[];

export function atributosDeNegocio(objeto: Record<string, unknown>): string[] {
  return Object.keys(objeto)
    .filter((clave) => clave !== "id" && !clave.endsWith("Id"))
    .sort();
}
