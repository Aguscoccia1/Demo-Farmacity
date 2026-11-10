import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import {
  actualizarCliente,
  crearCliente,
  obtenerCliente,
} from "../../mock/api/clientes";
import {
  clienteSchema,
  type ClienteForm,
} from "../../domain/validation";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Boton,
  Campo,
  Cargando,
  EncabezadoPagina,
  Input,
  Tarjeta,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";

export function PaginaFormularioCliente() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const cargar = useCallback(
    () => (id ? obtenerCliente(id) : Promise.resolve(null)),
    [id],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      dni: "",
      telefono: "",
      email: "",
      direccion: "",
    },
  });

  useEffect(() => {
    if (datos) {
      reset({
        nombre: datos.nombre,
        apellido: datos.apellido,
        dni: datos.dni,
        telefono: datos.telefono,
        email: datos.email,
        direccion: datos.direccion,
      });
    }
  }, [datos, reset]);

  const enviar = async (formulario: ClienteForm) => {
    setErrorApi(null);
    try {
      if (esEdicion && id) {
        await actualizarCliente(id, formulario);
        mostrarToast("Cliente modificado.");
      } else {
        await crearCliente(formulario);
        mostrarToast("Cliente registrado.");
      }
      navigate("/clientes");
    } catch (motivo) {
      setErrorApi(
        motivo instanceof Error ? motivo.message : "No se pudo guardar el cliente.",
      );
    }
  };

  if (cargando) return <Cargando texto="Cargando cliente…" />;
  if (error || (esEdicion && !datos)) {
    return (
      <Alerta tono="error">
        {error ?? "El cliente no existe."}{" "}
        <button type="button" className="underline" onClick={() => navigate("/clientes")}>
          Volver a clientes
        </button>
      </Alerta>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate("/clientes")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a clientes
      </button>
      <EncabezadoPagina
        titulo={esEdicion ? "Modificar cliente" : "Nuevo cliente"}
        descripcion={
          esEdicion
            ? "Actualizá los datos de contacto y la identificación del cliente."
            : "Completá los datos del cliente para registrarlo."
        }
      />

      <Tarjeta className="p-5 sm:p-6">
        {errorApi && (
          <Alerta tono="error" className="mb-5">
            {errorApi}
          </Alerta>
        )}
        <form onSubmit={handleSubmit(enviar)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Nombre"
              htmlFor="nombre"
              error={errors.nombre?.message}
              requerido
            >
              <Input
                id="nombre"
                autoComplete="given-name"
                error={Boolean(errors.nombre)}
                {...register("nombre")}
              />
            </Campo>
            <Campo
              etiqueta="Apellido"
              htmlFor="apellido"
              error={errors.apellido?.message}
              requerido
            >
              <Input
                id="apellido"
                autoComplete="family-name"
                error={Boolean(errors.apellido)}
                {...register("apellido")}
              />
            </Campo>
            <Campo
              etiqueta="DNI"
              htmlFor="dni"
              error={errors.dni?.message}
              ayuda="7 u 8 dígitos, sin puntos."
              requerido
            >
              <Input
                id="dni"
                inputMode="numeric"
                maxLength={8}
                error={Boolean(errors.dni)}
                {...register("dni")}
              />
            </Campo>
            <Campo
              etiqueta="Teléfono"
              htmlFor="telefono"
              error={errors.telefono?.message}
              requerido
            >
              <Input
                id="telefono"
                type="tel"
                autoComplete="tel"
                error={Boolean(errors.telefono)}
                {...register("telefono")}
              />
            </Campo>
            <Campo
              etiqueta="Correo electrónico"
              htmlFor="email"
              error={errors.email?.message}
              requerido
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                error={Boolean(errors.email)}
                {...register("email")}
              />
            </Campo>
            <Campo
              etiqueta="Dirección"
              htmlFor="direccion"
              error={errors.direccion?.message}
              requerido
            >
              <Input
                id="direccion"
                autoComplete="street-address"
                error={Boolean(errors.direccion)}
                {...register("direccion")}
              />
            </Campo>
          </div>
          <div className="mt-6 flex justify-end gap-2 border-t border-ink-200 pt-4">
            <Boton variante="secundario" onClick={() => navigate("/clientes")}>
              Cancelar
            </Boton>
            <Boton type="submit" cargando={isSubmitting}>
              <Save className="h-4 w-4" aria-hidden />
              {esEdicion ? "Guardar cambios" : "Registrar cliente"}
            </Boton>
          </div>
        </form>
      </Tarjeta>
    </div>
  );
}
