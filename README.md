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
- Vitest + React Testing Library

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
npm test          # pruebas automatizadas
npm run lint      # ESLint
```

## Usuarios de prueba

En la pantalla de login hay un enlace a **Usuarios de prueba** que completa las
credenciales automáticamente.

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Encargado de Venta | `venta` | `venta123` |
| Encargado de Caja | `caja` | `caja123` |
| Encargado de Depósito | `deposito` | `deposito123` |
| Encargado de Compras | `compras` | `compras123` |
| Administrador | `admin` | `admin123` |

El acceso se bloquea durante 5 minutos después de 3 intentos fallidos. La
sesión se cierra automáticamente tras 5 minutos de inactividad, con un aviso
30 segundos antes. Ambos valores se configuran en `src/config.ts`.

Cada rol tiene un menú y un conjunto de rutas permitidas. Si se intenta abrir
una ruta ajena al rol, se muestra **Acceso restringido**.

## Recorrido sugerido

1. Ingresar como `venta` y registrar una venta con receta o una venta libre.
2. Cambiar a `caja`, cobrar la venta y emitir el comprobante de pago.
3. Ingresar como `deposito` para consultar stock, pedidos y compras recibidas.
4. Ingresar como `compras` para registrar una compra y recepcionarla.
5. Volver a `deposito` para aplicar el stock de la compra recibida.
6. Ingresar como `admin` para consultar el registro de auditoría.

## Módulos

### Mostrador — Encargado de Venta

- Alta, modificación, ficha y listado imprimible de clientes.
- Registro de turnos.
- Consulta y alta de obras sociales.
- Consulta de stock y disponibilidad por sucursal.
- Listado, alta, modificación y anulación de ventas con receta.
- Listado, alta, modificación y anulación de ventas libres.
- Catálogo de productos de venta libre.
- Validación de receta vigente, médico y matrícula.
- Búsqueda de genéricos equivalentes por principio activo y stock.
- Cálculo de subtotal, descuento, total, cobertura e importe a cobrar.

### Caja — Encargado de Caja

- Ventas pendientes de cobro de la sucursal activa.
- Cobro con uno o varios medios de pago.
- Simulación de rechazo de pagos electrónicos.
- Regla especial para coberturas del 100%.
- Comprobante de pago imprimible.
- Consulta de cobros y corrección del reparto de medios.
- Listado de cobros del día.

### Depósito — Encargado de Depósito

- Consulta, alta y modificación de inventario.
- Alertas de stock por debajo del mínimo.
- Salidas e ingresos manuales de mercadería.
- Pedidos a la Droguería Central.
- Generación e impresión de la orden de pedido.
- Envío y cancelación de pedidos.
- Ajuste de stock al marcar mercadería recibida.
- Consulta de compras recibidas y aplicación de stock.
- Consulta, alta y modificación de droguerías.

### Compras — Encargado de Compras

- Alta y modificación de compras.
- Creación de una compra a partir de un pedido Enviado.
- Recepción de compras.
- Anulación de compras Registradas.
- Consulta y listado de compras.

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
- El stock se controla al registrar o modificar una venta y se descuenta al
  confirmar el cobro.
- Las ventas cobradas no se pueden modificar ni anular.
- Los pedidos solo se modifican o eliminan en estado Registrado.
- Para enviar un pedido primero debe generarse su orden de pedido.
- El ajuste de stock por mercadería recibida ocurre al pasar un pedido de
  Registrado a Enviado con la opción correspondiente marcada.
- Las compras se registran siempre contra la Droguería Central.
- La recepción de una compra solo cambia su estado. El stock se aplica después,
  desde **Compras recibidas**, y solo una vez por compra.
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
  test/            configuración de pruebas
```

## Pruebas

```bash
npm test
```

Las pruebas cubren:

- Cálculos de venta, cobertura, recetas, genéricos, stock, pagos y
  transiciones de estado.
- Registro interno de los 48 casos de uso, rutas, roles y atributos de las 22
  entidades.
- Flujo de inicio de sesión con un usuario demo.
- Flujo de cobro en efectivo de una venta pendiente.
- Recepción de compras y aplicación de stock sin doble conteo.

También se puede ejecutar el chequeo de tipos y el build con
`npm run build`, y el análisis estático con `npm run lint`.

## Alcance y limitaciones

Esta demo no incluye backend, pagos reales, impresión fiscal, envío de correos,
notificaciones, exportaciones, gráficos, indicadores, CRUD de productos ni
administración de usuarios. Las pantallas y acciones se limitan a los circuitos
descritos en los casos de uso.
