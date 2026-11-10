import { addDays, addMonths, format, subDays } from "date-fns";
import type {
  BaseDatos,
  Cliente,
  DetalleCompra,
  DetallePedido,
  DetalleVenta,
  DrogueriaCentral,
  EstadoCompra,
  EstadoPedido,
  EstadoVenta,
  Inventario,
  MedioPago,
  Medicamento,
  ObraSocial,
  Pedido,
  ProductoVentaLibre,
  Receta,
  RegistroAuditoria,
  Sucursal,
  TipoMedioPago,
  TipoVenta,
  Turno,
  Venta,
} from "../domain/types";
import { calcularSubtotal, calcularTotalesVenta } from "../domain/rules";

const hoy = new Date();
const isoDiasAtras = (dias: number) => subDays(hoy, dias).toISOString();
const fechaDiasAdelante = (dias: number) => format(addDays(hoy, dias), "yyyy-MM-dd");
const fechaDiasAtras = (dias: number) => format(subDays(hoy, dias), "yyyy-MM-dd");
const vencimientoMeses = (meses: number) => format(addMonths(hoy, meses), "yyyy-MM-dd");

export const IDS = {
  estadoVenta: {
    registrada: "estado-venta-registrada",
    cobrada: "estado-venta-cobrada",
    anulada: "estado-venta-anulada",
  },
  estadoPedido: {
    registrado: "estado-pedido-registrado",
    enviado: "estado-pedido-enviado",
    cancelado: "estado-pedido-cancelado",
  },
  estadoCompra: {
    registrada: "estado-compra-registrada",
    recibida: "estado-compra-recibida",
    anulada: "estado-compra-anulada",
  },
  mediosPago: {
    efectivo: "medio-pago-efectivo",
    debito: "medio-pago-debito",
    credito: "medio-pago-credito",
    transferencia: "medio-pago-transferencia",
  },
  central: "drogueria-central",
} as const;

const sucursales: Sucursal[] = [
  {
    id: "sucursal-01",
    nombre: "Córdoba Centro",
    direccion: "Av. Colón 123",
    telefono: "0351 422-1001",
  },
  {
    id: "sucursal-02",
    nombre: "Nueva Córdoba",
    direccion: "Av. Hipólito Yrigoyen 456",
    telefono: "0351 468-2002",
  },
  {
    id: "sucursal-03",
    nombre: "Rosario Centro",
    direccion: "Córdoba 789",
    telefono: "0341 421-3003",
  },
];

const clientes: Cliente[] = [
  {
    id: "cliente-01",
    nombre: "María",
    apellido: "González",
    dni: "28456789",
    telefono: "351 555-0101",
    email: "maria.gonzalez@correo.com",
    direccion: "Belgrano 245, Córdoba",
  },
  {
    id: "cliente-02",
    nombre: "Juan",
    apellido: "Pérez",
    dni: "31567890",
    telefono: "351 555-0102",
    email: "juan.perez@correo.com",
    direccion: "San Martín 812, Córdoba",
  },
  {
    id: "cliente-03",
    nombre: "Ana",
    apellido: "Rodríguez",
    dni: "26789012",
    telefono: "351 555-0103",
    email: "ana.rodriguez@correo.com",
    direccion: "Rivadavia 150, Córdoba",
  },
  {
    id: "cliente-04",
    nombre: "Carlos",
    apellido: "López",
    dni: "22123456",
    telefono: "351 555-0104",
    email: "carlos.lopez@correo.com",
    direccion: "Ovidio Lagos 980, Córdoba",
  },
  {
    id: "cliente-05",
    nombre: "Lucía",
    apellido: "Martínez",
    dni: "35678901",
    telefono: "351 555-0105",
    email: "lucia.martinez@correo.com",
    direccion: "Chacabuco 455, Córdoba",
  },
  {
    id: "cliente-06",
    nombre: "Diego",
    apellido: "Sosa",
    dni: "30123457",
    telefono: "351 555-0106",
    email: "diego.sosa@correo.com",
    direccion: "Ayacucho 320, Córdoba",
  },
  {
    id: "cliente-07",
    nombre: "Valentina",
    apellido: "Romero",
    dni: "38901234",
    telefono: "341 555-0107",
    email: "valentina.romero@correo.com",
    direccion: "Rioja 1100, Rosario",
  },
  {
    id: "cliente-08",
    nombre: "Martín",
    apellido: "Acosta",
    dni: "27456123",
    telefono: "341 555-0108",
    email: "martin.acosta@correo.com",
    direccion: "Mendoza 640, Rosario",
  },
  {
    id: "cliente-09",
    nombre: "Sofía",
    apellido: "Herrera",
    dni: "34567812",
    telefono: "341 555-0109",
    email: "sofia.herrera@correo.com",
    direccion: "Santa Fe 1530, Rosario",
  },
  {
    id: "cliente-10",
    nombre: "Nicolás",
    apellido: "Díaz",
    dni: "29876543",
    telefono: "341 555-0110",
    email: "nicolas.diaz@correo.com",
    direccion: "Salta 720, Rosario",
  },
  {
    id: "cliente-11",
    nombre: "Camila",
    apellido: "Torres",
    dni: "36789012",
    telefono: "351 555-0111",
    email: "camila.torres@correo.com",
    direccion: "Duarte Quirós 600, Córdoba",
  },
  {
    id: "cliente-12",
    nombre: "Federico",
    apellido: "Ruiz",
    dni: "25678901",
    telefono: "351 555-0112",
    email: "federico.ruiz@correo.com",
    direccion: "Independencia 380, Córdoba",
  },
  {
    id: "cliente-13",
    nombre: "Paula",
    apellido: "Benegas",
    dni: "33456789",
    telefono: "351 555-0113",
    email: "paula.benegas@correo.com",
    direccion: "Estrada 55, Córdoba",
  },
  {
    id: "cliente-14",
    nombre: "Gonzalo",
    apellido: "Medina",
    dni: "24345678",
    telefono: "341 555-0114",
    email: "gonzalo.medina@correo.com",
    direccion: "San Luis 890, Rosario",
  },
  {
    id: "cliente-15",
    nombre: "Carolina",
    apellido: "Vera",
    dni: "31234567",
    telefono: "351 555-0115",
    email: "carolina.vera@correo.com",
    direccion: "Buenos Aires 1120, Córdoba",
  },
];

