import type { Rol } from "../domain/types";

export const ROLES: Rol[] = [
  "Encargado de Ventas",
  "Encargado de Caja",
  "Encargado de Depósito",
  "Encargado de Compras",
  "Administrador",
];

export const DESCRIPCION_ROL: Record<Rol, string> = {
  "Encargado de Ventas": "Clientes, obras sociales, stock y ventas",
  "Encargado de Caja": "Cobros y comprobantes",
  "Encargado de Depósito": "Inventario, pedidos, compras y droguerías",
  "Encargado de Compras": "Compras y recepción de mercadería",
  Administrador: "Registro de auditoría",
};
