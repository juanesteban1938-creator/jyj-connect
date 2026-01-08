'use server';

import { ai } from '@/ai/genkit';
import { transportOptions } from '@/lib/mailer';
import nodemailer from 'nodemailer';
import { SendInvoiceInputSchema, SendInvoiceOutputSchema, type SendInvoiceInput, type SendInvoiceOutput } from '@/lib/schemas';


export async function sendInvoice(input: SendInvoiceInput): Promise<SendInvoiceOutput> {
    return sendInvoiceFlow(input);
}

const sendInvoiceFlow = ai.defineFlow(
  {
    name: 'sendInvoiceFlow',
    inputSchema: SendInvoiceInputSchema,
    outputSchema: SendInvoiceOutputSchema,
  },
  async ({ to, subject, htmlContent }) => {
    const transporter = nodemailer.createTransport(transportOptions);

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Correo enviado exitosamente a ${to}.`);
      return { success: true, message: `Correo enviado a ${to}.` };
    } catch (error: any) {
      console.error('Error al enviar el correo:', error);
      return { success: false, message: 'Error al enviar el correo: ' + error.message };
    }
  }
);
