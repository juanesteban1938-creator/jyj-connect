
const WHATSAPP_BOT_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'https://focused-harmony-production.up.railway.app';
const API_KEY = process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || 'jj-connect-2026';

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
  console.log('Nova intentando enviar notificación avanzada a:', servicio.clienteTelefono);
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-service-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(servicio)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Bot respondió con error: ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
        } catch (e) {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    console.warn('Error detallado enviando notificación:', error.message);
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
    console.warn('Servidor del bot no disponible actualmente.');
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
    console.warn('No se pudo obtener el QR:', error);
    return { error: 'No se pudo obtener el código QR' };
  }
}
