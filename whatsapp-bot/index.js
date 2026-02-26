
const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
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

/**
 * Resuelve el ID de WhatsApp con lógica específica para Colombia.
 * Colombia requiere un '9' después del '57' para móviles en el JID interno de WA.
 */
async function resolveWAId(phone) {
    let clean = (phone || '').toString().replace(/\D/g, '');
    
    // Si el número tiene 10 dígitos (formato Colombia), añadir prefijo 57
    if (clean.length === 10) {
        clean = '57' + clean;
    }

    console.log(`[Nova] Procesando número: ${clean}`);

    // LOGICA CRITICA: Colombia Móvil (57 + 3...)
    // WhatsApp usa internamente 57 + 9 + 3...
    if (clean.startsWith('573') && clean.length === 12) {
        const jidCon9 = `579${clean.substring(2)}@c.us`;
        console.log(`[Nova] Formato Colombia detectado. JID sugerido: ${jidCon9}`);
        return jidCon9;
    }

    return `${clean}@c.us`;
}

app.get('/status', (req, res) => res.json({ connected: isReady }));

app.get('/qr', (req, res) => {
    if (isReady) return res.json({ message: 'Conectado' });
    if (!qrCodeBase64) return res.status(404).json({ error: 'QR no generado' });
    res.json({ qr: qrCodeBase64 });
});

async function sendToTarget(targetId, text, media) {
    try {
        console.log(`[Nova] Intentando envío a JID: ${targetId}`);
        await client.sendMessage(targetId, text);
        if (media) {
            await client.sendMessage(targetId, media);
        }
        return { success: true };
    } catch (error) {
        console.warn(`[Nova] Fallo envío a ${targetId}:`, error.message);
        return { success: false, error: error.message };
    }
}

app.post('/send-service-notification', authMiddleware, async (req, res) => {
    const data = req.body;
    if (!data.clienteTelefono) return res.status(400).json({ error: 'Teléfono requerido' });
    if (!isReady) return res.status(503).json({ error: 'Nova no está conectada' });

    try {
        const primaryId = await resolveWAId(data.clienteTelefono);
        const textMessage = `¡Hola, ${data.clienteNombre}! 👋\n\nSoy *Nova*, asistente virtual de *Transportes Especiales J&J* 🚐\n\nTu servicio ha sido programado:\n\n━━━━━━━━━━━━━━━━\n🗓️ *Fecha:* ${data.fecha}\n⏰ *Hora:* ${data.hora}\n📍 *Origen:* ${data.origen}\n🏁 *Destino:* ${data.destino}\n🚗 *Placa:* ${data.placa}\n👤 *Conductor:* ${data.conductor}\n━━━━━━━━━━━━━━━━\n\nPor favor estar listo 10 minutos antes. 🙏\n\n¡Gracias por elegirnos! 🌟`;

        let media = null;
        try {
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await page.setViewport({ width: 600, height: 700 });
            const htmlContent = `<html><body style="margin:0;padding:20px;background:#f4f6f8;font-family:sans-serif;"><div style="width:560px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);"><div style="background:#1a5fa8;padding:20px;color:white;border-radius:16px 16px 0 0;font-weight:bold;">RESUMEN DEL SERVICIO</div><div style="padding:30px;"><div style="color:#888;font-size:12px;text-transform:uppercase;">Pasajero</div><div style="font-size:20px;font-weight:bold;color:#1a5fa8;margin-bottom:20px;">${data.clienteNombre}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;"><div style="background:#f8f9fa;padding:15px;border-radius:10px;grid-column:span 2;"><b>Origen:</b> ${data.origen}<br><b>Destino:</b> ${data.destino}</div><div><b>Fecha:</b> ${data.fecha}</div><div><b>Hora:</b> ${data.hora}</div><div><b>Vehículo:</b> ${data.placa}</div><div><b>Conductor:</b> ${data.conductor}</div></div></div></div></body></html>`;
            await page.setContent(htmlContent);
            const screenshot = await page.screenshot({ encoding: 'base64' });
            await browser.close();
            media = new MessageMedia('image/png', screenshot, 'resumen.png');
        } catch (e) { 
            console.warn('[Nova] Falló generación de tarjeta visual.'); 
        }

        // Primer Intento (con JID resuelto)
        let result = await sendToTarget(primaryId, textMessage, media);
        
        // REINTENTO: Si falla y es Colombia, probar el formato sin el '9' o viceversa
        if (!result.success && data.clienteTelefono.toString().includes('57')) {
            console.log('[Nova] Reintentando con formato alternativo para Colombia...');
            const altId = primaryId.includes('579') 
                ? primaryId.replace('579', '57') 
                : primaryId.replace('57', '579');
            
            result = await sendToTarget(altId, textMessage, media);
        }

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: `El número ${data.clienteTelefono} no parece estar en WhatsApp o el formato es incorrecto.` });
        }
    } catch (error) {
        console.error('[Nova] Error crítico:', error);
        res.status(500).json({ error: 'Error interno del bot: ' + error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[Nova] Servidor activo en puerto ${port}`);
    client.initialize().catch(err => console.error('[Nova] Init error:', err));
});
