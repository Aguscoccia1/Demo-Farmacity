import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import type { MedioPago, VentaCompleta } from "../../domain/types";
import {
  confirmarCobro,
  listarVentasPendientesDeCobro,
  type ResultadoCobro,
} from "../../mock/api/caja";
import { obtenerMediosPago } from "../../mock/api/catalogos";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Cargando,
  EncabezadoPagina,
  Tarjeta,
  Vacio,
} from "../../components/ui";
import {
  EditorPagos,
  crearPago,
  importeACobrarDeVenta,
  type PagoForm,
} from "./componentes";
import { mostrarToast } from "../../stores/toasts";

interface DatosCobro {
  ventas: VentaCompleta[];
  mediosPago: MedioPago[];
}

export function PaginaCobrar() {
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [pagos, setPagos] = useState<PagoForm[]>([]);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCobro | null>(null);

  const cargar = useCallback(async (): Promise<DatosCobro> => {
    const [ventas, mediosPago] = await Promise.all([
      listarVentasPendientesDeCobro(sucursalId),
      obtenerMediosPago(),
    ]);
    return { ventas, mediosPago };
  }, [sucursalId]);
  const { datos, cargando, error, recargar } = useConsulta(cargar);

  const ventaSeleccionada = useMemo(
    () =>
      datos?.ventas.find((venta) => venta.venta.id === seleccionId) ?? null,
    [datos, seleccionId],
  );

  const importeEsperado = ventaSeleccionada
    ? importeACobrarDeVenta(ventaSeleccionada.venta)
    : 0;

  const seleccionar = (venta: VentaCompleta, mediosPago: MedioPago[]) => {
    const importe = importeACobrarDeVenta(venta.venta);
    const medioInicial = mediosPago[0];
    setSeleccionId(venta.venta.id);
    setResultado(null);
    setErrorPago(null);
    setPagos(
      medioInicial
        ? [crearPago(1, medioInicial.id, importe === 0 ? "0" : String(importe))]
        : [],
    );
  };

  const confirmar = async () => {
    if (!ventaSeleccionada) return;
    setErrorPago(null);
    if (pagos.length === 0 || pagos.some((pago) => !pago.medioPagoId)) {
      setErrorPago("Seleccioná un medio de pago.");
      return;
    }
    if (importeEsperado > 0 && pagos.some((pago) => Number(pago.importe) <= 0)) {
      setErrorPago("Cada medio de pago debe tener un importe mayor que cero.");
      return;
    }
    setConfirmando(true);
    try {
      const nuevoResultado = await confirmarCobro(
        ventaSeleccionada.venta.id,
        pagos.map((pago) => ({
          medioPagoId: pago.medioPagoId,
          importe: Number(pago.importe) || 0,
        })),
      );
      setResultado(nuevoResultado);
      setSeleccionId(null);
      setPagos([]);
      mostrarToast("Cobro registrado.");
      recargar();
    } catch (motivo) {
      setErrorPago(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo registrar el cobro. Reintentá.",
      );
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Cobrar venta"
        descripcion="Seleccioná una venta pendiente y registrá los medios de pago. La venta debe estar Registrada y con stock disponible."
      />

      {resultado && (
        <Tarjeta className="mb-5 border-brand-200 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-ink-950">
                Cobro registrado
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                {resultado.cobro.venta.cliente.apellido},{" "}
                {resultado.cobro.venta.cliente.nombre} ·{" "}
                {formatearMoneda(resultado.cobro.cobro.importe)} ·{" "}
                {formatearFechaHora(resultado.cobro.cobro.fecha)}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {resultado.mensajes.map((mensaje) => (
                  <li key={mensaje}>
                    <Badge tono="verde">{mensaje}</Badge>
                  </li>
                ))}
              </ul>
              {resultado.alertasStock.length > 0 && (
                <Alerta tono="advertencia" className="mt-3">
                  <p className="font-medium">Productos con stock bajo mínimo</p>
                  <p>{resultado.alertasStock.join(", ")}</p>
                </Alerta>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Boton
                  onClick={() =>
                    navigate(
                      `/caja/comprobante/${resultado.cobro.venta.venta.id}`,
                    )
                  }
                >
                  <ReceiptText className="h-4 w-4" aria-hidden />
                  Emitir comprobante de pago
                </Boton>
                <Boton
                  variante="secundario"
                  onClick={() => {
                    setResultado(null);
                    recargar();
                  }}
                >
                  Cobrar otra venta
                </Boton>
              </div>
            </div>
          </div>
        </Tarjeta>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Tarjeta className="xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold text-ink-950">
              <Banknote className="h-4 w-4 text-brand-700" aria-hidden />
              Ventas pendientes de cobro
            </h2>
            <Badge tono="amarillo">{datos?.ventas.length ?? 0}</Badge>
          </div>

          {cargando ? (
            <Cargando texto="Cargando ventas pendientes…" />
          ) : error ? (
            <div className="p-4">
              <Alerta tono="error">{error}</Alerta>
            </div>
          ) : !datos || datos.ventas.length === 0 ? (
            <Vacio
              icono={Banknote}
              titulo="No hay ventas pendientes de cobro"
              descripcion="Cuando se registre una venta en mostrador, aparecerá en esta lista."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabla-base">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Monto cubierto</th>
                    <th className="text-right">Importe a cobrar</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {datos.ventas.map((completa) => {
                    const aCobrar = importeACobrarDeVenta(completa.venta);
                    const activa = completa.venta.id === seleccionId;
                    return (
                      <tr
                        key={completa.venta.id}
                        className={activa ? "bg-brand-50/60" : undefined}
                      >
                        <td className="whitespace-nowrap">
                          {formatearFechaHora(completa.venta.fecha)}
                        </td>
                        <td>
                          <span className="font-medium text-ink-900">
                            {completa.cliente.apellido}, {completa.cliente.nombre}
                          </span>
                          <span className="block text-xs text-ink-500">
                            DNI {completa.cliente.dni}
                          </span>
                        </td>
                        <td>
                          <Badge tono={completa.venta.tipoVenta === "Con receta" ? "azul" : "gris"}>
                            {completa.venta.tipoVenta}
                          </Badge>
                          {completa.obraSocial && (
                            <span className="mt-1 block text-xs text-ink-500">
                              {completa.obraSocial.sigla} ·{" "}
                              {completa.obraSocial.porcentajeCobertura}%
                            </span>
                          )}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatearMoneda(completa.venta.total)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatearMoneda(completa.venta.montoCubierto)}
                        </td>
                        <td className="text-right font-semibold tabular-nums">
                          {formatearMoneda(aCobrar)}
                        </td>
                        <td className="text-right">
                          <Boton
                            tamano="sm"
                            variante={activa ? "secundario" : "suave"}
                            onClick={() => seleccionar(completa, datos.mediosPago)}
                          >
                            {activa ? "Seleccionada" : "Cobrar"}
                          </Boton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>

        <aside className="h-fit rounded-xl border border-ink-200 bg-white p-4 shadow-card xl:sticky xl:top-24">
          <h2 className="flex items-center gap-2 font-semibold text-ink-950">
            <CreditCard className="h-4 w-4 text-brand-700" aria-hidden />
            Medios de pago
          </h2>

          {!ventaSeleccionada ? (
            <p className="mt-4 rounded-lg border border-dashed border-ink-300 px-4 py-8 text-center text-sm text-ink-500">
              Seleccioná una venta de la lista para registrar el cobro.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="rounded-lg bg-ink-50 p-3 text-sm">
                <p className="font-medium text-ink-900">
                  {ventaSeleccionada.cliente.apellido},{" "}
                  {ventaSeleccionada.cliente.nombre}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {ventaSeleccionada.venta.tipoVenta} ·{" "}
                  {formatearFechaHora(ventaSeleccionada.venta.fecha)}
                </p>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Total</dt>
                    <dd className="tabular-nums text-ink-800">
                      {formatearMoneda(ventaSeleccionada.venta.total)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Cubierto</dt>
                    <dd className="tabular-nums text-ink-800">
                      {formatearMoneda(ventaSeleccionada.venta.montoCubierto)}
                    </dd>
                  </div>
                  {ventaSeleccionada.obraSocial && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-500">Obra social</dt>
                      <dd className="text-ink-800">
                        {ventaSeleccionada.obraSocial.sigla}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <EditorPagos
                pagos={pagos}
                mediosPago={datos?.mediosPago ?? []}
                importeEsperado={importeEsperado}
                onCambiar={setPagos}
                error={errorPago ?? undefined}
              />

              {importeEsperado > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-ink-500">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Los pagos con débito, crédito o transferencia pueden ser
                  rechazados por la entidad. Si ocurre, podés reintentar con el
                  mismo u otro medio.
                </p>
              )}

              <Boton
                className="w-full"
                onClick={confirmar}
                cargando={confirmando}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Confirmar cobro
              </Boton>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
