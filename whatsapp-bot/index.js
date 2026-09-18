/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * Versión: Text-Only Hybrid Core (Firestore Persistence)
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

// ── CONFIGURACIÓN DE FIREBASE ──
let db = null;
let authCollection = null;

try {
    if (!admin.apps.length) {
        console.log('[Firebase] Iniciando SDK...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
    authCollection = db.collection('whatsapp_auth_session');
    console.log('[Firebase] ✅ SDK Conectado para Persistencia');
} catch (error) {
    console.error('[Firebase] Fallo crítico de conexión:', error.message);
}

/**
 * Inteligencia de Ruta y Clima (Fetch nativo + Timeout de 3s)
 */
async function getSmartInfo(origen, destino) {
    const smartData = {
        distancia: "Información calculada en ruta",
        tiempo: "Información calculada en ruta",
        climaEstado: "Despejado", 
        climaTemp: "--",
        recomendacion: "Por favor estar atento a las indicaciones del conductor."
    };

    try {
        if (GMAPS_KEY && origen && destino) {
            const mapsUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origen)}&destinations=${encodeURIComponent(destino)}&key=${GMAPS_KEY}`;
            const mapsRes = await fetch(mapsUrl, { signal: AbortSignal.timeout(3000) });
            const mapsJson = await mapsRes.json();
            
            if (mapsJson.rows?.[0]?.elements?.[0]?.status === "OK") {
                smartData.distancia = mapsJson.rows[0].elements[0].distance.text;
                smartData.tiempo = mapsJson.rows[0].elements[0].duration.text;
                
                const durationSeconds = mapsJson.rows[0].elements[0].duration.value;
                if (durationSeconds > 7200) {
                    smartData.recomendacion = "Viaje largo, te sugerimos ropa cómoda y buena hidratación.";
                }
            }
        }

        if (WEATHER_KEY && destino) {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destino)}&appid=${WEATHER_KEY}&units=metric&lang=es`;
            const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(3000) });
            const weatherJson = await weatherRes.json();
            
            if (weatherJson.main) {
                smartData.climaTemp = Math.round(weatherJson.main.temp);
                smartData.climaEstado = weatherJson.weather[0].description;
                
                const mainWeather = weatherJson.weather[0].main.toLowerCase();
                if (mainWeather.includes('rain')) {
                    smartData.recomendacion = "Lleva paraguas, se esperan lluvias en tu destino.";
                } else if (smartData.climaTemp > 28) {
                    smartData.recomendacion = "Día soleado y caluroso, no olvides hidratarte.";
                }
            }
        }
    } catch (error) {
        console.error('[API ERROR] Falla en Maps/Clima:', error.message);
    }
    return smartData;
}

/**
 * Adaptador de Autenticación Firestore (Baileys Persistence)
 */
async function getAuthAdapter() {
    const writeData = async (data, id) => {
        try { if (!authCollection) return;
            const json = JSON.stringify(data, (k, v) => Buffer.isBuffer(v) ? { type: 'Buffer', data: v.toString('base64') } : v);
            await authCollection.doc(id).set({ data: json, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        } catch (e) { console.error('[Auth Write Error]', e.message); }
    };

    const readData = async (id) => {
        try { if (!authCollection) return null;
            const doc = await authCollection.doc(id).get();
            if (!doc.exists) return null;
            return JSON.parse(doc.data().data, (k, v) => (v && v.type === 'Buffer') ? Buffer.from(v.data, 'base64') : v);
        } catch (e) { return null; }
    };

    const removeData = async (id) => { 
        try { if (authCollection) await authCollection.doc(id).delete(); } catch (e) {} 
    };

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
        saveCreds: async () => { /* Manejado por sock.ev.on('creds.update') */ }
    };
}

async function connectToWhatsApp() {
    console.log('[Nova] Encendiendo motor de WhatsApp... [DEPLOY: 2026-STABLE]');
    try {
        const { state } = await getAuthAdapter();
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) { 
                qrCodeBase64 = await qrcode.toDataURL(qr); 
                connectionStatus = 'waiting_qr'; 
                console.log('[Nova] 📲 Código QR generado. Esperando vinculación...');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error instanceof Boom) ? 
                    lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
                
                if (shouldReconnect) {
                    console.log('[Nova] Reintentando conexión en 5s...');
                    setTimeout(connectToWhatsApp, 5000);
                } else {
                    console.log('[Nova] ⚠️ Sesión cerrada. Limpiando credenciales...');
                    connectionStatus = 'logged_out';
                }
            } else if (connection === 'open') {
                qrCodeBase64 = ''; 
                connectionStatus = 'connected';
                console.log('[Nova] ✅ SISTEMA ONLINE - LISTO PARA COMANDOS');
            }
        });

        sock.ev.on('creds.update', async (creds) => {
            if (authCollection) {
                const json = JSON.stringify(creds, (k, v) => Buffer.isBuffer(v) ? { type: 'Buffer', data: v.toString('base64') } : v);
                await authCollection.doc('creds').set({ data: json, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            }
        });

        // Inbox Listener
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
        console.error('[Nova] Error fatal en motor:', error.message);
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

app.post('/restart', checkApiKey, async (req, res) => {
    try {
        if (sock) sock.logout();
        if (authCollection) {
            const batch = db.batch();
            const docs = await authCollection.get();
            docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        res.json({ success: true });
        process.exit(0);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    
    try {
        const d = req.body;
        let phone = String(d.clienteTelefono).replace(/\D/g, '');
        if (!phone.startsWith('57') && phone.length === 10) phone = '57' + phone;
        const jid = `${phone}@s.whatsapp.net`;

        const smart = await getSmartInfo(d.origen, d.destino);
        
        const mensajeFormateado = `¡Hola, *${d.clienteNombre}*! 👋

Soy Nova, asistente virtual de Transportes Especiales J&J 🚐

Tu servicio ha sido programado:
━━━━━━━━━━━━━━━━
🗓️ Fecha: ${d.fecha}
⏰ Hora: ${d.hora}
📍 Origen: ${d.origen}
🏁 Destino: ${d.destino}
🚗 Placa: ${d.placa}
👤 Conductor: ${d.conductor}
📞 Contacto: ${d.telefonoConductor}
━━━━━━━━━━━━━━━━
🛣️ Distancia: ${smart.distancia}
⏳ Tiempo est: ${smart.tiempo}
🌤️ Clima destino: ${smart.climaEstado} (${smart.climaTemp}°C)
💡 Sugerencia: ${smart.recomendacion}

Por favor estar listo 10 minutos antes. 🙏
¡Gracias por elegirnos! 🌟

Transportes Especiales J&J`;

        await sock.sendMessage(jid, { text: mensajeFormateado });

        if (db) {
            await db.collection('notificaciones_whatsapp').add({
                clienteNombre: d.clienteNombre,
                clienteTelefono: phone,
                tipo: 'Confirmación Servicio',
                estado: 'enviado',
                fecha: admin.firestore.FieldValue.serverTimestamp()
            });
        }

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
