/**
 * VIANOVA S.A.S - WhatsApp Bot Engine (Nova)
 * Versión: 4.5.0 (Optimización Cron + Timezone UTC-5)
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

function resolveWAId(number) {
    let clean = number.toString().replace(/\D/g, '');
    if (!clean.startsWith('57')) clean = '57' + clean;
    return `${clean}@c.us`;
}

async function generateServiceCard(data) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
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
                <div class="footer">Generado por Nova v4.5</div>
            </div>
        </body>
        </html>
        `;

        await page.setViewport({ width: 600, height: 800 });
        await page.setContent(htmlContent);
        const buffer = await page.screenshot({ type: 'png' });
        await browser.close();
        return buffer.toString('base64');
    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
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

        const text = `⚠️ *¡AVISO DE SALIDA!* ⚠️\n\nHola *${data.clienteNombre}*, tu vehículo ya está próximo a iniciar el servicio.\n\n${weatherMsg}\n\n📍 *Seguimiento:* Estamos en camino. Favor estar atento al celular. 🙏`;
        
        await client.sendMessage(jid, text);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

cron.schedule('* * * * *', async () => {
    if (!isReady) return;
    const now = new Date();
    console.log(`[Cron] Revisando: ${now.toISOString()}`);
    try {
        const snapshot = await db.collection('servicios')
            .where('estado', 'in', ['Programado', 'programado'])
            .where('notificacionSalidaEnviada', '==', false)
            .get();

        for (const doc of snapshot.docs) {
            const s = doc.data();
            if (!s.horaRecogidaTimestamp) {
                console.log(`[Cron] Sin timestamp: ${s.consecutivo}`);
                continue;
            }
            const horaRecogida = s.horaRecogidaTimestamp.toDate();
            const diffMs = now - horaRecogida;
            const diffMin = diffMs / 60000;
            console.log(`[Cron] Servicio ${s.consecutivo}: diff=${diffMin.toFixed(2)} min`);
            
            if (diffMin >= 0 && diffMin <= 2) {
                console.log(`[Cron] ¡Disparando para ${s.consecutivo}!`);
                try {
                    await fetch(`http://localhost:${port}/send-departure-notification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
                        body: JSON.stringify({
                            clienteTelefono: s.telefonoCliente || s.clienteTelefono,
                            clienteNombre: s.clienteNombre || s.cliente,
                            origen: s.origen,
                            destino: s.destino
                        })
                    });
                    await doc.ref.update({ notificacionSalidaEnviada: true });
                    console.log(`[Cron] ✅ Enviado y marcado.`);
                } catch(e) {
                    console.error(`[Cron] Error:`, e.message);
                }
            }
        }
    } catch (error) {
        console.error('[Cron] Error general:', error.message);
    }
});

app.listen(port, '0.0.0.0', () => {
    client.initialize().catch(err => console.error('[Nova] Error de inicialización:', err));
});