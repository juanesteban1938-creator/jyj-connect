
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
        if (err) return console.error('Error QR:', err);
        qrCodeBase64 = url;
    });
    isReady = false;
});

client.on('ready', () => {
    console.log('Bot Nova Listo');
    isReady = true;
    qrCodeBase64 = '';
});

client.on('disconnected', () => {
    isReady = false;
    client.initialize().catch(err => console.error(err));
});

const authMiddleware = (req, res, next) => {
    const headerKey = req.headers['x-api-key'];
    if (apiKey && headerKey !== apiKey) return res.status(401).json({ error: 'No autorizado' });
    next();
};

app.get('/status', (req, res) => res.json({ connected: isReady }));

app.get('/qr', (req, res) => {
    if (isReady) return res.json({ message: 'Conectado' });
    if (!qrCodeBase64) return res.status(404).json({ error: 'Sin QR' });
    res.json({ qr: qrCodeBase64 });
});

app.post('/send-service-notification', authMiddleware, async (req, res) => {
    const data = req.body;
    if (!data.clienteTelefono) return res.status(400).json({ error: 'Teléfono requerido' });
    if (!isReady) return res.status(503).json({ error: 'Bot no listo' });

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
        <body style="margin:0; padding:20px; background:#f4f6f8; font-family:sans-serif;">
            <div id="card" style="width:560px; background:white; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.1); border:1px solid #e1e4e8;">
                <div style="background:#1a5fa8; padding:24px; display:flex; align-items:center; justify-content:space-between; color:white;">
                    <div>
                        <div style="font-size:20px; font-weight:bold; letter-spacing:0.5px;">RESUMEN DEL SERVICIO</div>
                        <div style="font-size:10px; opacity:0.8; margin-top:4px; font-weight:bold; text-transform:uppercase;">Nova | Asistente Virtual</div>
                    </div>
                    <img src="https://i.ibb.co/zhzhTrvV/logo-cxc.png" height="45" style="filter: brightness(0) invert(1);" />
                </div>
                <div style="padding:28px;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                        <div style="grid-column: span 2;">
                            <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Cliente</div>
                            <div style="font-size:16px; font-weight:bold; color:#1a5fa8;">${data.clienteNombre}</div>
                        </div>
                        <div>
                            <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Fecha</div>
                            <div style="font-size:14px; font-weight:bold; color:#333;">${data.fecha}</div>
                        </div>
                        <div>
                            <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Hora de recogida</div>
                            <div style="font-size:14px; font-weight:bold; color:#333;">${data.hora}</div>
                        </div>
                        <div style="grid-column: span 2; background:#f8f9fa; padding:12px; border-radius:8px;">
                            <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold; margin-bottom:6px;">Ruta</div>
                            <div style="font-size:13px; color:#333; line-height:1.6;">
                                <div style="display:flex; align-items:center; margin-bottom:4px;">
                                    <span style="color:#22c55e; margin-right:8px;">●</span> <b>Origen:</b> ${data.origen}
                                </div>
                                <div style="display:flex; align-items:center;">
                                    <span style="color:#ef4444; margin-right:8px;">▼</span> <b>Destino:</b> ${data.destino}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Vehículo / Placa</div>
                            <div style="font-size:13px; font-weight:bold; color:#333;">${data.placa}</div>
                        </div>
                        <div>
                            <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Conductor</div>
                            <div style="font-size:13px; font-weight:bold; color:#333;">${data.conductor}</div>
                        </div>
                        <div style="grid-column: span 2;">
                            <div style="font-size:10px; color:#888; text-transform:uppercase; font-weight:bold; margin-bottom:4px;">Contacto Conductor</div>
                            <div style="font-size:13px; font-weight:bold; color:#333;">${data.telefonoConductor}</div>
                        </div>
                    </div>
                </div>
                <div style="background:#f8f9fa; padding:16px; text-align:center; color:#1a5fa8; font-size:10px; border-top:1px solid #eee; font-weight:bold;">
                    GRACIAS POR ELEGIR TRANSPORTES ESPECIALES J&J
                </div>
            </div>
        </body>
        </html>`;

        await page.setContent(htmlContent);
        const card = await page.$('#card');
        const screenshot = await card.screenshot({ encoding: 'base64' });
        await browser.close();

        const media = new MessageMedia('image/png', screenshot, 'resumen.png');
        await client.sendMessage(chatId, media);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Bot Nova corriendo en puerto ${port}`);
    client.initialize().catch(err => console.error(err));
});
