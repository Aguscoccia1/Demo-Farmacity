import { exigirRol } from "./comun";
import type { Cliente, Turno, VentaCompleta } from "../../domain/types";
import {
  clienteSchema,
  turnoSchema,
  validarConEsquema,
  type ClienteForm,
  type TurnoForm,
} from "../../domain/validation";
import {
  ApiError,
  auditar,
  buscarCliente,
  enriquecerVenta,
  generarId,
  ordenarPorFechaDesc,
} from "./comun";
import { leerBaseDatos, transaccion } from "./db";

export interface TurnoConCliente {
  turno: Turno;
  cliente: Cliente;
}

export interface FichaCliente {
  cliente: Cliente;
  ventas: VentaCompleta[];
  turnos: Turno[];
}

function ordenarTurnos(turnos: Turno[]): Turno[] {
  return [...turnos].sort((a, b) =>
    `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`),
  );
}

export async function listarClientes(): Promise<Cliente[]> {
  const db = await leerBaseDatos();
  return [...db.clientes].sort((a, b) =>
    `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"),
  );
}

export async function obtenerCliente(id: string): Promise<Cliente> {
  const db = await leerBaseDatos();
  return buscarCliente(db, id);
}

export async function obtenerFichaCliente(id: string): Promise<FichaCliente> {
  const db = await leerBaseDatos();
  const cliente = buscarCliente(db, id);
  const ventas = ordenarPorFechaDesc(
    db.ventas.filter((venta) => venta.clienteId === id),
  ).map((venta) => enriquecerVenta(db, venta.id));
  return {
    cliente,
    ventas,
    turnos: ordenarTurnos(db.turnos.filter((turno) => turno.clienteId === id)),
  };
}

export async function crearCliente(datos: ClienteForm): Promise<Cliente> {
  exigirRol("Encargado de Ventas");
  let limpios: ClienteForm;
  try {
    limpios = validarConEsquema(clienteSchema, datos);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Datos inválidos.");
  }
  return transaccion((db) => {
    exigirRol("Encargado de Ventas");
    if (db.clientes.some((cliente) => cliente.dni === limpios.dni)) {
      throw new ApiError("Ya existe un cliente con ese DNI.", "DNI_DUPLICADO");
    }
    const cliente: Cliente = {
      id: generarId("cliente"),
      ...limpios,
    };
    db.clientes.push(cliente);
    auditar(db, {
      tipoOperacion: "Alta",
      descripcion: `Cliente dado de alta: ${cliente.apellido}, ${cliente.nombre} (DNI ${cliente.dni}).`,
      referenciaId: cliente.id,
    });
    return cliente;
  });
}

export async function actualizarCliente(
  id: string,
  datos: ClienteForm,
): Promise<Cliente> {
  exigirRol("Encargado de Ventas");
  let limpios: ClienteForm;
  try {
    limpios = validarConEsquema(clienteSchema, datos);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Datos inválidos.");
  }
  return transaccion((db) => {
    exigirRol("Encargado de Ventas");
    const cliente = buscarCliente(db, id);
    if (
      db.clientes.some(
        (candidato) => candidato.dni === limpios.dni && candidato.id !== id,
      )
    ) {
      throw new ApiError("Ya existe un cliente con ese DNI.", "DNI_DUPLICADO");
    }
    Object.assign(cliente, limpios);
    auditar(db, {
      tipoOperacion: "Modificación",
      descripcion: `Cliente modificado: ${cliente.apellido}, ${cliente.nombre} (DNI ${cliente.dni}).`,
      referenciaId: cliente.id,
    });
    return cliente;
  });
}

export async function listarTurnos(): Promise<TurnoConCliente[]> {
  const db = await leerBaseDatos();
  return ordenarTurnos(db.turnos).map((turno) => ({
    turno,
    cliente: buscarCliente(db, turno.clienteId),
  }));
}

export async function crearTurno(datos: TurnoForm): Promise<Turno> {
  exigirRol("Encargado de Ventas");
  let limpios: TurnoForm;
  try {
    limpios = validarConEsquema(turnoSchema, datos);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Datos inválidos.");
  }
  return transaccion((db) => {
    exigirRol("Encargado de Ventas");
    buscarCliente(db, limpios.clienteId);
    const duplicado = db.turnos.some(
      (turno) =>
        turno.clienteId === limpios.clienteId &&
        turno.fecha === limpios.fecha &&
        turno.hora === limpios.hora,
    );
    if (duplicado) {
      throw new ApiError(
        "El cliente ya tiene un turno en esa fecha y hora.",
        "TURNO_DUPLICADO",
      );
    }
    const turno: Turno = {
      id: generarId("turno"),
      ...limpios,
    };
    db.turnos.push(turno);
    const cliente = buscarCliente(db, turno.clienteId);
    auditar(db, {
      tipoOperacion: "Alta",
      descripcion: `Turno registrado para ${cliente.apellido}, ${cliente.nombre}: ${turno.fecha} a las ${turno.hora}.`,
      referenciaId: turno.id,
    });
    return turno;
  });
}
