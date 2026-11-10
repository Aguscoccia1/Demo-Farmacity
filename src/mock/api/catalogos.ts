import type {
  DrogueriaCentral,
  MedioPago,
  ObraSocial,
  Sucursal,
} from "../../domain/types";
import {
  ApiError,
  buscarInventario,
  listarProductosConTipo,
  type ProductoConStock,
} from "./comun";
import { leerBaseDatos } from "./db";

export async function obtenerSucursales(): Promise<Sucursal[]> {
  const db = await leerBaseDatos();
  return [...db.sucursales].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function obtenerObrasSociales(): Promise<ObraSocial[]> {
  const db = await leerBaseDatos();
  return [...db.obrasSociales].sort((a, b) =>
    a.sigla.localeCompare(b.sigla, "es"),
  );
}

export async function obtenerMediosPago(): Promise<MedioPago[]> {
  const db = await leerBaseDatos();
  const orden = ["Efectivo", "Débito", "Crédito", "Transferencia"];
  return [...db.mediosPago].sort(
    (a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo),
  );
}

export async function obtenerDroguerias(): Promise<DrogueriaCentral[]> {
  const db = await leerBaseDatos();
  return [...db.droguerias].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}

export async function listarCatalogoConStock(
  sucursalId: string,
): Promise<ProductoConStock[]> {
  const db = await leerBaseDatos();
  if (!db.sucursales.some((sucursal) => sucursal.id === sucursalId)) {
    throw new ApiError("La sucursal seleccionada no existe.");
  }
  return listarProductosConTipo(db)
    .map((producto) => {
      const inventario = buscarInventario(db, producto.id, sucursalId);
      return {
        ...producto,
        stockActual: inventario?.stockActual ?? 0,
        stockMinimo: inventario?.stockMinimo ?? 0,
        stockMaximo: inventario?.stockMaximo ?? 0,
        inventarioId: inventario?.id ?? null,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
