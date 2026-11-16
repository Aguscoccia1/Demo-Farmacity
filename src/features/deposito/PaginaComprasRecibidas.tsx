import { ListadoImprimible } from "../../components/ListadoImprimible";
import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Eye } from "lucide-react";
import type { CompraCompleta } from "../../domain/types";
import { aplicarStockCompra, listarCompras } from "../../mock/api/compras";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Cargando,
  ConfirmarDialogo,
  EncabezadoPagina,
  Modal,
  Select,
  Tarjeta,
  Vacio,
} from "../../components/ui";
import { tonoEstadoCompra } from "../compras/PaginaCompras";
import { mostrarToast } from "../../stores/toasts";

export function PaginaComprasRecibidas() {
  const sucursalId = useSucursalActiva();
  const [estado, setEstado] = useState("todas");
  const [detalle, setDetalle] = useState<CompraCompleta | null>(null);
  const [aplicarAbierto, setAplicarAbierto] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargar = useCallback(() => listarCompras(sucursalId), [sucursalId]);
  const { datos, cargando, error, recargar } = useConsulta(cargar);

  const filtradas = useMemo(() => {
    if (!datos) return [];
    if (estado === "todas") return datos;
    return datos.filter((compra) => compra.estado.nombre === estado);
  }, [datos, estado]);

  const pendientes = useMemo(
    () =>
      (datos ?? []).filter(
        (compra) =>
          compra.estado.nombre === "Recibida" && !compra.stockAplicado,
      ).length,
    [datos],
  );

  const aplicar = async () => {
    if (!detalle) return;
    setErrorAccion(null);
    setAplicando(true);
    try {
      const resultado = await aplicarStockCompra(detalle.compra.id);
      setAplicarAbierto(false);
      setDetalle(null);
      mostrarToast(resultado.mensaje);
      recargar();
    } catch (motivo) {
      setErrorAccion(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo aplicar el stock de la compra.",
      );
      setAplicarAbierto(false);
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Compras de la sucursal"
        descripcion="Todas las compras de la sucursal activa. Aplicá el stock de las compras recibidas que todavía no lo tienen actualizado."
      />

      {errorAccion && (
        <Alerta tono="error" className="mb-4">
          {errorAccion}
        </Alerta>
      )}

      {pendientes > 0 && (
        <Alerta tono="advertencia" className="mb-4">
          Hay {pendientes} compra(s) recibida(s) con stock pendiente de aplicar.
        </Alerta>
      )}

      <div className="mb-4 flex justify-end">
        <ListadoImprimible titulo="Compras" deshabilitado={cargando || Boolean(error)}
          columnas={["Fecha", "Sucursal", "Droguería", "Productos", "Estado", "Total", "Stock"]}
          filas={filtradas.map((c) => [formatearFechaHora(c.compra.fecha), c.sucursal.nombre, c.drogueria.nombre, c.detalles.map((d) => `${d.producto.nombre}: ${d.cantidad}`).join(", "), c.estado.nombre, formatearMoneda(c.compra.total), c.stockAjustadoPorPedido ? "Stock ya ajustado desde el pedido" : c.stockAplicado ? "Aplicado" : "Pendiente"])} />
      </div>

      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-ink-500">
            Listado de compras de la sucursal en cualquier estado.
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-estado-compra-recibidas" className="text-sm text-ink-500">
              Estado
            </label>
            <Select
              id="filtro-estado-compra-recibidas"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="w-44"
            >
              <option value="todas">Todas</option>
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
        ) : filtradas.length === 0 ? (
          <Vacio
            icono={ClipboardList}
            titulo={
              datos && datos.length === 0
                ? "Todavía no hay compras"
                : "No hay compras para mostrar"
            }
            descripcion={
              datos && datos.length === 0
                ? "Las compras que registre Compras para esta sucursal aparecerán en esta pantalla."
                : "Probá cambiando el estado seleccionado."
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
                  <th>Stock</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((completa) => {
                  const puedeAplicar =
                    completa.estado.nombre === "Recibida" &&
                    !completa.stockAplicado;
                  return (
                    <tr key={completa.compra.id}>
                      <td className="whitespace-nowrap">
                        {formatearFechaHora(completa.compra.fecha)}
                      </td>
                      <td className="font-medium text-ink-900">
                        {completa.drogueria.nombre}
                      </td>
                      <td>
                        {completa.pedido ? (
                          <span className="text-sm text-ink-600">
                            Pedido del {formatearFechaHora(completa.pedido.fecha)}
                          </span>
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
                      <td className="text-right tabular-nums">
                        {formatearMoneda(completa.compra.total)}
                      </td>
                      <td>
                        {completa.estado.nombre !== "Recibida" ? (
                          <span className="text-ink-400">—</span>
                        ) : completa.stockAjustadoPorPedido ? (
                          <Badge tono="azul">
                            Stock ya ajustado desde el pedido
                          </Badge>
                        ) : completa.stockAplicado ? (
                          <Badge tono="verde">Aplicado</Badge>
                        ) : (
                          <Badge tono="amarillo">Pendiente</Badge>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-3 whitespace-nowrap text-sm">
                          <button
                            type="button"
                            onClick={() => setDetalle(completa)}
                            className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                            Ver detalle
                          </button>
                          {puedeAplicar && (
                            <button
                              type="button"
                              onClick={() => {
                                setDetalle(completa);
                                setAplicarAbierto(true);
                              }}
                              className="inline-flex items-center gap-1 font-medium text-ink-700 hover:underline"
                            >
                              <CheckCircle2 className="h-4 w-4" aria-hidden />
                              Aplicar stock
                            </button>
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

      <Modal
        abierto={Boolean(detalle) && !aplicarAbierto}
        titulo="Detalle de la compra"
        descripcion={
          detalle
            ? `${detalle.drogueria.nombre} · ${formatearFechaHora(detalle.compra.fecha)}`
            : undefined
        }
        onCerrar={() => setDetalle(null)}
        ancho="lg"
        pie={
          detalle &&
          detalle.estado.nombre === "Recibida" &&
          !detalle.stockAplicado ? (
            <>
              <Boton variante="secundario" onClick={() => setDetalle(null)}>
                Cerrar
              </Boton>
              <Boton onClick={() => setAplicarAbierto(true)}>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Aplicar stock
              </Boton>
            </>
          ) : (
            <Boton variante="secundario" onClick={() => setDetalle(null)}>
              Cerrar
            </Boton>
          )
        }
      >
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-ink-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Estado
                </p>
                <div className="mt-1">
                  <Badge tono={tonoEstadoCompra(detalle.estado.nombre)}>
                    {detalle.estado.nombre}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Stock
                </p>
                <div className="mt-1">
                  {detalle.estado.nombre !== "Recibida" ? (
                    <span className="text-ink-400">—</span>
                  ) : detalle.stockAjustadoPorPedido ? (
                    <Badge tono="azul">Stock ya ajustado desde el pedido</Badge>
                  ) : detalle.stockAplicado ? (
                    <Badge tono="verde">Aplicado</Badge>
                  ) : (
                    <Badge tono="amarillo">Pendiente de aplicar</Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Pedido de origen
                </p>
                <p className="mt-0.5 text-ink-800">
                  {detalle.pedido
                    ? `Pedido del ${formatearFechaHora(detalle.pedido.fecha)}`
                    : "Sin pedido"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Total
                </p>
                <p className="mt-0.5 font-semibold tabular-nums text-ink-900">
                  {formatearMoneda(detalle.compra.total)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-ink-200">
              <table className="tabla-base">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Cantidad</th>
                    <th className="text-right">Precio unitario</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.detalles.map((linea) => (
                    <tr key={linea.id}>
                      <td>
                        <span className="font-medium text-ink-900">
                          {linea.producto.nombre}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {linea.producto.marca}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{linea.cantidad}</td>
                      <td className="text-right tabular-nums">
                        {formatearMoneda(linea.precioUnitario)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatearMoneda(linea.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmarDialogo
        abierto={aplicarAbierto}
        titulo="Aplicar stock de la compra"
        descripcion="Se sumarán al inventario de la sucursal las cantidades de todos los productos de esta compra. Esta acción se registra una sola vez."
        textoConfirmar="Aplicar stock"
        cargando={aplicando}
        onConfirmar={aplicar}
        onCerrar={() => setAplicarAbierto(false)}
      >
        {detalle && (
          <p className="text-sm text-ink-600">
            {detalle.drogueria.nombre} ·{" "}
            {formatearFechaHora(detalle.compra.fecha)} ·{" "}
            {detalle.detalles.length} producto(s)
          </p>
        )}
      </ConfirmarDialogo>
    </div>
  );
}
