
/**
 * VIANOVA S.A.S - WhatsApp Bridge Client
 * Módulo de comunicación con el bot Nova.
 */

const WHATSAPP_BOT_URL = 'https://focused-harmony-production.up.railway.app';
const API_KEY = 'jj-connect-2026';

/**
 * Limpia y normaliza un número de teléfono para enviarlo al bot.
 * Asegura que solo viajen dígitos.
 */
function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Extraer solo dígitos
  return phone.toString().replace(/\D/g, '');
}

export async function enviarNotificacionServicio(servicio: {
  clienteNombre: string
  clienteTelefono: string
  fecha: string
  hora: string
  origen: string
  destino: string
  placa: string
  conductor: string
  telefonoConductor: string
}) {
  const cleanPhone = sanitizePhoneNumber(servicio.clienteTelefono);
  
  console.log('[Nova] Solicitando notificación para:', cleanPhone);

  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-service-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        ...servicio,
        clienteTelefono: cleanPhone 
      })
    });
    
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || `Error: ${response.status}`);
    }

    return result;
  } catch (error: any) {
    console.error('[Nova] Error de red o servidor:', error.message);
    throw error;
  }
}

export async function obtenerEstadoWhatsApp() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`);
    if (!response.ok) return { connected: false };
    return response.json();
  } catch (error) {
    return { connected: false, error: 'Nova Server Offline' };
  }
}

export async function obtenerQR() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/qr`);
    return response.json();
  } catch (error) {
    return { error: 'QR Indisponible' };
  }
}
