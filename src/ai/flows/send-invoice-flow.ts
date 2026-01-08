'use server';
// This file is no longer used for sending emails from the client,
// but is kept to avoid breaking the genkit dev server.
// The email sending logic has been moved to /api/send-invoice/route.ts
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
    subject: `📄 Cuenta de Cobro ${input.nroFactura} - Transportes Especial J&J`,
    html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #000; font-family: 'Poppins', sans-serif;">Estimado(a) cliente, reciba un cordial saludo.</h2>
            <p>¡Hola! Es un gusto saludarte de nuevo.</p>
            <p>En Transportes Especial J&J, creemos que la innovación debe acompañarte desde que abordas nuestro vehículo hasta que recibes tu documentación. Por eso, hemos optimizado nuestro sistema para que gestiones tus servicios de forma digital y sin complicaciones.</p>
            <p>📄 <b>Tu Cuenta de Cobro está lista:</b> Hemos adjuntado el PDF oficial con todos los detalles de tu trayecto. Nuestro compromiso es la transparencia y la agilidad en cada proceso.</p>
            <br>
            <p>Gracias por elegirnos como su aliado en movilidad. Quedamos a su disposición para cualquier consulta adicional.</p>
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
