import { create } from "zustand";

export type TipoToast = "exito" | "error" | "info";

export interface Toast {
  id: number;
  mensaje: string;
  tipo: TipoToast;
}

interface EstadoToasts {
  toasts: Toast[];
  agregar: (mensaje: string, tipo?: TipoToast) => void;
  quitar: (id: number) => void;
}

let contador = 0;

export const useToastStore = create<EstadoToasts>((set) => ({
  toasts: [],
  agregar: (mensaje, tipo = "exito") => {
    const id = ++contador;
    set((estado) => ({
      toasts: [...estado.toasts, { id, mensaje, tipo }],
    }));
    window.setTimeout(() => {
      set((estado) => ({
        toasts: estado.toasts.filter((toast) => toast.id !== id),
      }));
    }, 5000);
  },
  quitar: (id) =>
    set((estado) => ({
      toasts: estado.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function mostrarToast(mensaje: string, tipo: TipoToast = "exito"): void {
  useToastStore.getState().agregar(mensaje, tipo);
}
