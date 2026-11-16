import { ListadoImprimible } from "../../components/ListadoImprimible";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Banknote, ClipboardList } from "lucide-react";
import { listarCobrosDelDia } from "../../mock/api/caja";
import { formatearFecha, formatearFechaHora, formatearMoneda } from "../../lib/format";
import { redondearMonto } from "../../domain/rules";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Cargando,
  EncabezadoPagina,
  Tarjeta,
  Vacio,
} from "../../components/ui";
import { MediosDeCobro } from "./componentes";

export function PaginaCobrosDelDia() {
  const sucursalId = useSucursalActiva();
  const cargar = useCallback(
    () => listarCobrosDelDia(sucursalId),
    [sucursalId],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  const total = useMemo(
    () =>
      redondearMonto(
        (datos ?? []).reduce((acc, cobro) => acc + cobro.cobro.importe, 0),
      ),
    [datos],
  );

  const porMedio = useMemo(() => {
    const acumulado = new Map<string, number>();
    (datos ?? []).forEach((cobro) => {
      cobro.detalles.forEach((detalle) => {
        acumulado.set(
          detalle.medioPago.tipo,
          redondearMonto(
            (acumulado.get(detalle.medioPago.tipo) ?? 0) + detalle.importe,
          ),
        );
      });
    });
    return [...acumulado.entries()];
  }, [datos]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Cobros del día"
        descripcion={`Cobros registrados hoy, ${formatearFecha(new Date().toISOString())}, en la sucursal activa.`}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tarjeta className="p-4 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Total cobrado
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-950">
            {formatearMoneda(total)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {datos?.length ?? 0} cobro(s)
          </p>
        </Tarjeta>
        <Tarjeta className="p-4 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Por medio de pago
          </p>
          {porMedio.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">Sin cobros registrados hoy.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {porMedio.map(([tipo, importe]) => (
                <li key={tipo}>
                  <Badge tono="azul">
                    {tipo}: {formatearMoneda(importe)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mb-4 flex justify-end">
        <ListadoImprimible titulo="Cobros del día" deshabilitado={cargando || Boolean(error)}
          columnas={["Fecha", "Sucursal", "Cliente", "Medios de pago", "Importe"]}
          filas={(datos ?? []).map((c) => [formatearFechaHora(c.cobro.fecha), c.venta.sucursal.nombre, `${c.venta.cliente.apellido}, ${c.venta.cliente.nombre}`, c.detalles.map((d) => `${d.medioPago.tipo}: ${formatearMoneda(d.importe)}`).join(", "), formatearMoneda(c.cobro.importe)])}
          resumen={`Total cobrado: ${formatearMoneda(total)}`} />
      </div>

      <Tarjeta>
        {cargando ? (
          <Cargando texto="Cargando cobros del día…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : !datos || datos.length === 0 ? (
          <Vacio
            icono={ClipboardList}
            titulo="Todavía no hay cobros hoy"
            descripcion="Los cobros confirmados durante la jornada se listan en esta pantalla."
            accion={
              <Link
                to="/caja/cobrar"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
              >
                <Banknote className="h-4 w-4" aria-hidden />
                Cobrar venta
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Tipo de venta</th>
                  <th>Medios de pago</th>
                  <th className="text-right">Importe</th>
                  <th className="text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((completa) => (
                  <tr key={completa.cobro.id}>
                    <td className="whitespace-nowrap">
                      {formatearFechaHora(completa.cobro.fecha)}
                    </td>
                    <td>
                      <span className="font-medium text-ink-900">
                        {completa.venta.cliente.apellido},{" "}
                        {completa.venta.cliente.nombre}
                      </span>
                      <span className="block text-xs text-ink-500">
                        DNI {completa.venta.cliente.dni}
                      </span>
                    </td>
                    <td>{completa.venta.venta.tipoVenta}</td>
                    <td>
                      <MediosDeCobro detalles={completa.detalles} />
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatearMoneda(completa.cobro.importe)}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/caja/comprobante/${completa.venta.venta.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Ver comprobante
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right font-medium text-ink-700">
                    Total del día
                  </td>
                  <td className="text-right font-semibold tabular-nums text-ink-950">
                    {formatearMoneda(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
