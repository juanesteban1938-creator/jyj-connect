'use client';

/**
 * J&J CONNECT V2.0 - WhatsApp Bridge
 * Empresa: Transportes Especiales J&J
 * Asistente: Nova
 */

export const WHATSAPP_BOT_URL = 'https://focused-harmony-production.up.railway.app';
const API_KEY = 'jj-connect-2026';

/**
 * Intenta parsear una respuesta como JSON de forma segura.
 */
async function safeJsonParse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error('[WhatsApp Bridge] Error parseando respuesta:', text.substring(0, 100));
    return null;
  }
}

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
    
    const hasExplicitPrefix = phoneStr.startsWith('+');
    let telefono = phoneStr.replace(/\D/g, '');

    if (!telefono || telefono.length < 7) {
      return { success: false, error: 'Teléfono del cliente inválido o vacío' };
    }

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

    const data = await safeJsonParse(response);

    if (!response.ok) {
        throw new Error(data?.error || 'Error en el servidor de Nova');
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerEstadoNova() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`, {
      headers: { 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(5000)
    });
    
    const data = await safeJsonParse(response);
    
    if (!response.ok || !data) {
        return { connected: false, error: 'Servidor no responde' };
    }
    
    return data;
  } catch (error) {
    return { connected: false, error: 'Bot fuera de línea' };
  }
}

export async function obtenerQRNova() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/qr`, {
      headers: { 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.status === 202) return { error: 'Generando...' };
    
    const data = await safeJsonParse(response);
    
    if (!response.ok || !data) return { error: 'No disponible' };
    
    return data;
  } catch {
    return { error: 'Error de red al obtener QR' };
  }
}
