import type { Rol } from "../domain/types";

let actor: { usuario: string; rol: Rol | "Sistema" } = {
  usuario: "Sistema",
  rol: "Sistema",
};

export function establecerActor(usuario: string, rol: Rol): void {
  actor = { usuario, rol };
}

export function limpiarActor(): void {
  actor = { usuario: "Sistema", rol: "Sistema" };
}

export function obtenerActor(): { usuario: string; rol: Rol | "Sistema" } {
  return actor;
}