const turnos: Turno[] = [
  { id: "turno-01", clienteId: "cliente-01", fecha: fechaDiasAdelante(1), hora: "09:30" },
  { id: "turno-02", clienteId: "cliente-03", fecha: fechaDiasAdelante(1), hora: "10:15" },
  { id: "turno-03", clienteId: "cliente-06", fecha: fechaDiasAdelante(2), hora: "11:00" },
  { id: "turno-04", clienteId: "cliente-11", fecha: fechaDiasAdelante(2), hora: "16:30" },
  { id: "turno-05", clienteId: "cliente-10", fecha: fechaDiasAdelante(3), hora: "08:45" },
  { id: "turno-06", clienteId: "cliente-14", fecha: fechaDiasAdelante(4), hora: "12:00" },
  { id: "turno-07", clienteId: "cliente-02", fecha: fechaDiasAdelante(5), hora: "15:30" },
  { id: "turno-08", clienteId: "cliente-08", fecha: fechaDiasAdelante(6), hora: "17:00" },
];

const obrasSociales: ObraSocial[] = [
  {
    id: "obra-social-01",
    nombre: "Instituto Nacional de Servicios Sociales para Jubilados y Pensionados",
    sigla: "PAMI",
    telefono: "0800 222-7264",
    porcentajeCobertura: 100,
  },
  {
    id: "obra-social-02",
    nombre: "Organización de Servicios Directos Empresarios",
    sigla: "OSDE",
    telefono: "0800 555-6733",
    porcentajeCobertura: 40,
  },
  {
    id: "obra-social-03",
    nombre: "Swiss Medical Group",
    sigla: "Swiss Medical",
    telefono: "0800 444-7700",
    porcentajeCobertura: 35,
  },
  {
    id: "obra-social-04",
    nombre: "GALENO Salud",
    sigla: "Galeno",
    telefono: "0800 333-4253",
    porcentajeCobertura: 30,
  },
  {
    id: "obra-social-05",
    nombre: "Medifé Asociación Civil",
    sigla: "Medifé",
    telefono: "0800 777-6333",
    porcentajeCobertura: 25,
  },
  {
    id: "obra-social-06",
    nombre: "Instituto de Obra Médico Asistencial",
    sigla: "IOMA",
    telefono: "0800 999-4662",
    porcentajeCobertura: 50,
  },
  {
    id: "obra-social-07",
    nombre: "Obra Social de los Empleados de Comercio y Actividades Civiles",
    sigla: "OSECAC",
    telefono: "0800 444-6722",
    porcentajeCobertura: 45,
  },
  {
    id: "obra-social-08",
    nombre: "Administración Provincial del Seguro de Salud",
    sigla: "APROSS",
    telefono: "0800 777-2776",
    porcentajeCobertura: 60,
  },
];

const estadosVenta: EstadoVenta[] = [
  {
    id: IDS.estadoVenta.registrada,
    nombre: "Registrada",
    descripcion: "Venta registrada, pendiente de cobro.",
  },
  {
    id: IDS.estadoVenta.cobrada,
    nombre: "Cobrada",
    descripcion: "Venta cobrada y medicamento entregado.",
  },
  {
    id: IDS.estadoVenta.anulada,
    nombre: "Anulada",
    descripcion: "Venta anulada por el usuario.",
  },
];

const mediosPago: MedioPago[] = [
  { id: IDS.mediosPago.efectivo, tipo: "Efectivo" },
  { id: IDS.mediosPago.debito, tipo: "Débito" },
  { id: IDS.mediosPago.credito, tipo: "Crédito" },
  { id: IDS.mediosPago.transferencia, tipo: "Transferencia" },
];

const laboratorios = [
  "Laboratorios Andina",
  "NovaFarma",
  "Laboratorios Bienestar",
  "Aconcagua Salud",
  "Litoral Pharma",
  "Pampa Medic",
  "Delta Salud",
  "Cuyo Farma",
];

