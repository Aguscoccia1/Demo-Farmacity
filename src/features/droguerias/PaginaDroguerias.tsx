import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Pencil, Plus } from "lucide-react";
import { listarDroguerias } from "../../mock/api/droguerias";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Buscador,
  Cargando,
  EncabezadoPagina,
  Tarjeta,
  Vacio,
} from "../../components/ui";

export function PaginaDroguerias() {
  const [busqueda, setBusqueda] = useState("");
  const cargar = useCallback(() => listarDroguerias(), []);
  const { datos, cargando, error } = useConsulta(cargar);

  const filtradas = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return datos;
    return datos.filter((drogueria) =>
      `${drogueria.nombre} ${drogueria.cuit} ${drogueria.email} ${drogueria.direccion}`
        .toLowerCase()
        .includes(texto),
    );
  }, [datos, busqueda]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Droguerías"
        descripcion="Droguerías registradas para las compras y pedidos de la farmacia."
        acciones={
          <Link
            to="/droguerias/nueva"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva droguería
          </Link>
        }
      />

      <Tarjeta>
        <div className="border-b border-ink-200 p-4">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por nombre, CUIT o correo"
            etiqueta="Buscar droguerías"
            className="w-full sm:max-w-sm"
          />
        </div>

        {cargando ? (
          <Cargando texto="Cargando droguerías…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtradas.length === 0 ? (
          <Vacio
            icono={Building2}
            titulo={busqueda ? "No hay resultados" : "Todavía no hay droguerías"}
            descripcion={
              busqueda
                ? "Probá con otro nombre, CUIT o correo."
                : "Registrá la primera droguería para comenzar."
            }
            accion={
              !busqueda ? (
                <Link
                  to="/droguerias/nueva"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nueva droguería
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>CUIT</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Correo electrónico</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((drogueria) => (
                  <tr key={drogueria.id}>
                    <td className="font-medium text-ink-900">
                      {drogueria.nombre}
                    </td>
                    <td className="tabular-nums">{drogueria.cuit}</td>
                    <td>{drogueria.telefono}</td>
                    <td>{drogueria.direccion}</td>
                    <td>{drogueria.email}</td>
                    <td className="text-right">
                      <Link
                        to={`/droguerias/${drogueria.id}/editar`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        Modificar
                      </Link>
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
