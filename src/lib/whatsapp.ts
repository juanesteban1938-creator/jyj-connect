
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
        throw new Error(`Bot respondió con error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error enviando notificación avanzada:', error);
    throw error;
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
