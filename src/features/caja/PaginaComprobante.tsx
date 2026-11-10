import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Cross, Printer, ReceiptText } from "lucide-react";
import type { CobroCompleto, VentaCompleta } from "../../domain/types";
import { listarCobros } from "../../mock/api/caja";
import { obtenerVenta } from "../../mock/api/ventas";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
import { redondearMonto } from "../../domain/rules";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import { Alerta, Boton, Cargando } from "../../components/ui";

interface DatosComprobante {
  venta: VentaCompleta;
  cobro: CobroCompleto | null;
}

export function PaginaComprobante() {
  const { ventaId } = useParams();
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();

  const cargar = useCallback(async (): Promise<DatosComprobante | null> => {
    if (!ventaId) return null;
    const [venta, cobros] = await Promise.all([
      obtenerVenta(ventaId),
      listarCobros(sucursalId),
    ]);
    return {
      venta,
      cobro: cobros.find((item) => item.cobro.ventaId === ventaId) ?? null,
    };
  }, [ventaId, sucursalId]);
  const { datos, cargando, error } = useConsulta(cargar);

  if (cargando) return <Cargando texto="Preparando el comprobante…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "La venta no existe."}{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate("/caja/cobros")}
        >
          Volver a cobros
        </button>
      </Alerta>
    );
  }

  const { venta, cobro } = datos;
  const subtotal = redondearMonto(
    venta.detalles.reduce((acc, detalle) => acc + detalle.subtotal, 0),
  );

  if (!cobro) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alerta tono="advertencia" titulo="La venta todavía no tiene un cobro">
          El comprobante de pago se emite una vez confirmado el cobro de la
          venta.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => navigate("/caja/cobrar")}
          >
            Ir a cobrar
          </button>
        </Alerta>
      </div>
    );
  }

  return (
    <div className="bg-ink-100 print:bg-white">
      <div className="no-imprimir mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/caja/cobros")}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a cobros
        </button>
        <Boton onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir comprobante
        </Boton>
      </div>

      <div className="hoja-impresion mx-auto max-w-3xl rounded-xl border border-ink-200 bg-white p-8 shadow-card">
        <div className="flex flex-col gap-4 border-b border-ink-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Cross className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-950">
                Gestión de Farmacias
              </p>
              <p className="text-sm text-ink-600">{venta.sucursal.nombre}</p>
              <p className="text-xs text-ink-500">
                {venta.sucursal.direccion} · {venta.sucursal.telefono}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <ReceiptText className="h-4 w-4 text-brand-700" aria-hidden />
              Comprobante de pago
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {formatearFechaHora(cobro.cobro.fecha)}
            </p>
            <p className="text-xs text-ink-500">
              Venta del {formatearFechaHora(venta.venta.fecha)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-ink-200 py-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Cliente
            </p>
            <p className="mt-0.5 font-medium text-ink-900">
              {venta.cliente.apellido}, {venta.cliente.nombre}
            </p>
            <p className="text-xs text-ink-500">DNI {venta.cliente.dni}</p>
            <p className="text-xs text-ink-500">{venta.cliente.telefono}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Venta
            </p>
            <p className="mt-0.5 text-ink-800">{venta.venta.tipoVenta}</p>
            <p className="text-xs text-ink-500">
              Obra social:{" "}
              {venta.obraSocial
                ? `${venta.obraSocial.sigla} (${venta.obraSocial.porcentajeCobertura}%)`
                : "Sin obra social"}
            </p>
            {venta.receta && (
              <p className="text-xs text-ink-500">
                Receta: {venta.receta.medico} · Matrícula{" "}
                {venta.receta.matriculaMedico}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto py-5">
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

        <div className="border-t border-ink-200 pt-5">
          <dl className="ml-auto max-w-sm space-y-1.5 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="tabular-nums text-ink-800">
                {formatearMoneda(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-ink-500">Descuento</dt>
              <dd className="tabular-nums text-ink-800">
                − {formatearMoneda(venta.venta.descuento)}
              </dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-ink-200 pt-1.5 font-medium">
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
              <dt>Importe cobrado</dt>
              <dd className="tabular-nums">
                {formatearMoneda(cobro.cobro.importe)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 border-t border-ink-200 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Medios de pago
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {cobro.detalles.map((detalle) => (
              <li key={detalle.id} className="flex justify-between gap-6">
                <span className="text-ink-700">{detalle.medioPago.tipo}</span>
                <span className="tabular-nums text-ink-900">
                  {formatearMoneda(detalle.importe)}
                </span>
              </li>
            ))}
          </ul>
          {cobro.cobro.importe === 0 && (
            <p className="mt-2 text-sm text-brand-800">
              La obra social cubrió el 100% de la venta.
            </p>
          )}
        </div>

        <p className="mt-8 border-t border-ink-100 pt-3 text-center text-xs text-ink-400">
          Comprobante emitido por el sistema de gestión de la farmacia.
        </p>
      </div>
    </div>
  );
}
