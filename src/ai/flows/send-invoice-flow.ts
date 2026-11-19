'use server';
/**
 * FLUJO IA: Envío de Cuenta de Cobro (Redirigido a API segura)
 */
import { ai } from '@/ai/genkit';
import { SendInvoiceInputSchema, type SendInvoiceInput, SendInvoiceOutputSchema } from '@/lib/schemas';

export async function sendInvoice(input: SendInvoiceInput): Promise<SendInvoiceOutput> {
  const bridgeUrl = process.env.RAILWAY_BOT_URL || 'https://focused-harmony-production.up.railway.app';
  const apiKey = process.env.RAILWAY_API_KEY || 'jj-connect-2026';

  try {
    const response = await fetch(`${bridgeUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        to: input.to,
        subject: `📄 Cuenta de Cobro ${input.nroFactura} - Transportes Especial J&J`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #000; font-family: 'Poppins', sans-serif;">Estimado(a) cliente, reciba un cordial saludo.</h2>
                <p>📄 <b>Tu Cuenta de Cobro está lista:</b> Hemos adjuntado el PDF oficial con todos los detalles de tu trayecto.</p>
                <br>
                <p>Cordialmente,</p>
                <p><strong>Departamento de Operaciones</strong></p>
            </div>
        `,
        attachments: [
            {
                filename: 'Cuenta_de_Cobro_JJ.pdf',
                content: input.pdfBase64,
                encoding: 'base64',
                contentType: 'application/pdf'
            }
        ]
      })
    });

    if (!response.ok) throw new Error('Error en comunicación con el puente.');

    return { success: true, message: `Correo enviado vía puente a ${input.to}.` };
  } catch (error: any) {
    console.error('Error al enviar correo vía puente:', error);
    return { success: false, message: 'Error de puente: ' + error.message };
  }
}

const sendInvoiceFlow = ai.defineFlow(
  {
    name: 'sendInvoiceFlow',
    inputSchema: SendInvoiceInputSchema,
    outputSchema: SendInvoiceOutputSchema,
  },
  sendInvoice
);