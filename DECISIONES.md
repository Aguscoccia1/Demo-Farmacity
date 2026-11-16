# Decisiones y supuestos

Este documento registra las decisiones tomadas para resolver ambigüedades del
relevamiento y mantener la demo acotada a los circuitos pedidos.

## 1. Modelo de datos

- Se modelaron las 22 entidades de negocio en `src/domain/types.ts` y se
  registraron sus atributos en `src/domain/schema.ts`.
- `Producto` se trata como una entidad base. `Medicamento` y
  `ProductoVentaLibre` se persisten como objetos completos que incluyen los
  atributos de `Producto`, en lugar de guardar una referencia a un producto
  separado. Por eso el registro de atributos de los subtipos incluye los
  atributos heredados.
- No existe una colección persistida de `Producto`: los catálogos se arman con
  `medicamentos` y `productosVentaLibre`.
- Los identificadores (`id`), las claves relacionales terminadas en `Id` y
  `RegistroAuditoria.referenciaId` se consideran campos técnicos y no forman
  parte de los atributos de negocio.
- `RegistroAuditoria` es una entidad técnica de apoyo para la consulta de
  auditoría y para marcar operaciones ya realizadas (por ejemplo, la generación
  de una orden o la aplicación de stock de una compra). No forma parte de las
  22 entidades de negocio.
- Los estados de venta, pedido y compra se persisten como entidades con
  `nombre` y `descripcion`, no como enumeraciones embebidas.

## 2. Importes, cobertura y medios de pago

- Todos los cálculos se redondean a dos decimales con una función común.
- El descuento se aplica sobre el subtotal y no puede ser negativo ni superar
  el subtotal.
- La cobertura de la obra social se calcula sobre el total de la venta después
  del descuento.
- El importe a cobrar nunca puede ser negativo: si la cobertura supera el
  total, se toma `0`.
- Cuando la cobertura es del 100%, el cobro se confirma con exactamente un
  detalle de importe `0`. No se admiten varios detalles en ese caso.
- En un cobro con importe mayor que cero, cada medio de pago debe tener un
  importe positivo y la suma debe coincidir exactamente con el importe
  esperado.
- Se permiten varios medios de pago en una misma venta.
- La modificación de un cobro solo corrige el reparto entre medios; no cambia
  el importe total cobrado ni la venta asociada.

## 3. Simulación de rechazo de pagos

- El rechazo se simula en el servidor mock antes de mutar la base.
- El efectivo nunca se rechaza.
- Débito, crédito y transferencia se rechazan cuando el valor aleatorio es
  menor a `CONFIG.probabilidadRechazoPago` (10% por defecto).
- La función `pagoRechazado` acepta un generador aleatorio inyectable para
  poder probar el comportamiento de forma determinista.
- Si un pago es rechazado, la venta permanece en estado Registrada y no se
  crea ningún cobro ni movimiento de stock. El usuario puede reintentar con el
  mismo medio o con otro.
- Si el importe a cobrar es `0`, no se evalúa el rechazo de medios electrónicos:
  el cobro se registra con el único detalle de importe `0`.

## 4. Ventas y stock

- Una venta se crea en estado Registrada.
- Al registrar o modificar una venta se valida que haya stock suficiente en la
  sucursal, pero el stock no se descuenta en ese momento.
- El descuento de stock ocurre al confirmar el cobro, que es cuando la
  mercadería se entrega. Así, una venta Registrada que se anula no altera el
  inventario.
- Las ventas solo se pueden modificar o anular en estado Registrada. La
  anulación se ofrece dentro de la pantalla de edición para no agregar una
  pantalla extra.
- Una venta Cobrada no se puede modificar ni anular.
- Una venta con receta solo admite medicamentos. Una venta libre admite
  productos de venta libre y también medicamentos que no requieren receta.
  Si se intenta agregar un medicamento que requiere receta a una venta libre,
  la operación se rechaza con un mensaje claro y el código de error
  `REQUIERE_RECETA`.
- La receta debe tener fechas reales de calendario, estar vigente a la fecha
  de la operación, con médico y matrícula. Su emisión no puede ser futura ni
  posterior a su vencimiento. La misma regla se revalida en Caja.
- Un medicamento con vencimiento anterior a hoy no se agrega, registra ni
  modifica en una venta. Caja revalida su vigencia antes de cobrar. Se muestra
  deshabilitado con “Vencido”; su laboratorio y vencimiento aparecen en la
  selección y en la consulta de stock. El día de vencimiento se admite.
- La búsqueda de genéricos compara el principio activo sin distinguir
  mayúsculas y minúsculas, excluye el medicamento original y exige stock
  suficiente para la cantidad pedida. Los candidatos vencidos se excluyen.
