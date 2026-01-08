'use server';

import { ai } from '@/ai/genkit';
import { SendInvoiceInputSchema, type SendInvoiceInput, SendInvoiceOutputSchema } from '@/lib/schemas';
import nodemailer from 'nodemailer';

export async function sendInvoice(input: SendInvoiceInput): Promise<SendInvoiceOutput> {
  console.log('Intento de conexión para:', process.env.SMTP_USER);
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: 'cymeyvdehchdnrrf',
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: input.to,
    subject: `📄 Cuenta de Cobro - ${input.nroFactura} - Transportes Especial J&J`,
    html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #000; font-family: 'Poppins', sans-serif;">Estimado(a) cliente, esperamos que tenga un excelente día.</h2>
            <p>Es un gusto para nosotros enviarle el soporte de su servicio de transporte. Adjunto encontrará la Cuenta de Cobro oficial en formato PDF.</p>
            <p>En <b>Transportes Especial J&J</b>, agradecemos su confianza. Estamos comprometidos con su puntualidad, seguridad y confort en cada trayecto.</p>
            <br>
            <p>Quedamos a su entera disposición para cualquier inquietud adicional.</p>
            <p>Cordialmente,</p>
            <div style="margin-top: 10px;">
                <p style="margin: 0; font-weight: bold;">Departamento de Operaciones</p>
                <p style="margin: 0;">Transportes.especialesjyj@gmail.com</p>
                <p style="margin: 0;">Celular: +57 314 2889955</p>
                <p style="margin: 0;">Carrera 58 numero 130A-82</p>
            </div>
        </div>
    `,
    attachments: [
        {
            filename: 'Cuenta_de_Cobro_JJ.pdf',
            content: Buffer.from(input.pdfBase64, 'base64'),
            contentType: 'application/pdf'
        }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: `Correo enviado a ${input.to}.` };
  } catch (error: any) {
    console.error('Error al enviar el correo:', error);
    return { success: false, message: 'Error al enviar el correo: ' + error.message };
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
