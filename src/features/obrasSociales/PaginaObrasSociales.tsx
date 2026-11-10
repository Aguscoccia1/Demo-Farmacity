import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ShieldPlus } from "lucide-react";
import type { ObraSocial } from "../../domain/types";
import { listarObrasSociales } from "../../mock/api/obrasSociales";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Boton,
  Buscador,
  Cargando,
  EncabezadoPagina,
  Modal,
  Tarjeta,
  Vacio,
} from "../../components/ui";

export function PaginaObrasSociales() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [seleccionada, setSeleccionada] = useState<ObraSocial | null>(null);
  const cargar = useCallback(() => listarObrasSociales(), []);
  const { datos, cargando, error } = useConsulta(cargar);

  const filtradas = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return datos;
    return datos.filter((obra) =>
      `${obra.nombre} ${obra.sigla}`.toLowerCase().includes(texto),
    );
  }, [datos, busqueda]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Obras sociales"
        descripcion="Consultá las coberturas disponibles para las ventas con receta."
        acciones={
          <Boton onClick={() => navigate("/obras-sociales/nueva")}>
            <ShieldPlus className="h-4 w-4" aria-hidden />
            Nueva obra social
          </Boton>
        }
      />

      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por nombre o sigla"
            etiqueta="Buscar obras sociales"
            className="w-full sm:max-w-sm"
          />
          <p className="text-xs text-ink-500" aria-live="polite">
            {cargando ? "Cargando…" : `${filtradas.length} obra(s) social(es)`}
          </p>
        </div>
        {cargando ? (
          <Cargando texto="Cargando obras sociales…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtradas.length === 0 ? (
          <Vacio
            icono={ShieldPlus}
            titulo="No hay obras sociales"
            descripcion="Agregá una obra social para asociarla a las ventas con receta."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Sigla</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Cobertura</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((obra) => (
                  <tr key={obra.id}>
                    <td className="font-semibold text-ink-900">{obra.sigla}</td>
                    <td className="max-w-lg">{obra.nombre}</td>
                    <td>{obra.telefono}</td>
                    <td>
                      <span className="font-medium tabular-nums">
                        {obra.porcentajeCobertura}%
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setSeleccionada(obra)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                        Consultar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Modal
        abierto={Boolean(seleccionada)}
        titulo={seleccionada ? `Obra social ${seleccionada.sigla}` : "Obra social"}
        onCerrar={() => setSeleccionada(null)}
        ancho="md"
      >
        {seleccionada && (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Nombre</dt>
              <dd className="mt-0.5 text-ink-800">{seleccionada.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Sigla</dt>
              <dd className="mt-0.5 text-ink-800">{seleccionada.sigla}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Teléfono</dt>
              <dd className="mt-0.5 text-ink-800">{seleccionada.telefono}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Porcentaje de cobertura</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-ink-800">
                {seleccionada.porcentajeCobertura}%
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
