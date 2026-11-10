/**
 * Valores configurables de la demo.
 * Los tiempos se expresan en milisegundos.
 */
export const CONFIG = {
  inactividadMs: 5 * 60 * 1000,
  avisoInactividadMs: 30 * 1000,
  maxIntentosFallidos: 3,
  bloqueoMs: 5 * 60 * 1000,
  probabilidadRechazoPago: 0.1,
  latenciaMinMs: 150,
  latenciaMaxMs: 700,
  claveAlmacenamiento: "farmacity-gestion:v1",
  claveBloqueos: "farmacity-bloqueos:v1",
} as const;
