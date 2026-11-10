import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuthStore } from "../auth/store";
import { puedeAccederRuta } from "./routes";
import { Boton } from "../components/ui";

export function RutaProtegida() {
  const usuario = useAuthStore((estado) => estado.usuario);
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  if (!puedeAccederRuta(usuario.rol, location.pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-ink-200 bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <ShieldAlert className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-ink-950">Acceso restringido</h1>
          <p className="mt-2 text-sm text-ink-500">
            Tu rol ({usuario.rol}) no tiene permiso para ingresar a esta
            sección.
          </p>
          <Link to="/" className="mt-6 inline-flex">
            <Boton>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Ir al inicio
            </Boton>
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export function PaginaNoEncontrada() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-ink-200 bg-white p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-ink-950">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          La dirección que buscás no está disponible.
        </p>
        <Link to="/" className="mt-6 inline-flex">
          <Boton>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Ir al inicio
          </Boton>
        </Link>
      </div>
    </div>
  );
}