const medicamentos: Medicamento[] = [
  {
    id: "medicamento-01",
    nombre: "Paracetamol 500 mg",
    descripcion: "Analgésico y antipirético para alivio del dolor y la fiebre.",
    marca: "Andina",
    precio: 3200,
    codigoBarras: "7791234500011",
    principioActivo: "Paracetamol",
    requiereReceta: false,
    fechaVencimiento: vencimientoMeses(14),
    laboratorio: laboratorios[0],
    presentacion: "x 20 comprimidos",
    concentracion: "500 mg",
  },
  {
    id: "medicamento-02",
    nombre: "Paracetamol 500 mg",
    descripcion: "Analgésico y antipirético de venta bajo receta.",
    marca: "NovaFarma",
    precio: 4100,
    codigoBarras: "7791234500028",
    principioActivo: "Paracetamol",
    requiereReceta: false,
    fechaVencimiento: vencimientoMeses(18),
    laboratorio: laboratorios[1],
    presentacion: "x 30 comprimidos",
    concentracion: "500 mg",
  },
  {
    id: "medicamento-03",
    nombre: "Ibuprofeno 400 mg",
    descripcion: "Antiinflamatorio no esteroideo para dolor leve a moderado.",
    marca: "Bienestar",
    precio: 3800,
    codigoBarras: "7791234500035",
    principioActivo: "Ibuprofeno",
    requiereReceta: false,
    fechaVencimiento: vencimientoMeses(11),
    laboratorio: laboratorios[2],
    presentacion: "x 20 comprimidos",
    concentracion: "400 mg",
  },
  {
    id: "medicamento-04",
    nombre: "Ibuprofeno 600 mg",
    descripcion: "Antiinflamatorio de mayor concentración.",
    marca: "Aconcagua",
    precio: 5200,
    codigoBarras: "7791234500042",
    principioActivo: "Ibuprofeno",
    requiereReceta: false,
    fechaVencimiento: vencimientoMeses(16),
    laboratorio: laboratorios[3],
    presentacion: "x 20 comprimidos",
    concentracion: "600 mg",
  },
  {
    id: "medicamento-05",
    nombre: "Amoxicilina 500 mg",
    descripcion: "Antibiótico de amplio espectro.",
    marca: "Litoral",
    precio: 7500,
    codigoBarras: "7791234500059",
    principioActivo: "Amoxicilina",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(9),
    laboratorio: laboratorios[4],
    presentacion: "x 21 comprimidos",
    concentracion: "500 mg",
  },
  {
    id: "medicamento-06",
    nombre: "Amoxicilina 875 mg",
    descripcion: "Antibiótico de amplio espectro de alta concentración.",
    marca: "Pampa Med",
    precio: 9800,
    codigoBarras: "7791234500066",
    principioActivo: "Amoxicilina",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(13),
    laboratorio: laboratorios[5],
    presentacion: "x 14 comprimidos",
    concentracion: "875 mg",
  },
  {
    id: "medicamento-07",
    nombre: "Enalapril 10 mg",
    descripcion: "Tratamiento de hipertensión arterial.",
    marca: "Delta Salud",
    precio: 5600,
    codigoBarras: "7791234500073",
    principioActivo: "Enalapril",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(15),
    laboratorio: laboratorios[6],
    presentacion: "x 30 comprimidos",
    concentracion: "10 mg",
  },
  {
    id: "medicamento-08",
    nombre: "Enalapril 20 mg",
    descripcion: "Tratamiento de hipertensión arterial e insuficiencia cardíaca.",
    marca: "Andina",
    precio: 6900,
    codigoBarras: "7791234500080",
    principioActivo: "Enalapril",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(20),
    laboratorio: laboratorios[0],
    presentacion: "x 30 comprimidos",
    concentracion: "20 mg",
  },
  {
    id: "medicamento-09",
    nombre: "Metformina 500 mg",
    descripcion: "Tratamiento de diabetes tipo 2.",
    marca: "Bienestar",
    precio: 4700,
    codigoBarras: "7791234500097",
    principioActivo: "Metformina",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(12),
    laboratorio: laboratorios[2],
    presentacion: "x 30 comprimidos",
    concentracion: "500 mg",
  },
  {
    id: "medicamento-10",
    nombre: "Metformina 850 mg",
    descripcion: "Tratamiento de diabetes tipo 2 de mayor concentración.",
    marca: "NovaFarma",
    precio: 5900,
    codigoBarras: "7791234500103",
    principioActivo: "Metformina",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(10),
    laboratorio: laboratorios[1],
    presentacion: "x 30 comprimidos",
    concentracion: "850 mg",
  },
  {
    id: "medicamento-11",
    nombre: "Omeprazol 20 mg",
    descripcion: "Protector gástrico para reflujo y úlceras.",
    marca: "Aconcagua",
    precio: 6400,
    codigoBarras: "7791234500110",
    principioActivo: "Omeprazol",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(22),
    laboratorio: laboratorios[3],
    presentacion: "x 28 cápsulas",
    concentracion: "20 mg",
  },
  {
    id: "medicamento-12",
    nombre: "Omeprazol 40 mg",
    descripcion: "Protector gástrico de alta concentración.",
    marca: "Litoral",
    precio: 8300,
    codigoBarras: "7791234500127",
    principioActivo: "Omeprazol",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(17),
    laboratorio: laboratorios[4],
    presentacion: "x 28 cápsulas",
    concentracion: "40 mg",
  },
  {
    id: "medicamento-13",
    nombre: "Loratadina 10 mg",
    descripcion: "Antihistamínico para alergias estacionales.",
    marca: "Pampa Med",
    precio: 2900,
    codigoBarras: "7791234500134",
    principioActivo: "Loratadina",
    requiereReceta: false,
    fechaVencimiento: vencimientoMeses(19),
    laboratorio: laboratorios[5],
    presentacion: "x 10 comprimidos",
    concentracion: "10 mg",
  },
  {
    id: "medicamento-14",
    nombre: "Loratadina 10 mg",
    descripcion: "Antihistamínico para rinitis y urticaria.",
    marca: "Delta Salud",
    precio: 4200,
    codigoBarras: "7791234500141",
    principioActivo: "Loratadina",
    requiereReceta: false,
    fechaVencimiento: vencimientoMeses(21),
    laboratorio: laboratorios[6],
    presentacion: "x 20 comprimidos",
    concentracion: "10 mg",
  },
  {
    id: "medicamento-15",
    nombre: "Diclofenac 50 mg",
    descripcion: "Antiinflamatorio para dolor muscular y articular.",
    marca: "Andina",
    precio: 3600,
    codigoBarras: "7791234500158",
    principioActivo: "Diclofenac",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(8),
    laboratorio: laboratorios[0],
    presentacion: "x 20 comprimidos",
    concentracion: "50 mg",
  },
  {
    id: "medicamento-16",
    nombre: "Diclofenac 75 mg",
    descripcion: "Antiinflamatorio de liberación prolongada.",
    marca: "NovaFarma",
    precio: 4800,
    codigoBarras: "7791234500165",
    principioActivo: "Diclofenac",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(14),
    laboratorio: laboratorios[1],
    presentacion: "x 10 comprimidos",
    concentracion: "75 mg",
  },
  {
    id: "medicamento-17",
    nombre: "Sertralina 50 mg",
    descripcion: "Tratamiento de trastornos depresivos y de ansiedad.",
    marca: "Bienestar",
    precio: 9900,
    codigoBarras: "7791234500172",
    principioActivo: "Sertralina",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(16),
    laboratorio: laboratorios[2],
    presentacion: "x 30 comprimidos",
    concentracion: "50 mg",
  },
  {
    id: "medicamento-18",
    nombre: "Sertralina 100 mg",
    descripcion: "Tratamiento de trastornos depresivos de mayor concentración.",
    marca: "Aconcagua",
    precio: 13500,
    codigoBarras: "7791234500189",
    principioActivo: "Sertralina",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(23),
    laboratorio: laboratorios[3],
    presentacion: "x 30 comprimidos",
    concentracion: "100 mg",
  },
  {
    id: "medicamento-19",
    nombre: "Salbutamol 100 mcg",
    descripcion: "Broncodilatador para crisis de asma.",
    marca: "Litoral",
    precio: 8700,
    codigoBarras: "7791234500196",
    principioActivo: "Salbutamol",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(12),
    laboratorio: laboratorios[4],
    presentacion: "aerosol 200 dosis",
    concentracion: "100 mcg",
  },
  {
    id: "medicamento-20",
    nombre: "Salbutamol 200 mcg",
    descripcion: "Broncodilatador de alta concentración para uso inhalatorio.",
    marca: "Pampa Med",
    precio: 11200,
    codigoBarras: "7791234500202",
    principioActivo: "Salbutamol",
    requiereReceta: true,
    fechaVencimiento: vencimientoMeses(18),
    laboratorio: laboratorios[5],
    presentacion: "aerosol 200 dosis",
    concentracion: "200 mcg",
  },
];

