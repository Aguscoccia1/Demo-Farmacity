import type { DetalleVenta, ProductoConTipo, Receta } from "../../domain/types";
import {
  calcularSubtotal,
  calcularTotalesVenta,
  esRecetaValida,
  puedeModificarVenta,
} from "../../domain/rules";
import {
  recetaSchema,
  validarConEsquema,
  type RecetaForm,
} from "../../domain/validation";
import {
  ApiError,
  auditar,
  buscarCliente,
  buscarInventario,
  buscarObraSocial,
  buscarProducto,
  buscarSucursal,
  enriquecerVenta,
  generarId,
  listarProductosConTipo,
  ordenarPorFechaDesc,
  type ProductoConStock,
} from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export interface ItemVentaInput {
  productoId: string;
  cantidad: number;
}

export interface DatosVentaBase {
  clienteId: string;
  sucursalId: string;
  descuento: number;
  items: ItemVentaInput[];
}

export interface DatosVentaConReceta extends DatosVentaBase {
  obraSocialId: string | null;
  receta: RecetaForm;
}

export interface DatosVentaLibre extends DatosVentaBase {
  obraSocialId?: null;
}

interface VentaPreparada {
  clienteId: string;
  sucursalId: string;
  obraSocialId: string | null;
  descuento: number;
  items: Array<{
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  subtotal: number;
  total: number;
  montoCubierto: number;
  recetaLimpia: RecetaForm | null;
}

function normalizarItems(
  db: Parameters<typeof buscarProducto>[0],
  items: ItemVentaInput[],
): Map<string, number> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError("Agregá al menos un producto a la venta.");
  }
  const agrupados = new Map<string, number>();
  items.forEach((item) => {
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      throw new ApiError("La cantidad de cada producto debe ser mayor que cero.");
    }
    if (!buscarProducto(db, item.productoId)) {
      throw new ApiError("Uno de los productos seleccionados no existe.");
    }
    agrupados.set(item.productoId, (agrupados.get(item.productoId) ?? 0) + item.cantidad);
  });
  return agrupados;
}

function prepararVenta(
  db: Parameters<typeof buscarProducto>[0],
  tipoVenta: "Con receta" | "Venta libre",
  datos: DatosVentaConReceta | DatosVentaLibre,
): VentaPreparada {
  buscarCliente(db, datos.clienteId);
  buscarSucursal(db, datos.sucursalId);
  if (!Number.isFinite(datos.descuento) || datos.descuento < 0) {
    throw new ApiError("El descuento no puede ser negativo.");
  }
  const agrupados = normalizarItems(db, datos.items);
  const productos: ProductoConTipo[] = [];
  for (const productoId of agrupados.keys()) {
    const producto = buscarProducto(db, productoId);
    if (!producto) throw new ApiError("Uno de los productos no existe.");
    if (tipoVenta === "Con receta" && producto.tipoProducto !== "Medicamento") {
      throw new ApiError(
        "Una venta con receta solo puede incluir medicamentos.",
      );
    }
    if (tipoVenta === "Venta libre" && producto.tipoProducto !== "Venta libre") {
      throw new ApiError(
        "Una venta libre solo puede incluir productos de venta libre.",
      );
    }
    const inventario = buscarInventario(db, productoId, datos.sucursalId);
    const stock = inventario?.stockActual ?? 0;
    const cantidad = agrupados.get(productoId) ?? 0;
    if (stock < cantidad) {
      throw new ApiError(
        `No hay stock suficiente de ${producto.nombre}. Disponible: ${stock}.`,
        "SIN_STOCK",
      );
    }
    productos.push(producto);
  }

  let recetaLimpia: RecetaForm | null = null;
  let porcentajeCobertura: number | null = null;
  if (tipoVenta === "Con receta") {
    const conReceta = datos as DatosVentaConReceta;
    try {
      recetaLimpia = validarConEsquema(recetaSchema, conReceta.receta);
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : "La receta no es válida.",
      );
    }
    if (!esRecetaValida(recetaLimpia)) {
      throw new ApiError(
        "La receta no es válida: debe estar vigente y tener médico y matrícula.",
        "RECETA_INVALIDA",
      );
    }
    if (conReceta.obraSocialId) {
      const obraSocial = buscarObraSocial(db, conReceta.obraSocialId);
      if (!obraSocial) throw new ApiError("La obra social seleccionada no existe.");
      porcentajeCobertura = obraSocial.porcentajeCobertura;
    }
  }

  const items = [...agrupados.entries()].map(([productoId, cantidad]) => {
    const producto = productos.find((item) => item.id === productoId);
    if (!producto) throw new ApiError("Uno de los productos no existe.");
    return {
      productoId,
      cantidad,
      precioUnitario: producto.precio,
      subtotal: calcularSubtotal(cantidad, producto.precio),
    };
  });

  const totales = calcularTotalesVenta(
    items,
    datos.descuento,
    porcentajeCobertura,
  );
  return {
    clienteId: datos.clienteId,
    sucursalId: datos.sucursalId,
    obraSocialId:
      tipoVenta === "Con receta"
        ? (datos as DatosVentaConReceta).obraSocialId
        : null,
    descuento: datos.descuento,
    items,
    subtotal: totales.subtotal,
    total: totales.total,
    montoCubierto: totales.montoCubierto,
    recetaLimpia,
  };
}

