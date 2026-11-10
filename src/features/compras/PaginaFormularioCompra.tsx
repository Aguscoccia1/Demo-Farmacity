import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, ShoppingCart, Trash2 } from "lucide-react";
import type { CompraCompleta } from "../../domain/types";
import type { ProductoConStock } from "../../mock/api/comun";
import {
  actualizarCompra,
  crearCompra,
  listarPedidosEnviados,
  obtenerCompra,
} from "../../mock/api/compras";
import { listarCatalogoConStock } from "../../mock/api/catalogos";
import { redondearMonto } from "../../domain/rules";
import { formatearFechaHora, formatearMoneda } from "../../lib/format";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Boton,
  Campo,
  Cargando,
  EncabezadoPagina,
  Input,
  Select,
  Tarjeta,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";

interface ItemCompraForm {
  clave: number;
  productoId: string;
  cantidad: string;
  precioUnitario: string;
}

type PedidoEnviado = Awaited<ReturnType<typeof listarPedidosEnviados>>[number];

interface DatosCompraFormulario {
  catalogo: ProductoConStock[];
  pedidos: PedidoEnviado[];
  compra: CompraCompleta | null;
}

function crearItem(clave: number): ItemCompraForm {
  return { clave, productoId: "", cantidad: "1", precioUnitario: "" };
}