const productosVentaLibre: ProductoVentaLibre[] = [
  {
    id: "pvl-01",
    nombre: "Vitamina C 1000 mg",
    descripcion: "Suplemento de vitamina C efervescente.",
    marca: "Bienestar",
    precio: 4500,
    codigoBarras: "7799876500018",
    categoria: "Vitaminas",
  },
  {
    id: "pvl-02",
    nombre: "Alcohol en gel 250 ml",
    descripcion: "Alcohol en gel al 70% para higiene de manos.",
    marca: "Cuidado Total",
    precio: 2100,
    codigoBarras: "7799876500025",
    categoria: "Higiene",
  },
  {
    id: "pvl-03",
    nombre: "Protector solar FPS 50",
    descripcion: "Protector solar facial y corporal de 120 g.",
    marca: "SolSeguro",
    precio: 8900,
    codigoBarras: "7799876500032",
    categoria: "Dermatología",
  },
  {
    id: "pvl-04",
    nombre: "Crema hidratante 200 ml",
    descripcion: "Crema hidratante para pieles sensibles.",
    marca: "DermaLab",
    precio: 6200,
    codigoBarras: "7799876500049",
    categoria: "Dermatología",
  },
  {
    id: "pvl-05",
    nombre: "Sales de rehidratación oral",
    descripcion: "Sales de rehidratación oral sabor limón, x 10 sobres.",
    marca: "HidraLife",
    precio: 1800,
    codigoBarras: "7799876500056",
    categoria: "Digestivo",
  },
  {
    id: "pvl-06",
    nombre: "Carbón activado",
    descripcion: "Carbón activado en comprimidos, x 10 unidades.",
    marca: "DigestPlus",
    precio: 2400,
    codigoBarras: "7799876500063",
    categoria: "Digestivo",
  },
  {
    id: "pvl-07",
    nombre: "Curitas surtidas",
    descripcion: "Apósitos adhesivos de distintos tamaños, x 20 unidades.",
    marca: "CuraFácil",
    precio: 1500,
    codigoBarras: "7799876500070",
    categoria: "Primeros auxilios",
  },
  {
    id: "pvl-08",
    nombre: "Venda elástica 10 cm",
    descripcion: "Venda elástica de algodón para inmovilización.",
    marca: "CuraFácil",
    precio: 1900,
    codigoBarras: "7799876500087",
    categoria: "Primeros auxilios",
  },
  {
    id: "pvl-09",
    nombre: "Solución fisiológica 500 ml",
    descripcion: "Solución fisiológica estéril para higiene.",
    marca: "HidraLife",
    precio: 2600,
    codigoBarras: "7799876500094",
    categoria: "Higiene",
  },
  {
    id: "pvl-10",
    nombre: "Cepillo dental suave",
    descripcion: "Cepillo dental de cerdas suaves.",
    marca: "Sonrisa",
    precio: 1700,
    codigoBarras: "7799876500100",
    categoria: "Higiene",
  },
  {
    id: "pvl-11",
    nombre: "Pasta dental 90 g",
    descripcion: "Pasta dental con protección total.",
    marca: "Sonrisa",
    precio: 3100,
    codigoBarras: "7799876500117",
    categoria: "Higiene",
  },
  {
    id: "pvl-12",
    nombre: "Vitamina D3 1000 UI",
    descripcion: "Suplemento de vitamina D3, x 60 comprimidos.",
    marca: "Bienestar",
    precio: 5200,
    codigoBarras: "7799876500124",
    categoria: "Vitaminas",
  },
  {
    id: "pvl-13",
    nombre: "Magnesio 400 mg",
    descripcion: "Suplemento de magnesio, x 30 comprimidos.",
    marca: "NovaFarma",
    precio: 4800,
    codigoBarras: "7799876500131",
    categoria: "Vitaminas",
  },
  {
    id: "pvl-14",
    nombre: "Agua oxigenada 250 ml",
    descripcion: "Agua oxigenada de 10 volúmenes para limpieza.",
    marca: "CuraFácil",
    precio: 1400,
    codigoBarras: "7799876500148",
    categoria: "Primeros auxilios",
  },
  {
    id: "pvl-15",
    nombre: "Descongestivo nasal 20 ml",
    descripcion: "Solución descongestiva nasal.",
    marca: "Aconcagua",
    precio: 3900,
    codigoBarras: "7799876500155",
    categoria: "Respiratorio",
  },
];

const todosLosProductos = [...medicamentos, ...productosVentaLibre];

