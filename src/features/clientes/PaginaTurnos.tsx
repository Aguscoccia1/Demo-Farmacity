import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarClock, CalendarPlus } from "lucide-react";
import { crearTurno, listarClientes, listarTurnos } from "../../mock/api/clientes";
import { turnoSchema, type TurnoForm } from "../../domain/validation";
import { formatearFecha } from "../../lib/format";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Boton,
  Buscador,
  Campo,
  Cargando,
  EncabezadoPagina,
  Input,
  Modal,
  Select,
  Tarjeta,
  Vacio,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";

interface DatosTurnos {
  turnos: Awaited<ReturnType<typeof listarTurnos>>;
  clientes: Awaited<ReturnType<typeof listarClientes>>;
}

export function PaginaTurnos() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [errorApi, setErrorApi] = useState<string | null>(null);

  const cargar = useCallback(async (): Promise<DatosTurnos> => {
    const [turnos, clientes] = await Promise.all([listarTurnos(), listarClientes()]);
    return { turnos, clientes };
  }, []);
  const { datos, cargando, error, recargar } = useConsulta(cargar);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TurnoForm>({
    resolver: zodResolver(turnoSchema),
    defaultValues: {
      clienteId: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      hora: "",
    },
  });

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return datos.turnos;
    return datos.turnos.filter(({ cliente }) =>
      `${cliente.nombre} ${cliente.apellido} ${cliente.dni}`
        .toLowerCase()
        .includes(texto),
    );
  }, [datos, busqueda]);

  const abrir = () => {
    setErrorApi(null);
    reset({
      clienteId: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      hora: "",
    });
    setModalAbierto(true);
  };

  const enviar = async (formulario: TurnoForm) => {
    setErrorApi(null);
    try {
      await crearTurno(formulario);
      setModalAbierto(false);
      recargar();
      mostrarToast("Turno registrado.");
    } catch (motivo) {
      setErrorApi(
        motivo instanceof Error ? motivo.message : "No se pudo registrar el turno.",
      );
    }
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Turnos"
        descripcion="Registrá los turnos de atención de los clientes."
        acciones={
          <Boton onClick={abrir}>
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Nuevo turno
          </Boton>
        }
      />

      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por cliente o DNI"
            etiqueta="Buscar turnos"
            className="w-full sm:max-w-sm"
          />
          <p className="text-xs text-ink-500" aria-live="polite">
            {cargando ? "Cargando…" : `${filtrados.length} turno(s)`}
          </p>
        </div>

        {cargando ? (
          <Cargando texto="Cargando turnos…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={CalendarClock}
            titulo="No hay turnos registrados"
            descripcion="Los turnos agendados aparecerán en este listado."
            accion={<Boton onClick={abrir}>Registrar turno</Boton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(({ turno, cliente }) => (
                  <tr key={turno.id}>
                    <td>{formatearFecha(turno.fecha)}</td>
                    <td className="tabular-nums">{turno.hora}</td>
                    <td className="font-medium text-ink-900">
                      {cliente.apellido}, {cliente.nombre}
                    </td>
                    <td className="tabular-nums">{cliente.dni}</td>
                    <td>{cliente.telefono}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Modal
        abierto={modalAbierto}
        titulo="Nuevo turno"
        descripcion="Seleccioná el cliente, la fecha y el horario de atención."
        onCerrar={() => setModalAbierto(false)}
        pie={
          <>
            <Boton variante="secundario" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Boton>
            <Boton type="submit" form="formulario-turno" cargando={isSubmitting}>
              Registrar turno
            </Boton>
          </>
        }
      >
        {errorApi && (
          <Alerta tono="error" className="mb-4">
            {errorApi}
          </Alerta>
        )}
        <form
          id="formulario-turno"
          onSubmit={handleSubmit(enviar)}
          className="space-y-4"
          noValidate
        >
          <Campo
            etiqueta="Cliente"
            htmlFor="clienteId"
            error={errors.clienteId?.message}
            requerido
          >
            <Select
              id="clienteId"
              error={Boolean(errors.clienteId)}
              {...register("clienteId")}
            >
              <option value="">Seleccioná un cliente</option>
              {datos?.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.apellido}, {cliente.nombre} — DNI {cliente.dni}
                </option>
              ))}
            </Select>
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Fecha"
              htmlFor="fecha"
              error={errors.fecha?.message}
              requerido
            >
              <Input
                id="fecha"
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                error={Boolean(errors.fecha)}
                {...register("fecha")}
              />
            </Campo>
            <Campo
              etiqueta="Hora"
              htmlFor="hora"
              error={errors.hora?.message}
              requerido
            >
              <Input
                id="hora"
                type="time"
                error={Boolean(errors.hora)}
                {...register("hora")}
              />
            </Campo>
          </div>
        </form>
      </Modal>
    </div>
  );
}
