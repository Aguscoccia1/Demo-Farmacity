import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Minus,
  Pill,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { format } from "date-fns";
import type {
  Cliente,
  ObraSocial,
  VentaCompleta,
} from "../../domain/types";
import type { ProductoConStock } from "../../mock/api/comun";
import {
  buscarGenericoEquivalente,
  calcularImporteCobro,
  calcularMontoCubierto,
  esRecetaValida,
  redondearMonto,
} from "../../domain/rules";
import {
  recetaSchema,
  type RecetaForm,
} from "../../domain/validation";
import {
  actualizarVentaConReceta,
  anularVenta,
  crearVentaConReceta,
  obtenerProductosConStock,
  obtenerVenta,
} from "../../mock/api/ventas";
import { listarClientes } from "../../mock/api/clientes";
import { listarObrasSociales } from "../../mock/api/obrasSociales";
import { formatearFecha, formatearMoneda } from "../../lib/format";
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
  Modal,
  Select,
  Tarjeta,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";
import { medicamentoVencido } from "../../domain/fechas";

interface ItemSeleccionado {
  productoId: string;
  cantidad: number;
}

type MedicamentoConStock = Extract<
  ProductoConStock,
  { tipoProducto: "Medicamento" }
>;

interface DatosVenta {
  clientes: Cliente[];
  obrasSociales: ObraSocial[];
  catalogo: ProductoConStock[];
  venta: VentaCompleta | null;
}

const PASOS = [
  "Cliente",
  "Obra social",
  "Receta",
  "Medicamentos",
  "Descuento",
  "Resumen",
];

function recetaInicial(): RecetaForm {
  return {
    fecha: format(new Date(), "yyyy-MM-dd"),
    fechaVencimiento: "",
    medico: "",
    matriculaMedico: "",
  };
}

