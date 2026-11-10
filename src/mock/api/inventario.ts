import type { Inventario, ProductoConTipo } from "../../domain/types";
import {
  ApiError,
  auditar,
  buscarInventario,
  buscarProducto,
  buscarSucursal,
  generarId,
  type InventarioConProducto,
} from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export interface DatosInventario {
  productoId: string;
  sucursalId: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
}

export type TipoMovimientoStock = "salida" | "ingreso";

export interface ResultadoMovimientoStock {
  inventario: Inventario;
  producto: ProductoConTipo;
  quedoBajoMinimo: boolean;
  excedeMaximo: boolean;
}

function validarStock(valor: number, campo: string): void {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new ApiError(`${campo} debe ser un número entero mayor o igual a cero.`);
  }
}

function validarDatosInventario(datos: DatosInventario): void {
  validarStock(datos.stockActual, "El stock actual");
  validarStock(datos.stockMinimo, "El stock mínimo");
  validarStock(datos.stockMaximo, "El stock máximo");
  if (datos.stockMinimo > datos.stockMaximo) {
    throw new ApiError("El stock mínimo no puede ser mayor que el stock máximo.");
  }
}

export async function listarInventario(
  sucursalId: string,
): Promise<InventarioConProducto[]> {
  const db = await leerBaseDatos();
  buscarSucursal(db, sucursalId);
  return db.inventarios
    .filter((inventario) => inventario.sucursalId === sucursalId)
    .map((inventario) => {
      const producto = buscarProducto(db, inventario.productoId);
      if (!producto) throw new ApiError("Un producto del inventario no existe.");
      return { ...inventario, producto };
    })
    .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, "es"));
}

export async function obtenerInventario(id: string): Promise<InventarioConProducto> {
  const db = await leerBaseDatos();
  const inventario = db.inventarios.find((item) => item.id === id);
  if (!inventario) throw new ApiError("El registro de inventario no existe.");
  const producto = buscarProducto(db, inventario.productoId);
  if (!producto) throw new ApiError("El producto no existe.");
  return { ...inventario, producto };
}

export async function crearInventario(
  datos: DatosInventario,
): Promise<InventarioConProducto> {
  return transaccion((db) => {
    buscarProducto(db, datos.productoId);
    buscarSucursal(db, datos.sucursalId);
    validarDatosInventario(datos);
    if (buscarInventario(db, datos.productoId, datos.sucursalId)) {
      throw new ApiError(
        "Ese producto ya tiene inventario en la sucursal seleccionada.",
        "INVENTARIO_DUPLICADO",
      );
    }
    const inventario: Inventario = {
      id: generarId("inventario"),
      productoId: datos.productoId,
      sucursalId: datos.sucursalId,
      stockActual: datos.stockActual,
      stockMinimo: datos.stockMinimo,
      stockMaximo: datos.stockMaximo,
    };
    db.inventarios.push(inventario);
    const producto = buscarProducto(db, datos.productoId);
    const sucursal = buscarSucursal(db, datos.sucursalId);
    auditar(db, {
      tipoOperacion: "Alta",
      descripcion: `Inventario dado de alta: ${producto?.nombre ?? "producto"} en ${sucursal.nombre}.`,
      sucursalId: datos.sucursalId,
      referenciaId: inventario.id,
    });
    const productoEncontrado = buscarProducto(db, inventario.productoId);
    if (!productoEncontrado) throw new ApiError("El producto no existe.");
    return { ...inventario, producto: productoEncontrado };
  });
}

export async function actualizarInventario(
  id: string,
  datos: Pick<DatosInventario, "stockActual" | "stockMinimo" | "stockMaximo">,
): Promise<InventarioConProducto> {
  return transaccion((db) => {
    const inventario = db.inventarios.find((item) => item.id === id);
    if (!inventario) throw new ApiError("El registro de inventario no existe.");
    validarDatosInventario({ ...datos, productoId: inventario.productoId, sucursalId: inventario.sucursalId });
    inventario.stockActual = datos.stockActual;
    inventario.stockMinimo = datos.stockMinimo;
    inventario.stockMaximo = datos.stockMaximo;
    const producto = buscarProducto(db, inventario.productoId);
    if (!producto) throw new ApiError("El producto no existe.");
    auditar(db, {
      tipoOperacion: "Modificación",
      descripcion: `Inventario modificado: ${producto.nombre}, stock actual ${inventario.stockActual}.`,
      sucursalId: inventario.sucursalId,
      referenciaId: inventario.id,
    });
    return { ...inventario, producto };
  });
}

export async function listarAlertasStockBajo(
  sucursalId: string,
): Promise<InventarioConProducto[]> {
  const inventario = await listarInventario(sucursalId);
  return inventario.filter(
    (fila) => fila.stockActual < fila.stockMinimo,
  );
}

export async function registrarMovimientoStock(datos: {
  tipo: TipoMovimientoStock;
  productoId: string;
  sucursalId: string;
  cantidad: number;
}): Promise<ResultadoMovimientoStock> {
  return transaccion((db) => {
    if (!Number.isInteger(datos.cantidad) || datos.cantidad <= 0) {
      throw new ApiError("La cantidad debe ser un número entero mayor que cero.");
    }
    const inventario = buscarInventario(db, datos.productoId, datos.sucursalId);
    if (!inventario) {
      throw new ApiError(
        "El producto no tiene inventario en esta sucursal. Primero registrá su inventario.",
      );
    }
    if (datos.tipo === "salida" && inventario.stockActual < datos.cantidad) {
      throw new ApiError(
        `No hay stock suficiente. Disponible: ${inventario.stockActual}.`,
        "SIN_STOCK",
      );
    }
    if (datos.tipo === "salida") {
      inventario.stockActual -= datos.cantidad;
    } else {
      inventario.stockActual += datos.cantidad;
    }
    const producto = buscarProducto(db, inventario.productoId);
    if (!producto) throw new ApiError("El producto no existe.");
    const quedoBajoMinimo = inventario.stockActual < inventario.stockMinimo;
    const excedeMaximo = inventario.stockActual > inventario.stockMaximo;
    auditar(db, {
      tipoOperacion: "Movimiento de stock",
      descripcion: `${datos.tipo === "salida" ? "Salida" : "Ingreso manual"} de ${datos.cantidad} unidad(es) de ${producto.nombre}. Stock resultante: ${inventario.stockActual}.`,
      sucursalId: datos.sucursalId,
      referenciaId: inventario.id,
    });
    return { inventario, producto, quedoBajoMinimo, excedeMaximo };
  });
}
