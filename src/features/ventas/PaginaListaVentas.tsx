import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Plus, ReceiptText, ShoppingBag } from "lucide-react";
import type { VentaCompleta } from "../../domain/types";
import { listarVentas } from "../../mock/api/ventas";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Buscador,
  Cargando,
  EncabezadoPagina,
  Select,
  Tarjeta,
  Vacio,
} from "../../components/ui";
import { DetalleVentaModal, tonoEstadoVenta } from "./componentes";

export function PaginaListaVentas({
  tipoVenta,
}: {
  tipoVenta: "Con receta" | "Venta libre";
}) {
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [detalle, setDetalle] = useState<VentaCompleta | null>(null);
  const cargar = useCallback(
    () => listarVentas(sucursalId, tipoVenta),
    [sucursalId, tipoVenta],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  const esReceta = tipoVenta === "Con receta";
  const rutaBase = esReceta ? "/ventas/receta" : "/ventas-libres";

  const filtradas = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    return datos.filter(({ venta, cliente }) => {
      const coincideTexto =
        !texto ||
        `${cliente.nombre} ${cliente.apellido} ${cliente.dni}`
          .toLowerCase()
          .includes(texto);
      if (!coincideTexto) return false;
      if (estado === "todos") return true;
      return venta.estadoId === estado;
    });
  }, [datos, busqueda, estado]);

  return (
    <div>
      <EncabezadoPagina
        titulo={esReceta ? "Ventas con receta" : "Ventas libres"}
        descripcion={
          esReceta
            ? "Consultá y administrá las ventas con receta de la sucursal activa."
            : "Consultá y administrá las ventas de productos de venta libre."
        }
        acciones={
          <>
            {!esReceta && (
              <Boton
                variante="secundario"
                onClick={() => navigate("/ventas-libres/catalogo")}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden />
                Catálogo
              </Boton>
            )}
            <Boton onClick={() => navigate(`${rutaBase}/nueva`)}>
              <Plus className="h-4 w-4" aria-hidden />
              {esReceta ? "Nueva venta con receta" : "Nueva venta libre"}
            </Boton>
          </>
        }
      />

      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 md:flex-row md:items-center md:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por cliente o DNI"
            etiqueta="Buscar ventas"
            className="w-full md:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="filtro-estado-venta" className="text-sm text-ink-500">
              Estado
            </label>
            <Select
              id="filtro-estado-venta"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="w-44"
            >
              <option value="todos">Todos</option>
              <option value="estado-venta-registrada">Registradas</option>
              <option value="estado-venta-cobrada">Cobradas</option>
              <option value="estado-venta-anulada">Anuladas</option>
            </Select>
          </div>
        </div>

        {cargando ? (
          <Cargando texto="Cargando ventas…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtradas.length === 0 ? (
          <Vacio
            icono={esReceta ? ReceiptText : ShoppingBag}
            titulo={busqueda || estado !== "todos" ? "No hay resultados" : "Todavía no hay ventas"}
            descripcion={
              busqueda || estado !== "todos"
                ? "Probá con otro cliente o cambiá el estado seleccionado."
                : "Registrá la primera venta para comenzar."
            }
            accion={
              !busqueda && estado === "todos" ? (
                <Boton onClick={() => navigate(`${rutaBase}/nueva`)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {esReceta ? "Nueva venta con receta" : "Nueva venta libre"}
                </Boton>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  {esReceta && <th>Obra social</th>}
                  <th>Estado</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Monto cubierto</th>
                  <th className="text-right">Importe a cobrar</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((completa) => {
                  const { venta, cliente, estado: estadoVenta, obraSocial } = completa;
                  return (
                    <tr key={venta.id}>
                      <td className="whitespace-nowrap">
                        {formatearFechaHora(venta.fecha)}
                      </td>
                      <td>
                        <span className="font-medium text-ink-900">
                          {cliente.apellido}, {cliente.nombre}
                        </span>
                        <span className="block text-xs text-ink-500">DNI {cliente.dni}</span>
                      </td>
                      {esReceta && (
                        <td>
                          {obraSocial ? (
                            <span>
                              {obraSocial.sigla}{" "}
                              <span className="text-xs text-ink-500">
                                ({obraSocial.porcentajeCobertura}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-ink-400">Sin obra social</span>
                          )}
                        </td>
                      )}
                      <td>
                        <Badge tono={tonoEstadoVenta(estadoVenta.nombre)}>
                          {estadoVenta.nombre}
                        </Badge>
                      </td>
                      <td className="text-right font-medium tabular-nums">
                        {formatearMoneda(venta.total)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatearMoneda(venta.montoCubierto)}
                      </td>
                      <td className="text-right font-medium tabular-nums">
                        {formatearMoneda(
                          Math.max(0, venta.total - venta.montoCubierto),
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                          <button
                            type="button"
                            onClick={() => setDetalle(completa)}
                            className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                            Ver detalle
                          </button>
                          {estadoVenta.nombre === "Registrada" && (
                            <Link
                              to={`${rutaBase}/${venta.id}/editar`}
                              className="font-medium text-ink-600 hover:underline"
                            >
                              Modificar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <DetalleVentaModal
        venta={detalle}
        abierto={Boolean(detalle)}
        onCerrar={() => setDetalle(null)}
      />
    </div>
  );
}
