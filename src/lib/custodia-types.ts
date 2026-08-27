
export interface UsuarioPanel {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'operador';
  modulos_permitidos: string[];
  fecha_creacion: string;
}

export interface ConfigCustodia {
  costo_fijo_mensual: number;
  envios_mes_estimados: number;
  tarifa_por_km: number;
  cargo_fijo_custodia: number;
  tasa_riesgo: number; // Porcentaje decimal (ej. 0.005 para 0.5%)
  margen_utilidad: number; // Porcentaje decimal (ej. 0.25 para 25%)
  tope_cobertura_estandar: number;
  valor_declarado_minimo: number;
  km_maximo_urbano: number;
  updatedAt: any;
}

export interface Envio {
  id: string;
  consecutivo: string;
  fecha: string;
  hora: string;
  origen: string;
  destino: string;
  vehiculo: 'Moto' | 'Auto' | 'Van';
  descripcion: string;
  valorDeclarado: number;
  valorDeclaradoReal?: number; // El valor real si se usó el mínimo
  fueValorDeclaradoOmitido: boolean;
  kmEstimados: number;
  // Campos calculados
  costoBaseLogistico: number;
  primaRiesgo: number;
  cargoCustodia: number;
  margenUtilidadValor: number;
  tarifaTotal: number;
  planClasificacion: 'Esencial' | 'Seguro' | 'Corporativo';
  requiereRevisionManual: boolean;
  estado: 'programado' | 'en_transito' | 'entregado' | 'cancelado' | 'requiere_revision_manual';
  // Asignación de personal
  conductorId?: string;
  conductorNombre?: string;
  createdAt: any;
}