- Al cobrar se generan los mensajes de “Receta sellada” y “Medicamento
  entregado” para ventas con receta, o “Productos entregados” para ventas
  libres. También se informa si algún producto quedó por debajo del mínimo.

## 5. Pedidos

- Un pedido se crea en estado Registrado y siempre se dirige a la Droguería
  Central.
- Solo se puede modificar o eliminar un pedido Registrado.
- El alta genera la orden en la misma transacción, registra su generación en
  auditoría y navega automáticamente a la vista imprimible. Se mantiene la
  generación explícita para pedidos antiguos sin orden; habilita el envío.
- No se puede enviar un pedido sin orden generada.
- El envío se realiza desde el detalle del pedido y permite marcar
  “mercadería recibida”. Si se marca, el stock se incrementa en la misma
  transición de Registrado a Enviado.
- Si no se marca, el pedido solo cambia de estado y el stock no se modifica.
- No se cancela un pedido que tenga una compra vinculada no Anulada. El error
  es “El pedido tiene una compra asociada”.
- Si se cancela un pedido Enviado con stock ajustado, primero se comprueba que
  todos los productos tengan cantidades suficientes para revertirlo. Ante
  cualquier faltante se rechaza sin cambiar stock, estado ni auditoría; no se
  recorta la reversión a cero. Si alcanza, se resta y registra la reversión.
- Un pedido Cancelado no puede volver a otro estado.
- La generación de la orden navega directamente a la vista imprimible.

## 6. Compras

- Las compras se registran siempre contra la Droguería Central. Las demás
  droguerías del seed existen para el circuito de alta, modificación y consulta
  de droguerías, no como proveedores alternativos de compras.
- Una compra puede originarse en un pedido Enviado de la misma sucursal. En ese
  caso se precargan las cantidades del pedido.
- Solo se admite una compra no Anulada por pedido. La coincidencia exacta de
  productos y cantidades se valida en el alta y en la modificación, agrupando
  líneas repetidas por producto. Los precios pueden corregirse. Anular la
  compra permite crear otra para el mismo pedido.
- El precio unitario de compra se inicializa con el precio de venta del
  producto y es editable. El total se recalcula con los subtotales.
- Una compra se crea en estado Registrada. Solo en ese estado se puede
  modificar o anular.
- Registrar la recepción cambia el estado a Recibida, pero no modifica el
  stock.
- La aplicación de stock se hace desde **Compras** de Depósito, solo para compras
  Recibidas y solo una vez. La marca de “stock aplicado” se guarda como un
  registro de auditoría asociado a la compra.
- Si el pedido de origen ya ajustó el stock al enviarse con “mercadería
  recibida”, la aplicación de stock de la compra es un no-op: no se suman las
  cantidades nuevamente, la compra queda marcada como aplicada y el usuario
  recibe “Stock ya ajustado desde el pedido”. Así se evita el doble conteo
  entre el ajuste del pedido y la actualización de stock de la compra.
- Antes de aplicar stock se valida que todos los productos tengan inventario en
  la sucursal; si falta alguno, no se aplica ningún cambio.
- La pantalla **Compras** de Depósito lista todas las compras de la
  sucursal en cualquier estado, con un filtro por estado (Registrada, Recibida,
  Anulada) y una columna de stock que distingue “Pendiente”, “Aplicado” y
  “Stock ya ajustado desde el pedido”. La acción de aplicar stock solo se
  ofrece en las compras Recibidas con stock pendiente.

## 7. Sucursales y alcance de los filtros

- No se agregó una relación cliente–sucursal porque no estaba en el
  relevamiento. Los clientes son globales.
- La sucursal activa se elige en el encabezado y se aplica a los datos
  operativos: ventas, cobros, inventario, pedidos y compras.
- Las obras sociales, droguerías, medicamentos y productos de venta libre son
  catálogos globales.
- La auditoría muestra todos los registros; no se filtró por sucursal porque no
  se pidió ese filtro.
- El inicio muestra accesos directos según el rol, sin indicadores ni métricas.

## 8. Fechas, montos y textos

- Las fechas se persisten en formato ISO y se muestran en `dd/mm/yyyy` (o
  `dd/mm/yyyy HH:mm` cuando incluye hora).
- Los campos de fecha usan controles nativos del navegador.
- Turnos no admite fechas anteriores a hoy. La validación se aplica tanto en
  el formulario como en la operación mock, con fecha local de la aplicación.
- Los importes se muestran en pesos argentinos con formato `es-AR`.
- La interfaz está en español de Argentina.
- No se muestran códigos de caso de uso ni terminología de análisis en la
  pantalla. El registro de los 48 casos de uso es interno.
