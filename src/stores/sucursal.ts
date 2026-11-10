import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EstadoSucursal {
  sucursalId: string | null;
  seleccionarSucursal: (sucursalId: string) => void;
  inicializarSucursal: (idsDisponibles: string[]) => void;
}

export const useSucursalStore = create<EstadoSucursal>()(
  persist(
    (set, get) => ({
      sucursalId: null,
      seleccionarSucursal: (sucursalId) => set({ sucursalId }),
      inicializarSucursal: (idsDisponibles) => {
        const actual = get().sucursalId;
        if (!actual || !idsDisponibles.includes(actual)) {
          set({ sucursalId: idsDisponibles[0] ?? null });
        }
      },
    }),
    { name: "farmacity-sucursal:v1" },
  ),
);
