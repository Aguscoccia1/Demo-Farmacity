import { z } from "zod";

const textoRequerido = (mensaje: string) =>
  z.string().trim().min(1, mensaje);

const fechaIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida.");

const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida (HH:mm).");

export const clienteSchema = z.object({
  nombre: textoRequerido("Ingresá el nombre."),
  apellido: textoRequerido("Ingresá el apellido."),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos."),
  telefono: textoRequerido("Ingresá el teléfono."),
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  direccion: textoRequerido("Ingresá la dirección."),
});

export type ClienteForm = z.infer<typeof clienteSchema>;

export const turnoSchema = z.object({
  clienteId: textoRequerido("Seleccioná un cliente."),
  fecha: fechaIso,
  hora,
});

export type TurnoForm = z.infer<typeof turnoSchema>;

export const obraSocialSchema = z.object({
  nombre: textoRequerido("Ingresá el nombre de la obra social."),
  sigla: textoRequerido("Ingresá la sigla."),
  telefono: textoRequerido("Ingresá el teléfono."),
  porcentajeCobertura: z
    .number({ invalid_type_error: "Ingresá un porcentaje." })
    .min(0, "La cobertura mínima es 0%.")
    .max(100, "La cobertura máxima es 100%."),
});

export type ObraSocialForm = z.infer<typeof obraSocialSchema>;

export const recetaSchema = z.object({
  fecha: fechaIso,
  fechaVencimiento: fechaIso,
  medico: textoRequerido("Ingresá el nombre del médico."),
  matriculaMedico: textoRequerido("Ingresá la matrícula del médico."),
});

export type RecetaForm = z.infer<typeof recetaSchema>;

export const drogueriaSchema = z.object({
  nombre: textoRequerido("Ingresá el nombre."),
  cuit: textoRequerido("Ingresá el CUIT."),
  telefono: textoRequerido("Ingresá el teléfono."),
  direccion: textoRequerido("Ingresá la dirección."),
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
});

export type DrogueriaForm = z.infer<typeof drogueriaSchema>;

export function validarConEsquema<T>(
  schema: z.ZodSchema<T>,
  datos: unknown,
): T {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) {
    throw new Error(resultado.error.issues[0]?.message ?? "Datos inválidos.");
  }
  return resultado.data;
}
