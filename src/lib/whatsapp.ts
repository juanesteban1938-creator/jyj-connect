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

    if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error en el servidor de Nova');
    }
    
    return { success: true };
  } catch (error: any) {
    // No lanzamos error fatal, devolvemos error controlado para el UI
    return { success: false, error: error.message };
  }
}

export async function obtenerEstadoNova() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`, {
      headers: { 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(5000) // Timeout para evitar colgar el UI
    });
    
    if (!response.ok) {
        return { connected: false, error: 'Servidor no responde' };
    }
    
    return await response.json();
  } catch (error) {
    // Error silencioso para el sistema de polling
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
    if (!response.ok) return { error: 'No disponible' };
    
    return await response.json();
  } catch {
    return { error: 'Error de red al obtener QR' };
  }
}
