import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Boxes, Pencil, Plus } from "lucide-react";
import { listarInventario } from "../../mock/api/inventario";
import { estadoStock } from "../stock/PaginasStock";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Buscador,
  Cargando,
  EncabezadoPagina,
  Select,
  Tarjeta,
  Vacio,
} from "../../components/ui";

export function PaginaInventario() {
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const cargar = useCallback(
    () => listarInventario(sucursalId),
    [sucursalId],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    return datos.filter((fila) => {
      const coincideTexto =
        !texto ||
        `${fila.producto.nombre} ${fila.producto.marca} ${fila.producto.descripcion}`
          .toLowerCase()
          .includes(texto);
      if (!coincideTexto) return false;
      if (estado === "bajo") return fila.stockActual < fila.stockMinimo;
      if (estado === "sin-stock") return fila.stockActual === 0;
      if (estado === "disponible") return fila.stockActual > 0;
      return true;
    });
  }, [datos, busqueda, estado]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Inventario"
        descripcion="Stock actual, mínimo y máximo de los productos de la sucursal activa."
        acciones={
          <Link
            to="/inventario/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo registro de inventario
          </Link>
        }
      />

      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar producto, marca o descripción"
            etiqueta="Buscar inventario"
            className="w-full sm:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-inventario" className="text-sm text-ink-500">
              Estado
            </label>
            <Select
              id="filtro-inventario"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="w-44"
            >
              <option value="todos">Todos</option>
              <option value="disponible">Con stock</option>
              <option value="bajo">Bajo mínimo</option>
              <option value="sin-stock">Sin stock</option>
            </Select>
          </div>
        </div>

        {cargando ? (
          <Cargando texto="Cargando inventario…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={Boxes}
            titulo={
              datos && datos.length === 0
                ? "La sucursal todavía no tiene inventario"
                : "No hay resultados"
            }
            descripcion={
              datos && datos.length === 0
                ? "Registrá el primer producto para comenzar a controlar el stock."
                : "Probá con otro producto o cambiá el filtro de estado."
            }
            accion={
              datos && datos.length === 0 ? (
                <Link
                  to="/inventario/nuevo"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nuevo registro de inventario
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th className="text-right">Stock actual</th>
                  <th className="text-right">Mínimo</th>
                  <th className="text-right">Máximo</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((fila) => {
                  const situacion = estadoStock(fila);
                  return (
                    <tr key={fila.id}>
                      <td>
                        <span className="font-medium text-ink-900">
                          {fila.producto.nombre}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {fila.producto.tipoProducto} · {fila.producto.codigoBarras}
                        </span>
                      </td>
                      <td>{fila.producto.marca}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {fila.stockActual}
                      </td>
                      <td className="text-right tabular-nums">{fila.stockMinimo}</td>
                      <td className="text-right tabular-nums">{fila.stockMaximo}</td>
                      <td>
                        <Badge tono={situacion.tono}>{situacion.etiqueta}</Badge>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/inventario/${fila.id}/editar`)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          Modificar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
