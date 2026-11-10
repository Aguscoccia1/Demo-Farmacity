import { format } from "date-fns";
import type {
  RegistroAuditoria,
  Rol,
  TipoOperacion,
} from "../../domain/types";
import { ApiError, auditar, ordenarPorFechaDesc } from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export interface FiltrosAuditoria {
  desde?: string;
  hasta?: string;
  usuario?: string;
  tipoOperacion?: TipoOperacion | "";
}

export async function listarAuditoria(
  filtros: FiltrosAuditoria = {},
): Promise<RegistroAuditoria[]> {
  const db = await leerBaseDatos();
  return ordenarPorFechaDesc(
    db.auditoria.filter((registro) => {
      const fechaLocal = format(new Date(registro.fecha), "yyyy-MM-dd");
      if (filtros.desde && fechaLocal < filtros.desde) return false;
      if (filtros.hasta && fechaLocal > filtros.hasta) return false;
      if (
        filtros.usuario &&
        !registro.usuario.toLowerCase().includes(filtros.usuario.toLowerCase())
      ) {
        return false;
      }
      if (filtros.tipoOperacion && registro.tipoOperacion !== filtros.tipoOperacion) {
        return false;
      }
      return true;
    }),
  );
}

export async function registrarEventoAuditoria(datos: {
  usuario: string;
  rol: Rol | "Sistema";
  tipoOperacion: TipoOperacion;
  descripcion: string;
  sucursalId?: string | null;
  referenciaId?: string | null;
}): Promise<void> {
  await transaccion((db) => {
    auditar(db, {
      usuario: datos.usuario,
      rol: datos.rol,
      tipoOperacion: datos.tipoOperacion,
      descripcion: datos.descripcion,
      sucursalId: datos.sucursalId ?? null,
      referenciaId: datos.referenciaId ?? null,
    });
  });
}

export async function listarUsuariosAuditoria(): Promise<string[]> {
  const db = await leerBaseDatos();
  const usuarios = new Set(db.auditoria.map((registro) => registro.usuario));
  return [...usuarios].sort((a, b) => a.localeCompare(b, "es"));
}

export function validarFechasAuditoria(desde?: string, hasta?: string): void {
  if (desde && hasta && desde > hasta) {
    throw new ApiError("La fecha desde no puede ser posterior a la fecha hasta.");
  }
}
