import type { Rol } from "../domain/types";
import { ROLES } from "./roles";

export interface DefinicionRuta {
  patron: string;
  roles: Rol[];
}

/**
 * Permisos de acceso por ruta. El inicio está disponible para todos los roles.
 * Las rutas no listadas se consideran inexistentes.
 */
export const RUTAS_PROTEGIDAS: DefinicionRuta[] = [
  { patron: "/", roles: ROLES },
  { patron: "/clientes", roles: ["Encargado de Ventas"] },
  { patron: "/clientes/nuevo", roles: ["Encargado de Ventas"] },
  { patron: "/clientes/lista-imprimible", roles: ["Encargado de Ventas"] },
  { patron: "/clientes/:id", roles: ["Encargado de Ventas"] },
  { patron: "/clientes/:id/editar", roles: ["Encargado de Ventas"] },
  { patron: "/turnos", roles: ["Encargado de Ventas"] },
  { patron: "/obras-sociales", roles: ["Encargado de Ventas"] },
  { patron: "/obras-sociales/nueva", roles: ["Encargado de Ventas"] },
  { patron: "/stock", roles: ["Encargado de Ventas"] },
  { patron: "/disponibilidad", roles: ["Encargado de Ventas"] },
  { patron: "/ventas/receta", roles: ["Encargado de Ventas"] },
  { patron: "/ventas/receta/nueva", roles: ["Encargado de Ventas"] },
  { patron: "/ventas/receta/:id/editar", roles: ["Encargado de Ventas"] },
  { patron: "/ventas-libres", roles: ["Encargado de Ventas"] },
  { patron: "/ventas-libres/catalogo", roles: ["Encargado de Ventas"] },
  { patron: "/ventas-libres/nueva", roles: ["Encargado de Ventas"] },
  { patron: "/ventas-libres/:id/editar", roles: ["Encargado de Ventas"] },
  { patron: "/caja/cobrar", roles: ["Encargado de Caja"] },
  { patron: "/caja/cobros", roles: ["Encargado de Caja"] },
  { patron: "/caja/cobros/:id", roles: ["Encargado de Caja"] },
  { patron: "/caja/cobros-dia", roles: ["Encargado de Caja"] },
  { patron: "/caja/comprobante/:ventaId", roles: ["Encargado de Caja"] },
  { patron: "/inventario", roles: ["Encargado de Depósito"] },
  { patron: "/inventario/nuevo", roles: ["Encargado de Depósito"] },
  { patron: "/inventario/:id/editar", roles: ["Encargado de Depósito"] },
  { patron: "/alertas-stock", roles: ["Encargado de Depósito"] },
  { patron: "/movimientos", roles: ["Encargado de Depósito"] },
  { patron: "/pedidos", roles: ["Encargado de Depósito"] },
  { patron: "/pedidos/nuevo", roles: ["Encargado de Depósito"] },
  { patron: "/pedidos/:id", roles: ["Encargado de Depósito"] },
  { patron: "/pedidos/:id/editar", roles: ["Encargado de Depósito"] },
  { patron: "/pedidos/:id/orden", roles: ["Encargado de Depósito"] },
  { patron: "/compras-recibidas", roles: ["Encargado de Depósito"] },
  { patron: "/droguerias", roles: ["Encargado de Depósito"] },
  { patron: "/droguerias/nueva", roles: ["Encargado de Depósito"] },
  { patron: "/droguerias/:id/editar", roles: ["Encargado de Depósito"] },
  { patron: "/compras", roles: ["Encargado de Compras"] },
  { patron: "/compras/nueva", roles: ["Encargado de Compras"] },
  { patron: "/compras/:id", roles: ["Encargado de Compras"] },
  { patron: "/compras/:id/editar", roles: ["Encargado de Compras"] },
  { patron: "/auditoria", roles: ["Administrador"] },
];

function patronARegex(patron: string): RegExp {
  if (patron === "/") return /^\/$/;
  const segmentos = patron.split("/").map((segmento) => {
    if (segmento.startsWith(":")) return "[^/]+";
    return segmento.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return new RegExp(`^${segmentos.join("/")}$`);
}

export function rutaCoincide(patron: string, ruta: string): boolean {
  return patronARegex(patron).test(ruta);
}

export function obtenerPermisoRuta(ruta: string): DefinicionRuta | undefined {
  return RUTAS_PROTEGIDAS.find((definicion) =>
    rutaCoincide(definicion.patron, ruta),
  );
}

export function puedeAccederRuta(rol: Rol, ruta: string): boolean {
  const permiso = obtenerPermisoRuta(ruta);
  return permiso?.roles.includes(rol) ?? false;
}

export function rutaPermitidaParaRol(rol: Rol, patron: string): boolean {
  return RUTAS_PROTEGIDAS.find((definicion) => definicion.patron === patron)?.roles.includes(rol) ?? false;
}
