'use server';

import { ai } from '@/ai/genkit';
import { SendTestEmailOutputSchema, type SendTestEmailOutput } from '@/lib/schemas';

/**
 * Prueba de conexión a través del Puente Railway.
 */
export async function sendTestEmail(): Promise<SendTestEmailOutput> {
    const bridgeUrl = process.env.RAILWAY_BOT_URL || 'https://focused-harmony-production.up.railway.app';
    const apiKey = process.env.RAILWAY_API_KEY || 'jj-connect-2026';
    const targetEmail = process.env.SMTP_USER || 'transportes.especialesjyj@gmail.com';
    
    try {
      const response = await fetch(`${bridgeUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          to: targetEmail,
          subject: 'Prueba de Puente Seguro - J&J Connect',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h1>¡Puente Operativo!</h1>
                <p>Este correo confirma que la aplicación web se está comunicando correctamente con el servidor de Railway para enviar correos electrónicos.</p>
                <br>
                <p>Cordialmente,</p>
                <p><strong>Nova Intelligence v5.0</strong></p>
            </div>
          `
        })
      });

      if (!response.ok) {
        throw new Error('Fallo al contactar el puente seguro.');
      }

      console.log('Correo de prueba enviado exitosamente vía puente.');
      return { success: true, message: 'Prueba de puente exitosa.' };
    } catch (error: any) {
      console.error('Error en prueba de puente:', error);
      return { success: false, message: 'Error de puente: ' + error.message };
    }
}

const sendTestEmailFlow = ai.defineFlow(
  {
    name: 'sendTestEmailFlow',
    outputSchema: SendTestEmailOutputSchema
  },
  sendTestEmail
);