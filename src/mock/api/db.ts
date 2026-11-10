import { CONFIG } from "../../config";
import type { BaseDatos } from "../../domain/types";
import { crearSeed } from "../seed";

const VERSION_ALMACENAMIENTO = 1;

interface ContenedorPersistido {
  version: number;
  db: BaseDatos;
}

function esBaseDatos(valor: unknown): valor is BaseDatos {
  if (!valor || typeof valor !== "object") return false;
  const db = valor as Partial<BaseDatos>;
  return (
    Array.isArray(db.clientes) &&
    Array.isArray(db.ventas) &&
    Array.isArray(db.inventarios) &&
    Array.isArray(db.pedidos) &&
    Array.isArray(db.compras) &&
    Array.isArray(db.auditoria)
  );
}

export function leerBaseDatosSync(): BaseDatos {
  try {
    const crudo = localStorage.getItem(CONFIG.claveAlmacenamiento);
    if (!crudo) {
      const seed = crearSeed();
      guardarBaseDatosSync(seed);
      return seed;
    }
    const contenedor = JSON.parse(crudo) as ContenedorPersistido;
    if (
      contenedor.version !== VERSION_ALMACENAMIENTO ||
      !esBaseDatos(contenedor.db)
    ) {
      const seed = crearSeed();
      guardarBaseDatosSync(seed);
      return seed;
    }
    return contenedor.db;
  } catch {
    const seed = crearSeed();
    guardarBaseDatosSync(seed);
    return seed;
  }
}

function guardarBaseDatosSync(db: BaseDatos): void {
  const contenedor: ContenedorPersistido = {
    version: VERSION_ALMACENAMIENTO,
    db,
  };
  localStorage.setItem(CONFIG.claveAlmacenamiento, JSON.stringify(contenedor));
}

export function reiniciarDemoSync(): void {
  guardarBaseDatosSync(crearSeed());
}

export function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

export async function esperarLatencia(): Promise<void> {
  if (import.meta.env.MODE === "test") return;
  const rango = CONFIG.latenciaMaxMs - CONFIG.latenciaMinMs;
  const milisegundos = CONFIG.latenciaMinMs + Math.random() * rango;
  await new Promise((resolve) => setTimeout(resolve, milisegundos));
}

export async function leerBaseDatos(): Promise<BaseDatos> {
  await esperarLatencia();
  return clonar(leerBaseDatosSync());
}

export async function transaccion<T>(
  operacion: (db: BaseDatos) => T,
): Promise<T> {
  await esperarLatencia();
  const db = clonar(leerBaseDatosSync());
  const resultado = operacion(db);
  guardarBaseDatosSync(db);
  // Las operaciones que solo persisten cambios (por ejemplo, auditoría)
  // devuelven void; clonar(undefined) no es un JSON válido.
  return resultado === undefined ? resultado : clonar(resultado);
}
