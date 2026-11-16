import { ListadoImprimible } from "../../components/ListadoImprimible";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, FileText, Pencil, Plus, Truck } from "lucide-react";
import { listarPedidos } from "../../mock/api/pedidos";
import { formatearFechaHora } from "../../lib/format";
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

export function tonoEstadoPedido(nombre: string): TonoBadge {
  if (nombre === "Enviado") return "azul";
  if (nombre === "Cancelado") return "rojo";
  return "amarillo";
}

export function PaginaPedidos() {
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const cargar = useCallback(() => listarPedidos(sucursalId), [sucursalId]);
  const { datos, cargando, error } = useConsulta(cargar);

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    return datos.filter((completo) => {
      const coincideTexto =
        !texto ||
        `${completo.drogueria.nombre} ${completo.detalles
          .map((detalle) => detalle.producto.nombre)
          .join(" ")}`
          .toLowerCase()
          .includes(texto);
      if (!coincideTexto) return false;
      if (estado === "todos") return true;
      return completo.estado.nombre === estado;
    });
  }, [datos, busqueda, estado]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Pedidos a droguería"
        descripcion="Pedidos registrados para la sucursal activa, con su estado y orden de pedido."
        acciones={
          <Link
            to="/pedidos/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo pedido
          </Link>
        }
      />

      <div className="mb-4 flex justify-end">
        <ListadoImprimible titulo="Pedidos a droguería" deshabilitado={cargando || Boolean(error)}
          columnas={["Fecha", "Sucursal", "Droguería", "Productos", "Estado", "Orden"]}
          filas={filtrados.map((p) => [formatearFechaHora(p.pedido.fecha), p.sucursal.nombre, p.drogueria.nombre, p.detalles.map((d) => `${d.producto.nombre}: ${d.cantidad}`).join(", "), p.estado.nombre, p.ordenGenerada ? "Generada" : "Pendiente"])} />
      </div>

      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 md:flex-row md:items-center md:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por droguería o producto"
            etiqueta="Buscar pedidos"
            className="w-full md:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-estado-pedido" className="text-sm text-ink-500">
              Estado
            </label>
            <Select
              id="filtro-estado-pedido"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="w-44"
            >
              <option value="todos">Todos</option>
              <option value="Registrado">Registrados</option>
              <option value="Enviado">Enviados</option>
              <option value="Cancelado">Cancelados</option>
            </Select>
          </div>
        </div>

        {cargando ? (
          <Cargando texto="Cargando pedidos…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={Truck}
            titulo={
              datos && datos.length === 0
                ? "Todavía no hay pedidos"
                : "No hay resultados"
            }
            descripcion={
              datos && datos.length === 0
                ? "Registrá el primer pedido a la droguería para comenzar."
                : "Probá con otra búsqueda o cambiá el estado seleccionado."
            }
            accion={
              datos && datos.length === 0 ? (
                <Link
                  to="/pedidos/nuevo"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nuevo pedido
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
                  <th>Productos</th>
                  <th>Estado</th>
                  <th>Orden de pedido</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((completo) => (
                  <tr key={completo.pedido.id}>
                    <td className="whitespace-nowrap">
                      {formatearFechaHora(completo.pedido.fecha)}
                    </td>
                    <td className="font-medium text-ink-900">
                      {completo.drogueria.nombre}
                    </td>
                    <td>
                      <span className="tabular-nums">{completo.detalles.length}</span>
                      <span className="block max-w-xs truncate text-xs text-ink-500">
                        {completo.detalles
                          .map((detalle) => detalle.producto.nombre)
                          .join(", ")}
                      </span>
                    </td>
                    <td>
                      <Badge tono={tonoEstadoPedido(completo.estado.nombre)}>
                        {completo.estado.nombre}
                      </Badge>
                    </td>
                    <td>
                      {completo.ordenGenerada ? (
                        <Badge tono="verde">Generada</Badge>
                      ) : (
                        <Badge tono="gris">Pendiente</Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-3 whitespace-nowrap text-sm">
                        <Link
                          to={`/pedidos/${completo.pedido.id}`}
                          className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          Ver detalle
                        </Link>
                        {completo.estado.nombre === "Registrado" && (
                          <Link
                            to={`/pedidos/${completo.pedido.id}/editar`}
                            className="inline-flex items-center gap-1 font-medium text-ink-600 hover:underline"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                            Modificar
                          </Link>
                        )}
                        {completo.ordenGenerada && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/pedidos/${completo.pedido.id}/orden`)
                            }
                            className="inline-flex items-center gap-1 font-medium text-ink-600 hover:underline"
                          >
                            <FileText className="h-4 w-4" aria-hidden />
                            Orden
                          </button>
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
