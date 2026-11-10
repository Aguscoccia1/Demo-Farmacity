import type { ObraSocial } from "../../domain/types";
import {
  obraSocialSchema,
  validarConEsquema,
  type ObraSocialForm,
} from "../../domain/validation";
import { ApiError, auditar, generarId } from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export async function listarObrasSociales(): Promise<ObraSocial[]> {
  const db = await leerBaseDatos();
  return [...db.obrasSociales].sort((a, b) =>
    a.sigla.localeCompare(b.sigla, "es"),
  );
}

export async function obtenerObraSocial(id: string): Promise<ObraSocial> {
  const db = await leerBaseDatos();
  const obra = db.obrasSociales.find((item) => item.id === id);
  if (!obra) throw new ApiError("La obra social no existe.");
  return obra;
}

export async function crearObraSocial(
  datos: ObraSocialForm,
): Promise<ObraSocial> {
  let limpios: ObraSocialForm;
  try {
    limpios = validarConEsquema(obraSocialSchema, datos);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Datos inválidos.");
  }
  return transaccion((db) => {
    if (
      db.obrasSociales.some(
        (obra) => obra.sigla.toLowerCase() === limpios.sigla.toLowerCase(),
      )
    ) {
      throw new ApiError("Ya existe una obra social con esa sigla.");
    }
    const obra: ObraSocial = {
      id: generarId("obra-social"),
      ...limpios,
    };
    db.obrasSociales.push(obra);
    auditar(db, {
      tipoOperacion: "Alta",
      descripcion: `Obra social dada de alta: ${obra.sigla}.`,
      referenciaId: obra.id,
    });
    return obra;
  });
}