function descripcionVenta(
  tipoVenta: "Con receta" | "Venta libre",
  apellido: string,
  nombre: string,
  total: number,
): string {
  return `${tipoVenta === "Con receta" ? "Venta con receta" : "Venta libre"} registrada para ${apellido}, ${nombre} por ${new Intl.NumberFormat(
    "es-AR",
    { style: "currency", currency: "ARS" },
  ).format(total)}.`;
}

async function crearVenta(
  tipoVenta: "Con receta" | "Venta libre",
  datos: DatosVentaConReceta | DatosVentaLibre,
) {
  return transaccion((db) => {
    const preparada = prepararVenta(db, tipoVenta, datos);
    const cliente = buscarCliente(db, preparada.clienteId);
    const receta: Receta | null = preparada.recetaLimpia
      ? { id: generarId("receta"), ...preparada.recetaLimpia }
      : null;
    if (receta) db.recetas.push(receta);
    const estado = db.estadosVenta.find((item) => item.nombre === "Registrada");
    if (!estado) throw new ApiError("No está configurado el estado Registrada.");
    const venta = {
      id: generarId("venta"),
      sucursalId: preparada.sucursalId,
      clienteId: preparada.clienteId,
      estadoId: estado.id,
      obraSocialId: preparada.obraSocialId,
      recetaId: receta?.id ?? null,
      tipoVenta,
      descuento: preparada.descuento,
      montoCubierto: preparada.montoCubierto,
      total: preparada.total,
      fecha: new Date().toISOString(),
    } as const;
    db.ventas.push(venta);
    preparada.items.forEach((item, indice) => {
      const detalle: DetalleVenta = {
        id: generarId(`detalle-venta-${indice}`),
        ventaId: venta.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      };
      db.detallesVenta.push(detalle);
    });
    auditar(db, {
      tipoOperacion: "Alta",
      descripcion: descripcionVenta(
        tipoVenta,
        cliente.apellido,
        cliente.nombre,
        preparada.total,
      ),
      sucursalId: venta.sucursalId,
      referenciaId: venta.id,
    });
    return enriquecerVenta(db, venta.id);
  });
}

