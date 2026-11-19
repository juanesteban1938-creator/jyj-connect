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

// Middlewares iniciales con límites amplios para soportar PDFs de alta resolución
app.use(cors()); 
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Healthcheck para Railway
app.get('/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'jj-connect-2026';
const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;

let sock = null;
let qrCodeBase64 = '';
let connectionStatus = 'initializing';
const logger = pino({ level: 'silent' });

// ── CACHÉ DE MENSAJES PARA FIX DE CIFRADO ──
const msgRetryCache = new Map();

// ── CONFIGURACIÓN DE FIREBASE ──
let db = null;
let authCollection = null;

try {
    if (!admin.apps.length) {
        console.log('[Firebase] 🛡️ Iniciando SDK para Persistencia...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
    authCollection = db.collection('whatsapp_auth_session');
    console.log('[Firebase] ✅ SDK Conectado - Listo para sincronizar sesión');
} catch (error) {
    console.error('[Firebase] ❌ Error de inicialización:', error.message);
}

/**
 * Formatea una cadena de hora de 24h a 12h con AM/PM
 */
function formatTime12h(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].substring(0, 2);
    if (isNaN(hours)) return timeStr;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // La hora '0' debe ser '12'
    
    const hoursStr = hours < 10 ? '0' + hours : hours;
    return `${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Inteligencia de Ruta y Clima (Diseño de Texto Puro)
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
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origen)}&destinations=${encodeURIComponent(destino)}&key=${GMAPS_KEY}`;
            
            const mapsRes = await fetch(url, { signal: timeout });
            const mapsJson = await mapsRes.json();

            if (mapsJson.status === 'OK' && mapsJson.rows?.[0]?.elements?.[0]?.status === 'OK') {
                const element = mapsJson.rows[0].elements[0];
                smartData.distancia = element.distance.text;
                smartData.tiempo = element.duration.text;
                
                if (element.duration.value > 7200) {
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
            }
        }
    } catch (error) {
        console.error('[API ERROR] Falla silenciosa en Maps/Clima:', error.message);
    }
    return smartData;
}

/**
 * Adaptador de Autenticación Firestore (BufferJSON-Resilient)
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
    
    if (!creds) {
        console.log('[Nova] 🔑 Generando nuevas credenciales de sesión...');
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
            markOnlineOnConnect: true,
            connectTimeoutMs: 60000,
            generateHighQualityLinkPreview: false,
            // FIX: Habilitar recuperación de mensajes para reintentos de cifrado
            getMessage: async (key) => {
                if (msgRetryCache.has(key.id)) {
                    return msgRetryCache.get(key.id);
                }
                return undefined;
            }
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
                
                if (statusCode === 440 || statusCode === DisconnectReason.loggedOut) {
                    console.log('[Nova] ⚠️ Conflicto de sesión. Limpiando Firebase...');
                    if (authCollection) {
                        const batch = db.batch();
                        const docs = await authCollection.get();
                        docs.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                    process.exit(0);
                } else {
                    console.log('[Nova] 🔄 Reintentando conexión en 5s...');
                    setTimeout(connectToWhatsApp, 5000);
                }
            } else if (connection === 'open') {
                qrCodeBase64 = ''; 
                connectionStatus = 'connected';
                console.log('[Nova] ✅ SISTEMA ONLINE - LISTO PARA COMANDOS');

                // INICIALIZAR NOTIFICADOR DE CONDUCTORES CON GETTER Y CACHÉ
                if (db) startDriverAssignmentNotifier(() => sock, db, msgRetryCache);
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify' || !db) return;
            const msg = messages[0];
            
            // FIX: Cachear contenido para reintentos de descifrado (Salientes y Entrantes)
            if (msg.message) {
                msgRetryCache.set(msg.key.id, msg.message);
                // Mantener cache ligero (últimos 200 mensajes)
                if (msgRetryCache.size > 200) {
                    const firstKey = msgRetryCache.keys().next().value;
                    msgRetryCache.delete(firstKey);
                }
            }

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

app.post('/api/send-email', checkApiKey, async (req, res) => {
    try {
        const { to, subject, html, text, attachments } = req.body;
        if (!to || !subject) return res.status(400).json({ success: false, error: 'Faltan campos (to, subject)' });
        const result = await sendEmail({ to, subject, html, text, attachments });
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        const d = req.body;
        let phone = String(d.clienteTelefono).replace(/\D/g, '');
        if (!phone.startsWith('57') && phone.length === 10) phone = '57' + phone;
        const jid = `${phone}@s.whatsapp.net`;

        // FIX: Validar JID y calentar llaves antes de enviar
        const [result] = await sock.onWhatsApp(jid);
        const targetJid = result?.exists ? result.jid : jid;

        const smart = await getSmartInfo(d.origen, d.destino);
        const hora12 = formatTime12h(d.hora);
        
        const mensajeFormateado = `¡Hola, *${d.clienteNombre}*! 👋

Soy Nova, asistente virtual de Transportes Especiales J&J 🚐

Tu servicio ha sido programado:
━━━━━━━━━━━━━━━━
🗓️ *Fecha:* ${d.fecha}
⏰ *Hora:* ${hora12}
📍 *Origen:* ${d.origen}
🏁 *Destino:* ${d.destino}
🚗 *Placa:* ${d.placa}
👤 *Conductor:* ${d.conductor}
📞 *Contacto:* ${d.telefonoConductor}
━━━━━━━━━━━━━━━━
🛣️ *Distancia:* ${smart.distancia}
⏳ *Tiempo est:* ${smart.tiempo}
🌤️ *Clima destino:* ${smart.climaEstado} (${smart.climaTemp}°C)
💡 *Sugerencia:* ${smart.recomendacion}

Por favor estar listo 10 minutos antes. 🙏
¡Gracias por elegirnos! 🌟

*Transportes Especiales J&J*`;

        const sent = await sock.sendMessage(targetJid, { text: mensajeFormateado });
        
        // Caching inmediato del mensaje saliente para evitar "Waiting for message"
        if (sent) msgRetryCache.set(sent.key.id, sent.message);

        if (db) {
            await db.collection('notificaciones_whatsapp').add({
                clienteNombre: d.clienteNombre, clienteTelefono: phone,
                tipo: 'Confirmación Servicio', estado: 'enviado',
                fecha: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Fallo al procesar notificación' }); }
});

app.post('/notify-driver', checkApiKey, async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        const { serviceId } = req.body;
        if (!serviceId) return res.status(400).json({ error: 'Falta serviceId' });

        const result = await sendDriverNotification(() => sock, db, serviceId, msgRetryCache);
        res.json(result);
    } catch (error) {
        console.error('[Nova-HTTP] ❌ Error en /notify-driver:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-message', checkApiKey, async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        // Validar JID
        const [resCheck] = await sock.onWhatsApp(req.body.jid);
        const jid = resCheck?.exists ? resCheck.jid : req.body.jid;
        
        const sent = await sock.sendMessage(jid, { text: req.body.mensaje });
        if (sent) msgRetryCache.set(sent.key.id, sent.message);
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Middleware de manejo de errores global (Garantiza que el puente nunca devuelva HTML)
app.use((err, req, res, next) => {
    console.error('[BRIDGE ERROR]:', err.message);
    res.status(err.status || 500).json({ 
        success: false, 
        error: err.message || 'Fallo interno en el puente de Railway.' 
    });
});

app.listen(PORT, '0.0.0.0', () => { 
    console.log(`[Nova Engine] Activo en puerto ${PORT}`);
    connectToWhatsApp();
});
