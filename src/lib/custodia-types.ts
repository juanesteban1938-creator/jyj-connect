
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
  tasa_riesgo: number; // Porcentaje decimal (ej. 0.015 para 1.5%)
  margen_utilidad: number; // Porcentaje decimal (ej. 0.20)
  tope_cobertura_estandar: number;
  valor_declarado_minimo: number;
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
  kmEstimados: number;
  // Campos calculados
  subtotal: number;
  primaRiesgo: number;
  tarifaTotal: number;
  requiereRevisionManual: boolean;
  estado: 'Programado' | 'En Ruta' | 'Entregado' | 'Cancelado';
  createdAt: any;
}
