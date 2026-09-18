/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * Versión: Smart-Text Core (Sin Puppeteer)
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

// ── CONFIGURACIÓN DE FIREBASE (PERSISTENCIA DE SESIÓN) ──
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
 * Adaptador de Autenticación Firestore para Baileys
 */
async function getAuthAdapter() {
    const writeData = async (data, id) => {
        try {
            if (!authCollection) return;
            const json = JSON.stringify(data, (key, value) => {
                if (Buffer.isBuffer(value)) return { type: 'Buffer', data: value.toString('base64') };
                return value;
            });
            await authCollection.doc(id).set({ data: json, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        } catch (e) {}
    };

    const readData = async (id) => {
        try {
            if (!authCollection) return null;
            const doc = await authCollection.doc(id).get();
            if (!doc.exists) return null;
            return JSON.parse(doc.data().data, (key, value) => {
                if (value && value.type === 'Buffer') return Buffer.from(value.data, 'base64');
                return value;
            });
        } catch (e) { return null; }
    };

    const removeData = async (id) => {
        try { if (authCollection) await authCollection.doc(id).delete(); } catch (e) {}
    };

    const credsData = await readData('creds');
    const creds = credsData || initAuthCreds();

    return {
        state: {
            creds,
            keys: makeCacheableSignalKeyStore({
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) value = admin.proto.Message.AppStateSyncKeyData.fromObject(value);
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) await writeData(value, key); else await removeData(key);
                        }
                    }
                }
            }, logger)
        },
        saveCreds: async () => { await writeData(creds, 'creds'); }
    };
}

/**
 * Motor de Inteligencia de Ruta y Clima con Timeout de 3s
 */
async function getSmartInfo(origen, destino) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const smartData = {
        distancia: "Información calculada en ruta",
        tiempo: "Información calculada en ruta",
        climaEstado: "N/A",
        climaTemp: "--",
        recomendacion: "Por favor estar atento a las indicaciones del conductor."
    };

    try {
        // 1. Google Maps Data
        if (GMAPS_KEY) {
            const mapsRes = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origen)}&destinations=${encodeURIComponent(destino)}&key=${GMAPS_KEY}`, { signal: controller.signal });
            const mapsJson = await mapsRes.json();
            if (mapsJson.rows?.[0]?.elements?.[0]?.status === "OK") {
                smartData.distancia = mapsJson.rows[0].elements[0].distance.text;
                smartData.tiempo = mapsJson.rows[0].elements[0].duration.text;
                const durationSec = mapsJson.rows[0].elements[0].duration.value;
                if (durationSec > 7200) smartData.recomendacion = "Viaje largo, te sugerimos ropa cómoda.";
            }
        }

        // 2. Weather Data
        if (WEATHER_KEY) {
            const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destino)}&appid=${WEATHER_KEY}&units=metric&lang=es`, { signal: controller.signal });
            const weatherJson = await weatherRes.json();
            if (weatherJson.main) {
                smartData.climaTemp = Math.round(weatherJson.main.temp);
                smartData.climaEstado = weatherJson.weather[0].description;
                
                if (weatherJson.weather[0].main.toLowerCase().includes('rain')) {
                    smartData.recomendacion = "Lleva paraguas, se esperan lluvias en tu destino.";
                } else if (smartData.climaTemp > 28) {
                    smartData.recomendacion = "Día soleado, no olvides hidratarte.";
                }
            }
        }
    } catch (err) {
        console.warn('[Nova] Fallo en APIs externas, usando fallback.');
    } finally {
        clearTimeout(timeoutId);
    }

    return smartData;
}

/**
 * Conexión Core de Baileys
 */
async function connectToWhatsApp() {
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
                qrCodeBase64 = '';
                connectionStatus = 'connected';
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

    } catch (error) { 
        setTimeout(connectToWhatsApp, 10000); 
    }
}

// ── ENDPOINTS DE CONTROL ──

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
        
        // Obtener datos inteligentes de APIs externas
        const smart = await getSmartInfo(d.origen, d.destino);

        const mensaje = `¡Hola, *${d.clienteNombre}*! 👋

Soy *Nova*, asistente virtual de *Transportes Especiales J&J* 🚐

Tu servicio ha sido programado:
━━━━━━━━━━━━━━━━
🗓️ *Fecha:* ${d.fecha}
⏰ *Hora:* ${d.hora}
📍 *Origen:* ${d.origen}
🏁 *Destino:* ${d.destino}
🚗 *Placa:* ${d.placa}
👤 *Conductor:* ${d.conductor}
📞 *Contacto:* ${d.telefonoConductor || 'Ver en panel'}
━━━━━━━━━━━━━━━━
🛣️ *Distancia:* ${smart.distancia}
⏳ *Tiempo estimado:* ${smart.tiempo}
🌤️ *Clima en destino:* ${smart.climaEstado} (${smart.climaTemp}°C)
💡 *Sugerencia de Nova:* ${smart.recomendacion}

Por favor estar listo 10 minutos antes. 🙏

¡Gracias por elegirnos! 🌟
*Transportes Especiales J&J*`;

        await sock.sendMessage(jid, { text: mensaje });
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