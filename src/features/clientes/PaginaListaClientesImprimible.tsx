import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { listarClientes } from "../../mock/api/clientes";
import { useConsulta } from "../../hooks/useConsulta";
import { Alerta, Boton, Cargando } from "../../components/ui";
import { formatearFecha } from "../../lib/format";

export function PaginaListaClientesImprimible() {
  const navigate = useNavigate();
  const cargar = useCallback(() => listarClientes(), []);
  const { datos, cargando, error } = useConsulta(cargar);

  return (
    <div className="min-h-screen bg-ink-100 px-4 py-8 print:bg-white print:p-0">
      <div className="no-imprimir mx-auto mb-4 flex max-w-4xl items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/clientes")}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a clientes
        </button>
        <Boton onClick={() => window.print()} disabled={!datos}>
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir listado
        </Boton>
      </div>

      <div className="hoja-impresion mx-auto max-w-4xl rounded-xl border border-ink-200 bg-white p-8 shadow-card">
        <div className="mb-6 flex items-start justify-between border-b border-ink-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-ink-950">Listado de clientes</h1>
            <p className="mt-1 text-sm text-ink-500">Gestión de Farmacias</p>
          </div>
          <p className="text-sm text-ink-500">Emitido el {formatearFecha(new Date().toISOString())}</p>
        </div>

        {cargando ? (
          <Cargando texto="Cargando clientes…" />
        ) : error ? (
          <Alerta tono="error">{error}</Alerta>
        ) : (
          <table className="tabla-base">
            <thead>
              <tr>
                <th>Apellido y nombre</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Dirección</th>
              </tr>
            </thead>
            <tbody>
              {(datos ?? []).map((cliente) => (
                <tr key={cliente.id}>
                  <td className="font-medium text-ink-900">
                    {cliente.apellido}, {cliente.nombre}
                  </td>
                  <td>{cliente.dni}</td>
                  <td>{cliente.telefono}</td>
                  <td>{cliente.email}</td>
                  <td>{cliente.direccion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-6 text-xs text-ink-400">
          Documento generado desde el sistema de gestión.
        </p>
      </div>
    </div>
  );
}
