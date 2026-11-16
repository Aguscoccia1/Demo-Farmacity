import { create } from "zustand";
import { persist } from "zustand/middleware";
import { establecerActor, limpiarActor } from "../lib/sessionActor";
import { registrarEventoAuditoria } from "../mock/api/auditoria";
import { autenticar, type UsuarioSesion } from "./servicio";

interface EstadoSesion {
  usuario: UsuarioSesion | null;
  iniciarSesion: (usuario: string, contrasena: string) => Promise<void>;
  cerrarSesion: (motivo?: "manual" | "inactividad") => Promise<void>;
  restaurarActor: () => void;
}

export const useAuthStore = create<EstadoSesion>()(
  persist(
    (set, get) => ({
      usuario: null,
      iniciarSesion: async (usuario, contrasena) => {
        const sesion = await autenticar(usuario, contrasena);
        establecerActor(sesion.nombre, sesion.rol);
        set({ usuario: sesion });
      },
      cerrarSesion: async (motivo = "manual") => {
        const sesion = get().usuario;
        if (sesion) {
          try {
            await registrarEventoAuditoria({
              usuario: sesion.nombre,
              rol: sesion.rol,
              tipoOperacion: "Cierre de sesión",
              descripcion:
                motivo === "inactividad"
                  ? "Cierre de sesión automático por inactividad."
                  : "Cierre de sesión.",
            });
          } catch {
            // El cierre de sesión local debe completarse aunque falle el registro.
          }
        }
        limpiarActor();
        set({ usuario: null });
      },
      restaurarActor: () => {
        const sesion = get().usuario;
        if (sesion) establecerActor(sesion.nombre, sesion.rol);
      },
    }),
    {
      name: "farmacity-sesion:v1",
      version: 1,
      // Las sesiones anteriores al cambio de nombre del rol deben volver a ingresar.
      migrate: () => ({ usuario: null }),
      partialize: (estado) => ({ usuario: estado.usuario }),
      onRehydrateStorage: () => (estado) => {
        if (estado?.usuario) {
          establecerActor(estado.usuario.nombre, estado.usuario.rol);
        } else limpiarActor();
      },
    },
  ),
);
