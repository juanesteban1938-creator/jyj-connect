'use client';
/**
 * VIANOVA S.A.S - WhatsApp Bridge Client
 * Versión optimizada para Nova 2025
 */

const WHATSAPP_BOT_URL = 'https://focused-harmony-production.up.railway.app'
const API_KEY = 'jj-connect-2026'

function formatPhone(phone: string): string {
  let clean = phone.toString().replace(/\D/g, '')
  if (!clean.startsWith('57')) clean = '57' + clean
  return clean
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
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-service-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        ...servicio,
        clienteTelefono: formatPhone(servicio.clienteTelefono)
      })
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Error desconocido')
    return { success: true }
  } catch (error: any) {
    console.error('[Nova] Error:', error)
    return { success: false, error: error.message }
  }
}

export async function obtenerEstadoNova() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`, {
      headers: { 'x-api-key': API_KEY }
    })
    return await response.json()
  } catch {
    return { connected: false }
  }
}

export async function obtenerQRNova() {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/qr`, {
      headers: { 'x-api-key': API_KEY }
    })
    return await response.json()
  } catch {
    return { error: 'No disponible' }
  }
}
