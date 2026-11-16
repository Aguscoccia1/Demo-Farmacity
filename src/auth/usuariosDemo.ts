import type { Rol } from "../domain/types";

export interface UsuarioDemo {
  usuario: string;
  contrasena: string;
  nombre: string;
  rol: Rol;
}

export const USUARIOS_DEMO: UsuarioDemo[] = [
  {
    usuario: "venta",
    contrasena: "venta123",
    nombre: "Lucía Fernández",
    rol: "Encargado de Ventas",
  },
  {
    usuario: "caja",
    contrasena: "caja123",
    nombre: "Martín Aguirre",
    rol: "Encargado de Caja",
  },
  {
    usuario: "deposito",
    contrasena: "deposito123",
    nombre: "Sofía Ríos",
    rol: "Encargado de Depósito",
  },
  {
    usuario: "compras",
    contrasena: "compras123",
    nombre: "Julián Pereyra",
    rol: "Encargado de Compras",
  },
  {
    usuario: "admin",
    contrasena: "admin123",
    nombre: "Valeria Gómez",
    rol: "Administrador",
  },
];
