import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Boton, Modal } from "./ui";
import { formatearFechaHora } from "../lib/format";

/** La vista previa y el papel usan los mismos datos y respetan los filtros. */
export function ListadoImprimible({ titulo, columnas, filas, resumen, deshabilitado }: {
  titulo: string;
  columnas: string[];
  filas: ReactNode[][];
  resumen?: string;
  deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    document.body.classList.add("imprimir-listado");
    return () => document.body.classList.remove("imprimir-listado");
  }, [abierto]);
  const contenido = (
    <article className="hoja-impresion bg-white p-4 text-ink-950">
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p className="mb-4 text-sm">Emitido el {formatearFechaHora(new Date().toISOString())} · {filas.length} registro(s)</p>
      <table className="tabla-base">
        <thead><tr>{columnas.map((columna) => <th key={columna}>{columna}</th>)}</tr></thead>
        <tbody>{filas.map((fila, indice) => (
          <tr key={indice}>{fila.map((celda, columna) => <td key={columna}>{celda}</td>)}</tr>
        ))}</tbody>
      </table>
      {filas.length === 0 && <p className="py-4">Sin registros para los filtros seleccionados.</p>}
      {resumen && <p className="mt-4 font-semibold">{resumen}</p>}
    </article>
  );
  return (
    <>
      <Boton variante="secundario" disabled={deshabilitado} onClick={() => setAbierto(true)}>
        <Printer className="h-4 w-4" aria-hidden />Imprimir
      </Boton>
      <Modal abierto={abierto} titulo="Vista imprimible" ancho="xl" onCerrar={() => setAbierto(false)}
        pie={<><Boton variante="secundario" onClick={() => setAbierto(false)}>Cerrar</Boton><Boton onClick={() => window.print()}>Imprimir listado</Boton></>}>
        {contenido}
      </Modal>
      {abierto && createPortal(<div className="reporte-para-imprimir" aria-hidden="true">{contenido}</div>, document.body)}
    </>
  );
}