const inventarios: Inventario[] = todosLosProductos.flatMap((producto, indiceProducto) =>
  sucursales.map((sucursal, indiceSucursal) => {
    const stockBase = (indiceProducto * 13 + indiceSucursal * 29) % 85 + 8;
    return {
      id: `inventario-${producto.id}-${sucursal.id}`,
      productoId: producto.id,
      sucursalId: sucursal.id,
      stockActual: stockBase,
      stockMinimo: 10 + ((indiceProducto + indiceSucursal) % 3) * 5,
      stockMaximo: 100 + (indiceProducto % 4) * 20,
    };
  }),
);

const ajustarInventario = (
  productoId: string,
  sucursalId: string,
  stockActual: number,
  stockMinimo: number,
): void => {
  const fila = inventarios.find(
    (inventario) =>
      inventario.productoId === productoId && inventario.sucursalId === sucursalId,
  );
  if (fila) {
    fila.stockActual = stockActual;
    fila.stockMinimo = stockMinimo;
  }
};

ajustarInventario("medicamento-05", "sucursal-01", 3, 12);
ajustarInventario("medicamento-17", "sucursal-01", 0, 8);
ajustarInventario("medicamento-12", "sucursal-03", 0, 10);
ajustarInventario("pvl-03", "sucursal-01", 4, 10);
ajustarInventario("pvl-07", "sucursal-02", 2, 9);
ajustarInventario("pvl-11", "sucursal-02", 1, 8);

interface PlanReceta {
  fecha: string;
  fechaVencimiento: string;
  medico: string;
  matriculaMedico: string;
}

interface PlanVenta {
  id: string;
  clienteId: string;
  sucursalId: string;
  tipoVenta: TipoVenta;
  estado: "Registrada" | "Cobrada" | "Anulada";
  diasAtras: number;
  obraSocialId: string | null;
  descuento: number;
  items: Array<{ productoId: string; cantidad: number }>;
  receta?: PlanReceta;
  medios?: Array<{ medioId: string; parte: number; fijo?: number }>;
}

const recetaBase = (indice: number, diasAtras: number, venceMeses = 8): PlanReceta => ({
  fecha: fechaDiasAtras(diasAtras + 2),
  fechaVencimiento: vencimientoMeses(venceMeses),
  medico: ["Dra. Laura Bianchi", "Dr. Esteban Quiroga", "Dra. Mariela Funes", "Dr. Pablo Salguero"][
    indice % 4
  ],
  matriculaMedico: `MP-${12000 + indice * 137}`,
});

