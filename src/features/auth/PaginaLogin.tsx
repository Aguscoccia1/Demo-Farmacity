import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Cross, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../auth/store";
import { ErrorLogin, formatearRestante } from "../../auth/servicio";
import { USUARIOS_DEMO } from "../../auth/usuariosDemo";
import { CONFIG } from "../../config";
import { Boton, Campo, Input, Modal } from "../../components/ui";
import { mostrarToast } from "../../stores/toasts";

const esquemaLogin = z.object({
  usuario: z.string().trim().min(1, "Ingresá tu usuario."),
  contrasena: z.string().min(1, "Ingresá tu contraseña."),
});

type FormularioLogin = z.infer<typeof esquemaLogin>;

interface EstadoNavegacion {
  motivo?: "inactividad";
}

export function PaginaLogin() {
  const usuarioSesion = useAuthStore((estado) => estado.usuario);
  const iniciarSesion = useAuthStore((estado) => estado.iniciarSesion);
  const navigate = useNavigate();
  const location = useLocation();
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null);
  const [restante, setRestante] = useState(0);
  const [credencialesAbiertas, setCredencialesAbiertas] = useState(false);
  const motivo = (location.state as EstadoNavegacion | null)?.motivo;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormularioLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { usuario: "", contrasena: "" },
  });

  useEffect(() => {
    if (!bloqueadoHasta) return;
    const actualizar = () => {
      const milisegundos = bloqueadoHasta - Date.now();
      setRestante(Math.max(0, Math.ceil(milisegundos / 1000)));
      if (milisegundos <= 0) setBloqueadoHasta(null);
    };
    actualizar();
    const intervalo = window.setInterval(actualizar, 1000);
    return () => window.clearInterval(intervalo);
  }, [bloqueadoHasta]);

  if (usuarioSesion) {
    return <Navigate to="/" replace />;
  }

  const enviar = async (datos: FormularioLogin) => {
    setErrorLogin(null);
    try {
      await iniciarSesion(datos.usuario, datos.contrasena);
      mostrarToast("Sesión iniciada.");
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ErrorLogin) {
        setErrorLogin(error.message);
        setBloqueadoHasta(error.bloqueadoHasta ?? null);
      } else {
        setErrorLogin(
          error instanceof Error
            ? error.message
            : "No se pudo iniciar sesión.",
        );
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-ink-50">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-950 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #2f9f82 0, transparent 35%), radial-gradient(circle at 80% 80%, #145146 0, transparent 40%)",
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Cross className="h-6 w-6 text-brand-200" aria-hidden />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">Gestión de Farmacias</p>
            <p className="text-xs text-brand-200">Sistema interno</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-100 ring-1 ring-white/10">
            <Activity className="h-3.5 w-3.5" aria-hidden />
            Operación de mostrador y depósito
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Todo el trabajo de la farmacia, en un solo lugar.
          </h1>
          <p className="mt-4 text-sm leading-6 text-brand-100/80">
            Ventas con receta, cobros, stock, pedidos y compras con información
            actualizada de cada sucursal.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-xs text-brand-200/70">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Acceso según el rol de cada integrante del equipo.
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800">
              <Cross className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-ink-950">Gestión de Farmacias</p>
              <p className="text-xs text-ink-500">Sistema interno</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Ingresá con el usuario asignado a tu rol.
          </p>

          {motivo === "inactividad" && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900" role="status">
              Tu sesión se cerró por inactividad. Podés volver a ingresar.
            </div>
          )}

          <form onSubmit={handleSubmit(enviar)} className="mt-6 space-y-4" noValidate>
            <Campo etiqueta="Usuario" htmlFor="usuario" error={errors.usuario?.message} requerido>
              <Input
                id="usuario"
                autoComplete="username"
                autoFocus
                placeholder="Ej.: venta"
                error={Boolean(errors.usuario)}
                {...register("usuario")}
              />
            </Campo>
            <Campo
              etiqueta="Contraseña"
              htmlFor="contrasena"
              error={errors.contrasena?.message}
              requerido
            >
              <Input
                id="contrasena"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                error={Boolean(errors.contrasena)}
                {...register("contrasena")}
              />
            </Campo>

            {errorLogin && (
              <div
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
                role="alert"
              >
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p>{errorLogin}</p>
                  {restante > 0 && (
                    <p className="mt-1 font-medium">
                      Tiempo restante para reintentar:{" "}
                      {formatearRestante(restante * 1000)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Boton
              type="submit"
              className="w-full"
              cargando={isSubmitting}
              disabled={restante > 0}
            >
              Ingresar
              {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden />}
            </Boton>
          </form>

          <div className="mt-6 border-t border-ink-200 pt-5 text-center">
            <button
              type="button"
              onClick={() => setCredencialesAbiertas(true)}
              className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Usuarios de prueba
            </button>
            <p className="mt-1 text-xs text-ink-400">
              Credenciales disponibles para recorrer el sistema.
            </p>
          </div>
        </div>
      </div>

      <Modal
        abierto={credencialesAbiertas}
        titulo="Usuarios de prueba"
        descripcion="Elegí un rol para completar los datos de acceso."
        onCerrar={() => setCredencialesAbiertas(false)}
        ancho="lg"
      >
        <div className="overflow-x-auto rounded-lg border border-ink-200">
          <table className="tabla-base">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Usuario</th>
                <th>Contraseña</th>
                <th>
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {USUARIOS_DEMO.map((usuario) => (
                <tr key={usuario.usuario}>
                  <td>
                    <span className="font-medium text-ink-900">{usuario.rol}</span>
                    <span className="block text-xs text-ink-500">{usuario.nombre}</span>
                  </td>
                  <td className="font-mono text-xs">{usuario.usuario}</td>
                  <td className="font-mono text-xs">{usuario.contrasena}</td>
                  <td className="text-right">
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => {
                        setValue("usuario", usuario.usuario);
                        setValue("contrasena", usuario.contrasena);
                        setCredencialesAbiertas(false);
                      }}
                    >
                      Usar
                    </Boton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          El bloqueo se activa después de {CONFIG.maxIntentosFallidos} intentos
          fallidos y dura 5 minutos.
        </p>
      </Modal>
    </div>
  );
}
