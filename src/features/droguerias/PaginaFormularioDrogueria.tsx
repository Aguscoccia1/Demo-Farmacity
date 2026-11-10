import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import {
  actualizarDrogueria,
  crearDrogueria,
  obtenerDrogueria,
} from "../../mock/api/droguerias";
import {
  drogueriaSchema,
  type DrogueriaForm,
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

export function PaginaFormularioDrogueria() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const [errorApi, setErrorApi] = useState<string | null>(null);

  const cargar = useCallback(
    () => (id ? obtenerDrogueria(id) : Promise.resolve(null)),
    [id],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DrogueriaForm>({
    resolver: zodResolver(drogueriaSchema),
    defaultValues: {
      nombre: "",
      cuit: "",
      telefono: "",
      direccion: "",
      email: "",
    },
  });

  useEffect(() => {
    if (datos) {
      reset({
        nombre: datos.nombre,
        cuit: datos.cuit,
        telefono: datos.telefono,
        direccion: datos.direccion,
        email: datos.email,
      });
    }
  }, [datos, reset]);

  const enviar = async (formulario: DrogueriaForm) => {
    setErrorApi(null);
    try {
      if (esEdicion && id) {
        await actualizarDrogueria(id, formulario);
        mostrarToast("Droguería modificada.");
      } else {
        await crearDrogueria(formulario);
        mostrarToast("Droguería registrada.");
      }
      navigate("/droguerias");
    } catch (motivo) {
      setErrorApi(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo guardar la droguería.",
      );
    }
  };

  if (cargando) return <Cargando texto="Cargando droguería…" />;
  if (error || (esEdicion && !datos)) {
    return (
      <Alerta tono="error">
        {error ?? "La droguería no existe."}{" "}
        <button
          type="button"
          className="underline"
          onClick={() => navigate("/droguerias")}
        >
          Volver a droguerías
        </button>
      </Alerta>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate("/droguerias")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a droguerías
      </button>

      <EncabezadoPagina
        titulo={esEdicion ? "Modificar droguería" : "Nueva droguería"}
        descripcion={
          esEdicion
            ? "Actualizá los datos de contacto de la droguería."
            : "Registrá los datos de la droguería para las compras y pedidos."
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
              htmlFor="drogueria-nombre"
              error={errors.nombre?.message}
              requerido
              className="sm:col-span-2"
            >
              <Input
                id="drogueria-nombre"
                error={Boolean(errors.nombre)}
                {...register("nombre")}
              />
            </Campo>
            <Campo
              etiqueta="CUIT"
              htmlFor="drogueria-cuit"
              error={errors.cuit?.message}
              requerido
            >
              <Input
                id="drogueria-cuit"
                error={Boolean(errors.cuit)}
                {...register("cuit")}
              />
            </Campo>
            <Campo
              etiqueta="Teléfono"
              htmlFor="drogueria-telefono"
              error={errors.telefono?.message}
              requerido
            >
              <Input
                id="drogueria-telefono"
                type="tel"
                error={Boolean(errors.telefono)}
                {...register("telefono")}
              />
            </Campo>
            <Campo
              etiqueta="Dirección"
              htmlFor="drogueria-direccion"
              error={errors.direccion?.message}
              requerido
              className="sm:col-span-2"
            >
              <Input
                id="drogueria-direccion"
                error={Boolean(errors.direccion)}
                {...register("direccion")}
              />
            </Campo>
            <Campo
              etiqueta="Correo electrónico"
              htmlFor="drogueria-email"
              error={errors.email?.message}
              requerido
              className="sm:col-span-2"
            >
              <Input
                id="drogueria-email"
                type="email"
                error={Boolean(errors.email)}
                {...register("email")}
              />
            </Campo>
          </div>
          <div className="mt-6 flex justify-end gap-2 border-t border-ink-200 pt-4">
            <Boton variante="secundario" onClick={() => navigate("/droguerias")}>
              Cancelar
            </Boton>
            <Boton type="submit" cargando={isSubmitting}>
              <Save className="h-4 w-4" aria-hidden />
              {esEdicion ? "Guardar cambios" : "Registrar droguería"}
            </Boton>
          </div>
        </form>
      </Tarjeta>
    </div>
  );
}
