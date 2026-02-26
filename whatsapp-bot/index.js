
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

/**
 * Resuelve el ID real de WhatsApp (JID) para un número dado.
 * Maneja la complejidad del dígito "9" técnico en Colombia.
 */
async function resolveWAId(number) {
    let clean = number.toString().replace(/\D/g, '');
    console.log(`[Nova] Resolviendo ID para: ${clean}`);

    // 1. Intentar validación directa con el número tal cual
    const idDirect = await client.getNumberId(clean);
    if (idDirect) {
        console.log(`[Nova] ID Directo encontrado: ${idDirect._serialized}`);
        return idDirect._serialized;
    }

    // 2. Lógica específica para Colombia: WhatsApp usa internamente un "9" adicional (5793...)
    // Si el número es 573... (12 dígitos) y no se encontró, intentamos con 5793...
    if (clean.startsWith('573') && clean.length === 12) {
        const withNine = '579' + clean.substring(2);
        console.log(`[Nova] Intentando formato técnico de Colombia: ${withNine}`);
        const idWithNine = await client.getNumberId(withNine);
        if (idWithNine) {
            console.log(`[Nova] ID con '9' encontrado: ${idWithNine._serialized}`);
            return idWithNine._serialized;
        }
        
        // Si getNumberId falla por latencia pero el número es válido, forzamos el JID con el 9
        console.log(`[Nova] Forzando formato técnico @c.us`);
        return `${withNine}@c.us`;
    }

    // 3. Fallback manual estándar
    return `${clean}@c.us`;
}

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
        const targetJid = await resolveWAId(data.clienteTelefono);
        
        const textMessage = `¡Hola, *${data.clienteNombre}*! 👋\n\nSoy *Nova*, asistente virtual de *Transportes Especiales J&J* 🚐\n\nTu servicio ha sido programado:\n\n━━━━━━━━━━━━━━━━\n🗓️ *Fecha:* ${data.fecha}\n⏰ *Hora:* ${data.hora}\n📍 *Origen:* ${data.origen}\n🏁 *Destino:* ${data.destino}\n🚗 *Placa:* ${data.placa}\n👤 *Conductor:* ${data.conductor}\n━━━━━━━━━━━━━━━━\n\nPor favor estar listo 10 minutos antes. 🙏\n\n¡Gracias por elegirnos! 🌟`;

        await client.sendMessage(targetJid, textMessage);
        console.log(`[Nova] Mensaje enviado a: ${targetJid}`);
        
        // Generar y enviar tarjeta visual (Opcional, no bloquea el éxito)
        try {
            const browser = await puppeteer.launch({ 
                headless: true, 
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            const page = await browser.newPage();
            await page.setViewport({ width: 600, height: 700 });
            
            const htmlContent = `
            <html>
            <body style="margin:0;padding:20px;background:#f4f6f8;font-family:sans-serif;">
                <div style="width:560px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);overflow:hidden;">
                    <div style="background:#1a5fa8;padding:20px;color:white;text-align:center;font-weight:bold;letter-spacing:1px;font-size:18px;">
                        RESUMEN DE TU SERVICIO
                    </div>
                    <div style="padding:30px;">
                        <div style="color:#888;font-size:12px;text-transform:uppercase;margin-bottom:5px;">Pasajero</div>
                        <div style="font-size:22px;font-weight:bold;color:#1a5fa8;margin-bottom:20px;">${data.clienteNombre}</div>
                        
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                            <div style="background:#f8f9fa;padding:15px;border-radius:10px;grid-column:span 2;border-left:4px solid #1a5fa8;">
                                <div style="font-size:11px;color:#777;">RUTA</div>
                                <div style="font-size:14px;font-weight:bold;">${data.origen} ➔ ${data.destino}</div>
                            </div>
                            <div style="background:#f8f9fa;padding:12px;border-radius:8px;">
                                <div style="font-size:10px;color:#777;">FECHA</div>
                                <div style="font-size:14px;font-weight:bold;">${data.fecha}</div>
                            </div>
                            <div style="background:#f8f9fa;padding:12px;border-radius:8px;">
                                <div style="font-size:10px;color:#777;">HORA</div>
                                <div style="font-size:14px;font-weight:bold;">${data.hora}</div>
                            </div>
                            <div style="background:#f8f9fa;padding:12px;border-radius:8px;">
                                <div style="font-size:10px;color:#777;">PLACA</div>
                                <div style="font-size:14px;font-weight:bold;">${data.placa}</div>
                            </div>
                            <div style="background:#f8f9fa;padding:12px;border-radius:8px;">
                                <div style="font-size:10px;color:#777;">CONDUCTOR</div>
                                <div style="font-size:14px;font-weight:bold;">${data.conductor}</div>
                            </div>
                        </div>
                        <div style="margin-top:25px;text-align:center;color:#1a5fa8;font-size:12px;font-weight:bold;border-top:1px solid #eee;padding-top:15px;">
                            TRANSPORTES ESPECIALES J&J
                        </div>
                    </div>
                </div>
            </body>
            </html>`;
            
            await page.setContent(htmlContent);
            const screenshot = await page.screenshot({ encoding: 'base64' });
            await browser.close();
            
            const media = new MessageMedia('image/png', screenshot, 'resumen.png');
            await client.sendMessage(targetJid, media);
            console.log(`[Nova] Tarjeta visual enviada a: ${targetJid}`);
        } catch (e) { 
            console.warn('[Nova] Error al generar tarjeta visual, pero el texto fue enviado:', e.message); 
        }

        res.json({ success: true, message: 'Notificación enviada con éxito.' });
    } catch (error) {
        console.error('[Nova] Error crítico de envío:', error);
        res.status(500).json({ error: 'No se pudo localizar el número en WhatsApp o Nova tuvo un error interno.' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[Nova] Servidor activo en puerto ${port}`);
    client.initialize().catch(err => console.error('[Nova] Error de inicialización:', err));
});
