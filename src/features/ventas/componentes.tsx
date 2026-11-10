import { formatearFecha, formatearFechaHora, formatearMoneda } from "../../lib/format";
import type { VentaCompleta } from "../../domain/types";
import { Badge, Modal, type TonoBadge } from "../../components/ui";

export function tonoEstadoVenta(nombre: string): TonoBadge {
  if (nombre === "Cobrada") return "verde";
  if (nombre === "Anulada") return "rojo";
  return "amarillo";
}

export function DetalleVentaModal({
  venta,
  abierto,
  onCerrar,
}: {
  venta: VentaCompleta | null;
  abierto: boolean;
  onCerrar: () => void;
}) {
  if (!venta) return null;
  const importeACobrar = Math.max(0, venta.venta.total - venta.venta.montoCubierto);

  return (
    <Modal
      abierto={abierto}
      titulo="Detalle de la venta"
      descripcion={`${venta.venta.tipoVenta} del ${formatearFechaHora(venta.venta.fecha)}`}
      onCerrar={onCerrar}
      ancho="lg"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 rounded-lg bg-ink-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Cliente</p>
            <p className="mt-0.5 font-medium text-ink-900">
              {venta.cliente.apellido}, {venta.cliente.nombre}
            </p>
            <p className="text-xs text-ink-500">DNI {venta.cliente.dni}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Estado</p>
            <div className="mt-1">
              <Badge tono={tonoEstadoVenta(venta.estado.nombre)}>
                {venta.estado.nombre}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-ink-500">{venta.estado.descripcion}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Obra social</p>
            <p className="mt-0.5 text-ink-800">
              {venta.obraSocial
                ? `${venta.obraSocial.sigla} — ${venta.obraSocial.porcentajeCobertura}% de cobertura`
                : "Sin obra social"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Sucursal</p>
            <p className="mt-0.5 text-ink-800">{venta.sucursal.nombre}</p>
          </div>
        </div>

        {venta.receta && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-900">Receta</h3>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-ink-200 p-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-ink-400">Fecha</p>
                <p className="mt-0.5 text-ink-800">{formatearFecha(venta.receta.fecha)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400">Vencimiento</p>
                <p className="mt-0.5 text-ink-800">{formatearFecha(venta.receta.fechaVencimiento)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-ink-400">Médico</p>
                <p className="mt-0.5 text-ink-800">{venta.receta.medico}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400">Matrícula</p>
                <p className="mt-0.5 text-ink-800">{venta.receta.matriculaMedico}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">Productos</h3>
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
                {venta.detalles.map((detalle) => (
                  <tr key={detalle.id}>
                    <td>
                      <span className="font-medium text-ink-900">
                        {detalle.producto.nombre}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {detalle.producto.marca}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{detalle.cantidad}</td>
                    <td className="text-right tabular-nums">
                      {formatearMoneda(detalle.precioUnitario)}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatearMoneda(detalle.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <dl className="ml-auto max-w-sm space-y-2 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-ink-500">Subtotal</dt>
            <dd className="tabular-nums text-ink-800">
              {formatearMoneda(
                venta.detalles.reduce((acc, detalle) => acc + detalle.subtotal, 0),
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-ink-500">Descuento</dt>
            <dd className="tabular-nums text-ink-800">
              {formatearMoneda(venta.venta.descuento)}
            </dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-ink-200 pt-2 font-medium">
            <dt className="text-ink-800">Total</dt>
            <dd className="tabular-nums text-ink-950">
              {formatearMoneda(venta.venta.total)}
            </dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-ink-500">Monto cubierto</dt>
            <dd className="tabular-nums text-ink-800">
              {formatearMoneda(venta.venta.montoCubierto)}
            </dd>
          </div>
          <div className="flex justify-between gap-6 rounded-lg bg-brand-50 px-3 py-2 font-semibold text-brand-900">
            <dt>Importe a cobrar</dt>
            <dd className="tabular-nums">{formatearMoneda(importeACobrar)}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
