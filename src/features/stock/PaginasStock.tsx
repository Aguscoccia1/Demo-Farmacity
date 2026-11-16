import { useCallback, useMemo, useState } from "react";
import { Boxes, PackageSearch } from "lucide-react";
import { listarInventario } from "../../mock/api/inventario";
import { formatearFecha } from "../../lib/format";
import { medicamentoVencido } from "../../domain/fechas";
import type { InventarioConProducto } from "../../mock/api/comun";
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

export function estadoStock(fila: InventarioConProducto): {
  etiqueta: string;
  tono: "verde" | "amarillo" | "rojo";
} {
  if (fila.producto.tipoProducto === "Medicamento" && medicamentoVencido(fila.producto)) return { etiqueta: "Vencido", tono: "rojo" };
  if (fila.stockActual === 0) return { etiqueta: "Sin stock", tono: "rojo" };
  if (fila.stockActual < fila.stockMinimo) {
    return { etiqueta: "Bajo mínimo", tono: "amarillo" };
  }
  return { etiqueta: "Disponible", tono: "verde" };
}

export function PaginaConsultaStock() {
  const sucursalId = useSucursalActiva();
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
      if (estado === "disponible") return fila.stockActual > 0;
      if (estado === "sin-stock") return fila.stockActual === 0;
      return true;
    });
  }, [datos, busqueda, estado]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Consulta de stock"
        descripcion="Stock actual de cada producto en la sucursal activa, comparado con el mínimo y el máximo."
      />
      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar producto o marca"
            etiqueta="Buscar en el stock"
            className="w-full sm:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-stock" className="text-sm text-ink-500">
              Estado
            </label>
            <Select
              id="filtro-stock"
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
          <Cargando texto="Consultando stock…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={PackageSearch}
            titulo="No hay resultados"
            descripcion="Probá con otro producto o cambiá el filtro de estado."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Laboratorio</th>
                  <th>Vencimiento</th>
                  <th className="text-right">Stock actual</th>
                  <th className="text-right">Mínimo</th>
                  <th className="text-right">Máximo</th>
                  <th>Estado</th>
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
                          {fila.producto.tipoProducto}
                        </span>
                      </td>
                      <td>{fila.producto.marca}</td>
                      <td>{fila.producto.tipoProducto === "Medicamento" ? fila.producto.laboratorio : "—"}</td>
                      <td>{fila.producto.tipoProducto === "Medicamento" ? formatearFecha(fila.producto.fechaVencimiento) : "—"}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {fila.stockActual}
                      </td>
                      <td className="text-right tabular-nums">{fila.stockMinimo}</td>
                      <td className="text-right tabular-nums">{fila.stockMaximo}</td>
                      <td>
                        <Badge tono={situacion.tono}>{situacion.etiqueta}</Badge>
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

export function PaginaDisponibilidad() {
  const sucursalId = useSucursalActiva();
  const [busqueda, setBusqueda] = useState("");
  const cargar = useCallback(
    () => listarInventario(sucursalId),
    [sucursalId],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return datos;
    return datos.filter((fila) =>
      `${fila.producto.nombre} ${fila.producto.marca}`
        .toLowerCase()
        .includes(texto),
    );
  }, [datos, busqueda]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Disponibilidad de productos"
        descripcion="Verificá si un producto está disponible en la sucursal activa antes de ofrecerlo."
      />
      <Tarjeta>
        <div className="border-b border-ink-200 p-4">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por producto o marca"
            etiqueta="Buscar disponibilidad"
            className="w-full sm:max-w-md"
          />
        </div>
        {cargando ? (
          <Cargando texto="Consultando disponibilidad…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={Boxes}
            titulo="No encontramos ese producto"
            descripcion="Revisá el nombre o la marca ingresada."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((fila) => {
              const disponible = fila.stockActual > 0;
              return (
                <div
                  key={fila.id}
                  className="rounded-lg border border-ink-200 p-4 transition hover:border-ink-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900" title={fila.producto.nombre}>
                        {fila.producto.nombre}
                      </p>
                      <p className="text-xs text-ink-500">
                        {fila.producto.marca} · {fila.producto.tipoProducto}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tono={disponible ? "verde" : "rojo"}>
                        {disponible ? "Disponible" : "Sin stock"}
                      </Badge>
                      {fila.producto.tipoProducto === "Medicamento" &&
                        fila.producto.requiereReceta && (
                          <Badge tono="azul">Requiere receta</Badge>
                        )}
                      {fila.producto.tipoProducto === "Medicamento" &&
                        !fila.producto.requiereReceta && (
                          <Badge tono="gris">Sin receta</Badge>
                        )}
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-xs">
                    <div>
                      <dt className="text-ink-400">Actual</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-ink-800">
                        {fila.stockActual}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-400">Mínimo</dt>
                      <dd className="mt-0.5 tabular-nums text-ink-700">
                        {fila.stockMinimo}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-400">Máximo</dt>
                      <dd className="mt-0.5 tabular-nums text-ink-700">
                        {fila.stockMaximo}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
