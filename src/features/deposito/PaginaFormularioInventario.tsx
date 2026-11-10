import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import type { ProductoConStock } from "../../mock/api/comun";
import {
  actualizarInventario,
  crearInventario,
  obtenerInventario,
} from "../../mock/api/inventario";
import { listarCatalogoConStock } from "../../mock/api/catalogos";
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

interface DatosFormulario {
  productos: ProductoConStock[];
  inventario: Awaited<ReturnType<typeof obtenerInventario>> | null;
}

interface ErroresFormulario {
  productoId?: string;
  stockActual?: string;
  stockMinimo?: string;
  stockMaximo?: string;
}

function numeroEntero(valor: string): number {
  return Number(valor);
}

export function PaginaFormularioInventario() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();

  const [productoId, setProductoId] = useState("");
  const [stockActual, setStockActual] = useState("0");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [stockMaximo, setStockMaximo] = useState("0");
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (): Promise<DatosFormulario> => {
    const [productos, inventario] = await Promise.all([
      listarCatalogoConStock(sucursalId),
      id ? obtenerInventario(id) : Promise.resolve(null),
    ]);
    return { productos, inventario };
  }, [sucursalId, id]);
  const { datos, cargando, error } = useConsulta(cargar);

  useEffect(() => {
    if (!datos?.inventario) return;
    setProductoId(datos.inventario.productoId);
    setStockActual(String(datos.inventario.stockActual));
    setStockMinimo(String(datos.inventario.stockMinimo));
    setStockMaximo(String(datos.inventario.stockMaximo));
  }, [datos]);

  if (cargando) return <Cargando texto="Cargando inventario…" />;
  if (error || !datos) {
    return (
      <Alerta tono="error">
        {error ?? "No se pudo cargar el inventario."}{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate("/inventario")}
        >
          Volver a inventario
        </button>
      </Alerta>
    );
  }

  if (esEdicion && !datos.inventario) {
    return (
      <Alerta tono="error">
        El registro de inventario no existe.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate("/inventario")}
        >
          Volver a inventario
        </button>
      </Alerta>
    );
  }

  const productosDisponibles = esEdicion
    ? []
    : datos.productos.filter((producto) => producto.inventarioId === null);

  const validar = (): {
    stockActual: number;
    stockMinimo: number;
    stockMaximo: number;
  } | null => {
    const nuevos: ErroresFormulario = {};
    if (!esEdicion && !productoId) {
      nuevos.productoId = "Seleccioná un producto.";
    }
    const actual = numeroEntero(stockActual);
    const minimo = numeroEntero(stockMinimo);
    const maximo = numeroEntero(stockMaximo);
    if (!Number.isInteger(actual) || actual < 0) {
      nuevos.stockActual = "Ingresá un entero mayor o igual a cero.";
    }
    if (!Number.isInteger(minimo) || minimo < 0) {
      nuevos.stockMinimo = "Ingresá un entero mayor o igual a cero.";
    }
    if (!Number.isInteger(maximo) || maximo < 0) {
      nuevos.stockMaximo = "Ingresá un entero mayor o igual a cero.";
    }
    if (!nuevos.stockMinimo && !nuevos.stockMaximo && minimo > maximo) {
      nuevos.stockMinimo = "El stock mínimo no puede superar al máximo.";
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return null;
    return { stockActual: actual, stockMinimo: minimo, stockMaximo: maximo };
  };

  const guardar = async () => {
    setErrorGeneral(null);
    const valores = validar();
    if (!valores) return;
    setGuardando(true);
    try {
      if (esEdicion && id) {
        await actualizarInventario(id, valores);
        mostrarToast("Inventario modificado.");
      } else {
        await crearInventario({
          productoId,
          sucursalId,
          ...valores,
        });
        mostrarToast("Inventario registrado.");
      }
      navigate("/inventario");
    } catch (motivo) {
      setErrorGeneral(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo guardar el inventario.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate("/inventario")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a inventario
      </button>

      <EncabezadoPagina
        titulo={esEdicion ? "Modificar inventario" : "Nuevo registro de inventario"}
        descripcion={
          esEdicion
            ? "Actualizá el stock actual, mínimo y máximo del producto en la sucursal activa."
            : "Seleccioná un producto sin inventario en la sucursal activa y definí sus niveles de stock."
        }
      />

      <Tarjeta className="p-5 sm:p-6">
        {errorGeneral && (
          <Alerta tono="error" className="mb-5">
            {errorGeneral}
          </Alerta>
        )}

        {!esEdicion && productosDisponibles.length === 0 ? (
          <Alerta tono="advertencia" titulo="No hay productos disponibles">
            Todos los productos ya tienen inventario en esta sucursal. Podés
            modificar los registros existentes desde el listado de inventario.
          </Alerta>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              {esEdicion && datos.inventario ? (
                <div className="rounded-lg bg-ink-50 p-4 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Producto
                  </p>
                  <p className="mt-0.5 font-medium text-ink-900">
                    {datos.inventario.producto.nombre}
                  </p>
                  <p className="text-xs text-ink-500">
                    {datos.inventario.producto.marca} ·{" "}
                    {datos.inventario.producto.tipoProducto} ·{" "}
                    {datos.inventario.producto.codigoBarras}
                  </p>
                </div>
              ) : (
                <Campo
                  etiqueta="Producto"
                  htmlFor="inventario-producto"
                  error={errores.productoId}
                  ayuda="Solo se listan productos que todavía no tienen inventario en la sucursal."
                  requerido
                >
                  <Select
                    id="inventario-producto"
                    value={productoId}
                    onChange={(event) => {
                      setProductoId(event.target.value);
                      setErrores((anteriores) => ({
                        ...anteriores,
                        productoId: undefined,
                      }));
                    }}
                    error={Boolean(errores.productoId)}
                  >
                    <option value="">Seleccioná un producto</option>
                    {productosDisponibles.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} — {producto.marca} ({producto.tipoProducto})
                      </option>
                    ))}
                  </Select>
                </Campo>
              )}
            </div>

            <Campo
              etiqueta="Stock actual"
              htmlFor="stock-actual"
              error={errores.stockActual}
              requerido
            >
              <Input
                id="stock-actual"
                type="number"
                min={0}
                step={1}
                value={stockActual}
                onChange={(event) => setStockActual(event.target.value)}
                error={Boolean(errores.stockActual)}
              />
            </Campo>
            <Campo
              etiqueta="Stock mínimo"
              htmlFor="stock-minimo"
              error={errores.stockMinimo}
              requerido
            >
              <Input
                id="stock-minimo"
                type="number"
                min={0}
                step={1}
                value={stockMinimo}
                onChange={(event) => setStockMinimo(event.target.value)}
                error={Boolean(errores.stockMinimo)}
              />
            </Campo>
            <Campo
              etiqueta="Stock máximo"
              htmlFor="stock-maximo"
              error={errores.stockMaximo}
              requerido
            >
              <Input
                id="stock-maximo"
                type="number"
                min={0}
                step={1}
                value={stockMaximo}
                onChange={(event) => setStockMaximo(event.target.value)}
                error={Boolean(errores.stockMaximo)}
              />
            </Campo>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-ink-200 pt-4">
          <Boton variante="secundario" onClick={() => navigate("/inventario")}>
            Cancelar
          </Boton>
          <Boton
            onClick={guardar}
            cargando={guardando}
            disabled={!esEdicion && productosDisponibles.length === 0}
          >
            <Save className="h-4 w-4" aria-hidden />
            {esEdicion ? "Guardar cambios" : "Registrar inventario"}
          </Boton>
        </div>
      </Tarjeta>
    </div>
  );
}
