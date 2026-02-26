
const WHATSAPP_BOT_URL = 'https://focused-harmony-production.up.railway.app';
const API_KEY = 'jj-connect-2026';

/**
 * Limpia y normaliza un número de teléfono para WhatsApp.
 * Asegura que solo viajen dígitos y el prefijo de país.
 */
function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Extraer solo dígitos (elimina espacios, guiones, paréntesis)
  let cleaned = phone.toString().replace(/\D/g, '');
  // Eliminar ceros iniciales
  cleaned = cleaned.replace(/^0+/, '');
  
  // Si tiene 10 dígitos (formato móvil Colombia), asegurar el prefijo 57
  if (cleaned.length === 10) {
    cleaned = '57' + cleaned;
  }
  return cleaned;
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
  const phone = sanitizePhoneNumber(servicio.clienteTelefono);
  
  console.log('[Nova Client] Intentando notificar a:', phone);

  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-service-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        ...servicio,
        clienteTelefono: phone 
      })
    });
    
    const result = await response.json();

    if (!response.ok) {
        // Retornamos el error específico del servidor (ej. "Número no está en WhatsApp")
        throw new Error(result.error || `Error del servidor: ${response.status}`);
    }

    return result;
  } catch (error: any) {
    console.error('[Nova Client] Error en petición:', error.message);
    throw error;
  }
}

export async function obtenerEstadoWhatsApp() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) return { connected: false };
    return response.json();
  } catch (error) {
    console.warn('Nova Server Offline');
    return { connected: false, error: 'Servidor de Nova no responde' };
  }
}

export async function obtenerQR() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/qr`, {
      headers: { 'Accept': 'application/json' }
    });
    return response.json();
  } catch (error) {
    return { error: 'No se pudo obtener el código QR' };
  }
}
