import { Plus, Trash2 } from "lucide-react";
import type { MedioPago } from "../../domain/types";
import { formatearMoneda } from "../../lib/format";
import { redondearMonto } from "../../domain/rules";
import { Alerta, Badge, Boton, Input, Select } from "../../components/ui";

export interface PagoForm {
  clave: number;
  medioPagoId: string;
  importe: string;
}

export function crearPago(
  clave: number,
  medioPagoId: string,
  importe: string,
): PagoForm {
  return { clave, medioPagoId, importe };
}

export function totalPagos(pagos: PagoForm[]): number {
  return redondearMonto(
    pagos.reduce((acc, pago) => acc + (Number(pago.importe) || 0), 0),
  );
}

export function importeACobrarDeVenta(venta: {
  total: number;
  montoCubierto: number;
}): number {
  return redondearMonto(Math.max(0, venta.total - venta.montoCubierto));
}

export function tonoMedioPago(tipo: string) {
  if (tipo === "Efectivo") return "verde" as const;
  if (tipo === "Débito" || tipo === "Crédito") return "azul" as const;
  return "gris" as const;
}

export function EditorPagos({
  pagos,
  mediosPago,
  importeEsperado,
  onCambiar,
  error,
}: {
  pagos: PagoForm[];
  mediosPago: MedioPago[];
  importeEsperado: number;
  onCambiar: (pagos: PagoForm[]) => void;
  error?: string;
}) {
  const sinImporte = importeEsperado === 0;
  const ingresado = totalPagos(pagos);
  const restante = redondearMonto(importeEsperado - ingresado);
  const siguienteClave =
    pagos.reduce((maximo, pago) => Math.max(maximo, pago.clave), 0) + 1;

  const agregar = () => {
    const usados = new Set(pagos.map((pago) => pago.medioPagoId));
    const disponible =
      mediosPago.find((medio) => !usados.has(medio.id)) ?? mediosPago[0];
    if (!disponible) return;
    onCambiar([
      ...pagos,
      crearPago(siguienteClave, disponible.id, "0"),
    ]);
  };

  const quitar = (clave: number) => {
    if (pagos.length <= 1) return;
    onCambiar(pagos.filter((pago) => pago.clave !== clave));
  };

  return (
    <div className="space-y-3">
      {sinImporte && (
        <Alerta tono="info">
          La obra social cubre el 100% de la venta. El cobro se confirma con un
          único detalle de importe 0.
        </Alerta>
      )}

      <ul className="space-y-2">
        {pagos.map((pago, indice) => (
          <li
            key={pago.clave}
            className="grid grid-cols-1 gap-2 rounded-lg border border-ink-200 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end"
          >
            <div>
              <label
                htmlFor={`medio-pago-${pago.clave}`}
                className="mb-1 block text-xs font-medium text-ink-500"
              >
                Medio de pago {pagos.length > 1 ? indice + 1 : ""}
              </label>
              <Select
                id={`medio-pago-${pago.clave}`}
                value={pago.medioPagoId}
                onChange={(event) => {
                  const medioPagoId = event.target.value;
                  onCambiar(
                    pagos.map((item) =>
                      item.clave === pago.clave ? { ...item, medioPagoId } : item,
                    ),
                  );
                }}
              >
                {mediosPago.map((medio) => (
                  <option key={medio.id} value={medio.id}>
                    {medio.tipo}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor={`importe-pago-${pago.clave}`}
                className="mb-1 block text-xs font-medium text-ink-500"
              >
                Importe
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                  $
                </span>
                <Input
                  id={`importe-pago-${pago.clave}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={sinImporte ? "0" : pago.importe}
                  readOnly={sinImporte}
                  onChange={(event) => {
                    const importe = event.target.value;
                    onCambiar(
                      pagos.map((item) =>
                        item.clave === pago.clave ? { ...item, importe } : item,
                      ),
                    );
                  }}
                  className="pl-7 tabular-nums"
                />
              </div>
            </div>
            {!sinImporte ? (
              <Boton
                variante="fantasma"
                tamano="sm"
                onClick={() => quitar(pago.clave)}
                disabled={pagos.length <= 1}
                aria-label={`Quitar medio de pago ${indice + 1}`}
                className="justify-self-start sm:justify-self-end"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Boton>
            ) : (
              <span />
            )}
          </li>
        ))}
      </ul>

      {!sinImporte && (
        <Boton variante="secundario" tamano="sm" onClick={agregar}>
          <Plus className="h-4 w-4" aria-hidden />
          Agregar medio de pago
        </Boton>
      )}

      {error && <Alerta tono="error">{error}</Alerta>}

      <dl className="space-y-1.5 rounded-lg bg-ink-50 px-4 py-3 text-sm">
        <div className="flex justify-between gap-6">
          <dt className="text-ink-500">Importe a cobrar</dt>
          <dd className="font-medium tabular-nums text-ink-800">
            {formatearMoneda(importeEsperado)}
          </dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-ink-500">Total ingresado</dt>
          <dd className="tabular-nums text-ink-800">
            {formatearMoneda(ingresado)}
          </dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-ink-200 pt-1.5">
          <dt className="text-ink-600">Restante</dt>
          <dd
            className={`font-semibold tabular-nums ${
              Math.abs(restante) < 0.005 ? "text-brand-800" : "text-red-700"
            }`}
          >
            {formatearMoneda(restante)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function MediosDeCobro({
  detalles,
}: {
  detalles: Array<{ id: string; medioPago: MedioPago; importe: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {detalles.map((detalle) => (
        <Badge key={detalle.id} tono={tonoMedioPago(detalle.medioPago.tipo)}>
          {detalle.medioPago.tipo}: {formatearMoneda(detalle.importe)}
        </Badge>
      ))}
    </div>
  );
}
