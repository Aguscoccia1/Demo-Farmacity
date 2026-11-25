# Gestión de Farmacias — demo funcional

Demo frontend de un sistema de gestión para farmacias. Permite recorrer los
circuitos de mostrador, caja, depósito, pedidos a droguería, compras y
auditoría con datos simulados.

> Todos los datos son locales y se guardan en `localStorage`. No hay backend,
> pasarela de pagos ni servicios externos.

## Stack

- Vite + React 18 + TypeScript (`strict`)
- React Router
- Zustand
- React Hook Form + Zod
- Tailwind CSS
- lucide-react
- date-fns
- Vitest + React Testing Library (jsdom)

## Puesta en marcha

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

Scripts disponibles:

```bash
npm run dev       # servidor de desarrollo
npm run build     # chequeo de TypeScript + build de producción
npm run preview   # previsualización del build
npm test          # suite de pruebas completa
npm run test:watch # pruebas durante el desarrollo
npm run lint      # ESLint
```

## Usuarios de prueba

En la pantalla de login hay un enlace a **Usuarios de prueba** que completa las
credenciales automáticamente.

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Encargado de Ventas | `venta` | `venta123` |
| Encargado de Caja | `caja` | `caja123` |
| Encargado de Depósito | `deposito` | `deposito123` |
| Encargado de Compras | `compras` | `compras123` |
| Administrador | `admin` | `admin123` |

El acceso se bloquea durante 5 minutos después de 3 intentos fallidos. La
sesión se cierra automáticamente tras 5 minutos de inactividad, con un aviso
30 segundos antes. Ambos valores se configuran en `src/config.ts`.

Cada rol tiene un menú y un conjunto de rutas permitidas. Si se intenta abrir
una ruta ajena al rol, se muestra **Acceso restringido**.
El rol de mostrador se denomina **Encargado de Ventas** en usuarios, permisos,
seed y auditoría. Las sesiones de la versión anterior deben volver a ingresar
una vez tras este cambio; las credenciales de prueba siguen siendo las mismas.
Las operaciones de negocio de la API simulada también comprueban el actor de
la sesión y rechazan cambios de otro rol con “No tenés permiso para realizar
esta acción”. Administrador consulta auditoría y no realiza operaciones
comerciales. Las lecturas compartidas entre roles siguen disponibles.

## Recorrido sugerido

1. Ingresar como `venta` y registrar una venta con receta o una venta libre.
2. Cambiar a `caja` y cobrar la venta: se abre automáticamente su comprobante.
3. Ingresar como `deposito` para consultar stock, pedidos y **Compras**.
4. Ingresar como `compras` para registrar una compra y recepcionarla.
5. Volver a `deposito` para aplicar el stock de la compra recibida.
6. Ingresar como `admin` para consultar el registro de auditoría.

## Módulos

### Mostrador — Encargado de Ventas

- Alta, modificación, ficha y listado imprimible de clientes.
- Registro de turnos desde el día de hoy, con fechas de calendario válidas.
- Consulta y alta de obras sociales.
- Consulta de stock y disponibilidad por sucursal.
- Listado, alta, modificación y anulación de ventas con receta.
- Listado, alta, modificación y anulación de ventas libres.
- Catálogo de productos de venta libre y medicamentos sin receta.
- Las ventas libres admiten productos de venta libre y medicamentos que no
  requieren receta; los que requieren receta se rechazan con un mensaje claro.
- Validación de receta vigente, médico, matrícula y fechas reales; emisión
  hasta hoy y nunca posterior al vencimiento.
- Medicamentos vencidos deshabilitados con la leyenda **Vencido**. Laboratorio
  y vencimiento visibles en selección de medicamentos y consulta de stock.
- Búsqueda de genéricos equivalentes por principio activo, stock y vigencia.
- Cálculo de subtotal, descuento, total, cobertura e importe a cobrar.

### Caja — Encargado de Caja