async function actualizarVenta(
  ventaId: string,
  tipoVenta: "Con receta" | "Venta libre",
  datos: DatosVentaConReceta | DatosVentaLibre,
) {
  return transaccion((db) => {
    const venta = db.ventas.find((item) => item.id === ventaId);
    if (!venta) throw new ApiError("La venta no existe.");
    const estado = db.estadosVenta.find((item) => item.id === venta.estadoId);
    if (!estado || !puedeModificarVenta(estado.nombre)) {
      throw new ApiError("Solo se puede modificar una venta Registrada.");
    }
    if (venta.tipoVenta !== tipoVenta) {
      throw new ApiError("No se puede cambiar el tipo de venta.");
    }
    const preparada = prepararVenta(db, tipoVenta, datos);
    const cliente = buscarCliente(db, preparada.clienteId);

    let recetaId = venta.recetaId;
    if (preparada.recetaLimpia) {
      if (recetaId) {
        const receta = db.recetas.find((item) => item.id === recetaId);
        if (receta) {
          Object.assign(receta, preparada.recetaLimpia);
        } else {
          const nueva: Receta = { id: generarId("receta"), ...preparada.recetaLimpia };
          db.recetas.push(nueva);
          recetaId = nueva.id;
        }
      } else {
        const nueva: Receta = { id: generarId("receta"), ...preparada.recetaLimpia };
        db.recetas.push(nueva);
        recetaId = nueva.id;
      }
    }

    venta.clienteId = preparada.clienteId;
    venta.obraSocialId = preparada.obraSocialId;
    venta.recetaId = recetaId;
    venta.descuento = preparada.descuento;
    venta.montoCubierto = preparada.montoCubierto;
    venta.total = preparada.total;

    db.detallesVenta = db.detallesVenta.filter((detalle) => detalle.ventaId !== venta.id);
    preparada.items.forEach((item) => {
      db.detallesVenta.push({
        id: generarId("detalle-venta"),
        ventaId: venta.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      });
    });
    auditar(db, {
      tipoOperacion: "Modificación",
      descripcion: `Venta ${tipoVenta.toLowerCase()} modificada para ${cliente.apellido}, ${cliente.nombre}.`,
      sucursalId: venta.sucursalId,
      referenciaId: venta.id,
    });
    return enriquecerVenta(db, venta.id);
  });
}

export async function crearVentaConReceta(
  datos: DatosVentaConReceta,
) {
  return crearVenta("Con receta", datos);
}

export async function crearVentaLibre(datos: DatosVentaLibre) {
  return crearVenta("Venta libre", datos);
}

export async function actualizarVentaConReceta(
  id: string,
  datos: DatosVentaConReceta,
) {
  return actualizarVenta(id, "Con receta", datos);
}

export async function actualizarVentaLibre(
  id: string,
  datos: DatosVentaLibre,
) {
  return actualizarVenta(id, "Venta libre", datos);
}

export async function anularVenta(id: string): Promise<void> {
  await transaccion((db) => {
    const venta = db.ventas.find((item) => item.id === id);
    if (!venta) throw new ApiError("La venta no existe.");
    const estado = db.estadosVenta.find((item) => item.id === venta.estadoId);
    if (!estado || !puedeModificarVenta(estado.nombre)) {
      throw new ApiError("Solo se puede anular una venta Registrada.");
    }
    const estadoAnulada = db.estadosVenta.find(
      (item) => item.nombre === "Anulada",
    );
    if (!estadoAnulada) throw new ApiError("No está configurado el estado Anulada.");
    venta.estadoId = estadoAnulada.id;
    const cliente = buscarCliente(db, venta.clienteId);
    auditar(db, {
      tipoOperacion: "Anulación",
      descripcion: `Venta ${venta.tipoVenta.toLowerCase()} anulada para ${cliente.apellido}, ${cliente.nombre}.`,
      sucursalId: venta.sucursalId,
      referenciaId: venta.id,
    });
  });
}

export async function listarVentas(
  sucursalId: string,
  tipoVenta?: "Con receta" | "Venta libre",
) {
  const db = await leerBaseDatos();
  const ventas = db.ventas.filter(
    (venta) =>
      venta.sucursalId === sucursalId &&
      (tipoVenta ? venta.tipoVenta === tipoVenta : true),
  );
  return ordenarPorFechaDesc(ventas).map((venta) =>
    enriquecerVenta(db, venta.id),
  );
}

export async function obtenerVenta(ventaId: string) {
  const db = await leerBaseDatos();
  return enriquecerVenta(db, ventaId);
}

export async function obtenerProductosConStock(
  sucursalId: string,
): Promise<ProductoConStock[]> {
  const db = await leerBaseDatos();
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
