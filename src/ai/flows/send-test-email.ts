'use server';

import { ai } from '@/ai/genkit';
import { SendTestEmailOutputSchema, type SendTestEmailOutput } from '@/lib/schemas';
import nodemailer from 'nodemailer';

export async function sendTestEmail(): Promise<SendTestEmailOutput> {
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
      to: process.env.SMTP_USER,
      subject: 'Prueba de Conexión SMTP - J&J Connect',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1>¡Conexión Exitosa!</h1>
            <p>Este es un correo de prueba para verificar que la configuración SMTP funciona correctamente desde tu aplicación J&J Connect.</p>
            <br>
            <p>Cordialmente,</p>
            <p><strong>Departamento de Operaciones</strong><br>
            Transportes.especialesjyj@gmail.com<br>
            Celular: +57 314 2889955<br>
            Carrera 58 numero 130A-82</p>
        </div>
    `,
    };

    try {
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

    