/**
 * VIANOVA S.A.S - WhatsApp Bot Engine (Nova)
 * Versión: 4.2.0 (Síncrono para Railway + resolveWAId simple)
 */

const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const cron = require('node-cron');
const fetch = require('node-fetch');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'studio-6997056255-a0ecc'
    });
}
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'jj-connect-2026';
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY || '2e28a9be1c50b694b288c3a505f0d866';

let qrCodeBase64 = '';
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage'
        ]
    }
});

/**
 * RESOLUCIÓN DE ID (SÍNCRONA)
 */
function resolveWAId(number) {
    let clean = number.toString().replace(/\D/g, '');
    if (!clean.startsWith('57')) clean = '57' + clean;
    return `${clean}@c.us`;
}

// Generador de Tarjeta Visual (Puppeteer)
async function generateServiceCard(data) {
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    const htmlContent = `
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; margin: 0; background: #fff; width: 600px; height: 800px; }
            .card { width: 560px; height: 760px; margin: 20px; border-radius: 30px; background: #1a1a1a; color: white; position: relative; overflow: hidden; }
            .header { background: #f97316; padding: 40px; text-align: center; }
            .logo { font-size: 32px; font-weight: bold; letter-spacing: 2px; }
            .content { padding: 40px; }
            .info-box { background: #333; padding: 20px; border-radius: 20px; margin-bottom: 20px; }
            .label { color: #f97316; font-size: 14px; text-transform: uppercase; font-weight: bold; }
            .value { font-size: 20px; margin-top: 5px; }
            .footer { position: absolute; bottom: 40px; width: 100%; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <div class="logo">J&J CONNECT</div>
                <div style="font-size: 14px; opacity: 0.8;">PROGRAMACIÓN DE SERVICIO</div>
            </div>
            <div class="content">
                <div class="info-box">
                    <div class="label">🗓️ Fecha y Hora</div>
                    <div class="value">${data.fecha} - ${data.hora}</div>
                </div>
                <div class="info-box">
                    <div class="label">📍 Origen</div>
                    <div class="value">${data.origen}</div>
                </div>
                <div class="info-box">
                    <div class="label">🏁 Destino</div>
                    <div class="value">${data.destino}</div>
                </div>
                <div class="info-box">
                    <div class="label">🚐 Vehículo y Conductor</div>
                    <div class="value">Placa: ${data.placa} / ${data.conductor}</div>
                </div>
            </div>
            <div class="footer">Este es un comprobante digital generado por Nova v4.2</div>
        </div>
    </body>
    </html>
    `;

    await page.setViewport({ width: 600, height: 800 });
    await page.setContent(htmlContent);
    const buffer = await page.screenshot({ type: 'png' });
    await browser.close();
    return buffer.toString('base64');
}

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        if (err) return console.error('Error QR:', err);
        qrCodeBase64 = url;
    });
    isReady = false;
});

client.on('ready', () => {
    isReady = true;
    qrCodeBase64 = '';
    console.log('[Nova] Sistema operando correctamente.');
});

app.get('/status', (req, res) => res.json({ connected: isReady }));

app.get('/qr', (req, res) => {
    if (isReady) return res.json({ connected: true });
    if (!qrCodeBase64) return res.status(404).json({ error: 'QR no disponible' });
    res.json({ qr: qrCodeBase64 });
});

app.post('/send-service-notification', async (req, res) => {
    const data = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no está conectada' });

    try {
        const jid = resolveWAId(data.clienteTelefono);
        const imageBase64 = await generateServiceCard(data);
        const media = new MessageMedia('image/png', imageBase64, 'servicio.png');

        await client.sendMessage(jid, media);
        const msg = `¡Hola, *${data.clienteNombre}*! 👋 Soy *Nova*.\n\nTu servicio ha sido programado con éxito. Arriba te envío la tarjeta con los detalles. 🚐💨`;
        await client.sendMessage(jid, msg);

        res.json({ success: true });
    } catch (error) {
        console.error('[Nova] Error de envío:', error);
        res.status(500).json({ error: 'Fallo al enviar notificación.' });
    }
});

app.post('/send-departure-notification', async (req, res) => {
    const data = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no está conectada' });

    try {
        const jid = resolveWAId(data.clienteTelefono);
        
        let weatherMsg = '';
        try {
            const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Bogota&units=metric&appid=${WEATHER_KEY}&lang=es`);
            const wData = await wRes.json();
            weatherMsg = `🌡️ *Clima actual:* ${wData.main.temp}°C, ${wData.weather[0].description}.`;
        } catch (e) { weatherMsg = 'Clima no disponible.'; }

        const text = `⚠️ *¡AVISO DE SALIDA!* ⚠️\n\nHola *${data.clienteNombre}*, tu vehículo con placa *${data.placa}* ya ha salido hacia el punto de origen.\n\n${weatherMsg}\n\n📍 *Seguimiento:* Estamos en camino. Favor estar atento al celular. 🙏`;
        
        await client.sendMessage(jid, text);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

cron.schedule('* * * * *', async () => {
    if (!isReady) return;
    const now = new Date();
    const tenMinutesLater = new Date(now.getTime() + 10 * 60000);

    const snapshot = await db.collection('servicios')
        .where('estado', '==', 'Programado')
        .where('notificacionSalidaEnviada', '==', false)
        .where('horaRecogidaTimestamp', '<=', admin.firestore.Timestamp.fromDate(tenMinutesLater))
        .get();

    snapshot.forEach(async (docSnap) => {
        const s = docSnap.data();
        try {
            const jid = resolveWAId(s.telefonoCliente);
            await client.sendMessage(jid, `🚨 *NOTIFICACIÓN AUTOMÁTICA:* Su servicio *${s.consecutivo}* está próximo a iniciar (en 10 minutos). El vehículo *${s.vehiculoPlaca}* está en camino.`);
            await docSnap.ref.update({ notificacionSalidaEnviada: true });
        } catch (e) { console.error(`[Cron] Error en servicio ${s.id}:`, e); }
    });
});

app.listen(port, '0.0.0.0', () => {
    client.initialize().catch(err => console.error('[Nova] Error de inicialización:', err));
});