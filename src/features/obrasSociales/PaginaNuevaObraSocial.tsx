import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { crearObraSocial } from "../../mock/api/obrasSociales";
import {
  obraSocialSchema,
  type ObraSocialForm,
} from "../../domain/validation";
import {
  Alerta,
  Boton,
  Campo,
  EncabezadoPagina,
  Input,
  Tarjeta,
} from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";

export function PaginaNuevaObraSocial() {
  const navigate = useNavigate();
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ObraSocialForm>({
    resolver: zodResolver(obraSocialSchema),
    defaultValues: {
      nombre: "",
      sigla: "",
      telefono: "",
      porcentajeCobertura: 0,
    },
  });

  const enviar = async (formulario: ObraSocialForm) => {
    setErrorApi(null);
    try {
      await crearObraSocial(formulario);
      mostrarToast("Obra social registrada.");
      navigate("/obras-sociales");
    } catch (motivo) {
      setErrorApi(
        motivo instanceof Error
          ? motivo.message
          : "No se pudo registrar la obra social.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => navigate("/obras-sociales")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a obras sociales
      </button>
      <EncabezadoPagina
        titulo="Nueva obra social"
        descripcion="Registrá el nombre, la sigla, el teléfono y la cobertura."
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
              className="sm:col-span-2"
            >
              <Input
                id="nombre"
                error={Boolean(errors.nombre)}
                {...register("nombre")}
              />
            </Campo>
            <Campo
              etiqueta="Sigla"
              htmlFor="sigla"
              error={errors.sigla?.message}
              requerido
            >
              <Input
                id="sigla"
                error={Boolean(errors.sigla)}
                {...register("sigla")}
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
                error={Boolean(errors.telefono)}
                {...register("telefono")}
              />
            </Campo>
            <Campo
              etiqueta="Porcentaje de cobertura"
              htmlFor="porcentajeCobertura"
              error={errors.porcentajeCobertura?.message}
              ayuda="Entre 0 y 100."
              requerido
            >
              <div className="relative">
                <Input
                  id="porcentajeCobertura"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="pr-8"
                  error={Boolean(errors.porcentajeCobertura)}
                  {...register("porcentajeCobertura", { valueAsNumber: true })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                  %
                </span>
              </div>
            </Campo>
          </div>
          <div className="mt-6 flex justify-end gap-2 border-t border-ink-200 pt-4">
            <Boton variante="secundario" onClick={() => navigate("/obras-sociales")}>
              Cancelar
            </Boton>
            <Boton type="submit" cargando={isSubmitting}>
              <Save className="h-4 w-4" aria-hidden />
              Registrar obra social
            </Boton>
          </div>
        </form>
      </Tarjeta>
    </div>
  );
}
