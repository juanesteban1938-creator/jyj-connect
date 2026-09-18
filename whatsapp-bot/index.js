/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * Versión: High-Performance Image Core (Puppeteer + Baileys)
 */

const { 
    default: makeWASocket, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    initAuthCreds,
    Browsers
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const qrcode = require('qrcode');
const pino = require('pino');
const puppeteer = require('puppeteer');

const app = express();

// 1. PRIORIDAD: Healthcheck y Middlewares
app.get('/health', (req, res) => res.status(200).send('OK'));
app.use(cors()); 
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'jj-connect-2026';
const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;

let sock = null;
let qrCodeBase64 = '';
let connectionStatus = 'initializing';
const logger = pino({ level: 'silent' });

// ── CONFIGURACIÓN DE FIREBASE ──
let db = null;
let authCollection = null;

try {
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
    authCollection = db.collection('whatsapp_auth_session');
} catch (error) {
    console.error('[Firebase] Fallo inicial:', error.message);
}

/**
 * Generador de Tarjeta de Servicio con Puppeteer (Blindado para Railway)
 */
async function generateServiceCard(data) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 1000, deviceScaleFactor: 2 });

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&family=Noto+Color+Emoji&display=swap" rel="stylesheet">
            <style>
                body { 
                    margin: 0; padding: 40px; 
                    font-family: 'Inter', 'Noto Color Emoji', sans-serif; 
                    background: #F3F4F6;
                }
                .card {
                    background: white;
                    border-radius: 40px;
                    overflow: hidden;
                    box-shadow: 0 30px 60px -12px rgba(0,0,0,0.15);
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .header {
                    background: #1F3864;
                    padding: 40px;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .brand h1 { margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; }
                .brand p { margin: 0; font-size: 10px; font-weight: 700; color: #F59E0B; text-transform: uppercase; letter-spacing: 4px; }
                .badge {
                    background: rgba(245, 158, 11, 0.2);
                    color: #F59E0B;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                }
                .content { padding: 40px; }
                .route-grid { display: grid; grid-cols: 1fr; gap: 30px; margin-bottom: 40px; }
                .point { display: flex; gap: 20px; align-items: flex-start; }
                .dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
                .dot.origin { background: #10B981; border: 4px solid #D1FAE5; }
                .dot.dest { background: #EF4444; border: 4px solid #FEE2E2; }
                .label { font-size: 10px; font-weight: 900; color: #9CA3AF; text-transform: uppercase; margin-bottom: 4px; }
                .val { font-size: 18px; font-weight: 700; color: #1F2937; line-height: 1.3; }
                
                .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 20px; 
                    background: #F9FAFB;
                    padding: 30px;
                    border-radius: 24px;
                }
                .item-label { font-size: 9px; font-weight: 800; color: #6B7280; text-transform: uppercase; margin-bottom: 4px; }
                .item-val { font-size: 15px; font-weight: 700; color: #111827; }
                .footer {
                    padding: 30px;
                    text-align: center;
                    background: #1F3864;
                    color: white;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <div class="brand">
                        <h1>J&J CONNECT</h1>
                        <p>Transporte Especial</p>
                    </div>
                    <div class="badge">Programado</div>
                </div>
                <div class="content">
                    <div class="route-grid">
                        <div class="point">
                            <div class="dot origin"></div>
                            <div>
                                <div class="label">Punto de Recogida 📍</div>
                                <div class="val">${data.origen}</div>
                            </div>
                        </div>
                        <div class="point">
                            <div class="dot dest"></div>
                            <div>
                                <div class="label">Punto de Destino 🏁</div>
                                <div class="val">${data.destino}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-grid">
                        <div>
                            <div class="item-label">🗓️ Fecha</div>
                            <div class="item-val">${data.fecha}</div>
                        </div>
                        <div>
                            <div class="item-label">⏰ Hora</div>
                            <div class="item-val">${data.hora}</div>
                        </div>
                        <div>
                            <div class="item-label">👤 Conductor</div>
                            <div class="item-val">${data.conductor}</div>
                        </div>
                        <div>
                            <div class="item-label">🚗 Placa</div>
                            <div class="item-val">${data.placa}</div>
                        </div>
                    </div>
                </div>
                <div class="footer">Nova Digital Assistant — J&J v2.0</div>
            </div>
        </body>
        </html>
        `;

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const element = await page.$('body');
        return await element.screenshot({ type: 'png', omitBackground: true });
    } finally {
        await browser.close();
    }
}

/**
 * Inteligencia de Ruta y Clima (Timeout 3s)
 */
async function getSmartInfo(origen, destino) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const smartData = {
        distancia: "Información calculada en ruta",
        tiempo: "Información calculada en ruta",
        climaEstado: "N/A", climaTemp: "--",
        recomendacion: "Por favor estar atento a las indicaciones del conductor."
    };

    try {
        if (GMAPS_KEY) {
            const mapsRes = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origen)}&destinations=${encodeURIComponent(destino)}&key=${GMAPS_KEY}`, { signal: controller.signal });
            const mapsJson = await mapsRes.json();
            if (mapsJson.rows?.[0]?.elements?.[0]?.status === "OK") {
                smartData.distancia = mapsJson.rows[0].elements[0].distance.text;
                smartData.tiempo = mapsJson.rows[0].elements[0].duration.text;
            }
        }
        if (WEATHER_KEY) {
            const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destino)}&appid=${WEATHER_KEY}&units=metric&lang=es`, { signal: controller.signal });
            const weatherJson = await weatherRes.json();
            if (weatherJson.main) {
                smartData.climaTemp = Math.round(weatherJson.main.temp);
                smartData.climaEstado = weatherJson.weather[0].description;
                if (weatherJson.weather[0].main.toLowerCase().includes('rain')) smartData.recomendacion = "Lleva paraguas, se esperan lluvias en tu destino.";
            }
        }
    } catch (err) {} finally { clearTimeout(timeoutId); }
    return smartData;
}

/**
 * Adaptador de Autenticación Firestore
 */
async function getAuthAdapter() {
    const writeData = async (data, id) => {
        try { if (!authCollection) return;
            const json = JSON.stringify(data, (k, v) => Buffer.isBuffer(v) ? { type: 'Buffer', data: v.toString('base64') } : v);
            await authCollection.doc(id).set({ data: json, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        } catch (e) {}
    };
    const readData = async (id) => {
        try { if (!authCollection) return null;
            const doc = await authCollection.doc(id).get();
            if (!doc.exists) return null;
            return JSON.parse(doc.data().data, (k, v) => (v && v.type === 'Buffer') ? Buffer.from(v.data, 'base64') : v);
        } catch (e) { return null; }
    };
    const removeData = async (id) => { try { if (authCollection) await authCollection.doc(id).delete(); } catch (e) {} };

    const credsData = await readData('creds');
    return {
        state: {
            creds: credsData || initAuthCreds(),
            keys: makeCacheableSignalKeyStore({
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => { data[id] = await readData(`${type}-${id}`); }));
                    return data;
                },
                set: async (data) => {
                    for (const cat in data) {
                        for (const id in data[cat]) {
                            const val = data[cat][id];
                            const key = `${cat}-${id}`;
                            if (val) await writeData(val, key); else await removeData(key);
                        }
                    }
                }
            }, logger)
        },
        saveCreds: async () => { await writeData(initAuthCreds(), 'creds'); }
    };
}

async function connectToWhatsApp() {
    console.log('[DEPLOY-ID: 2026-BETA-PUPPETEER]');
    try {
        const { state, saveCreds } = await getAuthAdapter();
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            markOnlineOnConnect: true
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) { qrCodeBase64 = await qrcode.toDataURL(qr); connectionStatus = 'waiting_qr'; }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error instanceof Boom) ? 
                    lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
                if (shouldReconnect) setTimeout(connectToWhatsApp, 5000);
            } else if (connection === 'open') {
                qrCodeBase64 = ''; connectionStatus = 'connected';
                console.log('[Nova] ✅ SISTEMA ONLINE');
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify' || !db) return;
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;
            const jid = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            await db.collection('conversaciones').add({
                jid, cuerpo: text, tipo: 'entrante', leido: false,
                nombre: msg.pushName || jid.split('@')[0],
                fecha: admin.firestore.FieldValue.serverTimestamp()
            }).catch(() => {});
        });

    } catch (error) { setTimeout(connectToWhatsApp, 10000); }
}

const checkApiKey = (req, res, next) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
    next();
};

app.get('/status', checkApiKey, (req, res) => res.json({ connected: connectionStatus === 'connected', status: connectionStatus }));
app.get('/qr', checkApiKey, (req, res) => res.json({ qr: qrCodeBase64 }));

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    
    try {
        const d = req.body;
        const jid = `${d.clienteTelefono.replace(/\D/g, '')}@s.whatsapp.net`;
        const smart = await getSmartInfo(d.origen, d.destino);
        
        // Generar Tarjeta Gráfica Dinámica
        const imageBuffer = await generateServiceCard(d);

        const mensaje = `¡Hola, *${d.clienteNombre}*! 👋

Soy *Nova*, asistente de *Transportes Especiales J&J* 🚐

Tu servicio ha sido programado con éxito. Aquí tienes los detalles:

🛣️ *Distancia:* ${smart.distancia}
⏳ *Tiempo est.:* ${smart.tiempo}
🌤️ *Clima:* ${smart.climaEstado} (${smart.climaTemp}°C)
💡 *Sugerencia:* ${smart.recomendacion}

Por favor estar listo 10 minutos antes. 🙏`;

        await sock.sendMessage(jid, { 
            image: imageBuffer, 
            caption: mensaje 
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[Nova] Error envio:', error.message);
        res.status(500).json({ error: 'Fallo al procesar notificación' });
    }
});

app.post('/send-message', checkApiKey, async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        await sock.sendMessage(req.body.jid, { text: req.body.mensaje });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => { 
    console.log(`[Nova Engine] Activo en puerto ${PORT}`);
    connectToWhatsApp();
});