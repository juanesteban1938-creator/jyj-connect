
const WHATSAPP_BOT_URL = 'https://focused-harmony-production.up.railway.app';
const API_KEY = 'jj-connect-2026';

/**
 * Limpia y normaliza un número de teléfono para WhatsApp.
 * Solo extrae dígitos para que el bot haga la resolución final.
 */
function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Extraer solo dígitos
  let cleaned = phone.toString().replace(/\D/g, '');
  // Eliminar ceros iniciales
  cleaned = cleaned.replace(/^0+/, '');
  
  // Si tiene 10 dígitos (Colombia), asegurar el prefijo 57
  if (cleaned.length === 10 && !cleaned.startsWith('57')) {
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
  
  console.log('[Nova Client] Enviando petición para:', phone);

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
        throw new Error(result.error || `Error del bot (${response.status})`);
    }

    return result;
  } catch (error: any) {
    console.warn('[Nova Client] Fallo:', error.message);
    throw error;
  }
}

export async function obtenerEstadoWhatsApp() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`, {
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) return { connected: false };
    return response.json();
  } catch (error) {
    return { connected: false, error: 'Servidor fuera de línea' };
  }
}

export async function obtenerQR() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/qr`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    return response.json();
  } catch (error) {
    return { error: 'No se pudo obtener el código QR' };
  }
}
