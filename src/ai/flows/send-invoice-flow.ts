'use server';

import { ai } from '@/ai/genkit';
import { SendInvoiceInputSchema, type SendInvoiceInput, SendInvoiceOutputSchema } from '@/lib/schemas';
import nodemailer from 'nodemailer';

export async function sendInvoice(input: SendInvoiceInput): Promise<SendInvoiceOutput> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS?.trim(),
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: input.to,
    subject: input.subject,
    html: input.htmlContent,
  };

  try {
    console.log('Intentando autenticación con clave de 16 caracteres...');
    console.log(`Intento de conexión para: ${process.env.SMTP_USER}`);
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
