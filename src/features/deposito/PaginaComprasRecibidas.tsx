import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Eye } from "lucide-react";
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
  Tarjeta,
  Vacio,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";

export function PaginaComprasRecibidas() {
  const sucursalId = useSucursalActiva();
  const [detalle, setDetalle] = useState<CompraCompleta | null>(null);
  const [aplicarAbierto, setAplicarAbierto] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargar = useCallback(() => listarCompras(sucursalId), [sucursalId]);
  const { datos, cargando, error, recargar } = useConsulta(cargar);

  const recibidas = useMemo(
    () => (datos ?? []).filter((compra) => compra.estado.nombre === "Recibida"),
    [datos],
  );

  const pendientes = recibidas.filter((compra) => !compra.stockAplicado).length;

  const aplicar = async () => {
    if (!detalle) return;
    setErrorAccion(null);
    setAplicando(true);
    try {
      await aplicarStockCompra(detalle.compra.id);
      setAplicarAbierto(false);
      setDetalle(null);
      mostrarToast("Stock de la compra aplicado.");
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
        titulo="Compras recibidas"
        descripcion="Compras con recepción registrada. Aplicá el stock de las compras que todavía no lo tienen actualizado."
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

      <Tarjeta>
        {cargando ? (
          <Cargando texto="Cargando compras recibidas…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : recibidas.length === 0 ? (
          <Vacio
            icono={ClipboardCheck}
            titulo="No hay compras recibidas"
            descripcion="Las compras con recepción registrada aparecerán en esta pantalla para aplicar su stock."
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
                  <th className="text-right">Total</th>
                  <th>Stock</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recibidas.map((completa) => (
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
                    <td className="text-right tabular-nums">
                      {formatearMoneda(completa.compra.total)}
                    </td>
                    <td>
                      {completa.stockAplicado ? (
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
                        {!completa.stockAplicado && (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Modal
        abierto={Boolean(detalle) && !aplicarAbierto}
        titulo="Detalle de compra recibida"
        descripcion={
          detalle
            ? `${detalle.drogueria.nombre} · ${formatearFechaHora(detalle.compra.fecha)}`
            : undefined
        }
        onCerrar={() => setDetalle(null)}
        ancho="lg"
        pie={
          detalle && !detalle.stockAplicado ? (
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
                  <Badge tono="verde">{detalle.estado.nombre}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Stock
                </p>
                <div className="mt-1">
                  {detalle.stockAplicado ? (
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
