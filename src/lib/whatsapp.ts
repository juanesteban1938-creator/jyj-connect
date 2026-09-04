'use client';

/**
 * J&J CONNECT V2.0 - WhatsApp Bridge
 * Empresa: Transportes Especiales J&J
 * Asistente: Nova
 */

const WHATSAPP_BOT_URL = 'https://focused-harmony-production.up.railway.app';
const API_KEY = 'jj-connect-2026';

export async function enviarNotificacionServicio(servicio: {
  clienteNombre: string;
  clienteTelefono: string | number;
  fecha: string;
  hora: string;
  origen: string;
  destino: string;
  placa: string;
  conductor: string;
  telefonoConductor: string;
}) {
  try {
    const rawValue = servicio.clienteTelefono;
    const phoneStr = (rawValue !== null && rawValue !== undefined) ? String(rawValue).trim() : '';
    
    // Detectar si el usuario ya incluyó un prefijo internacional con el símbolo +
    const hasExplicitPrefix = phoneStr.startsWith('+');
    let telefono = phoneStr.replace(/\D/g, '');

    if (!telefono || telefono.length < 7) {
      return { success: false, error: 'Teléfono del cliente inválido o vacío' };
    }

    /**
     * LÓGICA DE PREFIJO INTERNACIONAL INTELIGENTE
     * 1. Si el usuario puso '+' (ej: +1305...), el replace dejó '1305...', lo usamos tal cual.
     * 2. Si el número tiene 10 dígitos (estándar Colombia local) y no empieza por 1 (USA) ni 57 (CO),
     *    le agregamos el 57 por defecto para mantener la compatibilidad con ingresos rápidos.
     */
    if (!hasExplicitPrefix && telefono.length === 10 && !telefono.startsWith('57') && !telefono.startsWith('1')) {
      telefono = '57' + telefono;
    }

    const response = await fetch(`${WHATSAPP_BOT_URL}/send-service-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        clienteNombre: servicio.clienteNombre,
        clienteTelefono: telefono,
        fecha: servicio.fecha,
        hora: servicio.hora,
        origen: servicio.origen,
        destino: servicio.destino,
        placa: servicio.placa,
        conductor: servicio.conductor,
        telefonoConductor: servicio.telefonoConductor,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error en el servidor de Nova');
    
    return { success: true };
  } catch (error: any) {
    console.error('[Nova] Error en Bridge:', error.message);
    return { success: false, error: error.message };
  }
}

export async function obtenerEstadoNova() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`, {
      headers: { 'x-api-key': API_KEY },
    });
    
    if (!response.ok) {
        return { connected: false };
    }
    
    const data = await response.json();
    return data; // Devuelve { connected: boolean }
  } catch (error) {
    console.error('[Nova Status] Error de conexión:', error);
    return { connected: false };
  }
}

export async function obtenerQRNova() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/qr`, {
      headers: { 'x-api-key': API_KEY },
    });
    
    if (!response.ok) return { error: 'No disponible' };
    
    return await response.json(); // Devuelve { qr: 'base64...' } o { connected: true }
  } catch {
    return { error: 'No disponible' };
  }
}
