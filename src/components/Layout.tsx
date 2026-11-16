import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  Boxes,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Cross,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  ReceiptText,
  ScrollText,
  ShieldPlus,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { CONFIG } from "../config";
import type { Rol } from "../domain/types";
import { useAuthStore } from "../auth/store";
import { formatearRestante } from "../auth/servicio";
import { obtenerSucursales } from "../mock/api/catalogos";
import { useConsulta } from "../hooks/useConsulta";
import { useSucursalStore } from "../stores/sucursal";
import { Boton, Cargando, Modal } from "../components/ui";
import { ContenedorToasts } from "../components/ContenedorToasts";
import { mostrarToast } from "../stores/toasts";

interface ItemNavegacion {
  etiqueta: string;
  ruta: string;
  icono: LucideIcon;
}

interface GrupoNavegacion {
  titulo: string;
  items: ItemNavegacion[];
}

const NAVEGACION: Record<Rol, GrupoNavegacion[]> = {
  "Encargado de Ventas": [
    {
      titulo: "Mostrador",
      items: [
        { etiqueta: "Clientes", ruta: "/clientes", icono: Users },
        { etiqueta: "Turnos", ruta: "/turnos", icono: CalendarClock },
        { etiqueta: "Obras sociales", ruta: "/obras-sociales", icono: ShieldPlus },
        { etiqueta: "Consulta de stock", ruta: "/stock", icono: PackageSearch },
        { etiqueta: "Disponibilidad", ruta: "/disponibilidad", icono: Boxes },
      ],
    },
    {
      titulo: "Ventas",
      items: [
        { etiqueta: "Ventas con receta", ruta: "/ventas/receta", icono: ReceiptText },
        { etiqueta: "Nueva venta con receta", ruta: "/ventas/receta/nueva", icono: ClipboardCheck },
        { etiqueta: "Ventas libres", ruta: "/ventas-libres", icono: ShoppingBag },
        { etiqueta: "Nueva venta libre", ruta: "/ventas-libres/nueva", icono: ShoppingCart },
        { etiqueta: "Catálogo de venta libre", ruta: "/ventas-libres/catalogo", icono: Store },
      ],
    },
  ],
  "Encargado de Caja": [
    {
      titulo: "Caja",
      items: [
        { etiqueta: "Cobrar", ruta: "/caja/cobrar", icono: CreditCard },
        { etiqueta: "Cobros", ruta: "/caja/cobros", icono: Banknote },
        { etiqueta: "Cobros del día", ruta: "/caja/cobros-dia", icono: ClipboardList },
      ],
    },
  ],
  "Encargado de Depósito": [
    {
      titulo: "Depósito",
      items: [
        { etiqueta: "Inventario", ruta: "/inventario", icono: Boxes },
        { etiqueta: "Stock bajo", ruta: "/alertas-stock", icono: AlertTriangle },
        { etiqueta: "Movimientos de stock", ruta: "/movimientos", icono: ArrowLeftRight },
        { etiqueta: "Pedidos a droguería", ruta: "/pedidos", icono: Truck },
        { etiqueta: "Compras", ruta: "/compras-recibidas", icono: ClipboardCheck },
        { etiqueta: "Droguerías", ruta: "/droguerias", icono: Building2 },
      ],
    },
  ],
  "Encargado de Compras": [
    {
      titulo: "Compras",
      items: [{ etiqueta: "Compras", ruta: "/compras", icono: ShoppingCart }],
    },
  ],
  Administrador: [
    {
      titulo: "Administración",
      items: [{ etiqueta: "Auditoría", ruta: "/auditoria", icono: ScrollText }],
    },
  ],
};

function AvisoInactividad() {
  const sesion = useAuthStore((estado) => estado.usuario);
  const cerrarSesion = useAuthStore((estado) => estado.cerrarSesion);
  const navigate = useNavigate();
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [segundos, setSegundos] = useState(
    Math.ceil(CONFIG.avisoInactividadMs / 1000),
  );
  const ultimaActividad = useRef(Date.now());
  const cerrando = useRef(false);

  const reiniciar = useCallback(() => {
    ultimaActividad.current = Date.now();
    setMostrarAviso(false);
  }, []);

  useEffect(() => {
    if (!sesion) return;
    cerrando.current = false;
    ultimaActividad.current = Date.now();
    setMostrarAviso(false);

    const eventos: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    const alActivar = () => {
      ultimaActividad.current = Date.now();
      setMostrarAviso(false);
    };
    eventos.forEach((evento) => window.addEventListener(evento, alActivar, { passive: true }));

    const intervalo = window.setInterval(() => {
      const transcurrido = Date.now() - ultimaActividad.current;
      const restante = CONFIG.inactividadMs - transcurrido;
      if (restante <= 0) {
        if (!cerrando.current) {
          cerrando.current = true;
          window.clearInterval(intervalo);
          void cerrarSesion("inactividad").finally(() => {
            navigate("/login", { replace: true, state: { motivo: "inactividad" } });
          });
        }
        return;
      }
      if (restante <= CONFIG.avisoInactividadMs) {
        setMostrarAviso(true);
        setSegundos(Math.ceil(restante / 1000));
      }
    }, 1000);

    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, alActivar));
      window.clearInterval(intervalo);
    };
  }, [sesion, cerrarSesion, navigate]);

  const salirAhora = async () => {
    if (cerrando.current) return;
    cerrando.current = true;
    setMostrarAviso(false);
    await cerrarSesion("inactividad");
    navigate("/login", { replace: true, state: { motivo: "inactividad" } });
  };

  return (
    <Modal
      abierto={mostrarAviso}
      titulo="¿Seguís ahí?"
      descripcion="Por seguridad, la sesión se cerrará automáticamente por inactividad."
      onCerrar={reiniciar}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={salirAhora}>
            Cerrar sesión
          </Boton>
          <Boton onClick={reiniciar}>Continuar sesión</Boton>
        </>
      }
    >
      <div className="flex items-center gap-4 rounded-lg bg-amber-50 p-4 text-amber-900">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <span className="text-lg font-semibold tabular-nums">
            {formatearRestante(segundos * 1000)}
          </span>
        </div>
        <p className="text-sm">
          Quedan <strong>{segundos} segundos</strong> antes del cierre
          automático. Elegí <strong>Continuar sesión</strong> para seguir
          trabajando.
        </p>
      </div>
    </Modal>
  );
}

