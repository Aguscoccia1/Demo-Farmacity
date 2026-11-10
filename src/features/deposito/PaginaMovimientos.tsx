import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, CheckCircle2, PackageMinus, PackagePlus } from "lucide-react";
import {
  listarInventario,
  registrarMovimientoStock,
  type ResultadoMovimientoStock,
  type TipoMovimientoStock,
} from "../../mock/api/inventario";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Campo,
  Cargando,
  EncabezadoPagina,
  Input,
  Select,
  Tarjeta,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";

interface ResultadoConCantidad {
  movimiento: ResultadoMovimientoStock;
  cantidad: number;
  tipo: TipoMovimientoStock;
}

export function PaginaMovimientos() {
  const sucursalId = useSucursalActiva();
  const [tipo, setTipo] = useState<TipoMovimientoStock>("ingreso");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConCantidad | null>(null);

  const cargar = useCallback(
    () => listarInventario(sucursalId),
    [sucursalId],
  );
  const { datos, cargando, error, recargar } = useConsulta(cargar);

  const seleccionado = useMemo(
    () => datos?.find((fila) => fila.productoId === productoId) ?? null,
    [datos, productoId],
  );

  const registrar = async () => {
    setErrorGeneral(null);
    const nuevos: Record<string, string> = {};
    if (!productoId) nuevos.productoId = "Seleccioná un producto.";
    const valor = Number(cantidad);
    if (!Number.isInteger(valor) || valor <= 0) {
      nuevos.cantidad = "Ingresá una cantidad entera mayor que cero.";
    }
    if (
      tipo === "salida" &&
      seleccionado &&
      Number.isInteger(valor) &&
      valor > seleccionado.stockActual
    ) {
      nuevos.cantidad = `No hay stock suficiente. Disponible: ${seleccionado.stockActual}.`;
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      const movimiento = await registrarMovimientoStock({
        tipo,
        productoId,
        sucursalId,
        cantidad: valor,
      });
      setResultado({ movimiento, cantidad: valor, tipo });
      setCantidad("");
      mostrarToast(
        tipo === "ingreso"
          ? "Ingreso de mercadería registrado."
          : "Salida de productos registrada.",
      );
      recargar();
    } catch (motivo) {
      setErrorGeneral(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo registrar el movimiento.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Movimientos de stock"
        descripcion="Registrá salidas de productos del depósito o ingresos manuales de mercadería."
      />

      {resultado && (
        <Tarjeta className="mb-5 border-brand-200 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-ink-950">
                {resultado.tipo === "ingreso"
                  ? "Ingreso registrado"
                  : "Salida registrada"}
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                {resultado.movimiento.producto.nombre} · {resultado.cantidad}{" "}
                unidad(es) · stock resultante{" "}
                {resultado.movimiento.inventario.stockActual}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {resultado.movimiento.quedoBajoMinimo && (
                  <Badge tono="amarillo">Quedó bajo el stock mínimo</Badge>
                )}
                {resultado.movimiento.excedeMaximo && (
                  <Badge tono="azul">Supera el stock máximo</Badge>
                )}
                {!resultado.movimiento.quedoBajoMinimo &&
                  !resultado.movimiento.excedeMaximo && (
                    <Badge tono="verde">Stock dentro de los niveles definidos</Badge>
                  )}
              </div>
            </div>
          </div>
        </Tarjeta>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta className="p-5 lg:col-span-2">
          {errorGeneral && (
            <Alerta tono="error" className="mb-4">
              {errorGeneral}
            </Alerta>
          )}

          {cargando ? (
            <Cargando texto="Cargando productos…" />
          ) : error ? (
            <Alerta tono="error">{error}</Alerta>
          ) : !datos || datos.length === 0 ? (
            <Alerta tono="advertencia" titulo="No hay inventario en la sucursal">
              Para registrar movimientos primero tenés que dar de alta los
              productos en el inventario.{" "}
              <Link to="/inventario/nuevo" className="font-medium underline">
                Nuevo registro de inventario
              </Link>
            </Alerta>
          ) : (
            <div className="space-y-4">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink-700">
                  Tipo de movimiento
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      tipo === "ingreso"
                        ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-300"
                        : "border-ink-200 hover:border-ink-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo-movimiento"
                      value="ingreso"
                      checked={tipo === "ingreso"}
                      onChange={() => {
                        setTipo("ingreso");
                        setErrores({});
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="flex items-center gap-1.5 font-medium text-ink-900">
                        <PackagePlus className="h-4 w-4 text-brand-700" aria-hidden />
                        Ingreso manual
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        Suma unidades al stock del producto.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      tipo === "salida"
                        ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-300"
                        : "border-ink-200 hover:border-ink-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo-movimiento"
                      value="salida"
                      checked={tipo === "salida"}
                      onChange={() => {
                        setTipo("salida");
                        setErrores({});
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="flex items-center gap-1.5 font-medium text-ink-900">
                        <PackageMinus className="h-4 w-4 text-brand-700" aria-hidden />
                        Salida del depósito
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        Descuenta unidades del stock disponible.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Producto"
                  htmlFor="movimiento-producto"
                  error={errores.productoId}
                  requerido
                >
                  <Select
                    id="movimiento-producto"
                    value={productoId}
                    onChange={(event) => {
                      setProductoId(event.target.value);
                      setErrores((anteriores) => {
                        const siguientes = { ...anteriores };
                        delete siguientes.productoId;
                        return siguientes;
                      });
                    }}
                    error={Boolean(errores.productoId)}
                  >
                    <option value="">Seleccioná un producto</option>
                    {datos.map((fila) => (
                      <option key={fila.id} value={fila.productoId}>
                        {fila.producto.nombre} — {fila.producto.marca} (stock{" "}
                        {fila.stockActual})
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo
                  etiqueta="Cantidad"
                  htmlFor="movimiento-cantidad"
                  error={errores.cantidad}
                  ayuda={
                    tipo === "salida" && seleccionado
                      ? `Disponible: ${seleccionado.stockActual}.`
                      : undefined
                  }
                  requerido
                >
                  <Input
                    id="movimiento-cantidad"
                    type="number"
                    min={1}
                    step={1}
                    value={cantidad}
                    onChange={(event) => {
                      setCantidad(event.target.value);
                      setErrores((anteriores) => {
                        const siguientes = { ...anteriores };
                        delete siguientes.cantidad;
                        return siguientes;
                      });
                    }}
                    error={Boolean(errores.cantidad)}
                  />
                </Campo>
              </div>

              <div className="flex justify-end border-t border-ink-200 pt-4">
                <Boton onClick={registrar} cargando={guardando}>
                  <ArrowLeftRight className="h-4 w-4" aria-hidden />
                  Registrar movimiento
                </Boton>
              </div>
            </div>
          )}
        </Tarjeta>

        <aside className="h-fit rounded-xl border border-ink-200 bg-white p-4 shadow-card">
          <h2 className="font-semibold text-ink-950">Producto seleccionado</h2>
          {!seleccionado ? (
            <p className="mt-3 rounded-lg border border-dashed border-ink-300 px-3 py-6 text-center text-sm text-ink-500">
              Elegí un producto para ver su stock actual.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-medium text-ink-900">
                  {seleccionado.producto.nombre}
                </p>
                <p className="text-xs text-ink-500">
                  {seleccionado.producto.marca} ·{" "}
                  {seleccionado.producto.tipoProducto}
                </p>
                <p className="text-xs text-ink-500">
                  {seleccionado.producto.codigoBarras}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-xs">
                <div>
                  <dt className="text-ink-400">Actual</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink-800">
                    {seleccionado.stockActual}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400">Mínimo</dt>
                  <dd className="mt-0.5 tabular-nums text-ink-700">
                    {seleccionado.stockMinimo}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400">Máximo</dt>
                  <dd className="mt-0.5 tabular-nums text-ink-700">
                    {seleccionado.stockMaximo}
                  </dd>
                </div>
              </dl>
              <Link
                to={`/inventario/${seleccionado.id}/editar`}
                className="inline-flex text-sm font-medium text-brand-700 hover:underline"
              >
                Modificar niveles de stock
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