export function PaginaVentaConReceta() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const sucursalId = useSucursalActiva();
  const inicializado = useRef(false);

  const [paso, setPaso] = useState(1);
  const [clienteId, setClienteId] = useState("");
  const [obraSocialId, setObraSocialId] = useState("");
  const [receta, setReceta] = useState<RecetaForm>(recetaInicial);
  const [items, setItems] = useState<ItemSeleccionado[]>([]);
  const [descuento, setDescuento] = useState("0");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [genericoPara, setGenericoPara] = useState<MedicamentoConStock | null>(
    null,
  );
  const [anularAbierto, setAnularAbierto] = useState(false);
  const [anulando, setAnulando] = useState(false);

  const cargar = useCallback(async (): Promise<DatosVenta> => {
    const [clientes, obrasSociales, catalogo, venta] = await Promise.all([
      listarClientes(),
      listarObrasSociales(),
      obtenerProductosConStock(sucursalId),
      id ? obtenerVenta(id) : Promise.resolve(null),
    ]);
    return { clientes, obrasSociales, catalogo, venta };
  }, [sucursalId, id]);

  const { datos, cargando, error } = useConsulta(cargar);

  useEffect(() => {
    if (!datos?.venta || inicializado.current) return;
    const venta = datos.venta;
    setClienteId(venta.cliente.id);
    setObraSocialId(venta.obraSocial?.id ?? "sin-obra");
    if (venta.receta) {
      setReceta({
        fecha: venta.receta.fecha,
        fechaVencimiento: venta.receta.fechaVencimiento,
        medico: venta.receta.medico,
        matriculaMedico: venta.receta.matriculaMedico,
      });
    }
    setItems(
      venta.detalles.map((detalle) => ({
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
      })),
    );
    setDescuento(String(venta.venta.descuento));
    inicializado.current = true;
  }, [datos]);

  const medicamentos = useMemo(
    () =>
      (datos?.catalogo ?? []).filter(
        (producto) => producto.tipoProducto === "Medicamento",
      ),
    [datos],
  );

  const clienteSeleccionado = datos?.clientes.find(
    (cliente) => cliente.id === clienteId,
  );
  const obraSeleccionada = datos?.obrasSociales.find(
    (obra) => obra.id === obraSocialId,
  );
  const porcentajeCobertura =
    obraSocialId && obraSocialId !== "sin-obra"
      ? (obraSeleccionada?.porcentajeCobertura ?? null)
      : null;

  const itemsDetallados = useMemo(
    () =>
      items.flatMap((item) => {
        const producto = medicamentos.find(
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
    [items, medicamentos],
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
  const montoCubierto = calcularMontoCubierto(total, porcentajeCobertura);
  const importeACobrar = calcularImporteCobro(total, montoCubierto);

  const productosFiltrados = useMemo(() => {
    const texto = busquedaProducto.trim().toLowerCase();
    if (!texto) return medicamentos;
    return medicamentos.filter((producto) =>
      `${producto.nombre} ${producto.marca} ${producto.principioActivo} ${producto.presentacion}`
        .toLowerCase()
        .includes(texto),
    );
  }, [medicamentos, busquedaProducto]);

  const stockPorProducto = useMemo(
    () =>
      new Map(
        medicamentos.map((producto) => [producto.id, producto.stockActual]),
      ),
    [medicamentos],
  );

  const actualizarReceta = (campo: keyof RecetaForm, valor: string) => {
    setReceta((anterior) => ({ ...anterior, [campo]: valor }));
    setErrores((anteriores) => {
      const siguientes = { ...anteriores };
      delete siguientes[campo];
      return siguientes;
    });
  };

  const validarReceta = (): boolean => {
    const resultado = recetaSchema.safeParse(receta);
    if (!resultado.success) {
      const nuevos: Record<string, string> = {};
      resultado.error.issues.forEach((issue) => {
        const campo = String(issue.path[0] ?? "receta");
        if (!nuevos[campo]) nuevos[campo] = issue.message;
      });
      setErrores(nuevos);
      return false;
    }
    if (!esRecetaValida(receta)) {
      setErrores({
        fechaVencimiento:
          "La receta está vencida. La fecha de vencimiento debe ser hoy o posterior.",
      });
      return false;
    }
    setErrores({});
    return true;
  };

  const continuar = () => {
    setErrorGeneral(null);
    if (paso === 1) {
      if (!clienteId) {
        setErrores({ clienteId: "Seleccioná un cliente." });
        return;
      }
      setErrores({});
    }
    if (paso === 2) {
      if (!obraSocialId) {
        setErrores({ obraSocialId: "Seleccioná una obra social o indicá que no tiene." });
        return;
      }
      setErrores({});
    }
    if (paso === 3 && !validarReceta()) return;
    if (paso === 4) {
      if (itemsDetallados.length === 0) {
        setErrores({ items: "Agregá al menos un medicamento." });
        return;
      }
      const stockInsuficiente = itemsDetallados.find(
        (item) => item.cantidad > item.producto.stockActual,
      );
      if (stockInsuficiente) {
        setErrores({
          items: `No hay stock suficiente de ${stockInsuficiente.producto.nombre}.`,
        });
        return;
      }
      setErrores({});
    }
    if (paso === 5) {
      if (!descuento.trim()) {
        setDescuento("0");
      } else {
        const numero = Number(descuento);
        if (!Number.isFinite(numero) || numero < 0) {
          setErrores({ descuento: "Ingresá un descuento válido." });
          return;
        }
        if (numero > subtotal) {
          setErrores({
            descuento: `El descuento no puede superar el subtotal (${formatearMoneda(subtotal)}).`,
          });
          return;
        }
      }
      setErrores({});
    }
    setPaso((actual) => Math.min(6, actual + 1));
  };

  const volver = () => {
    setErrorGeneral(null);
    setErrores({});
    setPaso((actual) => Math.max(1, actual - 1));
  };

  const agregarProducto = (producto: ProductoConStock) => {
    if (producto.tipoProducto === "Medicamento" && medicamentoVencido(producto)) return;
    setErrores({});
    setItems((anteriores) => {
      const existente = anteriores.find(
        (item) => item.productoId === producto.id,
      );
      if (existente) {
        if (existente.cantidad >= producto.stockActual) {
          setErrores({
            items: `No hay más stock de ${producto.nombre}. Disponible: ${producto.stockActual}.`,
          });
          return anteriores;
        }
        return anteriores.map((item) =>
          item.productoId === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      if (producto.stockActual < 1) {
        setErrores({
          items: `No hay stock de ${producto.nombre}. Podés ofrecer un genérico equivalente.`,
        });
        return anteriores;
      }
      return [...anteriores, { productoId: producto.id, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (productoId: string, delta: number) => {
    setItems((anteriores) =>
      anteriores.flatMap((item) => {
        if (item.productoId !== productoId) return [item];
        const producto = medicamentos.find(
          (candidato) => candidato.id === productoId,
        );
        if (delta > 0 && producto && medicamentoVencido(producto)) return [item];
        const limite = producto?.stockActual ?? 0;
        const nueva = Math.min(limite, item.cantidad + delta);
        if (nueva <= 0) return [];
        return [{ ...item, cantidad: nueva }];
      }),
    );
  };

  const abrirGenerico = (producto: ProductoConStock) => {
    if (producto.tipoProducto === "Medicamento") setGenericoPara(producto);
  };

  const genericoEquivalente = genericoPara
    ? buscarGenericoEquivalente(
        genericoPara,
        medicamentos,
        stockPorProducto,
        1,
      )
    : null;

  const aceptarGenerico = () => {
    if (!genericoEquivalente) return;
    const candidato = medicamentos.find(
      (producto) => producto.id === genericoEquivalente.id,
    );
    if (candidato) agregarProducto(candidato);
    setGenericoPara(null);
    mostrarToast("Genérico equivalente agregado a la venta.");
  };

  const disponibleParaAgregar = (producto: ProductoConStock): boolean => {
    const existente = items.find((item) => item.productoId === producto.id);
    return !(producto.tipoProducto === "Medicamento" && medicamentoVencido(producto)) && producto.stockActual > (existente?.cantidad ?? 0);
  };

  const guardarVenta = async () => {
    setErrorGeneral(null);
    if (!clienteSeleccionado) {
      setPaso(1);
      setErrores({ clienteId: "Seleccioná un cliente." });
      return;
    }
    if (itemsDetallados.length === 0) {
      setPaso(4);
      setErrores({ items: "Agregá al menos un medicamento." });
      return;
    }
    setGuardando(true);
    try {
      const datosVenta = {
        clienteId,
        sucursalId,
        obraSocialId:
          obraSocialId === "sin-obra" ? null : obraSocialId,
        descuento: descuentoAplicado,
        items: items.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
        })),
        receta: {
          fecha: receta.fecha,
          fechaVencimiento: receta.fechaVencimiento,
          medico: receta.medico,
          matriculaMedico: receta.matriculaMedico,
        },
      };
      if (esEdicion && id) {
        await actualizarVentaConReceta(id, datosVenta);
        mostrarToast("Venta con receta modificada.");
      } else {
        await crearVentaConReceta(datosVenta);
        mostrarToast("Venta registrada. Queda pendiente de cobro.");
      }
      navigate("/ventas/receta");
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
      navigate("/ventas/receta");
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
        <button type="button" className="underline" onClick={() => navigate("/ventas/receta")}>
          Volver a ventas con receta
        </button>
      </Alerta>
    );
  }

  if (
    esEdicion &&
    datos.venta &&
    (datos.venta.estado.nombre !== "Registrada" ||
      datos.venta.venta.tipoVenta !== "Con receta")
  ) {
    return (
      <div>
        <Alerta tono="advertencia">
          Solo se puede modificar una venta con receta en estado Registrada.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => navigate("/ventas/receta")}
          >
            Volver al listado
          </button>
        </Alerta>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/ventas/receta")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a ventas con receta
      </button>
      <EncabezadoPagina
        titulo={esEdicion ? "Modificar venta con receta" : "Nueva venta con receta"}
        descripcion="Completá el proceso de mostrador. La venta queda registrada y pendiente de cobro."
        acciones={
          esEdicion ? (
            <Boton
              variante="peligro"
              onClick={() => setAnularAbierto(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Anular venta
            </Boton>
          ) : undefined
        }
      />

      <ol className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-card">
        {PASOS.map((nombre, indice) => {
          const numero = indice + 1;
          const completado = numero < paso;
          const activo = numero === paso;
          return (
            <li
              key={nombre}
              aria-current={activo ? "step" : undefined}
              className={`flex min-w-fit flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-xs sm:text-sm ${
                activo
                  ? "bg-brand-50 font-medium text-brand-900"
                  : completado
                    ? "text-brand-700"
                    : "text-ink-400"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  completado
                    ? "bg-brand-600 text-white"
                    : activo
                      ? "bg-brand-100 text-brand-800 ring-1 ring-brand-300"
                      : "bg-ink-100 text-ink-500"
                }`}
              >
                {completado ? <Check className="h-3.5 w-3.5" aria-hidden /> : numero}
              </span>
              {nombre}
            </li>
          );
        })}
      </ol>

      {errorGeneral && (
        <Alerta tono="error" className="mb-5">
          {errorGeneral}
        </Alerta>
      )}

      <Tarjeta className="p-5 sm:p-6">
        {paso === 1 && (
          <div className="mx-auto max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <UserRound className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold text-ink-950">Cliente</h2>
                <p className="text-sm text-ink-500">
                  La venta debe quedar asociada a un cliente.
                </p>
              </div>
            </div>
            <Campo
              etiqueta="Cliente"
              htmlFor="venta-cliente"
              error={errores.clienteId}
              requerido
            >
              <Select
                id="venta-cliente"
                value={clienteId}
                onChange={(event) => {
                  setClienteId(event.target.value);
                  setErrores({});
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
            {clienteSeleccionado && (
              <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm">
                <p className="font-medium text-ink-900">
                  {clienteSeleccionado.apellido}, {clienteSeleccionado.nombre}
                </p>
                <p className="mt-1 text-ink-500">DNI {clienteSeleccionado.dni}</p>
                <p className="text-ink-500">{clienteSeleccionado.telefono}</p>
                <p className="text-ink-500">{clienteSeleccionado.direccion}</p>
              </div>
            )}
          </div>
        )}

        {paso === 2 && (
          <div className="mx-auto max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold text-ink-950">Obra social</h2>
                <p className="text-sm text-ink-500">
                  Consultá la cobertura antes de continuar con la receta.
                </p>
              </div>
            </div>
            <Campo
              etiqueta="Obra social"
              htmlFor="venta-obra-social"
              error={errores.obraSocialId}
              requerido
            >
              <Select
                id="venta-obra-social"
                value={obraSocialId}
                onChange={(event) => {
                  setObraSocialId(event.target.value);
                  setErrores({});
                }}
                error={Boolean(errores.obraSocialId)}
              >
                <option value="">Seleccioná una opción</option>
                <option value="sin-obra">Sin obra social</option>
                {datos.obrasSociales.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.sigla} — {obra.porcentajeCobertura}% de cobertura
                  </option>
                ))}
              </Select>
            </Campo>
            {obraSeleccionada && (
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
                <p className="font-semibold">{obraSeleccionada.nombre}</p>
                <p className="mt-1">
                  Cobertura:{" "}
                  <strong>{obraSeleccionada.porcentajeCobertura}%</strong> ·
                  Teléfono: {obraSeleccionada.telefono}
                </p>
                <p className="mt-2 text-xs text-brand-700">
                  El monto cubierto se calcula sobre el total de la venta.
                </p>
              </div>
            )}
            {obraSocialId === "sin-obra" && (
              <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm text-ink-600">
                La venta no tendrá cobertura de obra social.
              </div>
            )}
          </div>
        )}

        {paso === 3 && (
          <div className="mx-auto max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <FileText className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold text-ink-950">Receta</h2>
                <p className="text-sm text-ink-500">
                  La receta debe estar vigente y tener médico y matrícula.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Fecha de la receta"
                htmlFor="receta-fecha"
                error={errores.fecha}
                requerido
              >
                <Input
                  id="receta-fecha"
                  type="date"
                  value={receta.fecha}
                  onChange={(event) => actualizarReceta("fecha", event.target.value)}
                  error={Boolean(errores.fecha)}
                />
              </Campo>
              <Campo
                etiqueta="Fecha de vencimiento"
                htmlFor="receta-vencimiento"
                error={errores.fechaVencimiento}
                requerido
              >
                <Input
                  id="receta-vencimiento"
                  type="date"
                  value={receta.fechaVencimiento}
                  onChange={(event) =>
                    actualizarReceta("fechaVencimiento", event.target.value)
                  }
                  error={Boolean(errores.fechaVencimiento)}
                />
              </Campo>
              <Campo
                etiqueta="Médico"
                htmlFor="receta-medico"
                error={errores.medico}
                requerido
              >
                <Input
                  id="receta-medico"
                  value={receta.medico}
                  onChange={(event) => actualizarReceta("medico", event.target.value)}
                  placeholder="Nombre y apellido del médico"
                  error={Boolean(errores.medico)}
                />
              </Campo>
              <Campo
                etiqueta="Matrícula del médico"
                htmlFor="receta-matricula"
                error={errores.matriculaMedico}
                requerido
              >
                <Input
                  id="receta-matricula"
                  value={receta.matriculaMedico}
                  onChange={(event) =>
                    actualizarReceta("matriculaMedico", event.target.value)
                  }
                  placeholder="Ej.: MP-12345"
                  error={Boolean(errores.matriculaMedico)}
                />
              </Campo>
            </div>
          </div>
        )}

        {paso === 4 && (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Pill className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-semibold text-ink-950">Medicamentos</h2>
                  <p className="text-sm text-ink-500">
                    Agregá productos controlando el stock de la sucursal activa.
                  </p>
                </div>
              </div>
              <Buscador
                valor={busquedaProducto}
                onChange={setBusquedaProducto}
                placeholder="Buscar medicamento o principio activo"
                etiqueta="Buscar medicamentos"
                className="w-full sm:max-w-sm"
              />
            </div>

            {errores.items && (
              <Alerta tono="advertencia" className="mb-4">
                {errores.items}
              </Alerta>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="space-y-2 xl:col-span-2">
                {productosFiltrados.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">
                    No encontramos medicamentos con esa búsqueda.
                  </div>
                ) : (
                  productosFiltrados.map((producto) => {
                    const existente = items.find(
                      (item) => item.productoId === producto.id,
                    );
                    const puedeAgregar = disponibleParaAgregar(producto);
                    const generico =
                      producto.stockActual === 0
                        ? buscarGenericoEquivalente(
                            producto,
                            medicamentos,
                            stockPorProducto,
                            1,
                          )
                        : null;
                    return (
                      <div
                        key={producto.id}
                        className="flex flex-col gap-3 rounded-lg border border-ink-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-ink-900">{producto.nombre}</p>
                            {medicamentoVencido(producto) && <Badge tono="rojo">Vencido</Badge>}
                            {producto.requiereReceta && (
                              <Badge tono="azul">Requiere receta</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-ink-500">
                            {producto.marca} · {producto.presentacion} ·{" "}
                            {producto.concentracion}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            Principio activo: {producto.principioActivo}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            Laboratorio: {producto.laboratorio} · Vencimiento: {formatearFecha(producto.fechaVencimiento)}
                          </p>
                          <p className="mt-1 text-sm font-medium text-ink-800">
                            {formatearMoneda(producto.precio)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                            disabled={!puedeAgregar}
                            aria-label={`Agregar ${producto.nombre} de ${producto.marca}`}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            {existente ? `Agregar otro` : "Agregar"}
                          </Boton>
                          {producto.stockActual === 0 && generico && (
                            <Boton
                              variante="suave"
                              tamano="sm"
                              onClick={() => abrirGenerico(producto)}
                            >
                              Ofrecer genérico
                            </Boton>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <aside className="h-fit rounded-lg border border-ink-200 bg-ink-50 p-4 xl:sticky xl:top-24">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink-900">
                    Medicamentos de la venta
                  </h3>
                  <Badge tono="gris">{items.length}</Badge>
                </div>
                {itemsDetallados.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">
                    Todavía no agregaste medicamentos.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {itemsDetallados.map((item) => (
                      <li
                        key={item.productoId}
                        className="rounded-lg border border-ink-200 bg-white p-3"
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
                            onClick={() => cambiarCantidad(item.productoId, -item.cantidad)}
                            className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
                              disabled={item.cantidad >= item.producto.stockActual || medicamentoVencido(item.producto)}
                              className="rounded border border-ink-200 p-1 text-ink-600 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                              aria-label={`Agregar una unidad de ${item.producto.nombre}`}
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                          <span className="text-sm font-medium tabular-nums text-ink-800">
                            {formatearMoneda(item.subtotal)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 border-t border-ink-200 pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Subtotal</span>
                    <span className="font-medium tabular-nums text-ink-900">
                      {formatearMoneda(subtotal)}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {paso === 5 && (
          <div className="mx-auto max-w-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Pill className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold text-ink-950">Descuento</h2>
                <p className="text-sm text-ink-500">
                  El descuento es opcional. Se resta del subtotal de la venta.
                </p>
              </div>
            </div>
            <Campo
              etiqueta="Descuento"
              htmlFor="venta-descuento"
              error={errores.descuento}
              ayuda={`Podés ingresar un monto entre 0 y ${formatearMoneda(subtotal)}.`}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  $
                </span>
                <Input
                  id="venta-descuento"
                  type="number"
                  min={0}
                  max={subtotal}
                  step="0.01"
                  value={descuento}
                  onChange={(event) => {
                    setDescuento(event.target.value);
                    setErrores({});
                  }}
                  className="pl-7"
                  error={Boolean(errores.descuento)}
                />
              </div>
            </Campo>
            <div className="mt-5 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Subtotal</span>
                <span className="tabular-nums text-ink-800">
                  {formatearMoneda(subtotal)}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-ink-500">Descuento</span>
                <span className="tabular-nums text-ink-800">
                  − {formatearMoneda(descuentoAplicado)}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-ink-200 pt-2 font-semibold">
                <span className="text-ink-800">Total</span>
                <span className="tabular-nums text-ink-950">
                  {formatearMoneda(total)}
                </span>
              </div>
            </div>
          </div>
        )}

        {paso === 6 && (
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Check className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold text-ink-950">Resumen de la venta</h2>
                <p className="text-sm text-ink-500">
                  Revisá la información antes de registrar la venta.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="rounded-lg border border-ink-200 p-4 text-sm">
                  <h3 className="font-semibold text-ink-900">Cliente y cobertura</h3>
                  <p className="mt-2 font-medium text-ink-900">
                    {clienteSeleccionado?.apellido}, {clienteSeleccionado?.nombre}
                  </p>
                  <p className="text-ink-500">DNI {clienteSeleccionado?.dni}</p>
                  <p className="mt-2 text-ink-700">
                    {obraSocialId === "sin-obra"
                      ? "Sin obra social"
                      : `${obraSeleccionada?.sigla ?? ""} — ${porcentajeCobertura ?? 0}% de cobertura`}
                  </p>
                </div>

                <div className="rounded-lg border border-ink-200 p-4 text-sm">
                  <h3 className="font-semibold text-ink-900">Receta</h3>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-ink-400">Fecha</p>
                      <p className="text-ink-800">{formatearFecha(receta.fecha)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-400">Vencimiento</p>
                      <p className="text-ink-800">{formatearFecha(receta.fechaVencimiento)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-400">Médico</p>
                      <p className="text-ink-800">{receta.medico}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-400">Matrícula</p>
                      <p className="text-ink-800">{receta.matriculaMedico}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-ink-200">
                  <table className="tabla-base">
                    <thead>
                      <tr>
                        <th>Medicamento</th>
                        <th className="text-right">Cantidad</th>
                        <th className="text-right">Precio unitario</th>
                        <th className="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsDetallados.map((item) => (
                        <tr key={item.productoId}>
                          <td>
                            <span className="font-medium text-ink-900">
                              {item.producto.nombre}
                            </span>
                            <span className="block text-xs text-ink-500">
                              {item.producto.marca}
                            </span>
                          </td>
                          <td className="text-right tabular-nums">{item.cantidad}</td>
                          <td className="text-right tabular-nums">
                            {formatearMoneda(item.precioUnitario)}
                          </td>
                          <td className="text-right tabular-nums">
                            {formatearMoneda(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="h-fit rounded-lg border border-ink-200 bg-ink-50 p-4">
                <h3 className="text-sm font-semibold text-ink-900">Totales</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Subtotal</dt>
                    <dd className="tabular-nums text-ink-800">
                      {formatearMoneda(subtotal)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Descuento</dt>
                    <dd className="tabular-nums text-ink-800">
                      − {formatearMoneda(descuentoAplicado)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-ink-200 pt-2 font-medium">
                    <dt className="text-ink-800">Total</dt>
                    <dd className="tabular-nums text-ink-950">
                      {formatearMoneda(total)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Monto cubierto</dt>
                    <dd className="tabular-nums text-ink-800">
                      {formatearMoneda(montoCubierto)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 rounded-lg bg-brand-100 px-3 py-2 font-semibold text-brand-900">
                    <dt>Importe a cobrar</dt>
                    <dd className="tabular-nums">{formatearMoneda(importeACobrar)}</dd>
                  </div>
                </dl>
                <Alerta tono="info" className="mt-3">
                  La venta quedará <strong>Registrada y pendiente de cobro</strong>.
                </Alerta>
              </aside>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-ink-200 pt-4">
          <Boton
            variante="secundario"
            onClick={paso === 1 ? () => navigate("/ventas/receta") : volver}
            disabled={guardando}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {paso === 1 ? "Cancelar" : "Volver"}
          </Boton>
          {paso < 6 ? (
            <Boton onClick={continuar}>
              Continuar
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Boton>
          ) : (
            <Boton onClick={guardarVenta} cargando={guardando}>
              <Check className="h-4 w-4" aria-hidden />
              {esEdicion ? "Guardar cambios" : "Registrar venta"}
            </Boton>
          )}
        </div>
      </Tarjeta>

      <Modal
        abierto={Boolean(genericoPara)}
        titulo="Genérico equivalente"
        descripcion={
          genericoPara
            ? `No hay stock de ${genericoPara.nombre}.`
            : undefined
        }
        onCerrar={() => setGenericoPara(null)}
        ancho="md"
        pie={
          <>
            <Boton variante="secundario" onClick={() => setGenericoPara(null)}>
              Cancelar
            </Boton>
            <Boton onClick={aceptarGenerico} disabled={!genericoEquivalente}>
              Ofrecer genérico
            </Boton>
          </>
        }
      >
        {genericoEquivalente ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            <p className="font-semibold">
              {genericoEquivalente.nombre} — {genericoEquivalente.marca}
            </p>
            <p className="mt-1">
              Mismo principio activo: <strong>{genericoEquivalente.principioActivo}</strong>
            </p>
            <p className="mt-1">
              Presentación: {genericoEquivalente.presentacion} ·{" "}
              {genericoEquivalente.concentracion}
            </p>
            <p className="mt-1">
              Precio: {formatearMoneda(genericoEquivalente.precio)} · Stock:{" "}
              {stockPorProducto.get(genericoEquivalente.id) ?? 0}
            </p>
          </div>
        ) : (
          <Alerta tono="advertencia">
            No hay otro medicamento con el mismo principio activo y stock
            disponible.
          </Alerta>
        )}
      </Modal>

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
