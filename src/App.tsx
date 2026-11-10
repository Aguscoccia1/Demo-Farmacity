import { Route, Routes } from "react-router-dom";
import { PaginaLogin } from "./features/auth/PaginaLogin";
import { PaginaInicio } from "./features/inicio/PaginaInicio";
import { LayoutPrincipal } from "./components/Layout";
import { PaginaNoEncontrada, RutaProtegida } from "./routing/RouteGuards";
import { PaginaClientes } from "./features/clientes/PaginaClientes";
import { PaginaFichaCliente } from "./features/clientes/PaginaFichaCliente";
import { PaginaFormularioCliente } from "./features/clientes/PaginaFormularioCliente";
import { PaginaListaClientesImprimible } from "./features/clientes/PaginaListaClientesImprimible";
import { PaginaTurnos } from "./features/clientes/PaginaTurnos";
import { PaginaObrasSociales } from "./features/obrasSociales/PaginaObrasSociales";
import { PaginaNuevaObraSocial } from "./features/obrasSociales/PaginaNuevaObraSocial";
import {
  PaginaConsultaStock,
  PaginaDisponibilidad,
} from "./features/stock/PaginasStock";
import { PaginaListaVentas } from "./features/ventas/PaginaListaVentas";
import { PaginaVentaConReceta } from "./features/ventas/PaginaVentaConReceta";
import { PaginaCatalogoVentaLibre } from "./features/ventas/PaginaCatalogoVentaLibre";
import { PaginaVentaLibre } from "./features/ventas/PaginaVentaLibre";
import { PaginaCobrar } from "./features/caja/PaginaCobrar";
import { PaginaCobros } from "./features/caja/PaginaCobros";
import { PaginaCobroDetalle } from "./features/caja/PaginaCobroDetalle";
import { PaginaCobrosDelDia } from "./features/caja/PaginaCobrosDia";
import { PaginaComprobante } from "./features/caja/PaginaComprobante";
import { PaginaInventario } from "./features/deposito/PaginaInventario";
import { PaginaFormularioInventario } from "./features/deposito/PaginaFormularioInventario";
import { PaginaAlertasStock } from "./features/deposito/PaginaAlertasStock";
import { PaginaMovimientos } from "./features/deposito/PaginaMovimientos";
import { PaginaComprasRecibidas } from "./features/deposito/PaginaComprasRecibidas";
import { PaginaPedidos } from "./features/pedidos/PaginaPedidos";
import { PaginaFormularioPedido } from "./features/pedidos/PaginaFormularioPedido";
import { PaginaDetallePedido } from "./features/pedidos/PaginaDetallePedido";
import { PaginaOrdenPedido } from "./features/pedidos/PaginaOrdenPedido";
import { PaginaCompras } from "./features/compras/PaginaCompras";
import { PaginaFormularioCompra } from "./features/compras/PaginaFormularioCompra";
import { PaginaDetalleCompra } from "./features/compras/PaginaDetalleCompra";
import { PaginaDroguerias } from "./features/droguerias/PaginaDroguerias";
import { PaginaFormularioDrogueria } from "./features/droguerias/PaginaFormularioDrogueria";
import { PaginaAuditoria } from "./features/auditoria/PaginaAuditoria";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PaginaLogin />} />
      <Route element={<RutaProtegida />}>
        <Route element={<LayoutPrincipal />}>
          <Route index element={<PaginaInicio />} />

          <Route path="clientes" element={<PaginaClientes />} />
          <Route path="clientes/nuevo" element={<PaginaFormularioCliente />} />
          <Route
            path="clientes/lista-imprimible"
            element={<PaginaListaClientesImprimible />}
          />
          <Route path="clientes/:id" element={<PaginaFichaCliente />} />
          <Route
            path="clientes/:id/editar"
            element={<PaginaFormularioCliente />}
          />
          <Route path="turnos" element={<PaginaTurnos />} />

          <Route path="obras-sociales" element={<PaginaObrasSociales />} />
          <Route
            path="obras-sociales/nueva"
            element={<PaginaNuevaObraSocial />}
          />

          <Route path="stock" element={<PaginaConsultaStock />} />
          <Route path="disponibilidad" element={<PaginaDisponibilidad />} />

          <Route
            path="ventas/receta"
            element={<PaginaListaVentas tipoVenta="Con receta" />}
          />
          <Route
            path="ventas/receta/nueva"
            element={<PaginaVentaConReceta />}
          />
          <Route
            path="ventas/receta/:id/editar"
            element={<PaginaVentaConReceta />}
          />
          <Route
            path="ventas-libres"
            element={<PaginaListaVentas tipoVenta="Venta libre" />}
          />
          <Route
            path="ventas-libres/catalogo"
            element={<PaginaCatalogoVentaLibre />}
          />
          <Route path="ventas-libres/nueva" element={<PaginaVentaLibre />} />
          <Route
            path="ventas-libres/:id/editar"
            element={<PaginaVentaLibre />}
          />

          <Route path="caja/cobrar" element={<PaginaCobrar />} />
          <Route path="caja/cobros" element={<PaginaCobros />} />
          <Route path="caja/cobros/:id" element={<PaginaCobroDetalle />} />
          <Route path="caja/cobros-dia" element={<PaginaCobrosDelDia />} />
          <Route
            path="caja/comprobante/:ventaId"
            element={<PaginaComprobante />}
          />

          <Route path="inventario" element={<PaginaInventario />} />
          <Route
            path="inventario/nuevo"
            element={<PaginaFormularioInventario />}
          />
          <Route
            path="inventario/:id/editar"
            element={<PaginaFormularioInventario />}
          />
          <Route path="alertas-stock" element={<PaginaAlertasStock />} />
          <Route path="movimientos" element={<PaginaMovimientos />} />

          <Route path="pedidos" element={<PaginaPedidos />} />
          <Route path="pedidos/nuevo" element={<PaginaFormularioPedido />} />
          <Route path="pedidos/:id" element={<PaginaDetallePedido />} />
          <Route
            path="pedidos/:id/editar"
            element={<PaginaFormularioPedido />}
          />
          <Route path="pedidos/:id/orden" element={<PaginaOrdenPedido />} />
          <Route
            path="compras-recibidas"
            element={<PaginaComprasRecibidas />}
          />

          <Route path="droguerias" element={<PaginaDroguerias />} />
          <Route
            path="droguerias/nueva"
            element={<PaginaFormularioDrogueria />}
          />
          <Route
            path="droguerias/:id/editar"
            element={<PaginaFormularioDrogueria />}
          />

          <Route path="compras" element={<PaginaCompras />} />
          <Route path="compras/nueva" element={<PaginaFormularioCompra />} />
          <Route path="compras/:id" element={<PaginaDetalleCompra />} />
          <Route
            path="compras/:id/editar"
            element={<PaginaFormularioCompra />}
          />

          <Route path="auditoria" element={<PaginaAuditoria />} />
        </Route>
      </Route>
      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
}
