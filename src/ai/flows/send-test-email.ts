'use server';

import { ai } from '@/ai/genkit';
import { SendTestEmailOutputSchema, type SendTestEmailOutput } from '@/lib/schemas';
import nodemailer from 'nodemailer';

export async function sendTestEmail(): Promise<SendTestEmailOutput> {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true, 
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'Prueba de Conexión SMTP - J&J Connect',
      text: 'Este es un correo de prueba para verificar que la configuración SMTP funciona correctamente.',
      html: '<h1>¡Conexión Exitosa!</h1><p>Este es un correo de prueba para verificar que la configuración SMTP funciona correctamente desde tu aplicación J&J Connect.</p>',
    };

    try {
      console.log(`Intento de conexión para: ${process.env.SMTP_USER}`);
      await transporter.sendMail(mailOptions);
      console.log('Correo de prueba enviado exitosamente.');
      return { success: true, message: 'Correo de prueba enviado exitosamente.' };
    } catch (error: any) {
      console.error('Error al enviar el correo de prueba:', error);
      return { success: false, message: 'Error al enviar el correo de prueba: ' + error.message };
    }
}

const sendTestEmailFlow = ai.defineFlow(
  {
    name: 'sendTestEmailFlow',
    outputSchema: SendTestEmailOutputSchema
  },
  sendTestEmail
);
