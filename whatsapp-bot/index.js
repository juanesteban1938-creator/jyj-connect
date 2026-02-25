
const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3001;
const apiKey = process.env.API_KEY || 'jj-connect-2026';

let qrCodeBase64 = '';
let isReady = false;

// Configuración del cliente de WhatsApp
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
    console.log('Nuevo QR generado.');
});

client.on('ready', () => {
    console.log('Bot Nova listo.');
    isReady = true;
    qrCodeBase64 = '';
});

client.on('disconnected', (reason) => {
    console.log('Bot desconectado:', reason);
    isReady = false;
    client.initialize().catch(err => console.error(err));
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
    if (!qrCodeBase64) return res.status(404).json({ error: 'QR no listo' });
    res.json({ qr: qrCodeBase64 });
});

app.post('/send-service-notification', authMiddleware, async (req, res) => {
    const data = req.body;
    if (!data.clienteTelefono) return res.status(400).json({ error: 'Teléfono requerido' });
    if (!isReady) return res.status(503).json({ error: 'Bot no conectado' });

    const chatId = data.clienteTelefono.includes('@c.us') ? data.clienteTelefono : `${data.clienteTelefono}@c.us`;

    const textMessage = `¡Hola, ${data.clienteNombre}! 👋

Soy *Nova*, asistente virtual de *Transportes Especiales J&J* 🚐

Me complace confirmarte que tu servicio de transporte ha sido programado exitosamente. Aquí tienes todos los detalles:

━━━━━━━━━━━━━━━━
🗓️ *Fecha:* ${data.fecha}
⏰ *Hora de recogida:* ${data.hora}
📍 *Origen:* ${data.origen}
🏁 *Destino:* ${data.destino}
🚗 *Vehículo / Placa:* ${data.placa}
👤 *Conductor:* ${data.conductor}
📞 *Contacto conductor:* ${data.telefonoConductor}
━━━━━━━━━━━━━━━━

Por favor, estar listo 10 minutos antes de la hora de recogida. 🙏

Si tienes alguna pregunta o necesitas hacer algún cambio, no dudes en contactarnos.

¡Gracias por confiar en nosotros! 🌟
*Transportes Especiales J&J*`;

    try {
        await client.sendMessage(chatId, textMessage);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 600, height: 750, deviceScaleFactor: 2 });
        
        const htmlContent = `
        <html>
        <head>
            <style>
                body { margin: 0; padding: 20px; background: #f4f6f8; font-family: 'Helvetica', sans-serif; }
                .card { width: 560px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border: 1px solid #e1e4e8; }
                .header { background: #1a5fa8; padding: 24px; display: flex; align-items: center; justify-content: space-between; color: white; }
                .header-title { font-size: 20px; font-weight: bold; }
                .content { padding: 30px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .info-box { margin-bottom: 12px; }
                .label { font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; }
                .value { font-size: 14px; font-weight: bold; color: #333; }
                .route-box { grid-column: span 2; background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 5px; }
                .route-item { display: flex; align-items: center; margin-bottom: 5px; font-size: 13px; }
                .dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; }
                .footer { background: #f8f9fa; padding: 12px; text-align: center; color: #666; font-size: 10px; border-top: 1px solid #eee; }
            </style>
        </head>
        <body>
            <div class="card" id="card">
                <div class="header">
                    <div class="header-title">RESUMEN DEL SERVICIO</div>
                    <div style="background:white; border-radius:8px; padding:6px 12px; display:flex; align-items:center; gap:6px;">
                        <div style="background:#1a5fa8; color:white; font-weight:900; font-size:14px; padding:4px 8px; border-radius:4px;">J&J</div>
                        <span style="color:#1a5fa8; font-weight:700; font-size:13px;">Connect</span>
                    </div>
                </div>
                <div class="content">
                    <div class="grid">
                        <div class="info-box" style="grid-column: span 2;">
                            <div class="label">Cliente</div>
                            <div class="value" style="font-size: 18px; color: #1a5fa8;">${data.clienteNombre}</div>
                        </div>
                        <div class="info-box">
                            <div class="label">Fecha</div>
                            <div class="value">${data.fecha}</div>
                        </div>
                        <div class="info-box">
                            <div class="label">Hora Recogida</div>
                            <div class="value">${data.hora}</div>
                        </div>
                        <div class="route-box">
                            <div class="route-item">
                                <div class="dot" style="background: #22c55e;"></div>
                                <div><b>Origen:</b> ${data.origen}</div>
                            </div>
                            <div class="route-item" style="margin-bottom: 0;">
                                <div class="dot" style="background: #ef4444;"></div>
                                <div><b>Destino:</b> ${data.destino}</div>
                            </div>
                        </div>
                        <div class="info-box">
                            <div class="label">Vehículo / Placa</div>
                            <div class="value">${data.placa}</div>
                        </div>
                        <div class="info-box">
                            <div class="label">Conductor</div>
                            <div class="value">${data.conductor}</div>
                        </div>
                        <div class="info-box" style="grid-column: span 2;">
                            <div class="label">Teléfono Conductor</div>
                            <div class="value">${data.telefonoConductor}</div>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    Nova | Asistente Virtual de Transportes Especiales J&J
                </div>
            </div>
        </body>
        </html>`;

        await page.setContent(htmlContent);
        const cardElement = await page.$('#card');
        const screenshot = await cardElement.screenshot({ encoding: 'base64' });
        await browser.close();

        const media = new MessageMedia('image/png', screenshot, 'resumen.png');
        await client.sendMessage(chatId, media);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Bot Nova corriendo en puerto ${port}`);
    client.initialize().catch(err => console.error(err));
});
