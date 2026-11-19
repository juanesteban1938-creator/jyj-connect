/**
 * J&J CONNECT - Secure Google Apps Script Mailer Module
 * Este módulo centraliza el envío de correos delegando la tarea a Google Apps Script vía HTTPS.
 */

/**
 * Envía un correo electrónico de forma segura a través del motor de Google.
 * @param {Object} options - { to, subject, html, text, attachments }
 */
async function sendEmail({ to, subject, html, text, attachments = [] }) {
    const gasUrl = process.env.GAS_EMAIL_URL;
    
    if (!gasUrl) {
        throw new Error('Configuración GAS_EMAIL_URL incompleta en el servidor de Railway.');
    }

    const payload = {
        apiKey: "JJ_CONNECT_2026_SEGURA",
        to,
        subject,
        html,
        text,
        attachments
    };

    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });

        const rawText = await response.text();
        let data;

        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error('[GAS Bridge Error] Respuesta no es JSON:', rawText);
            throw new Error('El motor de Google devolvió una respuesta inesperada (no JSON).');
        }

        if (!data.success) {
            console.error('[GAS Bridge Error]:', data.error || rawText);
            throw new Error(data.error || 'Fallo reportado por Google Apps Script.');
        }

        console.log(`[GAS Bridge] Correo enviado exitosamente a ${to}`);
        return { success: true, messageId: data.messageId || 'GAS_SENT' };

    } catch (error) {
        console.error('[Bridge Mailer Error]:', error.message);
        throw error;
    }
}

module.exports = { sendEmail };
