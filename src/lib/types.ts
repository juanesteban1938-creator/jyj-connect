export type Servicio = {
  id: string;
  consecutivo: string;
  hora: string;
  fecha: string;
  origen: string;
  destino: string;
  cliente: string;
  nitCliente: string;
  telefonoCliente: string;
  clienteIniciales: string;
  clienteNombre?: string;
  emailCliente?: string;
  conductor: string;
  conductorTelefono?: string;
  vehiculo: string;
  vehiculoPlaca?: string;
  estado: 'Programado' | 'En Servicio' | 'Finalizado' | 'Cancelado';
  valorServicio: number;
  anticipo: number;
  saldo: number;
  metodoPago: 'Efectivo' | 'Transferencia' | 'Facturacion';
  costoOperacion: number;
  estadoPago: 'Pending' | 'Anticipo' | 'Pagado' | 'Anulado' | 'Pendiente';
  paradasAdicionales?: string[];
  puntosRecogida?: string[];
  puntosDestino?: string[];
  numeroComprobante?: string;
  banco?: string;
  notificacionEnviada: boolean;
  notificacionSalidaEnviada: boolean;
  horaRecogidaTimestamp?: any;
};

export type Cliente = {
  id: string; 
  razonSocial: string;
  nit: string;
  telefono: string;
  email?: string;
  tipo: 'Institucional' | 'Corporativo' | 'ONG' | 'Turismo' | 'Particular';
};

export type Conductor = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  direccion: string;
  barrio: string;
  telefono: string;
  categoriaLicencia: 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'C3';
  vencimientoLicencia: string;
  avatarUrl?: string;
};

export type Vehiculo = {
  id: string;
  marca: string;
  linea: string;
  modelo: string;
  tipoVehiculo: 'BUS' | 'BUSETA' | 'MICROBUS' | 'CAMIONETA' | 'OTRO';
  capacidad: number;
  placa: string;
  vencimientoSoat?: string;
  vencimientoTecnomecanica?: string;
  vencimientoTarjetaOperacion?: string;
  numeroPolizaSoat?: string;
  numeroPolizaRcc?: string;
  vencimientoRcc?: string;
  numeroPolizaRce?: string;
  vencimientoRce?: string;
};

export type Transaccion = {
  id: string;
  tipo: 'Ingreso' | 'Gasto';
  fecha: string;
  categoria: string;
  descripcion: string;
  valor: number;
  vehiculoPlaca?: string;
};
