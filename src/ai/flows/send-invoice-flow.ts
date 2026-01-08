'use server';

import { ai } from '@/ai/genkit';
import { transportOptions } from '@/lib/mailer';
import nodemailer from 'nodemailer';
import { z } from 'zod';

export const SendInvoiceInputSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  htmlContent: z.string(),
});
export type SendInvoiceInput = z.infer<typeof SendInvoiceInputSchema>;

export const sendInvoiceFlow = ai.defineFlow(
  {
    name: 'sendInvoiceFlow',
    inputSchema: SendInvoiceInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
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
