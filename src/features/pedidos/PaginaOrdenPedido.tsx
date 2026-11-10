import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Cross, FileText, Printer } from "lucide-react";
import { obtenerPedido } from "../../mock/api/pedidos";
import { formatearFechaHora } from "../../lib/format";
import { useConsulta } from "../../hooks/useConsulta";
import { Alerta, Boton, Cargando } from "../../components/ui";

export function PaginaOrdenPedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cargar = useCallback(
    () =>
      id
        ? obtenerPedido(id)
        : Promise.reject(new Error("Pedido no indicado.")),
    [id],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  if (cargando) return <Cargando texto="Preparando la orden de pedido…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "El pedido no existe."}{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate("/pedidos")}
        >
          Volver a pedidos
        </button>
      </Alerta>
    );
  }

  const { pedido, drogueria, sucursal, detalles, estado, ordenGenerada } = datos;

  if (!ordenGenerada) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alerta tono="advertencia" titulo="La orden de pedido todavía no fue generada">
          Para ver e imprimir la orden, primero generála desde el detalle del
          pedido.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => navigate(`/pedidos/${pedido.id}`)}
          >
            Ir al detalle del pedido
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
          onClick={() => navigate(`/pedidos/${pedido.id}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al pedido
        </button>
        <Boton onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir orden
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
              <p className="text-sm text-ink-600">{sucursal.nombre}</p>
              <p className="text-xs text-ink-500">
                {sucursal.direccion} · {sucursal.telefono}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <FileText className="h-4 w-4 text-brand-700" aria-hidden />
              Orden de pedido
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {formatearFechaHora(pedido.fecha)}
            </p>
            <p className="text-xs text-ink-500">Estado del pedido: {estado.nombre}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-ink-200 py-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Droguería
            </p>
            <p className="mt-0.5 font-medium text-ink-900">{drogueria.nombre}</p>
            <p className="text-ink-600">CUIT {drogueria.cuit}</p>
            <p className="text-ink-600">{drogueria.direccion}</p>
            <p className="text-ink-600">
              {drogueria.telefono} · {drogueria.email}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Solicita
            </p>
            <p className="mt-0.5 font-medium text-ink-900">{sucursal.nombre}</p>
            <p className="text-ink-600">{sucursal.direccion}</p>
            <p className="text-ink-600">{sucursal.telefono}</p>
          </div>
        </div>

        <div className="py-5">
          <table className="tabla-base">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Tipo</th>
                <th className="text-right">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((detalle) => (
                <tr key={detalle.id}>
                  <td>
                    <span className="font-medium text-ink-900">
                      {detalle.producto.nombre}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {detalle.producto.codigoBarras}
                    </span>
                  </td>
                  <td>{detalle.producto.marca}</td>
                  <td>{detalle.producto.tipoProducto}</td>
                  <td className="text-right font-semibold tabular-nums">
                    {detalle.cantidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between gap-6 border-t border-ink-200 pt-5 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Total de productos
            </p>
            <p className="mt-0.5 text-ink-800">{detalles.length} línea(s)</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Total de unidades
            </p>
            <p className="mt-0.5 font-semibold tabular-nums text-ink-900">
              {detalles.reduce((acc, detalle) => acc + detalle.cantidad, 0)}
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-ink-500">
          <div>
            <div className="border-t border-ink-300 pt-2">Farmacia</div>
          </div>
          <div>
            <div className="border-t border-ink-300 pt-2">Droguería</div>
          </div>
        </div>
      </div>
    </div>
  );
}