const planesVenta: PlanVenta[] = [
  {
    id: "venta-01",
    clienteId: "cliente-01",
    sucursalId: "sucursal-01",
    tipoVenta: "Con receta",
    estado: "Cobrada",
    diasAtras: 1,
    obraSocialId: "obra-social-01",
    descuento: 0,
    items: [{ productoId: "medicamento-05", cantidad: 2 }],
    receta: recetaBase(1, 1, 8),
    medios: [{ medioId: IDS.mediosPago.efectivo, parte: 1 }],
  },
  {
    id: "venta-02",
    clienteId: "cliente-02",
    sucursalId: "sucursal-01",
    tipoVenta: "Venta libre",
    estado: "Cobrada",
    diasAtras: 2,
    obraSocialId: null,
    descuento: 400,
    items: [
      { productoId: "pvl-01", cantidad: 1 },
      { productoId: "pvl-11", cantidad: 1 },
    ],
    medios: [
      { medioId: IDS.mediosPago.debito, parte: 0.4 },
      { medioId: IDS.mediosPago.efectivo, parte: 0.6 },
    ],
  },
  {
    id: "venta-03",
    clienteId: "cliente-03",
    sucursalId: "sucursal-01",
    tipoVenta: "Con receta",
    estado: "Registrada",
    diasAtras: 1,
    obraSocialId: "obra-social-02",
    descuento: 0,
    items: [{ productoId: "medicamento-07", cantidad: 1 }],
    receta: recetaBase(2, 1, 10),
  },
  {
    id: "venta-04",
    clienteId: "cliente-04",
    sucursalId: "sucursal-01",
    tipoVenta: "Venta libre",
    estado: "Registrada",
    diasAtras: 1,
    obraSocialId: null,
    descuento: 0,
    items: [
      { productoId: "pvl-02", cantidad: 2 },
      { productoId: "pvl-07", cantidad: 1 },
    ],
  },
  {
    id: "venta-05",
    clienteId: "cliente-05",
    sucursalId: "sucursal-01",
    tipoVenta: "Con receta",
    estado: "Anulada",
    diasAtras: 4,
    obraSocialId: "obra-social-06",
    descuento: 0,
    items: [{ productoId: "medicamento-09", cantidad: 1 }],
    receta: recetaBase(3, 4, 9),
  },
  {
    id: "venta-06",
    clienteId: "cliente-06",
    sucursalId: "sucursal-02",
    tipoVenta: "Con receta",
    estado: "Cobrada",
    diasAtras: 3,
    obraSocialId: "obra-social-03",
    descuento: 0,
    items: [
      { productoId: "medicamento-11", cantidad: 1 },
      { productoId: "medicamento-13", cantidad: 1 },
    ],
    receta: recetaBase(4, 3, 12),
    medios: [{ medioId: IDS.mediosPago.efectivo, parte: 1 }],
  },
  {
    id: "venta-07",
    clienteId: "cliente-07",
    sucursalId: "sucursal-02",
    tipoVenta: "Venta libre",
    estado: "Cobrada",
    diasAtras: 4,
    obraSocialId: null,
    descuento: 0,
    items: [
      { productoId: "pvl-12", cantidad: 1 },
      { productoId: "pvl-13", cantidad: 1 },
    ],
    medios: [{ medioId: IDS.mediosPago.credito, parte: 1 }],
  },
  {
    id: "venta-08",
    clienteId: "cliente-08",
    sucursalId: "sucursal-02",
    tipoVenta: "Venta libre",
    estado: "Registrada",
    diasAtras: 2,
    obraSocialId: null,
    descuento: 0,
    items: [
      { productoId: "pvl-05", cantidad: 2 },
      { productoId: "pvl-06", cantidad: 1 },
    ],
  },
  {
    id: "venta-09",
    clienteId: "cliente-09",
    sucursalId: "sucursal-02",
    tipoVenta: "Venta libre",
    estado: "Anulada",
    diasAtras: 5,
    obraSocialId: null,
    descuento: 0,
    items: [{ productoId: "pvl-14", cantidad: 1 }],
  },
  {
    id: "venta-10",
    clienteId: "cliente-10",
    sucursalId: "sucursal-03",
    tipoVenta: "Con receta",
    estado: "Cobrada",
    diasAtras: 5,
    obraSocialId: "obra-social-08",
    descuento: 0,
    items: [
      { productoId: "medicamento-15", cantidad: 2 },
      { productoId: "medicamento-19", cantidad: 1 },
    ],
    receta: recetaBase(5, 5, 7),
    medios: [{ medioId: IDS.mediosPago.transferencia, parte: 1 }],
  },
  {
    id: "venta-11",
    clienteId: "cliente-11",
    sucursalId: "sucursal-03",
    tipoVenta: "Venta libre",
    estado: "Cobrada",
    diasAtras: 6,
    obraSocialId: null,
    descuento: 600,
    items: [
      { productoId: "pvl-03", cantidad: 1 },
      { productoId: "pvl-04", cantidad: 1 },
    ],
    medios: [
      { medioId: IDS.mediosPago.debito, parte: 0.5 },
      { medioId: IDS.mediosPago.efectivo, parte: 0.5 },
    ],
  },
  {
    id: "venta-12",
    clienteId: "cliente-12",
    sucursalId: "sucursal-03",
    tipoVenta: "Con receta",
    estado: "Registrada",
    diasAtras: 2,
    obraSocialId: null,
    descuento: 300,
    items: [
      { productoId: "medicamento-01", cantidad: 1 },
      { productoId: "medicamento-03", cantidad: 1 },
    ],
    receta: recetaBase(6, 2, 11),
  },
  {
    id: "venta-13",
    clienteId: "cliente-13",
    sucursalId: "sucursal-03",
    tipoVenta: "Con receta",
    estado: "Anulada",
    diasAtras: 7,
    obraSocialId: "obra-social-02",
    descuento: 0,
    items: [{ productoId: "medicamento-02", cantidad: 1 }],
    receta: {
      ...recetaBase(7, 7, 9),
      fechaVencimiento: fechaDiasAtras(2),
    },
  },
  {
    id: "venta-14",
    clienteId: "cliente-14",
    sucursalId: "sucursal-03",
    tipoVenta: "Venta libre",
    estado: "Registrada",
    diasAtras: 3,
    obraSocialId: null,
    descuento: 0,
    items: [
      { productoId: "pvl-08", cantidad: 1 },
      { productoId: "pvl-09", cantidad: 1 },
    ],
  },
  {
    id: "venta-15",
    clienteId: "cliente-15",
    sucursalId: "sucursal-01",
    tipoVenta: "Con receta",
    estado: "Cobrada",
    diasAtras: 8,
    obraSocialId: "obra-social-05",
    descuento: 1000,
    items: [{ productoId: "medicamento-12", cantidad: 1 }],
    receta: recetaBase(8, 8, 6),
    medios: [{ medioId: IDS.mediosPago.efectivo, parte: 1 }],
  },
  {
    id: "venta-16",
    clienteId: "cliente-02",
    sucursalId: "sucursal-01",
    tipoVenta: "Venta libre",
    estado: "Cobrada",
    diasAtras: 9,
    obraSocialId: null,
    descuento: 0,
    items: [
      { productoId: "pvl-10", cantidad: 1 },
      { productoId: "pvl-11", cantidad: 1 },
    ],
    medios: [
      { medioId: IDS.mediosPago.credito, parte: 0.3 },
      { medioId: IDS.mediosPago.efectivo, parte: 0.7 },
    ],
  },
  {
    id: "venta-17",
    clienteId: "cliente-05",
    sucursalId: "sucursal-01",
    tipoVenta: "Venta libre",
    estado: "Anulada",
    diasAtras: 10,
    obraSocialId: null,
    descuento: 0,
    items: [{ productoId: "pvl-01", cantidad: 1 }],
  },
  {
    id: "venta-18",
    clienteId: "cliente-04",
    sucursalId: "sucursal-02",
    tipoVenta: "Con receta",
    estado: "Registrada",
    diasAtras: 1,
    obraSocialId: "obra-social-04",
    descuento: 0,
    items: [
      { productoId: "medicamento-17", cantidad: 1 },
      { productoId: "medicamento-18", cantidad: 1 },
    ],
    receta: recetaBase(9, 1, 13),
  },
  {
    id: "venta-19",
    clienteId: "cliente-07",
    sucursalId: "sucursal-02",
    tipoVenta: "Venta libre",
    estado: "Registrada",
    diasAtras: 2,
    obraSocialId: null,
    descuento: 0,
    items: [{ productoId: "pvl-15", cantidad: 1 }],
  },
  {
    id: "venta-20",
    clienteId: "cliente-09",
    sucursalId: "sucursal-02",
    tipoVenta: "Con receta",
    estado: "Anulada",
    diasAtras: 11,
    obraSocialId: null,
    descuento: 0,
    items: [{ productoId: "medicamento-20", cantidad: 1 }],
    receta: recetaBase(10, 11, 10),
  },
];

const estadosPorNombreVenta = new Map(
  estadosVenta.map((estado) => [estado.nombre, estado.id]),
);

const ventas: Venta[] = [];
const detallesVenta: DetalleVenta[] = [];
const recetas: Receta[] = [];
const cobros: BaseDatos["cobros"] = [];
const detallesCobro: BaseDatos["detallesCobro"] = [];

