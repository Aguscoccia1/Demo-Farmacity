import { CONFIG } from "../config";
import type { Rol } from "../domain/types";
import { esperarLatencia } from "../mock/api/db";
import { registrarEventoAuditoria } from "../mock/api/auditoria";
import { USUARIOS_DEMO, type UsuarioDemo } from "./usuariosDemo";

export interface UsuarioSesion {
  usuario: string;
  nombre: string;
  rol: Rol;
}

interface EstadoBloqueo {
  intentos: number;
  bloqueadoHasta: number | null;
}

type MapaBloqueos = Record<string, EstadoBloqueo>;

export class ErrorLogin extends Error {
  intentosRestantes?: number;
  bloqueadoHasta?: number;

  constructor(
    mensaje: string,
    opciones: { intentosRestantes?: number; bloqueadoHasta?: number } = {},
  ) {
    super(mensaje);
    this.name = "ErrorLogin";
    this.intentosRestantes = opciones.intentosRestantes;
    this.bloqueadoHasta = opciones.bloqueadoHasta;
  }
}

function leerBloqueos(): MapaBloqueos {
  try {
    const crudo = localStorage.getItem(CONFIG.claveBloqueos);
    return crudo ? (JSON.parse(crudo) as MapaBloqueos) : {};
  } catch {
    return {};
  }
}

function guardarBloqueos(bloqueos: MapaBloqueos): void {
  localStorage.setItem(CONFIG.claveBloqueos, JSON.stringify(bloqueos));
}

function buscarUsuarioDemo(usuario: string): UsuarioDemo | undefined {
  return USUARIOS_DEMO.find(
    (candidato) => candidato.usuario.toLowerCase() === usuario.toLowerCase(),
  );
}

export function formatearRestante(milisegundos: number): string {
  const totalSegundos = Math.max(0, Math.ceil(milisegundos / 1000));
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

export function obtenerBloqueoActivo(
  usuario: string,
  ahora = Date.now(),
): { bloqueadoHasta: number; restanteMs: number } | null {
  const estado = leerBloqueos()[usuario.toLowerCase()];
  if (!estado?.bloqueadoHasta || estado.bloqueadoHasta <= ahora) return null;
  return {
    bloqueadoHasta: estado.bloqueadoHasta,
    restanteMs: estado.bloqueadoHasta - ahora,
  };
}

export async function autenticar(
  usuario: string,
  contrasena: string,
  ahora = Date.now(),
): Promise<UsuarioSesion> {
  await esperarLatencia();
  const clave = usuario.trim().toLowerCase();
  const bloqueos = leerBloqueos();
  let estado = bloqueos[clave] ?? { intentos: 0, bloqueadoHasta: null };

  if (estado.bloqueadoHasta) {
    if (estado.bloqueadoHasta > ahora) {
      throw new ErrorLogin(
        `Usuario bloqueado. Reintentá en ${formatearRestante(
          estado.bloqueadoHasta - ahora,
        )}.`,
        { bloqueadoHasta: estado.bloqueadoHasta },
      );
    }
    estado = { intentos: 0, bloqueadoHasta: null };
  }

  const encontrado = buscarUsuarioDemo(clave);
  const credencialesValidas =
    encontrado !== undefined && encontrado.contrasena === contrasena;

  if (!credencialesValidas) {
    const intentos = estado.intentos + 1;
    if (intentos >= CONFIG.maxIntentosFallidos) {
      const bloqueadoHasta = ahora + CONFIG.bloqueoMs;
      bloqueos[clave] = { intentos: 0, bloqueadoHasta };
      guardarBloqueos(bloqueos);
      await registrarEventoAuditoria({
        usuario: encontrado?.nombre ?? (usuario.trim() || "Usuario desconocido"),
        rol: encontrado?.rol ?? "Sistema",
        tipoOperacion: "Bloqueo",
        descripcion: `Usuario bloqueado durante 5 minutos por 3 intentos fallidos consecutivos (${usuario.trim()}).`,
      });
      throw new ErrorLogin(
        `Usuario bloqueado por 3 intentos fallidos. Reintentá en ${formatearRestante(
          CONFIG.bloqueoMs,
        )}.`,
        { bloqueadoHasta },
      );
    }
    bloqueos[clave] = { intentos, bloqueadoHasta: null };
    guardarBloqueos(bloqueos);
    await registrarEventoAuditoria({
      usuario: encontrado?.nombre ?? (usuario.trim() || "Usuario desconocido"),
      rol: encontrado?.rol ?? "Sistema",
      tipoOperacion: "Login",
      descripcion: `Inicio de sesión fallido para el usuario ${usuario.trim()}. Intento ${intentos} de ${CONFIG.maxIntentosFallidos}.`,
    });
    throw new ErrorLogin(
      `Usuario o contraseña incorrectos. Intentos restantes: ${
        CONFIG.maxIntentosFallidos - intentos
      }.`,
      { intentosRestantes: CONFIG.maxIntentosFallidos - intentos },
    );
  }

  bloqueos[clave] = { intentos: 0, bloqueadoHasta: null };
  guardarBloqueos(bloqueos);
  await registrarEventoAuditoria({
    usuario: encontrado.nombre,
    rol: encontrado.rol,
    tipoOperacion: "Login",
    descripcion: "Inicio de sesión correcto.",
  });
  return {
    usuario: encontrado.usuario,
    nombre: encontrado.nombre,
    rol: encontrado.rol,
  };
}

export function limpiarIntentosDePrueba(): void {
  localStorage.removeItem(CONFIG.claveBloqueos);
}
