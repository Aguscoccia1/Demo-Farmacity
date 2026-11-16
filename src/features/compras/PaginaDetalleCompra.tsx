import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  PackageCheck,
  Pencil,
  XCircle,
} from "lucide-react";
import {
  anularCompra,
  obtenerCompra,
  registrarRecepcionCompra,
} from "../../mock/api/compras";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Cargando,
  ConfirmarDialogo,
  EncabezadoPagina,
  Tarjeta,
} from "../../components/ui";
import { tonoEstadoCompra } from "./PaginaCompras";
import { mostrarToast } from "../../stores/toasts";

export function PaginaDetalleCompra() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recepcionAbierta, setRecepcionAbierta] = useState(false);
  const [recibiendo, setRecibiendo] = useState(false);
  const [anulacionAbierta, setAnulacionAbierta] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargar = useCallback(
    () =>
      id
        ? obtenerCompra(id)
        : Promise.reject(new Error("Compra no indicada.")),
    [id],
  );
  const { datos, cargando, error, recargar } = useConsulta(cargar);

  if (cargando) return <Cargando texto="Cargando compra…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "La compra no existe."}{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate("/compras")}
        >
          Volver a compras
        </button>
      </Alerta>
    );
  }

  const { compra, estado } = datos;

  const registrarRecepcion = async () => {
    setErrorAccion(null);
    setRecibiendo(true);
    try {
      await registrarRecepcionCompra(compra.id);
      setRecepcionAbierta(false);
      mostrarToast("Recepción de compra registrada.");
      recargar();
    } catch (motivo) {
      setErrorAccion(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo registrar la recepción.",
      );
      setRecepcionAbierta(false);
    } finally {
      setRecibiendo(false);
    }
  };

  const anular = async () => {
    setErrorAccion(null);
    setAnulando(true);
    try {
      await anularCompra(compra.id);
      setAnulacionAbierta(false);
      mostrarToast("Compra anulada.");
      recargar();
    } catch (motivo) {
      setErrorAccion(
        motivo instanceof Error ? motivo.message : "No se pudo anular la compra.",
      );
      setAnulacionAbierta(false);
    } finally {
      setAnulando(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={() => navigate("/compras")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a compras
      </button>

      <EncabezadoPagina
        titulo={`Compra del ${formatearFechaHora(compra.fecha)}`}
        descripcion="Detalle de la compra, recepción de mercadería y estado del stock."
        acciones={
          estado.nombre === "Registrada" ? (
            <Link to={`/compras/${compra.id}/editar`} className="inline-flex">
              <Boton variante="secundario">
                <Pencil className="h-4 w-4" aria-hidden />
                Modificar
              </Boton>
            </Link>
          ) : undefined
        }
      />

      {errorAccion && (
        <Alerta tono="error" className="mb-4">
          {errorAccion}
        </Alerta>
      )}

      {estado.nombre === "Registrada" && (
        <Alerta tono="info" className="mb-4">
          Al registrar la recepción, la compra pasa a estado Recibida. El stock
          se actualiza después desde Compras de Depósito, en Depósito.
        </Alerta>
      )}
      {estado.nombre === "Recibida" && datos.stockAjustadoPorPedido && (
        <Alerta tono="info" className="mb-4">
          El stock ya fue actualizado desde la mercadería recibida del pedido
          de origen. No se vuelve a aplicar al actualizar el stock de la compra.
        </Alerta>
      )}
      {estado.nombre === "Recibida" &&
        !datos.stockAplicado &&
        !datos.stockAjustadoPorPedido && (
          <Alerta tono="advertencia" className="mb-4">
            La recepción está registrada, pero el stock todavía no fue aplicado.
            Depósito debe actualizarlo desde Compras de Depósito.
          </Alerta>
        )}
      {estado.nombre === "Recibida" &&
        datos.stockAplicado &&
        !datos.stockAjustadoPorPedido && (
          <Alerta tono="exito" className="mb-4">
            La recepción está registrada y el stock de la compra ya fue aplicado.
          </Alerta>
        )}
      {estado.nombre === "Anulada" && (
        <Alerta tono="advertencia" className="mb-4">
          La compra está anulada y no admite más acciones.
        </Alerta>
      )}

      <Tarjeta className="mb-4 p-5">
        <div className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Estado
            </p>
            <div className="mt-1">
              <Badge tono={tonoEstadoCompra(estado.nombre)}>
                {estado.nombre}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-ink-500">{estado.descripcion}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Droguería
            </p>
            <p className="mt-0.5 font-medium text-ink-900">
              {datos.drogueria.nombre}
            </p>
            <p className="text-xs text-ink-500">{datos.drogueria.telefono}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Pedido de origen
            </p>
            <p className="mt-0.5 text-ink-800">
              {datos.pedido
                ? `Pedido del ${formatearFechaHora(datos.pedido.fecha)}`
                : "Sin pedido"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Stock
            </p>
            <div className="mt-1">
              {datos.stockAjustadoPorPedido ? (
                <Badge tono="azul">Ajustado desde el pedido</Badge>
              ) : datos.stockAplicado ? (
                <Badge tono="verde">Aplicado</Badge>
              ) : (
                <Badge tono="gris">Pendiente de aplicar</Badge>
              )}
            </div>
            {datos.stockAjustadoPorPedido && (
              <p className="mt-1 text-xs text-ink-500">
                La mercadería recibida del pedido de origen ya ajustó el stock.
              </p>
            )}
          </div>
        </div>
      </Tarjeta>

      <Tarjeta className="mb-4">
        <div className="flex items-center gap-2 border-b border-ink-200 px-4 py-3">
          <PackageCheck className="h-4 w-4 text-brand-700" aria-hidden />
          <h2 className="font-semibold text-ink-950">Productos de la compra</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="tabla-base">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th className="text-right">Cantidad</th>
                <th className="text-right">Precio unitario</th>
                <th className="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {datos.detalles.map((detalle) => (
                <tr key={detalle.id}>
                  <td>
                    <span className="font-medium text-ink-900">
                      {detalle.producto.nombre}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {detalle.producto.tipoProducto} ·{" "}
                      {detalle.producto.codigoBarras}
                    </span>
                  </td>
                  <td>{detalle.producto.marca}</td>
                  <td className="text-right tabular-nums">{detalle.cantidad}</td>
                  <td className="text-right tabular-nums">
                    {formatearMoneda(detalle.precioUnitario)}
                  </td>
                  <td className="text-right font-medium tabular-nums">
                    {formatearMoneda(detalle.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right font-medium text-ink-700">
                  Total de la compra
                </td>
                <td className="text-right font-semibold tabular-nums text-ink-950">
                  {formatearMoneda(compra.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Tarjeta>

      {estado.nombre === "Registrada" && (
        <Tarjeta className="p-4">
          <h2 className="font-semibold text-ink-950">Acciones de la compra</h2>
          <p className="mt-1 text-sm text-ink-500">
            Registrá la recepción de la mercadería o anulá la compra si ya no
            corresponde.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Boton onClick={() => setRecepcionAbierta(true)}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Registrar recepción
            </Boton>
            <Boton variante="peligro" onClick={() => setAnulacionAbierta(true)}>
              <XCircle className="h-4 w-4" aria-hidden />
              Anular compra
            </Boton>
          </div>
        </Tarjeta>
      )}

      <ConfirmarDialogo
        abierto={recepcionAbierta}
        titulo="Registrar recepción"
        descripcion="La compra pasará a estado Recibida. El stock no se modifica en este paso: se aplica desde Compras de Depósito."
        textoConfirmar="Registrar recepción"
        cargando={recibiendo}
        onConfirmar={registrarRecepcion}
        onCerrar={() => setRecepcionAbierta(false)}
      />

      <ConfirmarDialogo
        abierto={anulacionAbierta}
        titulo="Anular compra"
        descripcion="La compra quedará anulada y no podrá recepcionarse. Esta acción no se puede deshacer."
        textoConfirmar="Anular compra"
        peligro
        cargando={anulando}
        onConfirmar={anular}
        onCerrar={() => setAnulacionAbierta(false)}
      />
    </div>
  );
}
