import { useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Mail, MapPin, Pencil, Phone, ReceiptText } from "lucide-react";
import { obtenerFichaCliente } from "../../mock/api/clientes";
import { formatearFecha, formatearFechaHora, formatearMoneda } from "../../lib/format";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Cargando,
  EncabezadoPagina,
  Tarjeta,
  Vacio,
  type TonoBadge,
} from "../../components/ui";

function tonoEstado(nombre: string): TonoBadge {
  if (nombre === "Cobrada") return "verde";
  if (nombre === "Anulada") return "rojo";
  return "amarillo";
}

export function PaginaFichaCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cargar = useCallback(
    () => (id ? obtenerFichaCliente(id) : Promise.reject(new Error("Cliente no indicado."))),
    [id],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  if (cargando) return <Cargando texto="Cargando ficha del cliente…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "No se pudo cargar la ficha."}{" "}
        <button type="button" className="underline" onClick={() => navigate("/clientes")}>
          Volver a clientes
        </button>
      </Alerta>
    );
  }

  const { cliente, ventas, turnos } = datos;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/clientes")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a clientes
      </button>
      <EncabezadoPagina
        titulo={`${cliente.apellido}, ${cliente.nombre}`}
        descripcion="Ficha del cliente con sus datos, ventas y turnos."
        acciones={
          <Link to={`/clientes/${cliente.id}/editar`} className="inline-flex">
            <Boton variante="secundario">
              <Pencil className="h-4 w-4" aria-hidden />
              Modificar cliente
            </Boton>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta className="p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-ink-900">Datos del cliente</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">DNI</dt>
              <dd className="mt-0.5 tabular-nums text-ink-800">{cliente.dni}</dd>
            </div>
            <div className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Teléfono</dt>
                <dd className="mt-0.5 text-ink-800">{cliente.telefono}</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Correo electrónico</dt>
                <dd className="mt-0.5 break-all text-ink-800">{cliente.email}</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Dirección</dt>
                <dd className="mt-0.5 text-ink-800">{cliente.direccion}</dd>
              </div>
            </div>
          </dl>
        </Tarjeta>

        <Tarjeta className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <ReceiptText className="h-4 w-4 text-brand-700" aria-hidden />
              Ventas del cliente
            </h2>
            <span className="text-xs text-ink-500">{ventas.length} venta(s)</span>
          </div>
          {ventas.length === 0 ? (
            <Vacio
              icono={ReceiptText}
              titulo="Sin ventas registradas"
              descripcion="Las ventas de este cliente aparecerán aquí."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabla-base">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map(({ venta, estado }) => (
                    <tr key={venta.id}>
                      <td>{formatearFechaHora(venta.fecha)}</td>
                      <td>{venta.tipoVenta}</td>
                      <td>
                        <Badge tono={tonoEstado(estado.nombre)}>{estado.nombre}</Badge>
                      </td>
                      <td className="font-medium tabular-nums">{formatearMoneda(venta.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>

        <Tarjeta className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <CalendarClock className="h-4 w-4 text-brand-700" aria-hidden />
              Turnos del cliente
            </h2>
          </div>
          {turnos.length === 0 ? (
            <Vacio
              icono={CalendarClock}
              titulo="Sin turnos registrados"
              descripcion="Los turnos de este cliente aparecerán aquí."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabla-base">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.map((turno) => (
                    <tr key={turno.id}>
                      <td>{formatearFecha(turno.fecha)}</td>
                      <td className="tabular-nums">{turno.hora}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