- Los códigos de caso de uso viven en `src/routing/useCases.ts` como registro
  interno de trazabilidad con el análisis.

## 9. Seguridad de la demo

- Las credenciales son fijas y están a la vista en el enlace de usuarios de
  prueba. Es una demo, no un sistema de autenticación real.
- El bloqueo por intentos fallidos se guarda en `localStorage`.
- La sesión se persiste en `localStorage` y se restaura al recargar.
- El nombre único del rol es **Encargado de Ventas**, incluido seed, actores,
  rutas, menú y auditoría. La persistencia de sesión pasa a versión 1: las
  sesiones del formato anterior se descartan para exigir un nuevo ingreso,
  evitando conservar un rol incompatible con los permisos actuales.
- El cierre por inactividad se controla en el layout principal y registra el
  evento en auditoría.
- Los permisos de menú y de rutas se derivan del rol de la sesión. Las rutas no
  declaradas se consideran inexistentes.
- Las mutaciones de negocio comprueban `obtenerActor()` mediante `exigirRol`
  antes de alterar datos. Venta gestiona clientes/turnos/obras sociales/ventas;
  Caja gestiona cobros; Depósito gestiona inventario/movimientos/pedidos/
  droguerías/aplicación de stock; Compras gestiona compras/recepción/anulación.
  Administrador tiene lectura de auditoría. Sin sesión o con otro rol se
  lanza `ApiError` con “No tenés permiso para realizar esta acción”.
- La persistencia y auditoría internas son infraestructura, no acciones de un
  usuario: deben permitir inicialización del seed y eventos de login/bloqueo/
  cierre, incluso sin sesión. Las lecturas operativas compartidas no se
  restringen. Estos controles siguen siendo una simulación local.

## 10. Pruebas y latencia simulada

- La API mock agrega una latencia aleatoria de 150 a 700 ms para mostrar los estados de carga.
- En modo test se omite la latencia. Vitest y React Testing Library usan jsdom
  y el setup compartido de `src/test/setup.ts`. Se ejecuta con `npm test`.
- Los cinco archivos de tests versionados y el setup se recuperaron de HEAD;
  el resto de la suite borrada se reconstruyó y amplió con las reglas actuales.
- Las pruebas fijan Date al 16/11/2026 y dejan temporizadores reales para
  userEvent. Limpian localStorage y actor entre casos y restauran mocks y reloj.
- Las llamadas que modifican datos establecen el actor correcto; los flujos
  cambian explícitamente de Ventas a Caja y de Depósito a Compras y de vuelta.
- Se comprueban permisos por rol, integridad pedido–compra, cancelación sin
  efectos parciales, turnos pasados, recetas inconsistentes y vencimientos.
  Los flujos completos verifican stock y ausencia de doble conteo; las pantallas
  prueban emisión de comprobante/orden, impresión y filtros.

## 11. Interfaz y alcance

- No se agregaron pantallas, campos, reportes, gráficos, indicadores, exports ni
  notificaciones que no estuvieran pedidos.
- No hay CRUD de productos ni administración de usuarios.
- Los formularios validan los datos con Zod y muestran mensajes en español.
- Los listados operativos se filtran por la sucursal activa y los catálogos
  globales no.
- Las vistas imprimibles ocultan la barra lateral, el encabezado y los botones
  de acción al imprimir.
- Ventas con receta, ventas libres, cobros del día, pedidos y compras ofrecen
  “Imprimir”: vista previa y documento con los mismos filtros y sin acciones.
  Se usa el diálogo de impresión del navegador, sin exportaciones adicionales.
- Al cobrar se navega al comprobante en la misma pestaña; no se abren ventanas
  emergentes ni se imprime automáticamente.

## 12. Decisiones de implementación que pueden revisarse

- Se eligió que la anulación de ventas viva en la pantalla de edición para
  evitar una pantalla adicional no pedida.
- Se eligió que la recepción de compras no aplique stock automáticamente, para
  separar la responsabilidad de Compras (recepción) de la de Depósito
  (actualización de inventario).
- Se eligió que el envío de un pedido pueda ajustar stock en el mismo paso si
  se marca “mercadería recibida”, tal como se desprende del circuito de pedidos
  relevado. Como consecuencia, la aplicación de stock de una compra con pedido
  de origen en ese caso es un no-op. La cancelación solo revierte el ajuste si
  no hay compra vigente y hay stock suficiente.
- Se eligió detectar el “stock ya ajustado” con registros de auditoría en vez
  de agregar un campo persistido a la compra, para no modificar el modelo de
  datos relevado.
- Se eligió mostrar la Droguería Central como proveedor fijo de compras aunque
  el seed incluya otras droguerías, porque el circuito de compras no pedía
  selección de proveedor.
