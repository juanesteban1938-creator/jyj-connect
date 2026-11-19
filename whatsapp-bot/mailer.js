/**
 * J&J CONNECT - Secure Mailer Module
 * Este módulo centraliza el envío de correos usando las variables de entorno de Railway.
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465, // True para 465, false para 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        // No fallar en certificados autofirmados
        rejectUnauthorized: false
    }
});

/**
 * Envía un correo electrónico de forma segura.
 * @param {Object} options - { to, subject, html, text, attachments }
 */
async function sendEmail({ to, subject, html, text, attachments = [] }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Configuración SMTP incompleta en el servidor.');
    }

    const mailOptions = {
        from: `"Transportes Especiales J&J" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
        attachments
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Bridge Mailer] Correo enviado a ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Bridge Mailer Error]:', error.message);
        throw error;
    }
}

module.exports = { sendEmail };
