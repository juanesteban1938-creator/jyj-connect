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
            <h2 style="color: #000; font-family: 'Poppins', sans-serif;">¡Hola! Es un gusto saludarte.</h2>
            <p>Adjunto a este correo encontrarás la cuenta de cobro detallada por el servicio de transporte prestado. En <b>Transportes Especial J&J</b>, nuestra prioridad es brindarte comodidad y puntualidad en cada trayecto.</p>
            <p>Si tienes alguna duda, estamos atentos para ayudarte. ¡Gracias por confiar en nosotros!</p>
            <br>
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
            content: input.pdfBuffer,
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
