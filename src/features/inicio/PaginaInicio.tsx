import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  PackagePlus,
  ReceiptText,
  ScrollText,
  ShieldPlus,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "../../auth/store";
import type { Rol } from "../../domain/types";

interface AccesoDirecto {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: LucideIcon;
}

const ACCESOS: Record<Rol, AccesoDirecto[]> = {
  "Encargado de Venta": [
    {
      titulo: "Nueva venta con receta",
      descripcion: "Cliente, obra social, receta y medicamentos.",
      ruta: "/ventas/receta/nueva",
      icono: ReceiptText,
    },
    {
      titulo: "Nueva venta libre",
      descripcion: "Productos de venta libre para un cliente.",
      ruta: "/ventas-libres/nueva",
      icono: ShoppingBag,
    },
    {
      titulo: "Clientes",
      descripcion: "Alta, modificación, ficha y listado.",
      ruta: "/clientes",
      icono: Users,
    },
    {
      titulo: "Turnos",
      descripcion: "Agenda de atención de clientes.",
      ruta: "/turnos",
      icono: CalendarClock,
    },
    {
      titulo: "Obras sociales",
      descripcion: "Coberturas y datos de contacto.",
      ruta: "/obras-sociales",
      icono: ShieldPlus,
    },
    {
      titulo: "Consulta de stock",
      descripcion: "Stock actual, mínimo y máximo.",
      ruta: "/stock",
      icono: PackagePlus,
    },
  ],
  "Encargado de Caja": [
    {
      titulo: "Cobrar",
      descripcion: "Ventas pendientes y medios de pago.",
      ruta: "/caja/cobrar",
      icono: CreditCard,
    },
    {
      titulo: "Cobros del día",
      descripcion: "Cobros registrados hoy.",
      ruta: "/caja/cobros-dia",
      icono: ClipboardCheck,
    },
    {
      titulo: "Consultar cobros",
      descripcion: "Historial y corrección de medios.",
      ruta: "/caja/cobros",
      icono: ReceiptText,
    },
  ],
  "Encargado de Depósito": [
    {
      titulo: "Nuevo pedido",
      descripcion: "Pedido a la Droguería Central.",
      ruta: "/pedidos/nuevo",
      icono: Truck,
    },
    {
      titulo: "Movimientos de stock",
      descripcion: "Salidas e ingresos manuales.",
      ruta: "/movimientos",
      icono: ArrowLeftRight,
    },
    {
      titulo: "Stock bajo",
      descripcion: "Productos por debajo del mínimo.",
      ruta: "/alertas-stock",
      icono: AlertTriangle,
    },
    {
      titulo: "Compras recibidas",
      descripcion: "Aplicar stock y consultar compras.",
      ruta: "/compras-recibidas",
      icono: ClipboardCheck,
    },
  ],
  "Encargado de Compras": [
    {
      titulo: "Nueva compra",
      descripcion: "Compra a la Droguería Central.",
      ruta: "/compras/nueva",
      icono: ShoppingCart,
    },
    {
      titulo: "Compras",
      descripcion: "Consultar, modificar y recepcionar.",
      ruta: "/compras",
      icono: ClipboardCheck,
    },
  ],
  Administrador: [
    {
      titulo: "Registro de auditoría",
      descripcion: "Operaciones registradas en el sistema.",
      ruta: "/auditoria",
      icono: ScrollText,
    },
  ],
};

export function PaginaInicio() {
  const usuario = useAuthStore((estado) => estado.usuario);
  if (!usuario) return null;
  const accesos = ACCESOS[usuario.rol];
  const primerNombre = usuario.nombre.split(" ")[0];

  return (
    <div>
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-700">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-950">
          Hola, {primerNombre}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Accedé a las tareas de tu rol para comenzar la jornada.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-700">Accesos directos</h2>
        <span className="text-xs text-ink-400">{usuario.rol}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accesos.map((acceso) => {
          const Icono = acceso.icono;
          return (
            <Link
              key={acceso.ruta}
              to={acceso.ruta}
              className="group flex items-start gap-4 rounded-xl border border-ink-200 bg-white p-5 shadow-card transition hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-brand-100">
                <Icono className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-medium text-ink-900 group-hover:text-brand-800">
                  {acceso.titulo}
                </p>
                <p className="mt-1 text-sm leading-5 text-ink-500">
                  {acceso.descripcion}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