planesVenta.forEach((plan, indiceVenta) => {
  const obraSocial = obrasSociales.find((obra) => obra.id === plan.obraSocialId);
  const items = plan.items.map((item) => {
    const producto = todosLosProductos.find(
      (candidato) => candidato.id === item.productoId,
    );
    if (!producto) throw new Error(`Producto inexistente en el seed: ${item.productoId}`);
    return {
      ...item,
      precioUnitario: producto.precio,
      subtotal: calcularSubtotal(item.cantidad, producto.precio),
    };
  });
  const totales = calcularTotalesVenta(
    items,
    plan.descuento,
    obraSocial?.porcentajeCobertura ?? null,
  );

  let recetaId: string | null = null;
  if (plan.receta) {
    recetaId = `receta-${String(indiceVenta + 1).padStart(2, "0")}`;
    recetas.push({ id: recetaId, ...plan.receta });
  }

  ventas.push({
    id: plan.id,
    sucursalId: plan.sucursalId,
    clienteId: plan.clienteId,
    estadoId: estadosPorNombreVenta.get(plan.estado) ?? IDS.estadoVenta.registrada,
    obraSocialId: plan.obraSocialId,
    recetaId,
    tipoVenta: plan.tipoVenta,
    descuento: plan.descuento,
    montoCubierto: totales.montoCubierto,
    total: totales.total,
    fecha: isoDiasAtras(plan.diasAtras),
  });

  items.forEach((item, indiceItem) => {
    detallesVenta.push({
      id: `detalle-venta-${String(indiceVenta + 1).padStart(2, "0")}-${indiceItem + 1}`,
      ventaId: plan.id,
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
    });
  });

  if (plan.estado === "Cobrada" && plan.medios) {
    const importe = totales.importeACobrar;
    const cobroId = `cobro-${String(cobros.length + 1).padStart(2, "0")}`;
    cobros.push({
      id: cobroId,
      ventaId: plan.id,
      fecha: isoDiasAtras(plan.diasAtras),
      importe,
    });

    if (importe === 0) {
      detallesCobro.push({
        id: `detalle-cobro-${String(detallesCobro.length + 1).padStart(2, "0")}`,
        cobroId,
        medioPagoId: IDS.mediosPago.efectivo,
        importe: 0,
      });
    } else if (plan.medios.length === 1) {
      detallesCobro.push({
        id: `detalle-cobro-${String(detallesCobro.length + 1).padStart(2, "0")}`,
        cobroId,
        medioPagoId: plan.medios[0].medioId,
        importe,
      });
    } else {
      let acumulado = 0;
      plan.medios.forEach((medio, indiceMedio) => {
        const esUltimo = indiceMedio === plan.medios!.length - 1;
        const monto = esUltimo
          ? Math.round((importe - acumulado) * 100) / 100
          : Math.round(importe * medio.parte * 100) / 100;
        acumulado += monto;
        detallesCobro.push({
          id: `detalle-cobro-${String(detallesCobro.length + 1).padStart(2, "0")}`,
          cobroId,
          medioPagoId: medio.medioId,
          importe: monto,
        });
      });
    }
  }
});

const droguerias: DrogueriaCentral[] = [
  {
    id: IDS.central,
    nombre: "Droguería Central",
    cuit: "30-71234567-8",
    telefono: "0800 333-7284",
    direccion: "Av. Vélez Sarsfield 1450, Córdoba",
    email: "pedidos@drogueriacentral.com.ar",
  },
  {
    id: "drogueria-02",
    nombre: "Distribuidora Norte",
    cuit: "30-70987654-3",
    telefono: "0351 455-8890",
    direccion: "Ruta 9 km 12, Córdoba",
    email: "contacto@distribuidoranorte.com.ar",
  },
  {
    id: "drogueria-03",
    nombre: "Droguería del Litoral",
    cuit: "30-69876543-1",
    telefono: "0341 480-2211",
    direccion: "Cochabamba 2240, Rosario",
    email: "ventas@drogueriadellitoral.com.ar",
  },
];

const estadosPedido: EstadoPedido[] = [
  {
    id: IDS.estadoPedido.registrado,
    nombre: "Registrado",
    descripcion: "Pedido registrado, pendiente de envío.",
  },
  {
    id: IDS.estadoPedido.enviado,
    nombre: "Enviado",
    descripcion: "Pedido enviado a la droguería.",
  },
  {
    id: IDS.estadoPedido.cancelado,
    nombre: "Cancelado",
    descripcion: "Pedido cancelado.",
  },
];

const pedidos: Pedido[] = [
  {
    id: "pedido-01",
    sucursalId: "sucursal-01",
    drogueriaId: IDS.central,
    estadoId: IDS.estadoPedido.registrado,
    fecha: isoDiasAtras(2),
  },
  {
    id: "pedido-02",
    sucursalId: "sucursal-02",
    drogueriaId: IDS.central,
    estadoId: IDS.estadoPedido.registrado,
    fecha: isoDiasAtras(5),
  },
  {
    id: "pedido-03",
    sucursalId: "sucursal-01",
    drogueriaId: IDS.central,
    estadoId: IDS.estadoPedido.enviado,
    fecha: isoDiasAtras(8),
  },
  {
    id: "pedido-04",
    sucursalId: "sucursal-03",
    drogueriaId: IDS.central,
    estadoId: IDS.estadoPedido.enviado,
    fecha: isoDiasAtras(12),
  },
  {
    id: "pedido-05",
    sucursalId: "sucursal-02",
    drogueriaId: IDS.central,
    estadoId: IDS.estadoPedido.cancelado,
    fecha: isoDiasAtras(15),
  },
];