export function PaginaFormularioCompra() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();
  const inicializado = useRef(false);
  const siguienteClave = useRef(2);

  const [pedidoId, setPedidoId] = useState("");
  const [items, setItems] = useState<ItemCompraForm[]>([crearItem(1)]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (): Promise<DatosCompraFormulario> => {
    const [catalogo, pedidos, compra] = await Promise.all([
      listarCatalogoConStock(sucursalId),
      listarPedidosEnviados(sucursalId),
      id ? obtenerCompra(id) : Promise.resolve(null),
    ]);
    return { catalogo, pedidos, compra };
  }, [sucursalId, id]);
  const { datos, cargando, error } = useConsulta(cargar);

  useEffect(() => {
    if (!datos?.compra || inicializado.current) return;
    setPedidoId(datos.compra.pedido?.id ?? "");
    setItems(
      datos.compra.detalles.map((detalle, indice) => ({
        clave: indice + 1,
        productoId: detalle.productoId,
        cantidad: String(detalle.cantidad),
        precioUnitario: String(detalle.precioUnitario),
      })),
    );
    siguienteClave.current = datos.compra.detalles.length + 1;
    inicializado.current = true;
  }, [datos]);

  const itemsCalculados = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        subtotal: redondearMonto(
          (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0),
        ),
      })),
    [items],
  );
  const total = redondearMonto(
    itemsCalculados.reduce((acc, item) => acc + item.subtotal, 0),
  );

  if (cargando) return <Cargando texto="Cargando compra…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "No se pudo cargar la compra."}{" "}
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

  if (esEdicion && !datos.compra) {
    return (
      <Alerta tono="error">
        La compra no existe.{" "}
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

  if (esEdicion && datos.compra?.estado.nombre !== "Registrada") {
    return (
      <Alerta tono="advertencia">
        Solo se puede modificar una compra en estado Registrada.{" "}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => navigate(`/compras/${datos.compra?.compra.id ?? ""}`)}
        >
          Volver al detalle de la compra
        </button>
      </Alerta>
    );
  }

  const productos = datos.catalogo;
  const pedidoSeleccionado = datos.pedidos.find(
    (pedido) => pedido.pedido.id === pedidoId,
  );

  const cambiarItem = (clave: number, cambios: Partial<ItemCompraForm>) => {
    setItems((anteriores) =>
      anteriores.map((item) =>
        item.clave === clave ? { ...item, ...cambios } : item,
      ),
    );
    setErrores({});
  };

  const seleccionarProducto = (clave: number, productoId: string) => {
    const producto = productos.find((candidato) => candidato.id === productoId);
    cambiarItem(clave, {
      productoId,
      precioUnitario: producto ? String(producto.precio) : "",
    });
  };

  const agregarItem = () => {
    const usados = new Set(items.map((item) => item.productoId));
    const disponible = productos.find((producto) => !usados.has(producto.id));
    const nuevo = crearItem(siguienteClave.current);
    siguienteClave.current += 1;
    if (disponible) {
      nuevo.productoId = disponible.id;
      nuevo.precioUnitario = String(disponible.precio);
    }
    setItems((anteriores) => [...anteriores, nuevo]);
  };

  const quitarItem = (clave: number) => {
    setItems((anteriores) => anteriores.filter((item) => item.clave !== clave));
    setErrores({});
  };

  const seleccionarPedido = (nuevoPedidoId: string) => {
    setPedidoId(nuevoPedidoId);
    setErrores({});
    if (!nuevoPedidoId) {
      siguienteClave.current = 2;
      setItems([crearItem(1)]);
      return;
    }
    const pedido = datos.pedidos.find(
      (candidato) => candidato.pedido.id === nuevoPedidoId,
    );
    if (!pedido) return;
    const nuevosItems = pedido.detalles.map((detalle, indice) => ({
      clave: indice + 1,
      productoId: detalle.productoId,
      cantidad: String(detalle.cantidad),
      precioUnitario: String(detalle.producto.precio),
    }));
    siguienteClave.current = nuevosItems.length + 1;
    setItems(nuevosItems);
  };

  const guardar = async () => {
    setErrorGeneral(null);
    if (items.length === 0) {
      setErrores({ items: "Agregá al menos un producto a la compra." });
      return;
    }
    const preparados: Array<{
      productoId: string;
      cantidad: number;
      precioUnitario: number;
    }> = [];
    const nuevosErrores: Record<string, string> = {};
    const vistos = new Set<string>();
    items.forEach((item) => {
      if (!item.productoId) {
        nuevosErrores[`producto-${item.clave}`] = "Seleccioná un producto.";
        return;
      }
      if (vistos.has(item.productoId)) {
        nuevosErrores[`producto-${item.clave}`] =
          "El producto ya está en la compra.";
        return;
      }
      vistos.add(item.productoId);
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        nuevosErrores[`cantidad-${item.clave}`] =
          "Ingresá una cantidad entera mayor que cero.";
        return;
      }
      const precioUnitario = Number(item.precioUnitario);
      if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
        nuevosErrores[`precio-${item.clave}`] =
          "Ingresá un precio unitario mayor que cero.";
        return;
      }
      preparados.push({ productoId: item.productoId, cantidad, precioUnitario });
    });
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setGuardando(true);
    try {
      if (esEdicion && id) {
        await actualizarCompra(id, { items: preparados });
        mostrarToast("Compra modificada.");
        navigate(`/compras/${id}`);
      } else {
        const nueva = await crearCompra({
          sucursalId,
          pedidoId: pedidoId || null,
          items: preparados,
        });
        mostrarToast("Compra registrada.");
        navigate(`/compras/${nueva.compra.id}`);
      }
    } catch (motivo) {
      setErrorGeneral(
        motivo instanceof Error ? motivo.message : "No se pudo guardar la compra.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => navigate(esEdicion && id ? `/compras/${id}` : "/compras")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {esEdicion ? "Volver a la compra" : "Volver a compras"}
      </button>

      <EncabezadoPagina
        titulo={esEdicion ? "Modificar compra" : "Nueva compra"}
        descripcion={
          esEdicion
            ? "Actualizá los productos, cantidades y precios mientras la compra esté Registrada."
            : "Registrá la compra a la Droguería Central, con o sin pedido de origen."
        }
      />

      {errorGeneral && (
        <Alerta tono="error" className="mb-4">
          {errorGeneral}
        </Alerta>
      )}

      <Tarjeta className="mb-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <ShoppingCart className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            {esEdicion ? (
              <>
                <p className="font-medium text-ink-900">
                  Droguería Central
                </p>
                <p className="text-xs text-ink-500">
                  {datos.compra?.pedido
                    ? `Compra originada en el pedido del ${formatearFechaHora(datos.compra.pedido.fecha)}.`
                    : "Compra sin pedido de origen."}
                </p>
              </>
            ) : (
              <Campo
                etiqueta="Pedido de origen"
                htmlFor="compra-pedido"
                ayuda="Opcional. Si elegís un pedido Enviado, se cargan sus productos y cantidades."
              >
                <Select
                  id="compra-pedido"
                  value={pedidoId}
                  onChange={(event) => seleccionarPedido(event.target.value)}
                >
                  <option value="">Sin pedido</option>
                  {datos.pedidos.map((pedido) => (
                    <option key={pedido.pedido.id} value={pedido.pedido.id}>
                      Pedido del {formatearFechaHora(pedido.pedido.fecha)} ·{" "}
                      {pedido.detalles.length} producto(s)
                    </option>
                  ))}
                </Select>
              </Campo>
            )}
          </div>
        </div>
        {pedidoSeleccionado && !esEdicion && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
            Se cargaron {pedidoSeleccionado.detalles.length} producto(s) del
            pedido. Podés ajustar cantidades y precios antes de registrar la
            compra.
          </p>
        )}
      </Tarjeta>

      <Tarjeta>
        <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
          <h2 className="font-semibold text-ink-950">Productos de la compra</h2>
          <Boton variante="secundario" tamano="sm" onClick={agregarItem}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar producto
          </Boton>
        </div>

        <div className="space-y-3 p-4">
          {errores.items && <Alerta tono="error">{errores.items}</Alerta>}
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-300 px-4 py-8 text-center text-sm text-ink-500">
              Agregá al menos un producto a la compra.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item, indice) => {
                const usados = new Set(
                  items
                    .filter((otro) => otro.clave !== item.clave)
                    .map((otro) => otro.productoId),
                );
                const calculado = itemsCalculados.find(
                  (candidato) => candidato.clave === item.clave,
                );
                return (
                  <li
                    key={item.clave}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-ink-200 p-3 sm:grid-cols-[minmax(0,1fr)_6.5rem_8rem_8rem_auto] sm:items-end"
                  >
                    <Campo
                      etiqueta={`Producto ${indice + 1}`}
                      htmlFor={`compra-producto-${item.clave}`}
                      error={errores[`producto-${item.clave}`]}
                    >
                      <Select
                        id={`compra-producto-${item.clave}`}
                        value={item.productoId}
                        onChange={(event) =>
                          seleccionarProducto(item.clave, event.target.value)
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
                              {producto.nombre} — {producto.marca}
                            </option>
                          ))}
                      </Select>
                    </Campo>
                    <Campo
                      etiqueta="Cantidad"
                      htmlFor={`compra-cantidad-${item.clave}`}
                      error={errores[`cantidad-${item.clave}`]}
                    >
                      <Input
                        id={`compra-cantidad-${item.clave}`}
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
                    <Campo
                      etiqueta="Precio unitario"
                      htmlFor={`compra-precio-${item.clave}`}
                      error={errores[`precio-${item.clave}`]}
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                          $
                        </span>
                        <Input
                          id={`compra-precio-${item.clave}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(event) =>
                            cambiarItem(item.clave, {
                              precioUnitario: event.target.value,
                            })
                          }
                          className="pl-7 tabular-nums"
                          error={Boolean(errores[`precio-${item.clave}`])}
                        />
                      </div>
                    </Campo>
                    <div className="pb-1 text-sm sm:text-right">
                      <p className="text-xs font-medium text-ink-500">Subtotal</p>
                      <p className="mt-1 font-semibold tabular-nums text-ink-900">
                        {formatearMoneda(calculado?.subtotal ?? 0)}
                      </p>
                    </div>
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Total de la compra
            </p>
            <p className="text-xl font-semibold tabular-nums text-ink-950">
              {formatearMoneda(total)}
            </p>
          </div>
          <div className="flex gap-2">
            <Boton
              variante="secundario"
              onClick={() => navigate(esEdicion && id ? `/compras/${id}` : "/compras")}
            >
              Cancelar
            </Boton>
            <Boton onClick={guardar} cargando={guardando}>
              <Save className="h-4 w-4" aria-hidden />
              {esEdicion ? "Guardar cambios" : "Registrar compra"}
            </Boton>
          </div>
        </div>
      </Tarjeta>
    </div>
  );
}
