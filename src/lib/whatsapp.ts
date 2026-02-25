
const WHATSAPP_BOT_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'https://focused-harmony-production.up.railway.app';
const API_KEY = process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || 'jj-connect-2026';

export async function enviarMensajeWhatsApp(phone: string, message: string) {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ phone, message })
    });
    return response.json();
  } catch (error) {
    console.error('Error enviando mensaje de WhatsApp:', error);
    return { success: false, error: 'No se pudo conectar con el servidor del bot' };
  }
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
  valor: string
}) {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-service-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(servicio)
    });
    return response.json();
  } catch (error) {
    console.error('Error enviando notificación avanzada:', error);
    return { success: false, error: 'No se pudo conectar con el servidor del bot' };
  }
}

export async function obtenerEstadoWhatsApp() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`);
    return response.json();
  } catch (error) {
    console.error('Error obteniendo estado de WhatsApp:', error);
    return { connected: false, error: 'Servidor fuera de línea' };
  }
}

export async function obtenerQR() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/qr`);
    return response.json();
  } catch (error) {
    console.error('Error obteniendo QR de WhatsApp:', error);
    return { error: 'No se pudo obtener el código QR' };
  }
}