const detallesPedido: DetallePedido[] = [
  { id: "detalle-pedido-01-1", pedidoId: "pedido-01", productoId: "medicamento-01", cantidad: 20 },
  { id: "detalle-pedido-01-2", pedidoId: "pedido-01", productoId: "medicamento-03", cantidad: 15 },
  { id: "detalle-pedido-02-1", pedidoId: "pedido-02", productoId: "pvl-01", cantidad: 30 },
  { id: "detalle-pedido-02-2", pedidoId: "pedido-02", productoId: "pvl-02", cantidad: 24 },
  { id: "detalle-pedido-03-1", pedidoId: "pedido-03", productoId: "medicamento-05", cantidad: 30 },
  { id: "detalle-pedido-03-2", pedidoId: "pedido-03", productoId: "medicamento-07", cantidad: 25 },
  { id: "detalle-pedido-04-1", pedidoId: "pedido-04", productoId: "pvl-03", cantidad: 10 },
  { id: "detalle-pedido-05-1", pedidoId: "pedido-05", productoId: "medicamento-12", cantidad: 12 },
];

const estadosCompra: EstadoCompra[] = [
  {
    id: IDS.estadoCompra.registrada,
    nombre: "Registrada",
    descripcion: "Compra registrada, pendiente de recepción.",
  },
  {
    id: IDS.estadoCompra.recibida,
    nombre: "Recibida",
    descripcion: "Mercadería recibida, pendiente de actualizar stock.",
  },
  {
    id: IDS.estadoCompra.anulada,
    nombre: "Anulada",
    descripcion: "Compra anulada.",
  },
];

const compras: BaseDatos["compras"] = [
  {
    id: "compra-01",
    sucursalId: "sucursal-01",
    drogueriaId: IDS.central,
    pedidoId: "pedido-03",
    estadoId: IDS.estadoCompra.registrada,
    fecha: isoDiasAtras(7),
    total: 0,
  },
  {
    id: "compra-02",
    sucursalId: "sucursal-03",
    drogueriaId: IDS.central,
    pedidoId: "pedido-04",
    estadoId: IDS.estadoCompra.registrada,
    fecha: isoDiasAtras(10),
    total: 0,
  },
  {
    id: "compra-03",
    sucursalId: "sucursal-01",
    drogueriaId: IDS.central,
    pedidoId: null,
    estadoId: IDS.estadoCompra.recibida,
    fecha: isoDiasAtras(14),
    total: 0,
  },
  {
    id: "compra-04",
    sucursalId: "sucursal-02",
    drogueriaId: IDS.central,
    pedidoId: null,
    estadoId: IDS.estadoCompra.recibida,
    fecha: isoDiasAtras(18),
    total: 0,
  },
  {
    id: "compra-05",
    sucursalId: "sucursal-03",
    drogueriaId: IDS.central,
    pedidoId: null,
    estadoId: IDS.estadoCompra.anulada,
    fecha: isoDiasAtras(20),
    total: 0,
  },
];

const planDetallesCompra: Array<
  Array<{ productoId: string; cantidad: number; precioUnitario: number }>
> = [
  [
    { productoId: "medicamento-05", cantidad: 30, precioUnitario: 5600 },
    { productoId: "medicamento-07", cantidad: 25, precioUnitario: 4200 },
  ],
  [{ productoId: "pvl-03", cantidad: 10, precioUnitario: 6800 }],
  [
    { productoId: "medicamento-02", cantidad: 30, precioUnitario: 3100 },
    { productoId: "pvl-01", cantidad: 40, precioUnitario: 3400 },
  ],
  [
    { productoId: "pvl-05", cantidad: 50, precioUnitario: 1300 },
    { productoId: "pvl-06", cantidad: 40, precioUnitario: 1800 },
  ],
  [{ productoId: "medicamento-12", cantidad: 15, precioUnitario: 6100 }],
];

const detallesCompra: DetalleCompra[] = [];
compras.forEach((compra, indiceCompra) => {
  const detalles = planDetallesCompra[indiceCompra];
  let total = 0;
  detalles.forEach((detalle, indiceDetalle) => {
    const subtotal = calcularSubtotal(detalle.cantidad, detalle.precioUnitario);
    total += subtotal;
    detallesCompra.push({
      id: `detalle-compra-${String(indiceCompra + 1).padStart(2, "0")}-${indiceDetalle + 1}`,
      compraId: compra.id,
      productoId: detalle.productoId,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnitario,
      subtotal,
    });
  });
  compra.total = Math.round(total * 100) / 100;
});

const auditoria: RegistroAuditoria[] = [
  {
    id: "auditoria-orden-03",
    fecha: isoDiasAtras(8),
    usuario: "Sistema",
    rol: "Sistema",
    tipoOperacion: "Pedido",
    descripcion: "Orden de pedido generada.",
    sucursalId: "sucursal-01",
    referenciaId: "pedido-03",
  },
  {
    id: "auditoria-orden-04",
    fecha: isoDiasAtras(12),
    usuario: "Sistema",
    rol: "Sistema",
    tipoOperacion: "Pedido",
    descripcion: "Orden de pedido generada.",
    sucursalId: "sucursal-03",
    referenciaId: "pedido-04",
  },
];

export function crearSeed(): BaseDatos {
  return JSON.parse(
    JSON.stringify({
      clientes,
      turnos,
      ventas,
      detallesVenta,
      recetas,
      estadosVenta,
      cobros,
      detallesCobro,
      mediosPago,
      obrasSociales,
      medicamentos,
      productosVentaLibre,
      inventarios,
      sucursales,
      pedidos,
      detallesPedido,
      estadosPedido,
      compras,
      detallesCompra,
      estadosCompra,
      droguerias,
      auditoria,
    }),
  ) as BaseDatos;
}

export const NOMBRES_ESTADOS = {
  venta: {
    registrada: "Registrada",
    cobrada: "Cobrada",
    anulada: "Anulada",
  },
  pedido: {
    registrado: "Registrado",
    enviado: "Enviado",
    cancelado: "Cancelado",
  },
  compra: {
    registrada: "Registrada",
    recibida: "Recibida",
    anulada: "Anulada",
  },
} as const;

export const TIPOS_MEDIO_PAGO: TipoMedioPago[] = [
  "Efectivo",
  "Débito",
  "Crédito",
  "Transferencia",
];
