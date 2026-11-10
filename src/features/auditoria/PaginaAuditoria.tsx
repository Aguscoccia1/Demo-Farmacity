import { useCallback, useState } from "react";
import { ScrollText, Search } from "lucide-react";
import type { RegistroAuditoria, Sucursal, TipoOperacion } from "../../domain/types";
import {
  listarAuditoria,
  listarUsuariosAuditoria,
  validarFechasAuditoria,
} from "../../mock/api/auditoria";
import { obtenerSucursales } from "../../mock/api/catalogos";
import { formatearFechaHora } from "../../lib/format";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Campo,
  Cargando,
  EncabezadoPagina,
  Input,
  Select,
  Tarjeta,
  Vacio,
} from "../../components/ui";

const TIPOS_OPERACION: TipoOperacion[] = [
  "Alta",
  "Modificación",
  "Anulación",
  "Cobro",
  "Pedido",
  "Compra",
  "Movimiento de stock",
  "Recepción",
  "Actualización de stock",
  "Login",
  "Bloqueo",
  "Cierre de sesión",
];

interface FiltrosFormulario {
  desde: string;
  hasta: string;
  usuario: string;
  tipoOperacion: TipoOperacion | "";
}

interface DatosAuditoria {
  registros: RegistroAuditoria[];
  usuarios: string[];
  sucursales: Sucursal[];
}

const FILTROS_VACIOS: FiltrosFormulario = {
  desde: "",
  hasta: "",
  usuario: "",
  tipoOperacion: "",
};

export function PaginaAuditoria() {
  const [filtros, setFiltros] = useState<FiltrosFormulario>(FILTROS_VACIOS);
  const [aplicados, setAplicados] = useState<FiltrosFormulario>(FILTROS_VACIOS);
  const [errorFiltros, setErrorFiltros] = useState<string | null>(null);

  const cargar = useCallback(async (): Promise<DatosAuditoria> => {
    const [registros, usuarios, sucursales] = await Promise.all([
      listarAuditoria({
        desde: aplicados.desde || undefined,
        hasta: aplicados.hasta || undefined,
        usuario: aplicados.usuario || undefined,
        tipoOperacion: aplicados.tipoOperacion,
      }),
      listarUsuariosAuditoria(),
      obtenerSucursales(),
    ]);
    return { registros, usuarios, sucursales };
  }, [aplicados]);

  const { datos, cargando, error } = useConsulta(cargar);

  const aplicar = () => {
    setErrorFiltros(null);
    try {
      validarFechasAuditoria(filtros.desde || undefined, filtros.hasta || undefined);
      setAplicados(filtros);
    } catch (motivo) {
      setErrorFiltros(
        motivo instanceof Error ? motivo.message : "Revisá las fechas ingresadas.",
      );
    }
  };

  const limpiar = () => {
    setErrorFiltros(null);
    setFiltros(FILTROS_VACIOS);
    setAplicados(FILTROS_VACIOS);
  };

  const nombreSucursal = (sucursalId: string | null) => {
    if (!sucursalId) return "—";
    return (
      datos?.sucursales.find((sucursal) => sucursal.id === sucursalId)?.nombre ??
      "—"
    );
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Registro de auditoría"
        descripcion="Operaciones registradas en el sistema, con usuario, rol, tipo de operación y sucursal."
      />

      <Tarjeta className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Campo etiqueta="Desde" htmlFor="auditoria-desde">
            <Input
              id="auditoria-desde"
              type="date"
              value={filtros.desde}
              onChange={(event) =>
                setFiltros((anteriores) => ({
                  ...anteriores,
                  desde: event.target.value,
                }))
              }
            />
          </Campo>
          <Campo etiqueta="Hasta" htmlFor="auditoria-hasta">
            <Input
              id="auditoria-hasta"
              type="date"
              value={filtros.hasta}
              onChange={(event) =>
                setFiltros((anteriores) => ({
                  ...anteriores,
                  hasta: event.target.value,
                }))
              }
            />
          </Campo>
          <Campo etiqueta="Usuario" htmlFor="auditoria-usuario">
            <Input
              id="auditoria-usuario"
              list="auditoria-usuarios"
              value={filtros.usuario}
              onChange={(event) =>
                setFiltros((anteriores) => ({
                  ...anteriores,
                  usuario: event.target.value,
                }))
              }
              placeholder="Nombre de usuario"
            />
            <datalist id="auditoria-usuarios">
              {(datos?.usuarios ?? []).map((usuario) => (
                <option key={usuario} value={usuario} />
              ))}
            </datalist>
          </Campo>
          <Campo etiqueta="Tipo de operación" htmlFor="auditoria-tipo">
            <Select
              id="auditoria-tipo"
              value={filtros.tipoOperacion}
              onChange={(event) =>
                setFiltros((anteriores) => ({
                  ...anteriores,
                  tipoOperacion: event.target.value as TipoOperacion | "",
                }))
              }
            >
              <option value="">Todos</option>
              {TIPOS_OPERACION.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        {errorFiltros && (
          <div className="mt-3">
            <Alerta tono="error">{errorFiltros}</Alerta>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Boton variante="secundario" onClick={limpiar}>
            Limpiar filtros
          </Boton>
          <Boton onClick={aplicar}>
            <Search className="h-4 w-4" aria-hidden />
            Aplicar filtros
          </Boton>
        </div>
      </Tarjeta>

      <Tarjeta>
        <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold text-ink-950">
            <ScrollText className="h-4 w-4 text-brand-700" aria-hidden />
            Operaciones registradas
          </h2>
          <Badge tono="gris">{datos?.registros.length ?? 0}</Badge>
        </div>

        {cargando ? (
          <Cargando texto="Cargando registros de auditoría…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : !datos || datos.registros.length === 0 ? (
          <Vacio
            icono={ScrollText}
            titulo="No hay registros para los filtros aplicados"
            descripcion="Probá ampliando el rango de fechas o quitando algún filtro."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Tipo de operación</th>
                  <th>Descripción</th>
                  <th>Sucursal</th>
                </tr>
              </thead>
              <tbody>
                {datos.registros.map((registro) => (
                  <tr key={registro.id}>
                    <td className="whitespace-nowrap">
                      {formatearFechaHora(registro.fecha)}
                    </td>
                    <td className="font-medium text-ink-900">
                      {registro.usuario}
                    </td>
                    <td>{registro.rol}</td>
                    <td>
                      <Badge tono="gris">{registro.tipoOperacion}</Badge>
                    </td>
                    <td className="max-w-md">{registro.descripcion}</td>
                    <td>{nombreSucursal(registro.sucursalId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
