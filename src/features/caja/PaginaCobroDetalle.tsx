import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import type { CobroCompleto, MedioPago } from "../../domain/types";
import { modificarCobro, obtenerCobro } from "../../mock/api/caja";
import { obtenerMediosPago } from "../../mock/api/catalogos";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Cargando,
  EncabezadoPagina,
  Tarjeta,
} from "../../components/ui";
import {
  EditorPagos,
  MediosDeCobro,
  crearPago,
  totalPagos,
  type PagoForm,
} from "./componentes";
import { mostrarToast } from "../../stores/toasts";

interface DatosCobroEdicion {
  cobro: CobroCompleto;
  mediosPago: MedioPago[];
}

function pagosDeCobro(cobro: CobroCompleto): PagoForm[] {
  if (cobro.detalles.length === 0) {
    return [crearPago(1, "", "0")];
  }
  return cobro.detalles.map((detalle, indice) => ({
    clave: indice + 1,
    medioPagoId: detalle.medioPago.id,
    importe: String(detalle.importe),
  }));
}

export function PaginaCobroDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const inicializado = useRef(false);
  const [pagos, setPagos] = useState<PagoForm[]>([]);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (): Promise<DatosCobroEdicion | null> => {
    if (!id) return null;
    const [cobro, mediosPago] = await Promise.all([
      obtenerCobro(id),
      obtenerMediosPago(),
    ]);
    return { cobro, mediosPago };
  }, [id]);
  const { datos, cargando, error } = useConsulta(cargar);

  useEffect(() => {
    if (!datos || inicializado.current) return;
    setPagos(pagosDeCobro(datos.cobro));
    inicializado.current = true;
  }, [datos]);

  if (cargando) return <Cargando texto="Cargando cobro…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "El cobro no existe."}{" "}
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

  const { cobro, mediosPago } = datos;
  const ingresado = totalPagos(pagos);
  const diferencia = Math.round((cobro.cobro.importe - ingresado) * 100) / 100;

  const guardar = async () => {
    setErrorPago(null);
    setErrorGeneral(null);
    if (pagos.length === 0 || pagos.some((pago) => !pago.medioPagoId)) {
      setErrorPago("Seleccioná un medio de pago.");
      return;
    }
    if (cobro.cobro.importe > 0 && pagos.some((pago) => Number(pago.importe) <= 0)) {
      setErrorPago("Cada medio de pago debe tener un importe mayor que cero.");
      return;
    }
    if (Math.abs(diferencia) >= 0.005) {
      setErrorPago(
        "El reparto de medios de pago debe sumar exactamente el importe del cobro.",
      );
      return;
    }
    setGuardando(true);
    try {
      await modificarCobro(
        cobro.cobro.id,
        pagos.map((pago) => ({
          medioPagoId: pago.medioPagoId,
          importe: Number(pago.importe) || 0,
        })),
      );
      mostrarToast("Reparto de medios de pago actualizado.");
      navigate("/caja/cobros");
    } catch (motivo) {
      setErrorGeneral(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo modificar el cobro.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate("/caja/cobros")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a cobros
      </button>

      <EncabezadoPagina
        titulo="Modificar cobro"
        descripcion="Corregí el reparto entre medios de pago sin cambiar el importe total del cobro."
      />

      {errorGeneral && (
        <Alerta tono="error" className="mb-4">
          {errorGeneral}
        </Alerta>
      )}

      <Tarjeta className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Cliente
            </p>
            <p className="mt-0.5 font-medium text-ink-900">
              {cobro.venta.cliente.apellido}, {cobro.venta.cliente.nombre}
            </p>
            <p className="text-xs text-ink-500">DNI {cobro.venta.cliente.dni}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Cobro
            </p>
            <p className="mt-0.5 text-ink-800">
              {formatearFechaHora(cobro.cobro.fecha)}
            </p>
            <p className="text-xs text-ink-500">
              {cobro.venta.venta.tipoVenta} · {cobro.venta.sucursal.nombre}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Importe del cobro
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink-950">
              {formatearMoneda(cobro.cobro.importe)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Reparto actual
            </p>
            <div className="mt-1">
              <MediosDeCobro detalles={cobro.detalles} />
            </div>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta className="p-4">
        <h2 className="mb-3 font-semibold text-ink-950">Medios de pago</h2>
        <EditorPagos
          pagos={pagos}
          mediosPago={mediosPago}
          importeEsperado={cobro.cobro.importe}
          onCambiar={setPagos}
          error={errorPago ?? undefined}
        />
        {Math.abs(diferencia) < 0.005 ? (
          <p className="mt-3">
            <Badge tono="verde">El reparto coincide con el importe del cobro</Badge>
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2 border-t border-ink-200 pt-4">
          <Boton variante="secundario" onClick={() => navigate("/caja/cobros")}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={guardando}>
            <Save className="h-4 w-4" aria-hidden />
            Guardar cambios
          </Boton>
        </div>
      </Tarjeta>
    </div>
  );
}
