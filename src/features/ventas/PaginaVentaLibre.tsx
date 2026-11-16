import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Cliente, VentaCompleta } from "../../domain/types";
import type { ProductoConStock } from "../../mock/api/comun";
import { categoriaDe } from "../../mock/api/comun";
import { admiteVentaLibre, redondearMonto } from "../../domain/rules";
import {
  actualizarVentaLibre,
  anularVenta,
  crearVentaLibre,
  obtenerProductosConStock,
  obtenerVenta,
} from "../../mock/api/ventas";
import { listarClientes } from "../../mock/api/clientes";
import { formatearMoneda } from "../../lib/format";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Buscador,
  Campo,
  Cargando,
  ConfirmarDialogo,
  EncabezadoPagina,
  Input,
  Select,
  Tarjeta,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";
import { medicamentoVencido } from "../../domain/fechas";
import { formatearFecha } from "../../lib/format";

interface ItemSeleccionado {
  productoId: string;
  cantidad: number;
}

interface DatosVentaLibre {
  clientes: Cliente[];
  catalogo: ProductoConStock[];
  venta: VentaCompleta | null;
}

export function PaginaVentaLibre() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const sucursalId = useSucursalActiva();
  const inicializado = useRef(false);

  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState<ItemSeleccionado[]>([]);
  const [descuento, setDescuento] = useState("0");
  const [busqueda, setBusqueda] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [anularAbierto, setAnularAbierto] = useState(false);
  const [anulando, setAnulando] = useState(false);

  const cargar = useCallback(async (): Promise<DatosVentaLibre> => {
    const [clientes, catalogo, venta] = await Promise.all([
      listarClientes(),
      obtenerProductosConStock(sucursalId),
      id ? obtenerVenta(id) : Promise.resolve(null),
    ]);
    return { clientes, catalogo, venta };
  }, [sucursalId, id]);
  const { datos, cargando, error } = useConsulta(cargar);

  useEffect(() => {
    if (!datos?.venta || inicializado.current) return;
    const venta = datos.venta;
    setClienteId(venta.cliente.id);
    setItems(
      venta.detalles.map((detalle) => ({
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
      })),
    );
    setDescuento(String(venta.venta.descuento));
    inicializado.current = true;
  }, [datos]);

  const productosVentaLibre = useMemo(
    () =>
      (datos?.catalogo ?? []).filter((producto) =>
        admiteVentaLibre(producto),
      ),
    [datos],
  );

  const clienteSeleccionado = datos?.clientes.find(
    (cliente) => cliente.id === clienteId,
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return productosVentaLibre;
    return productosVentaLibre.filter((producto) =>
      `${producto.nombre} ${producto.marca} ${categoriaDe(producto)}`
        .toLowerCase()
        .includes(texto),
    );
  }, [busqueda, productosVentaLibre]);

  const itemsDetallados = useMemo(
    () =>
      items.flatMap((item) => {
        const producto = productosVentaLibre.find(
          (candidato) => candidato.id === item.productoId,
        );
        if (!producto) return [];
        return [
          {
            ...item,
            producto,
            precioUnitario: producto.precio,
            subtotal: redondearMonto(item.cantidad * producto.precio),
          },
        ];
      }),
    [items, productosVentaLibre],
  );

  const subtotal = redondearMonto(
    itemsDetallados.reduce((acc, item) => acc + item.subtotal, 0),
  );
  const descuentoNumero = Number(descuento);
  const descuentoAplicado =
    Number.isFinite(descuentoNumero) && descuentoNumero > 0
      ? Math.min(descuentoNumero, subtotal)
      : 0;
  const total = redondearMonto(subtotal - descuentoAplicado);

  const agregarProducto = (producto: ProductoConStock) => {
    if (producto.tipoProducto === "Medicamento" && medicamentoVencido(producto)) return;
    setErrores({});
    setItems((anteriores) => {
      const existente = anteriores.find(
        (item) => item.productoId === producto.id,
      );
      if (existente) {
        if (existente.cantidad >= producto.stockActual) return anteriores;
        return anteriores.map((item) =>
          item.productoId === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      if (producto.stockActual < 1) return anteriores;
      return [...anteriores, { productoId: producto.id, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (productoId: string, delta: number) => {
    setItems((anteriores) =>
      anteriores.flatMap((item) => {
        if (item.productoId !== productoId) return [item];
        const producto = productosVentaLibre.find(
          (candidato) => candidato.id === productoId,
        );
        if (delta > 0 && producto?.tipoProducto === "Medicamento" && medicamentoVencido(producto)) return [item];
        const limite = producto?.stockActual ?? 0;
        const nueva = Math.min(limite, item.cantidad + delta);
        if (nueva <= 0) return [];
        return [{ ...item, cantidad: nueva }];
      }),
    );
  };

  const validar = (): boolean => {
    const nuevos: Record<string, string> = {};
    if (!clienteId) nuevos.clienteId = "Seleccioná un cliente.";
    if (items.length === 0) nuevos.items = "Agregá al menos un producto.";
    const numero = Number(descuento);
    if (descuento.trim() && (!Number.isFinite(numero) || numero < 0)) {
      nuevos.descuento = "Ingresá un descuento válido.";
    } else if (numero > subtotal) {
      nuevos.descuento = "El descuento no puede superar el subtotal.";
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const guardar = async () => {
    setErrorGeneral(null);
    if (!validar()) return;
    setGuardando(true);
    try {
      const payload = {
        clienteId,
        sucursalId,
        descuento: descuentoAplicado,
        items: items.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
        })),
      };
      if (esEdicion && id) {
        await actualizarVentaLibre(id, payload);
        mostrarToast("Venta libre modificada.");
      } else {
        await crearVentaLibre(payload);
        mostrarToast("Venta libre registrada. Queda pendiente de cobro.");
      }
      navigate("/ventas-libres");
    } catch (motivo) {
      setErrorGeneral(
        motivo instanceof Error ? motivo.message : "No se pudo registrar la venta.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const confirmarAnulacion = async () => {
    if (!id) return;
    setAnulando(true);
    try {
      await anularVenta(id);
      setAnularAbierto(false);
      mostrarToast("Venta anulada.");
      navigate("/ventas-libres");
    } catch (motivo) {
      setErrorGeneral(
        motivo instanceof Error ? motivo.message : "No se pudo anular la venta.",
      );
    } finally {
      setAnulando(false);
    }
  };

  if (cargando) return <Cargando texto="Cargando la venta…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "No se pudo cargar la venta."}{" "}
        <button type="button" className="underline" onClick={() => navigate("/ventas-libres")}>
          Volver a ventas libres
        </button>
      </Alerta>
    );
  }
  if (
    esEdicion &&
    datos.venta &&
    (datos.venta.estado.nombre !== "Registrada" ||
      datos.venta.venta.tipoVenta !== "Venta libre")
  ) {
    return (
      <Alerta tono="advertencia">
        Solo se puede modificar una venta libre en estado Registrada.{" "}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => navigate("/ventas-libres")}
        >
          Volver al listado
        </button>
      </Alerta>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/ventas-libres")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a ventas libres
      </button>
      <EncabezadoPagina
        titulo={esEdicion ? "Modificar venta libre" : "Nueva venta libre"}
        descripcion="Seleccioná el cliente y los productos disponibles: de venta libre y medicamentos que no requieren receta. La venta queda pendiente de cobro."
        acciones={
          esEdicion ? (
            <Boton variante="peligro" onClick={() => setAnularAbierto(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Anular venta
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
            <UserRound className="h-4 w-4" aria-hidden />
          </div>
          <div className="w-full max-w-xl">
            <Campo
              etiqueta="Cliente"
              htmlFor="venta-libre-cliente"
              error={errores.clienteId}
              requerido
            >
              <Select
                id="venta-libre-cliente"
                value={clienteId}
                onChange={(event) => {
                  setClienteId(event.target.value);
                  setErrores((anteriores) => {
                    const siguientes = { ...anteriores };
                    delete siguientes.clienteId;
                    return siguientes;
                  });
                }}
                error={Boolean(errores.clienteId)}
              >
                <option value="">Seleccioná un cliente</option>
                {datos.clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.apellido}, {cliente.nombre} — DNI {cliente.dni}
                  </option>
                ))}
              </Select>
            </Campo>
          </div>
        </div>
        {clienteSeleccionado && (
          <p className="mt-2 pl-12 text-xs text-ink-500">
            {clienteSeleccionado.telefono} · {clienteSeleccionado.email}
          </p>
        )}
      </Tarjeta>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Tarjeta className="xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-ink-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-ink-950">
                <ShoppingBag className="h-4 w-4 text-brand-700" aria-hidden />
                Productos disponibles
              </h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Productos de venta libre y medicamentos que no requieren receta.
                No se pueden agregar productos sin disponibilidad.
              </p>
            </div>
            <Buscador
              valor={busqueda}
              onChange={setBusqueda}
              placeholder="Nombre, marca o categoría"
              etiqueta="Buscar productos"
              className="w-full sm:max-w-xs"
            />
          </div>
          {errores.items && (
            <div className="px-4 pt-3">
              <Alerta tono="advertencia">{errores.items}</Alerta>
            </div>
          )}
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-ink-500">
              <Search className="h-6 w-6 text-ink-300" aria-hidden />
              No encontramos productos con esa búsqueda.
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {filtrados.map((producto) => {
                const enVenta = items.find(
                  (item) => item.productoId === producto.id,
                );
                const vencido = producto.tipoProducto === "Medicamento" && medicamentoVencido(producto);
                const disponible = !vencido && producto.stockActual > (enVenta?.cantidad ?? 0);
                return (
                  <li
                    key={producto.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink-900">{producto.nombre}</p>
                        {vencido && <Badge tono="rojo">Vencido</Badge>}
                        {producto.tipoProducto === "Medicamento" ? (
                          <Badge tono="azul">Medicamento sin receta</Badge>
                        ) : (
                          <Badge tono="gris">{categoriaDe(producto)}</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-ink-500">
                        {producto.descripcion}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {producto.marca} · {producto.codigoBarras}
                      </p>
                      {producto.tipoProducto === "Medicamento" && (
                        <p className="mt-0.5 text-xs text-ink-500">Laboratorio: {producto.laboratorio} · Vencimiento: {formatearFecha(producto.fechaVencimiento)}</p>
                      )}
                      <p className="mt-1 text-sm font-medium text-ink-800">
                        {formatearMoneda(producto.precio)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        tono={
                          producto.stockActual === 0
                            ? "rojo"
                            : producto.stockActual < producto.stockMinimo
                              ? "amarillo"
                              : "verde"
                        }
                      >
                        Stock: {producto.stockActual}
                      </Badge>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => agregarProducto(producto)}
                        disabled={!disponible}
                        aria-label={`Agregar ${producto.nombre}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Agregar
                      </Boton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        <aside className="h-fit rounded-xl border border-ink-200 bg-white p-4 shadow-card xl:sticky xl:top-24">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink-950">Venta</h2>
            <Badge tono="gris">{items.length} producto(s)</Badge>
          </div>
          {itemsDetallados.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-ink-300 px-3 py-6 text-center text-sm text-ink-500">
              Agregá productos del catálogo.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {itemsDetallados.map((item) => (
                <li
                  key={item.productoId}
                  className="rounded-lg border border-ink-200 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {item.producto.nombre}
                      </p>
                      <p className="text-xs text-ink-500">{item.producto.marca}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      onClick={() => cambiarCantidad(item.productoId, -item.cantidad)}
                      aria-label={`Quitar ${item.producto.nombre} de la venta`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.productoId, -1)}
                        className="rounded border border-ink-200 p-1 text-ink-600 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        aria-label={`Quitar una unidad de ${item.producto.nombre}`}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.productoId, 1)}
                        disabled={item.cantidad >= item.producto.stockActual || (item.producto.tipoProducto === "Medicamento" && medicamentoVencido(item.producto))}
                        className="rounded border border-ink-200 p-1 text-ink-600 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        aria-label={`Agregar una unidad de ${item.producto.nombre}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatearMoneda(item.subtotal)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-ink-200 pt-4">
            <Campo
              etiqueta="Descuento"
              htmlFor="descuento-venta-libre"
              error={errores.descuento}
              ayuda="Opcional. No puede superar el subtotal."
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  $
                </span>
                <Input
                  id="descuento-venta-libre"
                  type="number"
                  min={0}
                  max={subtotal}
                  step="0.01"
                  value={descuento}
                  onChange={(event) => {
                    setDescuento(event.target.value);
                    setErrores((anteriores) => {
                      const siguientes = { ...anteriores };
                      delete siguientes.descuento;
                      return siguientes;
                    });
                  }}
                  className="pl-7"
                  error={Boolean(errores.descuento)}
                />
              </div>
            </Campo>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular-nums text-ink-800">
                  {formatearMoneda(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Descuento</dt>
                <dd className="tabular-nums text-ink-800">
                  − {formatearMoneda(descuentoAplicado)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-2 text-base font-semibold">
                <dt className="text-ink-900">Total</dt>
                <dd className="tabular-nums text-ink-950">{formatearMoneda(total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-ink-500">
              La venta quedará pendiente de cobro en caja.
            </p>
            <Boton className="mt-4 w-full" onClick={guardar} cargando={guardando}>
              <Check className="h-4 w-4" aria-hidden />
              {esEdicion ? "Guardar cambios" : "Registrar venta"}
            </Boton>
          </div>
        </aside>
      </div>

      <ConfirmarDialogo
        abierto={anularAbierto}
        titulo="Anular venta"
        descripcion="La venta quedará anulada y no podrá cobrarse. Esta acción no se puede deshacer."
        textoConfirmar="Anular venta"
        peligro
        cargando={anulando}
        onConfirmar={confirmarAnulacion}
        onCerrar={() => setAnularAbierto(false)}
      />
    </div>
  );
}
