
const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

// Inicialización de Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'studio-6997056255-a0ecc'
    });
}

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3001;
const apiKey = process.env.API_KEY || 'jj-connect-2026';

let qrCodeBase64 = '';
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) return console.error('Error generando QR:', err);
        qrCodeBase64 = url;
    });
    isReady = false;
    console.log('[Nova] Nuevo QR generado.');
});

client.on('ready', () => {
    console.log('[Nova] Bot listo y conectado.');
    isReady = true;
    qrCodeBase64 = '';
});

client.on('disconnected', (reason) => {
    console.log('[Nova] Desconectado:', reason);
    isReady = false;
    setTimeout(() => {
        client.initialize().catch(err => console.error('[Nova] Error re-init:', err));
    }, 5000);
});

const authMiddleware = (req, res, next) => {
    const headerKey = req.headers['x-api-key'];
    if (apiKey && headerKey !== apiKey) {
        return res.status(401).json({ error: 'No autorizado.' });
    }
    next();
};

app.get('/status', (req, res) => res.json({ connected: isReady }));

app.get('/qr', (req, res) => {
    if (isReady) return res.json({ message: 'Conectado' });
    if (!qrCodeBase64) return res.status(404).json({ error: 'QR no generado' });
    res.json({ qr: qrCodeBase64 });
});

app.post('/send-service-notification', authMiddleware, async (req, res) => {
    const data = req.body;
    if (!data.clienteTelefono) return res.status(400).json({ error: 'Teléfono requerido' });
    if (!isReady) return res.status(503).json({ error: 'Nova no está conectada' });

    try {
        let cleanPhone = data.clienteTelefono.toString().replace(/\D/g, '');
        
        // Resolver el ID real en WhatsApp (Maneja automáticamente el '9' de Colombia)
        console.log(`[Nova] Validando número en WhatsApp: ${cleanPhone}`);
        const contactId = await client.getNumberId(cleanPhone);
        
        if (!contactId) {
            console.warn(`[Nova] El número ${cleanPhone} no fue encontrado en la red de WhatsApp.`);
            return res.status(404).json({ error: 'El número no está en WhatsApp o es inválido.' });
        }

        const targetJid = contactId._serialized;
        console.log(`[Nova] ID resuelto con éxito: ${targetJid}`);

        const textMessage = `¡Hola, ${data.clienteNombre}! 👋\n\nSoy *Nova*, asistente virtual de *Transportes Especiales J&J* 🚐\n\nTu servicio ha sido programado:\n\n━━━━━━━━━━━━━━━━\n🗓️ *Fecha:* ${data.fecha}\n⏰ *Hora:* ${data.hora}\n📍 *Origen:* ${data.origen}\n🏁 *Destino:* ${data.destino}\n🚗 *Placa:* ${data.placa}\n👤 *Conductor:* ${data.conductor}\n━━━━━━━━━━━━━━━━\n\nPor favor estar listo 10 minutos antes. 🙏\n\n¡Gracias por elegirnos! 🌟`;

        // Enviar mensaje de texto
        await client.sendMessage(targetJid, textMessage);
        
        // Intentar enviar tarjeta visual (opcional)
        try {
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await page.setViewport({ width: 600, height: 700 });
            const htmlContent = `<html><body style="margin:0;padding:20px;background:#f4f6f8;font-family:sans-serif;"><div style="width:560px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);"><div style="background:#1a5fa8;padding:20px;color:white;border-radius:16px 16px 0 0;font-weight:bold;text-align:center;letter-spacing:1px;">RESUMEN DEL SERVICIO</div><div style="padding:30px;"><div style="color:#888;font-size:12px;text-transform:uppercase;margin-bottom:5px;">Pasajero</div><div style="font-size:20px;font-weight:bold;color:#1a5fa8;margin-bottom:20px;">${data.clienteNombre}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;"><div style="background:#f8f9fa;padding:15px;border-radius:10px;grid-column:span 2;border-left:4px solid #1a5fa8;"><b>Origen:</b> ${data.origen}<br><b>Destino:</b> ${data.destino}</div><div style="background:#f8f9fa;padding:10px;border-radius:8px;"><b>Fecha:</b> ${data.fecha}</div><div style="background:#f8f9fa;padding:10px;border-radius:8px;"><b>Hora:</b> ${data.hora}</div><div style="background:#f8f9fa;padding:10px;border-radius:8px;"><b>Vehículo:</b> ${data.placa}</div><div style="background:#f8f9fa;padding:10px;border-radius:8px;"><b>Conductor:</b> ${data.conductor}</div></div><div style="margin-top:20px;text-align:center;color:#1a5fa8;font-size:12px;font-weight:bold;">TRANSPORTES ESPECIALES J&J</div></div></div></body></html>`;
            await page.setContent(htmlContent);
            const screenshot = await page.screenshot({ encoding: 'base64' });
            await browser.close();
            const media = new MessageMedia('image/png', screenshot, 'resumen.png');
            await client.sendMessage(targetJid, media);
        } catch (e) { 
            console.warn('[Nova] Falló generación de tarjeta visual, pero el texto se envió.'); 
        }

        res.json({ success: true });

    } catch (error) {
        console.error('[Nova] Error crítico al enviar:', error);
        res.status(500).json({ error: 'Error interno de Nova: ' + error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[Nova] Servidor activo en puerto ${port}`);
    client.initialize().catch(err => console.error('[Nova] Init error:', err));
});
