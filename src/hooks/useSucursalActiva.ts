import { useSucursalStore } from "../stores/sucursal";

export function useSucursalActiva(): string {
  const sucursalId = useSucursalStore((estado) => estado.sucursalId);
  if (!sucursalId) {
    throw new Error("No hay una sucursal activa.");
  }
  return sucursalId;
}
