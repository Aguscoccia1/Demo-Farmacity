import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageSearch, Plus, ShoppingBag } from "lucide-react";
import { obtenerProductosConStock } from "../../mock/api/ventas";
import { categoriaDe } from "../../mock/api/comun";
import { admiteVentaLibre } from "../../domain/rules";
import { formatearMoneda } from "../../lib/format";
import { useSucursalActiva } from "../../hooks/useSucursalActiva";
import { useConsulta } from "../../hooks/useConsulta";
import {
  Alerta,
  Badge,
  Boton,
  Buscador,
  Cargando,
  EncabezadoPagina,
  Select,
  Tarjeta,
  Vacio,
} from "../../components/ui";

export function PaginaCatalogoVentaLibre() {
  const sucursalId = useSucursalActiva();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const cargar = useCallback(
    async () =>
      (await obtenerProductosConStock(sucursalId)).filter((producto) =>
        admiteVentaLibre(producto),
      ),
    [sucursalId],
  );
  const { datos, cargando, error } = useConsulta(cargar);

  const categorias = useMemo(
    () =>
      [...new Set((datos ?? []).map((producto) => categoriaDe(producto)))].sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    [datos],
  );

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    return datos.filter((producto) => {
      const coincideTexto =
        !texto ||
        `${producto.nombre} ${producto.marca} ${categoriaDe(producto)}`
          .toLowerCase()
          .includes(texto);
      const coincideCategoria =
        categoria === "todas" || categoriaDe(producto) === categoria;
      return coincideTexto && coincideCategoria;
    });
  }, [datos, busqueda, categoria]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Catálogo de venta libre"
        descripcion="Consultá los productos de venta libre y los medicamentos que no requieren receta, con su disponibilidad en la sucursal activa."
        acciones={
          <Boton onClick={() => navigate("/ventas-libres/nueva")}>
            <Plus className="h-4 w-4" aria-hidden />
            Nueva venta libre
          </Boton>
        }
      />
      <Tarjeta>
        <div className="flex flex-col gap-3 border-b border-ink-200 p-4 md:flex-row md:items-center md:justify-between">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por nombre, marca o categoría"
            etiqueta="Buscar en el catálogo"
            className="w-full md:max-w-md"
          />
          <div className="flex items-center gap-2">
            <label htmlFor="categoria-catalogo" className="text-sm text-ink-500">
              Categoría
            </label>
            <Select
              id="categoria-catalogo"
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
              className="w-52"
            >
              <option value="todas">Todas</option>
              {categorias.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {cargando ? (
          <Cargando texto="Cargando catálogo…" />
        ) : error ? (
          <div className="p-4">
            <Alerta tono="error">{error}</Alerta>
          </div>
        ) : filtrados.length === 0 ? (
          <Vacio
            icono={PackageSearch}
            titulo="No hay productos para mostrar"
            descripcion="Probá con otra búsqueda o categoría."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla-base">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Categoría</th>
                  <th>Código de barras</th>
                  <th className="text-right">Precio</th>
                  <th>Disponibilidad</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((producto) => (
                  <tr key={producto.id}>
                    <td>
                      <span className="font-medium text-ink-900">
                        {producto.nombre}
                      </span>
                      <span className="block max-w-md text-xs text-ink-500">
                        {producto.descripcion}
                      </span>
                    </td>
                    <td>{producto.marca}</td>
                    <td>
                      <span className="block text-sm text-ink-800">
                        {categoriaDe(producto)}
                      </span>
                      {producto.tipoProducto === "Medicamento" && (
                        <Badge tono="azul">Sin receta</Badge>
                      )}
                    </td>
                    <td className="font-mono text-xs">{producto.codigoBarras}</td>
                    <td className="text-right font-medium tabular-nums">
                      {formatearMoneda(producto.precio)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Badge
                          tono={
                            producto.stockActual === 0
                              ? "rojo"
                              : producto.stockActual < producto.stockMinimo
                                ? "amarillo"
                                : "verde"
                          }
                        >
                          {producto.stockActual === 0 ? "Sin stock" : "Disponible"}
                        </Badge>
                        <span className="text-xs text-ink-500">
                          {producto.stockActual} unidades
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
      <div className="mt-4 flex justify-end">
        <Boton variante="suave" onClick={() => navigate("/ventas-libres")}>
          <ShoppingBag className="h-4 w-4" aria-hidden />
          Ver ventas libres
        </Boton>
      </div>
    </div>
  );
}
