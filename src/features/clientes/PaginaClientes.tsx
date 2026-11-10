import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Printer, UserPlus, Users } from "lucide-react";
import { listarClientes } from "../../mock/api/clientes";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Boton,
  Buscador,
  Cargando,
  EncabezadoPagina,
  Tarjeta,
  Vacio,
} from "../../components/ui";

export function PaginaClientes() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const cargar = useCallback(() => listarClientes(), []);
  const { datos, cargando, error, recargar } = useConsulta(cargar);

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return datos;
    return datos.filter((cliente) =>
      `${cliente.nombre} ${cliente.apellido} ${cliente.dni}`
        .toLowerCase()
        .includes(texto),
    );
  }, [datos, busqueda]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Clientes"
        descripcion="Consultá la ficha de cada cliente, sus ventas y turnos."
        acciones={
          <>
            <Link
              to="/clientes/lista-imprimible"
              className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-medium text-ink-700 shadow-sm transition hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Listado imprimible
            </Link>
            <Boton onClick={() => navigate("/clientes/nuevo")}>
              <UserPlus className="h-4 w-4" aria-hidden />
              Nuevo cliente
            </Boton>
          </>
        }
      />

      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por nombre, apellido o DNI"
            etiqueta="Buscar clientes"
            className="w-full sm:max-w-sm"
          />
          <p className="text-xs text-ink-500" aria-live="polite">
            {cargando ? "Cargando…" : `${filtrados.length} cliente(s)`}
          </p>
        </div>

        {cargando ? (
          <Cargando texto="Cargando clientes…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">
              {error}{" "}
              <button type="button" className="underline" onClick={recargar}>
                Reintentar
              </button>
            </Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={Users}
            titulo={busqueda ? "No encontramos clientes" : "Todavía no hay clientes"}
            descripcion={
              busqueda
                ? "Probá con otro nombre, apellido o DNI."
                : "Registrá el primer cliente para comenzar."
            }
            accion={
              !busqueda ? (
                <Boton onClick={() => navigate("/clientes/nuevo")}>
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Nuevo cliente
                </Boton>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                  <th>Correo electrónico</th>
                  <th>Dirección</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>
                      <Link
                        to={`/clientes/${cliente.id}`}
                        className="font-medium text-ink-900 hover:text-brand-700 hover:underline"
                      >
                        {cliente.apellido}, {cliente.nombre}
                      </Link>
                    </td>
                    <td className="tabular-nums">{cliente.dni}</td>
                    <td>{cliente.telefono}</td>
                    <td className="max-w-56 truncate" title={cliente.email}>
                      {cliente.email}
                    </td>
                    <td className="max-w-60">{cliente.direccion}</td>
                    <td>
                      <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                        <Link
                          to={`/clientes/${cliente.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          Ver ficha
                        </Link>
                        <Link
                          to={`/clientes/${cliente.id}/editar`}
                          className="font-medium text-ink-600 hover:underline"
                        >
                          Modificar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
