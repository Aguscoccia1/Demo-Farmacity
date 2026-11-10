import { useCallback, useEffect, useState } from "react";

export function useConsulta<T>(consulta: () => Promise<T>) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activa = true;
    setCargando(true);
    setError(null);
    consulta()
      .then((resultado) => {
        if (activa) setDatos(resultado);
      })
      .catch((motivo: unknown) => {
        if (activa) {
          setError(
            motivo instanceof Error
              ? motivo.message
              : "No se pudo cargar la información.",
          );
        }
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, [consulta, version]);

  const recargar = useCallback(() => setVersion((valor) => valor + 1), []);

  return { datos, cargando, error, recargar };
}
