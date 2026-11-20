/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * DEPLOY-ID: 2026-FINAL-STABLE
 * Versión: Arquitectura Resiliente de Texto Puro con Fix de Cifrado
 */

const { 
    default: makeWASocket, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    initAuthCreds,
    Browsers,
    BufferJSON,
    proto
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const pino = require('pino');
const { sendEmail } = require('./mailer');
const { startDriverAssignmentNotifier, sendDriverNotification } = require('./driverNotifier');

const app = express();

app.use(cors()); 
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'jj-connect-2026';
const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;

let sock = null;
let qrCodeBase64 = '';
let connectionStatus = 'initializing';
const logger = pino({ level: 'silent' });
const msgRetryCache = new Map();

let db = null;
let authCollection = null;

try {
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    authCollection = db.collection('whatsapp_auth_session');
} catch (error) {
    console.error('[Firebase Init Error]:', error.message);
}

function formatTime12h(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].substring(0, 2);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours < 10 ? '0' + hours : hours}:${minutes} ${ampm}`;
}

async function getSmartInfo(origen, destino) {
    const smartData = {
        distancia: "N/A", tiempo: "N/A", climaEstado: "Despejado", climaTemp: "--", recomendacion: "Atento a indicaciones."
    };
    try {
        const timeout = AbortSignal.timeout(3000); 
        if (GMAPS_KEY && origen && destino) {
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origen)}&destinations=${encodeURIComponent(destino)}&key=${GMAPS_KEY}`;
            const res = await fetch(url, { signal: timeout });
            const text = await res.text();
            const json = text.trim() ? JSON.parse(text) : null;
            if (json?.status === 'OK' && json.rows?.[0]?.elements?.[0]?.status === 'OK') {
                smartData.distancia = json.rows[0].elements[0].distance.text;
                smartData.tiempo = json.rows[0].elements[0].duration.text;
            }
        }
        if (WEATHER_KEY && destino) {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destino)}&appid=${WEATHER_KEY}&units=metric&lang=es`;
            const res = await fetch(weatherUrl, { signal: timeout });
            const text = await res.text();
            const json = text.trim() ? JSON.parse(text) : null;
            if (json?.main) {
                smartData.climaTemp = Math.round(json.main.temp);
                smartData.climaEstado = json.weather[0].description;
            }
        }
    } catch (e) {}
    return smartData;
}

async function getAuthAdapter() {
    const writeData = async (data, id) => {
        if (!authCollection) return;
        const json = JSON.stringify(data, BufferJSON.replacer);
        await authCollection.doc(id).set({ data: json }, { merge: true });
    };
    const readData = async (id) => {
        if (!authCollection) return null;
        const doc = await authCollection.doc(id).get();
        if (!doc.exists) return null;
        return JSON.parse(doc.data().data, BufferJSON.reviver);
    };
    const removeData = async (id) => { 
        if (authCollection) await authCollection.doc(id).delete();
    };

    let creds = await readData('creds') || initAuthCreds();
    return {
        state: {
            creds,
            keys: makeCacheableSignalKeyStore({
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => { 
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        data[id] = value; 
                    }));
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
        saveCreds: async () => await writeData(creds, 'creds')
    };
}

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await getAuthAdapter();
        const { version } = await fetchLatestBaileysVersion();
        sock = makeWASocket({
            version, auth: state, logger, browser: Browsers.macOS('Desktop'),
            getMessage: async (key) => msgRetryCache.get(key.id)
        });
        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', async (u) => {
            const { connection, qr } = u;
            if (qr) qrCodeBase64 = await qrcode.toDataURL(qr);
            if (connection === 'open') { connectionStatus = 'connected'; startDriverAssignmentNotifier(() => sock, db, msgRetryCache); }
            if (connection === 'close') setTimeout(connectToWhatsApp, 5000);
        });
    } catch (e) { setTimeout(connectToWhatsApp, 10000); }
}

const checkApiKey = (req, res, next) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
    next();
};

app.get('/status', checkApiKey, (req, res) => res.json({ connected: connectionStatus === 'connected', status: connectionStatus }));
app.get('/qr', checkApiKey, (req, res) => res.json({ qr: qrCodeBase64 }));

app.post('/api/send-email', checkApiKey, async (req, res) => {
    try {
        const result = await sendEmail(req.body);
        res.json(result);
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        const d = req.body;
        const smart = await getSmartInfo(d.origen, d.destino);
        const jid = `${String(d.clienteTelefono).replace(/\D/g, '')}@s.whatsapp.net`;
        
        const fecha = d.fecha || 'Por confirmar';
        const hora = formatTime12h(d.hora) || 'Por confirmar';
        const placa = d.placa || 'Por confirmar';
        const conductor = d.conductor || 'Por confirmar';
        const contacto = d.telefonoConductor || 'Por confirmar';

        const text = `¡Hola, *${d.clienteNombre}*! 👋

Soy Nova, asistente virtual de Transportes Especiales J&J 🚐

Tu servicio ha sido programado:
___________________________
📅 *Fecha:* ${fecha}
⏰ *Hora:* ${hora}
📍 *Origen:* ${d.origen}
🏁 *Destino:* ${d.destino}
🚗 *Placa:* ${placa}
👤 *Conductor:* ${conductor}
📞 *Contacto:* ${contacto}
___________________________
🛣️ *Distancia:* ${smart.distancia}
⏳ *Tiempo est:* ${smart.tiempo}
🌤️ *Clima destino:* ${smart.climaTemp}°C - ${smart.climaEstado}
💡 *Sugerencia:* ${smart.recomendacion}

Por favor estar listo 10 minutos antes. 🙏
¡Gracias por elegirnos! 🌟

*Transportes Especiales J&J*`;

        const sent = await sock.sendMessage(jid, { text });
        if (sent) msgRetryCache.set(sent.key.id, sent.message);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/notify-driver', checkApiKey, async (req, res) => {
    try {
        const result = await sendDriverNotification(() => sock, db, req.body.serviceId, msgRetryCache);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ success: false, error: err.message });
});

app.listen(PORT, '0.0.0.0', () => connectToWhatsApp());