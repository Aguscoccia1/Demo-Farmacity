import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Plus, ShoppingCart } from "lucide-react";
import { listarCompras } from "../../mock/api/compras";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
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
  type TonoBadge,
} from "../../components/ui";

export function tonoEstadoCompra(nombre: string): TonoBadge {
  if (nombre === "Recibida") return "verde";
  if (nombre === "Anulada") return "rojo";
  return "amarillo";
}

export function PaginaCompras() {
  const sucursalId = useSucursalActiva();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const cargar = useCallback(() => listarCompras(sucursalId), [sucursalId]);
  const { datos, cargando, error } = useConsulta(cargar);

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    return datos.filter((completa) => {
      const coincideTexto =
        !texto ||
        `${completa.drogueria.nombre} ${completa.drogueria.cuit} ${completa.detalles
          .map((detalle) => detalle.producto.nombre)
          .join(" ")}`
          .toLowerCase()
          .includes(texto);
      if (!coincideTexto) return false;
      if (estado === "todos") return true;
      return completa.estado.nombre === estado;
    });
  }, [datos, busqueda, estado]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Compras"
        descripcion="Compras registradas para la sucursal activa, con su estado y recepción."
        acciones={
          <Link
            to="/compras/nueva"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva compra
          </Link>
        }
      />

      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 md:flex-row md:items-center md:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por droguería o producto"
            etiqueta="Buscar compras"
            className="w-full md:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-estado-compra" className="text-sm text-ink-500">
              Estado
            </label>
            <Select
              id="filtro-estado-compra"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="w-44"
            >
              <option value="todos">Todos</option>
              <option value="Registrada">Registradas</option>
              <option value="Recibida">Recibidas</option>
              <option value="Anulada">Anuladas</option>
            </Select>
          </div>
        </div>

        {cargando ? (
          <Cargando texto="Cargando compras…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={ShoppingCart}
            titulo={
              datos && datos.length === 0
                ? "Todavía no hay compras"
                : "No hay resultados"
            }
            descripcion={
              datos && datos.length === 0
                ? "Registrá la primera compra a la droguería para comenzar."
                : "Probá con otra búsqueda o cambiá el estado seleccionado."
            }
            accion={
              datos && datos.length === 0 ? (
                <Link
                  to="/compras/nueva"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nueva compra
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Droguería</th>
                  <th>Origen</th>
                  <th>Productos</th>
                  <th>Estado</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((completa) => (
                  <tr key={completa.compra.id}>
                    <td className="whitespace-nowrap">
                      {formatearFechaHora(completa.compra.fecha)}
                    </td>
                    <td className="font-medium text-ink-900">
                      {completa.drogueria.nombre}
                    </td>
                    <td>
                      {completa.pedido ? (
                        <Badge tono="azul">
                          Pedido del {formatearFechaHora(completa.pedido.fecha)}
                        </Badge>
                      ) : (
                        <span className="text-ink-400">Sin pedido</span>
                      )}
                    </td>
                    <td>
                      <span className="tabular-nums">{completa.detalles.length}</span>
                      <span className="block max-w-xs truncate text-xs text-ink-500">
                        {completa.detalles
                          .map((detalle) => detalle.producto.nombre)
                          .join(", ")}
                      </span>
                    </td>
                    <td>
                      <Badge tono={tonoEstadoCompra(completa.estado.nombre)}>
                        {completa.estado.nombre}
                      </Badge>
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatearMoneda(completa.compra.total)}
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-3 whitespace-nowrap text-sm">
                        <Link
                          to={`/compras/${completa.compra.id}`}
                          className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          Ver detalle
                        </Link>
                        {completa.estado.nombre === "Registrada" && (
                          <Link
                            to={`/compras/${completa.compra.id}/editar`}
                            className="inline-flex items-center gap-1 font-medium text-ink-600 hover:underline"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                            Modificar
                          </Link>
                        )}
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
