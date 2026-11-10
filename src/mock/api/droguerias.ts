import type { DrogueriaCentral } from "../../domain/types";
import {
  drogueriaSchema,
  validarConEsquema,
  type DrogueriaForm,
} from "../../domain/validation";
import { ApiError, auditar, buscarDrogueria, generarId } from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export async function listarDroguerias(): Promise<DrogueriaCentral[]> {
  const db = await leerBaseDatos();
  return [...db.droguerias].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}

export async function obtenerDrogueria(id: string): Promise<DrogueriaCentral> {
  const db = await leerBaseDatos();
  return buscarDrogueria(db, id);
}

export async function crearDrogueria(
  datos: DrogueriaForm,
): Promise<DrogueriaCentral> {
  let limpios: DrogueriaForm;
  try {
    limpios = validarConEsquema(drogueriaSchema, datos);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Datos inválidos.");
  }
  return transaccion((db) => {
    if (
      db.droguerias.some(
        (drogueria) =>
          drogueria.nombre.toLowerCase() === limpios.nombre.toLowerCase(),
      )
    ) {
      throw new ApiError("Ya existe una droguería con ese nombre.");
    }
    const drogueria: DrogueriaCentral = {
      id: generarId("drogueria"),
      ...limpios,
    };
    db.droguerias.push(drogueria);
    auditar(db, {
      tipoOperacion: "Alta",
      descripcion: `Droguería dada de alta: ${drogueria.nombre}.`,
      referenciaId: drogueria.id,
    });
    return drogueria;
  });
}

export async function actualizarDrogueria(
  id: string,
  datos: DrogueriaForm,
): Promise<DrogueriaCentral> {
  let limpios: DrogueriaForm;
  try {
    limpios = validarConEsquema(drogueriaSchema, datos);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Datos inválidos.");
  }
  return transaccion((db) => {
    const drogueria = buscarDrogueria(db, id);
    if (
      db.droguerias.some(
        (candidata) =>
          candidata.id !== id &&
          candidata.nombre.toLowerCase() === limpios.nombre.toLowerCase(),
      )
    ) {
      throw new ApiError("Ya existe una droguería con ese nombre.");
    }
    Object.assign(drogueria, limpios);
    auditar(db, {
      tipoOperacion: "Modificación",
      descripcion: `Droguería modificada: ${drogueria.nombre}.`,
      referenciaId: drogueria.id,
    });
    return drogueria;
  });
}
