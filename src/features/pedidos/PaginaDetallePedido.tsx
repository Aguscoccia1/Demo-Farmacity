import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Pencil,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import {
  cambiarEstadoPedido,
  generarOrdenPedido,
  obtenerPedido,
} from "../../mock/api/pedidos";
import { formatearFechaHora } from "../../lib/format";
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
import { tonoEstadoPedido } from "./PaginaPedidos";
import { mostrarToast } from "../../stores/toasts";

export function PaginaDetallePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enviarAbierto, setEnviarAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cancelarAbierto, setCancelarAbierto] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargar = useCallback(
    () =>
      id
        ? obtenerPedido(id)
        : Promise.reject(new Error("Pedido no indicado.")),
    [id],
  );
  const { datos, cargando, error, recargar } = useConsulta(cargar);

  if (cargando) return <Cargando texto="Cargando pedido…" />;
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

  const { pedido, estado, detalles, ordenGenerada } = datos;
  const puedeEnviar = estado.nombre === "Registrado";
  const puedeCancelar =
    estado.nombre === "Registrado" || estado.nombre === "Enviado";

  const generar = async () => {
    setErrorAccion(null);
    setGenerando(true);
    try {
      await generarOrdenPedido(pedido.id);
      mostrarToast("Orden de pedido generada.");
      navigate(`/pedidos/${pedido.id}/orden`);
    } catch (motivo) {
      setErrorAccion(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo generar la orden de pedido.",
      );
    } finally {
      setGenerando(false);
    }
  };

  const enviar = async () => {
    setErrorAccion(null);
    setEnviando(true);
    try {
      const resultado = await cambiarEstadoPedido(pedido.id, {
        nuevoEstado: "Enviado",
      });
      setEnviarAbierto(false);
      mostrarToast(resultado.mensaje);
      recargar();
    } catch (motivo) {
      setErrorAccion(
        motivo instanceof Error ? motivo.message : "No se pudo enviar el pedido.",
      );
      setEnviarAbierto(false);
    } finally {
      setEnviando(false);
    }
  };

  const cancelar = async () => {
    setErrorAccion(null);
    setCancelando(true);
    try {
      const resultado = await cambiarEstadoPedido(pedido.id, {
        nuevoEstado: "Cancelado",
      });
      setCancelarAbierto(false);
      mostrarToast(resultado.mensaje);
      recargar();
    } catch (motivo) {
      setErrorAccion(
        motivo instanceof Error ? motivo.message : "No se pudo cancelar el pedido.",
      );
      setCancelarAbierto(false);
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={() => navigate("/pedidos")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a pedidos
      </button>

      <EncabezadoPagina
        titulo={`Pedido del ${formatearFechaHora(pedido.fecha)}`}
        descripcion="Detalle del pedido, estado, orden de pedido y acciones disponibles."
        acciones={
          <>
            {ordenGenerada && (
              <Link to={`/pedidos/${pedido.id}/orden`} className="inline-flex">
                <Boton variante="secundario">
                  <FileText className="h-4 w-4" aria-hidden />
                  Ver orden de pedido
                </Boton>
              </Link>
            )}
            {!ordenGenerada && estado.nombre !== "Cancelado" && (
              <Boton onClick={generar} cargando={generando}>
                <FileText className="h-4 w-4" aria-hidden />
                Generar orden de pedido
              </Boton>
            )}
            {estado.nombre === "Registrado" && (
              <Link to={`/pedidos/${pedido.id}/editar`} className="inline-flex">
                <Boton variante="secundario">
                  <Pencil className="h-4 w-4" aria-hidden />
                  Modificar
                </Boton>
              </Link>
            )}
          </>
        }
      />

      {errorAccion && (
        <Alerta tono="error" className="mb-4">
          {errorAccion}
        </Alerta>
      )}

      {estado.nombre === "Registrado" && !ordenGenerada && (
        <Alerta tono="advertencia" className="mb-4">
          Generá la orden de pedido antes de enviar el pedido a Compras.
        </Alerta>
      )}
      {estado.nombre === "Enviado" && (
        <Alerta tono="info" className="mb-4">
          El pedido quedó disponible para que Compras registre la compra asociada.
          El stock se actualizará desde Depósito después de registrar la recepción.
        </Alerta>
      )}
      {estado.nombre === "Cancelado" && (
        <Alerta tono="advertencia" className="mb-4">
          El pedido está cancelado y no admite más acciones.
        </Alerta>
      )}

      <Tarjeta className="mb-4 p-5">
        <div className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Estado
            </p>
            <div className="mt-1">
              <Badge tono={tonoEstadoPedido(estado.nombre)}>
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
              Sucursal
            </p>
            <p className="mt-0.5 text-ink-800">{datos.sucursal.nombre}</p>
            <p className="text-xs text-ink-500">{datos.sucursal.direccion}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Orden de pedido
            </p>
            <div className="mt-1">
              {ordenGenerada ? (
                <Badge tono="verde">Generada</Badge>
              ) : (
                <Badge tono="gris">Pendiente</Badge>
              )}
            </div>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta className="mb-4">
        <div className="flex items-center gap-2 border-b border-ink-200 px-4 py-3">
          <Truck className="h-4 w-4 text-brand-700" aria-hidden />
          <h2 className="font-semibold text-ink-950">Productos del pedido</h2>
        </div>
        <div className="overflow-x-auto">
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
      </Tarjeta>

      {(puedeEnviar || puedeCancelar) && (
        <Tarjeta className="p-4">
          <h2 className="font-semibold text-ink-950">Acciones del pedido</h2>
          <p className="mt-1 text-sm text-ink-500">
            Enviá el pedido cuando esté listo o cancelalo si ya no corresponde.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {puedeEnviar && (
              <Boton
                onClick={() => setEnviarAbierto(true)}
                disabled={!ordenGenerada}
                title={
                  !ordenGenerada
                    ? "Generá la orden de pedido antes de enviar."
                    : undefined
                }
              >
                <Send className="h-4 w-4" aria-hidden />
                Enviar a Compras
              </Boton>
            )}
            {puedeCancelar && (
              <Boton variante="peligro" onClick={() => setCancelarAbierto(true)}>
                <XCircle className="h-4 w-4" aria-hidden />
                Cancelar pedido
              </Boton>
            )}
          </div>
          {puedeEnviar && !ordenGenerada && (
            <p className="mt-2 text-xs text-ink-500">
              El botón Enviar se habilita cuando la orden de pedido está
              generada.
            </p>
          )}
        </Tarjeta>
      )}

      <ConfirmarDialogo
        abierto={enviarAbierto}
        titulo="Enviar a Compras"
        descripcion="El pedido quedará disponible para que Compras registre la adquisición a la Droguería Central. Pasará a estado Enviado y ya no podrá modificarse. Esta acción no modifica el stock."
        textoConfirmar="Enviar a Compras"
        cargando={enviando}
        onConfirmar={enviar}
        onCerrar={() => setEnviarAbierto(false)}
      />

      <ConfirmarDialogo
        abierto={cancelarAbierto}
        titulo="Cancelar pedido"
        descripcion="El pedido quedará cancelado y no podrá modificarse ni enviarse. Esta acción no se puede deshacer."
        textoConfirmar="Cancelar pedido"
        peligro
        cargando={cancelando}
        onConfirmar={cancelar}
        onCerrar={() => setCancelarAbierto(false)}
      />
    </div>
  );
}