- Ventas pendientes de cobro de la sucursal activa.
- Cobro con uno o varios medios de pago.
- Simulación de rechazo de pagos electrónicos.
- Regla especial para coberturas del 100%.
- Comprobante de pago imprimible que se abre automáticamente al confirmar.
- Consulta de cobros y corrección del reparto de medios.
- Listado de cobros del día.

### Depósito — Encargado de Depósito

- Consulta, alta y modificación de inventario.
- Alertas de stock por debajo del mínimo.
- Salidas e ingresos manuales de mercadería.
- Pedidos a la Droguería Central.
- Generación de la orden incluida en el alta y apertura del detalle para enviar el
  pedido a Compras. La impresión queda disponible desde “Ver orden de pedido”.
- Envío y cancelación de pedidos.
- Envío de pedidos sin modificar stock; Compras registra la compra y recepción.
- Protección de stock para pedidos antiguos que ya registraron un ingreso.
- Listado de todas las compras de la sucursal con filtro por estado.
- Aplicación de stock de las compras recibidas, sin doble conteo cuando el
  pedido de origen ya lo ajustó.
- Consulta, alta y modificación de droguerías.

### Compras — Encargado de Compras

- Alta y modificación de compras.
- Creación de una compra a partir de un pedido Enviado.
- Recepción de compras.
- Anulación de compras Registradas.
- Consulta y listado de compras.

Los listados de ventas con receta, ventas libres, cobros del día, pedidos y
compras tienen botón **Imprimir**. Abre una vista previa con los registros
filtrados, sucursal y fecha de emisión; desde allí se imprime sin los controles
de la aplicación. Compras se puede imprimir tanto desde Compras como Depósito.

### Administración — Administrador

- Registro de auditoría con filtros por fecha, usuario y tipo de operación.

## Reglas de negocio principales

- Los importes se calculan con redondeo a dos decimales.
- La cobertura de la obra social se aplica sobre el total de la venta.
- Si la cobertura es del 100%, el cobro se registra con un único detalle de
  importe `0`.
- Un cobro debe sumar exactamente el importe pendiente.
- Los pagos con débito, crédito o transferencia pueden ser rechazados con una
  probabilidad configurable. El efectivo nunca se rechaza.
- Un pago rechazado no modifica la venta: queda Registrada para reintentar.
- Las ventas solo se pueden modificar o anular en estado Registrada.
- Una venta con receta solo admite medicamentos; una venta libre admite
  productos de venta libre y medicamentos que no requieren receta.
- El stock se controla al registrar o modificar una venta y se descuenta al
  confirmar el cobro.
- Las ventas cobradas no se pueden modificar ni anular.
- Los pedidos solo se modifican o eliminan en estado Registrado.
- Los pedidos nuevos generan su orden en la misma transacción del alta. Para
  pedidos anteriores que no tengan orden se mantiene su generación explícita.
- Enviar un pedido solo lo pasa de Registrado a Enviado, sin modificar stock.
  “Enviar a Compras” representa el pase interno para gestionar la adquisición
  a la Droguería Central; no agrega aprobación ni un envío externo automático.
  En Compras, una nueva compra permite elegir ese pedido de la misma sucursal.
  Compras registra la recepción y Depósito aplica el stock de la compra recibida.
- No se cancela un pedido con una compra vinculada no Anulada: se informa
  “El pedido tiene una compra asociada”.
- Por compatibilidad, cancelar un pedido antiguo Enviado con stock ajustado revierte el ajuste solo si
  todos los productos tienen existencias suficientes. Si no, se rechaza toda
  la operación y se conserva el stock, estado y auditoría anteriores.
- Las compras se registran siempre contra la Droguería Central.
- Solo puede existir una compra vigente (no Anulada) por pedido. En el alta y
  modificación se conservan los productos del pedido, pero se pueden ajustar
  cantidades y precios unitarios y agregar otros productos.
- Los productos del pedido no se cambian ni quitan. Los adicionales pueden
  seleccionarse y quitarse. El stock se aplica según los detalles de la compra.
