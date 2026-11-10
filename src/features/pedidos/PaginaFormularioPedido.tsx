import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2, Truck } from "lucide-react";
import type { PedidoCompleto } from "../../domain/types";
import type { ProductoConStock } from "../../mock/api/comun";
import {
  actualizarPedido,
  crearPedido,
  eliminarPedido,
  obtenerPedido,
} from "../../mock/api/pedidos";
import { listarCatalogoConStock } from "../../mock/api/catalogos";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Boton,
  Campo,
  Cargando,
  ConfirmarDialogo,
  EncabezadoPagina,
  Input,
  Select,
  Tarjeta,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";

interface ItemForm {
  clave: number;
  productoId: string;
  cantidad: string;
}

interface DatosPedido {
  catalogo: ProductoConStock[];
  pedido: PedidoCompleto | null;
}

function crearItem(clave: number): ItemForm {
  return { clave, productoId: "", cantidad: "1" };
}

export function PaginaFormularioPedido() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();
  const inicializado = useRef(false);
  const siguienteClave = useRef(2);

  const [items, setItems] = useState<ItemForm[]>([crearItem(1)]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async (): Promise<DatosPedido> => {
    const [catalogo, pedido] = await Promise.all([
      listarCatalogoConStock(sucursalId),
      id ? obtenerPedido(id) : Promise.resolve(null),
    ]);
    return { catalogo, pedido };
  }, [sucursalId, id]);
  const { datos, cargando, error } = useConsulta(cargar);

  useEffect(() => {
    if (!datos?.pedido || inicializado.current) return;
    setItems(
      datos.pedido.detalles.map((detalle, indice) => ({
        clave: indice + 1,
        productoId: detalle.productoId,
        cantidad: String(detalle.cantidad),
      })),
    );
    siguienteClave.current = datos.pedido.detalles.length + 1;
    inicializado.current = true;
  }, [datos]);

  if (cargando) return <Cargando texto="Cargando pedido…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "No se pudo cargar el pedido."}{" "}
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

  if (esEdicion && !datos.pedido) {
    return (
      <Alerta tono="error">
        El pedido no existe.{" "}
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

  if (esEdicion && datos.pedido?.estado.nombre !== "Registrado") {
    return (
      <Alerta tono="advertencia">
        Solo se puede modificar un pedido en estado Registrado.{" "}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => navigate(`/pedidos/${datos.pedido?.pedido.id ?? ""}`)}
        >
          Volver al detalle del pedido
        </button>
      </Alerta>
    );
  }

  const productos = datos.catalogo;

  const cambiarItem = (clave: number, cambios: Partial<ItemForm>) => {
    setItems((anteriores) =>
      anteriores.map((item) =>
        item.clave === clave ? { ...item, ...cambios } : item,
      ),
    );
    setErrores({});
  };

  const agregarItem = () => {
    const usados = new Set(items.map((item) => item.productoId));
    const disponible = productos.find((producto) => !usados.has(producto.id));
    const nuevo = crearItem(siguienteClave.current);
    siguienteClave.current += 1;
    if (disponible) nuevo.productoId = disponible.id;
    setItems((anteriores) => [...anteriores, nuevo]);
  };

  const quitarItem = (clave: number) => {
    setItems((anteriores) => anteriores.filter((item) => item.clave !== clave));
    setErrores({});
  };

  const guardar = async () => {
    setErrorGeneral(null);
    if (items.length === 0) {
      setErrores({ items: "Agregá al menos un producto al pedido." });
      return;
    }
    const preparados: Array<{ productoId: string; cantidad: number }> = [];
    const nuevosErrores: Record<string, string> = {};
    const vistos = new Set<string>();
    items.forEach((item) => {
      if (!item.productoId) {
        nuevosErrores[`producto-${item.clave}`] = "Seleccioná un producto.";
        return;
      }
      if (vistos.has(item.productoId)) {
        nuevosErrores[`producto-${item.clave}`] =
          "El producto ya está en el pedido.";
        return;
      }
      vistos.add(item.productoId);
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        nuevosErrores[`cantidad-${item.clave}`] =
          "Ingresá una cantidad entera mayor que cero.";
        return;
      }
      preparados.push({ productoId: item.productoId, cantidad });
    });
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setGuardando(true);
    try {
      if (esEdicion && id) {
        await actualizarPedido(id, { items: preparados });
        mostrarToast("Pedido modificado.");
        navigate(`/pedidos/${id}`);
      } else {
        const nuevo = await crearPedido({ sucursalId, items: preparados });
        mostrarToast("Pedido registrado.");
        navigate(`/pedidos/${nuevo.pedido.id}`);
      }
    } catch (motivo) {
      setErrorGeneral(
        motivo instanceof Error ? motivo.message : "No se pudo guardar el pedido.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!id) return;
    setEliminando(true);
    try {
      await eliminarPedido(id);
      setEliminarAbierto(false);
      mostrarToast("Pedido eliminado.");
      navigate("/pedidos");
    } catch (motivo) {
      setErrorGeneral(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo eliminar el pedido.",
      );
      setEliminarAbierto(false);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={() => navigate(esEdicion && id ? `/pedidos/${id}` : "/pedidos")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {esEdicion ? "Volver al pedido" : "Volver a pedidos"}
      </button>

      <EncabezadoPagina
        titulo={esEdicion ? "Modificar pedido" : "Nuevo pedido"}
        descripcion={
          esEdicion
            ? "Actualizá los productos y cantidades del pedido mientras esté Registrado."
            : "Seleccioná los productos y cantidades para pedir a la Droguería Central."
        }
        acciones={
          esEdicion ? (
            <Boton variante="peligro" onClick={() => setEliminarAbierto(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Eliminar pedido
            </Boton>
          ) : undefined
        }
      />

      {errorGeneral && (
        <Alerta tono="error" className="mb-4">
          {errorGeneral}
        </Alerta>
      )}

      <Tarjeta className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Truck className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="font-medium text-ink-900">Droguería Central</p>
            <p className="text-xs text-ink-500">
              Los pedidos se envían a la droguería configurada para la farmacia.
            </p>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta>
        <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
          <h2 className="font-semibold text-ink-950">Productos del pedido</h2>
          <Boton variante="secundario" tamano="sm" onClick={agregarItem}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar producto
          </Boton>
        </div>

        <div className="space-y-3 p-4">
          {errores.items && <Alerta tono="error">{errores.items}</Alerta>}
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-300 px-4 py-8 text-center text-sm text-ink-500">
              Agregá al menos un producto al pedido.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item, indice) => {
                const usados = new Set(
                  items
                    .filter((otro) => otro.clave !== item.clave)
                    .map((otro) => otro.productoId),
                );
                return (
                  <li
                    key={item.clave}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-ink-200 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end"
                  >
                    <Campo
                      etiqueta={`Producto ${indice + 1}`}
                      htmlFor={`pedido-producto-${item.clave}`}
                      error={errores[`producto-${item.clave}`]}
                    >
                      <Select
                        id={`pedido-producto-${item.clave}`}
                        value={item.productoId}
                        onChange={(event) =>
                          cambiarItem(item.clave, {
                            productoId: event.target.value,
                          })
                        }
                        error={Boolean(errores[`producto-${item.clave}`])}
                      >
                        <option value="">Seleccioná un producto</option>
                        {productos
                          .filter(
                            (producto) =>
                              producto.id === item.productoId ||
                              !usados.has(producto.id),
                          )
                          .map((producto) => (
                            <option key={producto.id} value={producto.id}>
                              {producto.nombre} — {producto.marca} (
                              {producto.tipoProducto})
                            </option>
                          ))}
                      </Select>
                    </Campo>
                    <Campo
                      etiqueta="Cantidad"
                      htmlFor={`pedido-cantidad-${item.clave}`}
                      error={errores[`cantidad-${item.clave}`]}
                    >
                      <Input
                        id={`pedido-cantidad-${item.clave}`}
                        type="number"
                        min={1}
                        step={1}
                        value={item.cantidad}
                        onChange={(event) =>
                          cambiarItem(item.clave, {
                            cantidad: event.target.value,
                          })
                        }
                        error={Boolean(errores[`cantidad-${item.clave}`])}
                      />
                    </Campo>
                    <Boton
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => quitarItem(item.clave)}
                      disabled={items.length <= 1}
                      aria-label={`Quitar producto ${indice + 1}`}
                      className="justify-self-start sm:justify-self-end"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Boton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 px-4 py-3">
          <p className="text-xs text-ink-500">
            El pedido queda Registrado. Después podés generar la orden de pedido
            y enviarlo a la droguería.
          </p>
          <div className="flex gap-2">
            <Boton
              variante="secundario"
              onClick={() => navigate(esEdicion && id ? `/pedidos/${id}` : "/pedidos")}
            >
              Cancelar
            </Boton>
            <Boton onClick={guardar} cargando={guardando}>
              <Save className="h-4 w-4" aria-hidden />
              {esEdicion ? "Guardar cambios" : "Registrar pedido"}
            </Boton>
          </div>
        </div>
      </Tarjeta>

      <ConfirmarDialogo
        abierto={eliminarAbierto}
        titulo="Eliminar pedido"
        descripcion={
          datos.pedido?.ordenGenerada
            ? "El pedido y su orden de pedido se eliminarán. Esta acción no se puede deshacer."
            : "El pedido se eliminará definitivamente. Esta acción no se puede deshacer."
        }
        textoConfirmar="Eliminar pedido"
        peligro
        cargando={eliminando}
        onConfirmar={eliminar}
        onCerrar={() => setEliminarAbierto(false)}
      />
    </div>
  );
}
