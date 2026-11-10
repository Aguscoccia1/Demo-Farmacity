import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Eye, Pencil, ReceiptText } from "lucide-react";
import type { CobroCompleto } from "../../domain/types";
import { listarCobros } from "../../mock/api/caja";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Buscador,
  Cargando,
  EncabezadoPagina,
  Tarjeta,
  Vacio,
} from "../../components/ui";
import { MediosDeCobro } from "./componentes";

function coincideCobro(cobro: CobroCompleto, texto: string): boolean {
  if (!texto) return true;
  const cliente = cobro.venta.cliente;
  return `${cliente.nombre} ${cliente.apellido} ${cliente.dni}`
    .toLowerCase()
    .includes(texto);
}

export function PaginaCobros() {
  const sucursalId = useSucursalActiva();
  const [busqueda, setBusqueda] = useState("");
  const cargar = useCallback(() => listarCobros(sucursalId), [sucursalId]);
  const { datos, cargando, error } = useConsulta(cargar);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (datos ?? []).filter((cobro) => coincideCobro(cobro, texto));
  }, [datos, busqueda]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Cobros"
        descripcion="Consultá los cobros registrados en la sucursal activa y corregí el reparto de medios de pago."
        acciones={
          <Link to="/caja/cobrar" className="inline-flex">
            <span className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800">
              <Banknote className="h-4 w-4" aria-hidden />
              Cobrar venta
            </span>
          </Link>
        }
      />

      <Tarjeta>
        <div className="border-b border-ink-200 p-4">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por cliente o DNI"
            etiqueta="Buscar cobros"
            className="w-full sm:max-w-sm"
          />
        </div>

        {cargando ? (
          <Cargando texto="Cargando cobros…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={Banknote}
            titulo={busqueda ? "No hay resultados" : "Todavía no hay cobros"}
            descripcion={
              busqueda
                ? "Probá con otro cliente o DNI."
                : "Los cobros aparecerán acá cuando se cobre una venta."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo de venta</th>
                  <th>Medios de pago</th>
                  <th className="text-right">Importe</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((completa) => {
                  const { cobro, venta } = completa;
                  return (
                    <tr key={cobro.id}>
                      <td className="whitespace-nowrap">
                        {formatearFechaHora(cobro.fecha)}
                      </td>
                      <td>
                        <span className="font-medium text-ink-900">
                          {venta.cliente.apellido}, {venta.cliente.nombre}
                        </span>
                        <span className="block text-xs text-ink-500">
                          DNI {venta.cliente.dni}
                        </span>
                      </td>
                      <td>
                        <Badge
                          tono={
                            venta.venta.tipoVenta === "Con receta"
                              ? "azul"
                              : "gris"
                          }
                        >
                          {venta.venta.tipoVenta}
                        </Badge>
                      </td>
                      <td>
                        <MediosDeCobro detalles={completa.detalles} />
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatearMoneda(cobro.importe)}
                      </td>
                      <td>
                        <div className="flex justify-end gap-3 whitespace-nowrap text-sm">
                          <Link
                            to={`/caja/cobros/${cobro.id}`}
                            className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                            Modificar
                          </Link>
                          <Link
                            to={`/caja/comprobante/${venta.venta.id}`}
                            className="inline-flex items-center gap-1 font-medium text-ink-600 hover:underline"
                          >
                            <ReceiptText className="h-4 w-4" aria-hidden />
                            Comprobante
                          </Link>
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

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        Para ver el detalle completo de la venta, abrí el comprobante de pago.
      </p>
    </div>
  );
}
