
const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

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
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
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
});

client.on('ready', () => {
    isReady = true;
    qrCodeBase64 = '';
    console.log('[Nova] Bot listo y conectado.');
});

client.on('disconnected', () => {
    isReady = false;
    setTimeout(() => client.initialize(), 5000);
});

async function resolveWAId(number) {
    let clean = number.toString().replace(/\D/g, '');
    console.log(`[Nova] Resolviendo ID para: ${clean}`);

    const idDirect = await client.getNumberId(clean);
    if (idDirect) {
        console.log(`[Nova] ID Directo: ${idDirect._serialized}`);
        return idDirect._serialized;
    }

    if (clean.startsWith('573') && clean.length === 12) {
        const withNine = '579' + clean.substring(2);
        const idWithNine = await client.getNumberId(withNine);
        if (idWithNine) {
            console.log(`[Nova] ID Técnico Colombia: ${idWithNine._serialized}`);
            return idWithNine._serialized;
        }
        return `${withNine}@c.us`;
    }

    return `${clean}@c.us`;
}

app.get('/status', (req, res) => res.json({ connected: isReady }));

app.get('/qr', (req, res) => {
    if (isReady) return res.json({ connected: true });
    if (!qrCodeBase64) return res.status(404).json({ error: 'QR no generado' });
    res.json({ qr: qrCodeBase64 });
});

app.post('/send-service-notification', async (req, res) => {
    const data = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no está conectada' });
    try {
        const targetJid = await resolveWAId(data.clienteTelefono);
        const textMessage = `¡Hola, *${data.clienteNombre}*! 👋\n\nSoy *Nova*, asistente virtual de *Transportes Especiales J&J* 🚐\n\nTu servicio ha sido programado:\n\n🗓️ *Fecha:* ${data.fecha}\n⏰ *Hora:* ${data.hora}\n📍 *Origen:* ${data.origen}\n🏁 *Destino:* ${data.destino}\n🚗 *Placa:* ${data.placa}\n👤 *Conductor:* ${data.conductor}\n\nPor favor estar listo 10 minutos antes. 🙏`;
        
        await client.sendMessage(targetJid, textMessage);
        res.json({ success: true });
    } catch (error) {
        console.error('[Nova] Error de envío:', error);
        res.status(500).json({ error: 'Fallo al localizar el número en WhatsApp.' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[Nova] Servidor en puerto ${port}`);
    client.initialize().catch(err => console.error('[Nova] Error init:', err));
});