export function LayoutPrincipal() {
  const usuario = useAuthStore((estado) => estado.usuario);
  const cerrarSesion = useAuthStore((estado) => estado.cerrarSesion);
  const sucursalId = useSucursalStore((estado) => estado.sucursalId);
  const seleccionarSucursal = useSucursalStore((estado) => estado.seleccionarSucursal);
  const inicializarSucursal = useSucursalStore((estado) => estado.inicializarSucursal);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const cargarSucursales = useCallback(() => obtenerSucursales(), []);
  const { datos: sucursales, cargando, error, recargar } =
    useConsulta(cargarSucursales);

  useEffect(() => {
    if (sucursales && sucursales.length > 0) {
      inicializarSucursal(sucursales.map((sucursal) => sucursal.id));
    }
  }, [sucursales, inicializarSucursal]);

  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  const grupos = useMemo(
    () => (usuario ? NAVEGACION[usuario.rol] : []),
    [usuario],
  );

  if (!usuario) return null;

  const salir = async () => {
    setSaliendo(true);
    try {
      await cerrarSesion("manual");
      mostrarToast("Sesión cerrada.");
      navigate("/login", { replace: true });
    } finally {
      setSaliendo(false);
    }
  };

  const contenidoMenu = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/90 ring-1 ring-white/10">
          <Cross className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            Gestión de Farmacias
          </p>
          <p className="text-[11px] text-brand-200/70">Sistema interno</p>
        </div>
        <button
          type="button"
          className="ml-auto rounded-md p-1 text-brand-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menú principal">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `mb-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              isActive
                ? "bg-white/12 text-white"
                : "text-brand-100/75 hover:bg-white/8 hover:text-white"
            }`
          }
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
          Inicio
        </NavLink>
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-brand-200/50">
              {grupo.titulo}
            </p>
            <ul className="space-y-0.5">
              {grupo.items.map((item) => {
                const Icono = item.icono;
                return (
                  <li key={`${item.ruta}-${item.etiqueta}`}>
                    <NavLink
                      to={item.ruta}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                          isActive
                            ? "bg-brand-600/25 font-medium text-white ring-1 ring-inset ring-brand-400/25"
                            : "text-brand-100/70 hover:bg-white/8 hover:text-white"
                        }`
                      }
                    >
                      <Icono className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="leading-5">{item.etiqueta}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 rounded-lg bg-white/5 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-white">{usuario.nombre}</p>
          <p className="truncate text-[11px] text-brand-200/70">{usuario.rol}</p>
        </div>
        <button
          type="button"
          onClick={salir}
          disabled={saliendo}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-100/75 transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-800 focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden
        />
      )}

      <aside
        className={`no-imprimir fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-950 transition-transform duration-200 lg:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Barra lateral"
      >
        {contenidoMenu}
      </aside>

      <div className="layout-contenido lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur no-imprimir">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <div className="hidden items-center gap-2 text-sm text-ink-500 sm:flex">
              <Store className="h-4 w-4 text-brand-700" aria-hidden />
              <label htmlFor="sucursal-activa" className="font-medium text-ink-600">
                Sucursal activa
              </label>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              {cargando && <span className="text-xs text-ink-400">Cargando sucursales…</span>}
              {error && (
                <button
                  type="button"
                  className="text-xs text-red-700 underline"
                  onClick={recargar}
                >
                  Reintentar sucursales
                </button>
              )}
              {!cargando && !error && sucursales && (
                <select
                  id="sucursal-activa"
                  value={sucursalId ?? ""}
                  onChange={(event) => seleccionarSucursal(event.target.value)}
                  className="max-w-[11rem] rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-medium text-ink-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:max-w-none"
                >
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium leading-5 text-ink-900">
                  {usuario.nombre}
                </p>
                <p className="text-xs leading-4 text-ink-500">{usuario.rol}</p>
              </div>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 ring-1 ring-brand-200"
                aria-hidden
              >
                {usuario.nombre
                  .split(" ")
                  .map((parte) => parte.charAt(0))
                  .slice(0, 2)
                  .join("")}
              </div>
              <button
                type="button"
                onClick={salir}
                disabled={saliendo}
                className="hidden rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:block"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <main
          id="contenido-principal"
          className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {sucursalId &&
          sucursales?.some((sucursal) => sucursal.id === sucursalId) ? (
            <Outlet />
          ) : (
            <Cargando texto="Preparando la sucursal activa…" />
          )}
        </main>
      </div>

      <AvisoInactividad />
      <ContenedorToasts />
    </div>
  );
}

export function PantallaCargandoSesion() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <Cargando texto="Verificando sesión…" />
    </div>
  );
}
