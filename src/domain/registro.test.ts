import { describe, expect, it } from "vitest";
import type { BaseDatos, Rol } from "./types";
import {
  ENTIDADES,
  ENTITY_ATTRIBUTES,
  atributosDeNegocio,
  type NombreEntidad,
} from "./schema";
import { crearSeed } from "../mock/seed";
import { CASOS_DE_USO, casosDeRol } from "../routing/useCases";
import { obtenerPermisoRuta, puedeAccederRuta } from "../routing/routes";
import { ROLES } from "../routing/roles";

const COLECCION_POR_ENTIDAD: Partial<Record<NombreEntidad, keyof BaseDatos>> = {
  Cliente: "clientes",
  Turno: "turnos",
  Venta: "ventas",
  DetalleVenta: "detallesVenta",
  Receta: "recetas",
  EstadoVenta: "estadosVenta",
  Cobro: "cobros",
  DetalleCobro: "detallesCobro",
  MedioPago: "mediosPago",
  ObraSocial: "obrasSociales",
  Medicamento: "medicamentos",
  ProductoVentaLibre: "productosVentaLibre",
  Inventario: "inventarios",
  Sucursal: "sucursales",
  Pedido: "pedidos",
  DetallePedido: "detallesPedido",
  EstadoPedido: "estadosPedido",
  Compra: "compras",
  DetalleCompra: "detallesCompra",
  EstadoCompra: "estadosCompra",
  DrogueriaCentral: "droguerias",
};

function atributosEsperados(entidad: NombreEntidad): string[] {
  return [...ENTITY_ATTRIBUTES[entidad]].sort();
}

describe("registro de atributos de las 22 entidades", () => {
  it("declara exactamente las 22 entidades del modelo", () => {
    expect(ENTIDADES).toHaveLength(22);
    expect(new Set(ENTIDADES).size).toBe(22);
  });

  it("coincide con los atributos de negocio de los datos persistidos", () => {
    const db = crearSeed();

    ENTIDADES.filter((entidad) => entidad !== "Producto").forEach((entidad) => {
      const clave = COLECCION_POR_ENTIDAD[entidad];
      expect(clave, `Falta la colección de ${entidad}`).toBeDefined();
      const registros = db[clave!] as unknown as Array<Record<string, unknown>>;
      expect(registros.length, `${entidad} no tiene datos en el seed`).toBeGreaterThan(0);
      expect(atributosDeNegocio(registros[0])).toEqual(atributosEsperados(entidad));
    });
  });

  it("incluye los atributos heredados de Producto en sus dos subtipos", () => {
    const db = crearSeed();
    const atributosProducto = ENTITY_ATTRIBUTES.Producto;

    [db.medicamentos[0], db.productosVentaLibre[0]].forEach((producto) => {
      const atributos = atributosDeNegocio(
        producto as unknown as Record<string, unknown>,
      );
      atributosProducto.forEach((atributo) => {
        expect(atributos).toContain(atributo);
      });
    });
  });

  it("excluye identificadores y claves relacionales de los atributos de negocio", () => {
    expect(
      atributosDeNegocio({
        id: "venta-01",
        ventaId: "venta-01",
        clienteId: "cliente-01",
        total: 1200,
        fecha: "2026-05-15",
      }),
    ).toEqual(["fecha", "total"]);
  });
});

describe("registro interno de los 48 casos de uso", () => {
  it("contiene los códigos CU01 a CU48 sin repeticiones", () => {
    const codigos = CASOS_DE_USO.map((caso) => caso.codigo);
    const esperados = Array.from(
      { length: 48 },
      (_, indice) => `CU${String(indice + 1).padStart(2, "0")}`,
    );

    expect(CASOS_DE_USO).toHaveLength(48);
    expect(codigos).toEqual(esperados);
    expect(new Set(codigos).size).toBe(48);
  });

  it("asigna roles válidos y rutas accesibles para cada caso", () => {
    CASOS_DE_USO.forEach((caso) => {
      expect(caso.nombre.trim().length).toBeGreaterThan(0);
      expect(caso.roles.length).toBeGreaterThan(0);
      caso.roles.forEach((rol) => {
        expect(ROLES).toContain(rol);
        expect(puedeAccederRuta(rol, caso.ruta), `${caso.codigo} - ${caso.ruta}`).toBe(
          true,
        );
      });

      const permiso = obtenerPermisoRuta(caso.ruta);
      expect(permiso, `${caso.codigo} no tiene ruta protegida`).toBeDefined();
      expect(new Set(permiso!.roles)).toEqual(new Set(caso.roles));
    });
  });

  it("distribuye los casos de uso entre los roles operativos", () => {
    const esperado: Record<Rol, number> = {
      "Encargado de Ventas": 18,
      "Encargado de Caja": 6,
      "Encargado de Depósito": 19,
      "Encargado de Compras": 5,
      Administrador: 0,
    };

    ROLES.forEach((rol) => {
      expect(casosDeRol(rol)).toHaveLength(esperado[rol]);
    });
  });
});
