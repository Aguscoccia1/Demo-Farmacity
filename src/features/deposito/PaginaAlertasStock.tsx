import { useCallback } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeftRight, Pencil } from "lucide-react";
import { listarAlertasStockBajo } from "../../mock/api/inventario";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Cargando,
  EncabezadoPagina,
  Tarjeta,
  Vacio,
} from "../../components/ui";

export function PaginaAlertasStock() {
  const sucursalId = useSucursalActiva();
  const cargar = useCallback(
    () => listarAlertasStockBajo(sucursalId),
    [sucursalId],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  return (
    <div>
      <EncabezadoPagina
        titulo="Alertas de stock bajo"
        descripcion="Productos cuyo stock actual está por debajo del mínimo definido en la sucursal activa."
        acciones={
          <Link
            to="/movimientos"
            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-medium text-ink-700 shadow-sm transition hover:bg-ink-50"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden />
            Registrar movimiento
          </Link>
        }
      />

      <Tarjeta>
        {cargando ? (
          <Cargando texto="Revisando niveles de stock…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : !datos || datos.length === 0 ? (
          <Vacio
            icono={AlertTriangle}
            titulo="No hay productos bajo el mínimo"
            descripcion="Todos los productos de la sucursal activa tienen stock suficiente según su mínimo definido."
          />
        ) : (
          <>
            <div className="border-b border-ink-200 p-4">
              <Alerta tono="advertencia">
                Hay {datos.length} producto(s) con stock bajo mínimo. Registrá un
                ingreso de mercadería o generá un pedido a la droguería.
              </Alerta>
            </div>
            <div className="overflow-x-auto">
              <table className="tabla-base">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Marca</th>
                    <th className="text-right">Stock actual</th>
                    <th className="text-right">Mínimo</th>
                    <th className="text-right">Máximo</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((fila) => (
                    <tr key={fila.id}>
                      <td>
                        <span className="font-medium text-ink-900">
                          {fila.producto.nombre}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {fila.producto.tipoProducto} · {fila.producto.codigoBarras}
                        </span>
                      </td>
                      <td>{fila.producto.marca}</td>
                      <td className="text-right font-semibold tabular-nums text-amber-700">
                        {fila.stockActual}
                      </td>
                      <td className="text-right tabular-nums">{fila.stockMinimo}</td>
                      <td className="text-right tabular-nums">{fila.stockMaximo}</td>
                      <td>
                        <Badge tono={fila.stockActual === 0 ? "rojo" : "amarillo"}>
                          {fila.stockActual === 0 ? "Sin stock" : "Bajo mínimo"}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/inventario/${fila.id}/editar`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          Modificar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Tarjeta>
    </div>
  );
}
