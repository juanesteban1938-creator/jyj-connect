/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * DEPLOY-ID: 2026-ALPHA-01
 * Versión: Crypto-Resilient Firebase Auth
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

const app = express();

// Healthcheck para Railway
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
        console.log('[Firebase] 🛡️ Iniciando SDK con Cuenta de Servicio...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
    authCollection = db.collection('whatsapp_auth_session');
    console.log('[Firebase] ✅ SDK Conectado');
} catch (error) {
    console.error('[Firebase] ❌ Error de inicialización:', error.message);
}

/**
 * Inteligencia de Ruta y Clima (Text-Only optimized)
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
        const timeout = AbortSignal.timeout(3000);
        
        if (GMAPS_KEY && origen && destino) {
            console.log('[MAPS INPUT] Origen:', origen, '| Destino:', destino);
            const mapsUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origen)}&destinations=${encodeURIComponent(destino)}&key=${GMAPS_KEY}`;
            
            const mapsRes = await fetch(mapsUrl, { signal: timeout });
            const mapsJson = await mapsRes.json();
            
            console.log('[MAPS RAW RESPONSE]:', JSON.stringify(mapsJson));

            if (mapsJson.status === 'REQUEST_DENIED') {
                throw new Error('Google Maps API REQUEST_DENIED: ' + (mapsJson.error_message || 'Check API Key/Quota'));
            }

            const element = mapsJson.rows?.[0]?.elements?.[0];
            if (!element || element.status === 'ZERO_RESULTS') {
                throw new Error('Google Maps ZERO_RESULTS: No se encontró ruta entre los puntos.');
            }

            if (mapsJson.status === "OK" && element.status === "OK") {
                smartData.distancia = element.distance.text;
                smartData.tiempo = element.duration.text;
                
                const durationSeconds = element.duration.value;
                if (durationSeconds > 7200) {
                    smartData.recomendacion = "Viaje largo, te sugerimos ropa cómoda y buena hidratación.";
                }
            }
        }

        if (WEATHER_KEY && destino) {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destino)}&appid=${WEATHER_KEY}&units=metric&lang=es`;
            const weatherRes = await fetch(weatherUrl, { signal: timeout });
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
        if (error.message.includes('Google Maps')) {
            console.error('[MAPS FATAL ERROR]:', error.message);
        } else {
            console.error('[API ERROR] Falla en Clima/General:', error.message);
        }
    }
    return smartData;
}

/**
 * Adaptador de Autenticación Firestore (Buffer-Safe)
 */
async function getAuthAdapter() {
    const writeData = async (data, id) => {
        try { 
            if (!authCollection) return;
            const json = JSON.stringify(data, BufferJSON.replacer);
            await authCollection.doc(id).set({ data: json }, { merge: true });
        } catch (e) { 
            console.error('[Auth Write Error]', id, e.message); 
        }
    };

    const readData = async (id) => {
        try { 
            if (!authCollection) return null;
            const doc = await authCollection.doc(id).get();
            if (!doc.exists) return null;
            const content = doc.data().data;
            return JSON.parse(content, BufferJSON.reviver);
        } catch (e) { 
            return null; 
        }
    };

    const removeData = async (id) => { 
        try { if (authCollection) await authCollection.doc(id).delete(); } catch (e) {} 
    };

    let creds = await readData('creds');
    
    if (!creds || !creds.noiseKey) {
        console.log('[Nova] 🔑 Sesión no encontrada. Inicializando credenciales vírgenes...');
        creds = initAuthCreds();
        await writeData(creds, 'creds');
    }

    return {
        state: {
            creds,
            keys: makeCacheableSignalKeyStore({
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => { 
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value; 
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const cat in data) {
                        for (const id in data[cat]) {
                            const val = data[cat][id];
                            const key = `${cat}-${id}`;
                            if (val) tasks.push(writeData(val, key)); 
                            else tasks.push(removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }, logger)
        },
        saveCreds: async () => {
            await writeData(creds, 'creds');
        }
    };
}

async function connectToWhatsApp() {
    console.log('[Nova] 🚀 Iniciando motor de WhatsApp...');
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
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) { 
                qrCodeBase64 = await qrcode.toDataURL(qr); 
                connectionStatus = 'waiting_qr'; 
                console.log('\n[Nova] 📲 NUEVO CÓDIGO QR GENERADO:');
                qrcodeTerminal.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const error = lastDisconnect?.error;
                const statusCode = (error instanceof Boom) ? error.output.statusCode : 0;
                console.error('[CRASH REAL BAILLEYS]:', error || 'Desconexión desconocida');

                if (statusCode !== DisconnectReason.loggedOut) {
                    console.log('[Nova] 🔄 Reintentando conexión en 5s...');
                    setTimeout(connectToWhatsApp, 5000);
                } else {
                    console.log('[Nova] ⚠️ Sesión cerrada manualmente. Limpiando Firebase...');
                    if (authCollection) {
                        const batch = db.batch();
                        const docs = await authCollection.get();
                        docs.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                    connectionStatus = 'logged_out';
                }
            } else if (connection === 'open') {
                qrCodeBase64 = ''; 
                connectionStatus = 'connected';
                console.log('[Nova] ✅ SISTEMA ONLINE - LISTO PARA COMANDOS');
            }
        });

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
        console.error('[Nova] ❌ Error fatal en motor:', error.message);
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
    console.log(`[Nova Engine] [DEPLOY-ID: 2026-ALPHA-01] Activo en puerto ${PORT}`);
    connectToWhatsApp();
});