- Por compatibilidad, los pedidos antiguos que ya ingresaron stock requieren
  coincidencia exacta de productos y cantidades para evitar diferencias ocultas.
- No se registran ni modifican ventas con medicamentos vencidos. La vigencia
  se revalida al cobrar; un medicamento que vence hoy aún se admite.
- La recepción de una compra solo cambia su estado. El stock se aplica después,
  desde **Compras** de Depósito, y solo una vez por compra.
- Si el pedido de origen ya ajustó el stock, aplicar el stock de la compra es
  un no-op que informa “Stock ya ajustado desde el pedido”.
- Los estados de venta, pedido y compra respetan las transiciones definidas en
  `src/domain/rules.ts`.

## Datos de la demo

El seed (`src/mock/seed.ts`) incluye:

- 3 sucursales
- 15 clientes
- 8 obras sociales
- 20 medicamentos
- 15 productos de venta libre
- 90 registros de inventario (30 productos × 3 sucursales)
- 20 ventas
- 5 pedidos
- 5 compras
- 3 droguerías
- 5 usuarios
- Estados y medios de pago del sistema

La base se versiona en `localStorage` con la clave `farmacity-gestion:v1`. Los
demás datos de sesión, bloqueo y sucursal activa usan claves propias.

Para reiniciar la demo, eliminá las claves `farmacity-gestion:v1`,
`farmacity-bloqueos:v1`, `farmacity-sesion:v1` y `farmacity-sucursal:v1` desde
las herramientas del navegador y recargá la página.

## Estructura

```text
src/
  auth/            autenticación, bloqueo y sesión
  components/      layout y componentes de interfaz
  domain/          tipos, reglas, validaciones y registro de atributos
  features/        páginas por módulo funcional
  hooks/           consultas y sucursal activa
  lib/             formato y actor de sesión
  mock/            seed y API simulada con persistencia
  routing/         rutas, permisos, guardas y registro de casos de uso
  stores/          Zustand para sucursal y toasts
  test/            setup de pruebas y datos auxiliares
```

## Pruebas

```bash
npm test
npm run build
npm run lint
```

Se recuperaron desde HEAD los tests versionados y se adaptaron a los permisos
de la API y a la navegación automática al comprobante. Se reconstruyeron las
pruebas que no habían llegado a un commit. La suite cubre:

- Las 22 entidades del modelo, los 48 casos de uso y sus rutas y roles.
- Inicio de sesión con el rol **Encargado de Ventas** y descarte de sesiones antiguas.
- Acciones ajenas rechazadas para cada rol, ausencia de sesión y lecturas compartidas.
- Compra vigente única por pedido, conservación de sus productos y edición de cantidades/precios con adicionales.
- Cancelación con compra asociada o stock insuficiente, sin cambios parciales.
- Turnos pasados, recetas futuras, emisión posterior al vencimiento y fechas inexistentes.
- Medicamentos vencidos en venta, cobro y búsqueda de genéricos; estado deshabilitado en pantalla.
- Venta libre de medicamentos sin receta obligatoria.
- Flujo de venta con receta y cobertura hasta Caja y comprobante, verificando el stock.
- Flujo pedido → orden → compra → recepción → aplicación de stock, con y sin
  ajuste previo al enviar el pedido; una segunda aplicación se rechaza.
- Listados imprimibles, filtros y aplicación de stock desde Depósito.

Las pruebas usan jsdom, reinician almacenamiento y actor, y fijan la fecha al
16/11/2026. Solo se congela Date: los temporizadores siguen siendo reales para
las interacciones. Cada operación se ejecuta con su rol correspondiente; los
tests de permisos establecen explícitamente un rol ajeno. No requieren backend.

## Alcance y limitaciones

Esta demo no incluye backend, pagos reales, impresión fiscal, envío de correos,
notificaciones, exportaciones, gráficos, indicadores, CRUD de productos ni
administración de usuarios. Las pantallas y acciones se limitan a los circuitos
descritos en los casos de uso.
