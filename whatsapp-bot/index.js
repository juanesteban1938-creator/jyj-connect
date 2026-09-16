
/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * Versión: 3.4.1 (Stability & Healthcheck Patch)
 * Solución: Persistencia atómica en Firestore y manejo de reconexión robusto.
 */

const { 
    default: makeWASocket, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    isJidBroadcast,
    proto,
    initAuthState
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const qrcode = require('qrcode');
const pino = require('pino');
const fetch = require('node-fetch');

// ── CONFIGURACIÓN DE FIREBASE ──
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'jj-connect--18988325-5ab9e'
    });
}
const db = admin.firestore();
const authCollection = db.collection('whatsapp_auth_session');

// ── CONFIGURACIÓN DE EXPRESS ──
const app = express();
app.use(express.json());
app.use(cors());

// Healthcheck para Railway
app.get('/health', (req, res) => res.status(200).send('OK'));

const port = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'jj-connect-2026';
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || ''; 

let sock = null;
let qrCodeBase64 = '';
let connectionStatus = 'initializing';

const logger = pino({ level: 'silent' });

/**
 * ADAPTADOR DE FIREBASE PARA BAILEYS
 * Lee y guarda el estado de autenticación en la nube.
 */
async function getFirestoreAuth() {
    const writeData = async (data, id) => {
        try {
            const json = JSON.stringify(data, (key, value) => {
                if (Buffer.isBuffer(value)) return { type: 'Buffer', data: value.toString('base64') };
                return value;
            });
            await authCollection.doc(id).set({ data: json });
        } catch (e) {
            console.error('[Auth Save Error]:', e.message);
        }
    };

    const readData = async (id) => {
        try {
            const doc = await authCollection.doc(id).get();
            if (!doc.exists) return null;
            return JSON.parse(doc.data().data, (key, value) => {
                if (value && value.type === 'Buffer') return Buffer.from(value.data, 'base64');
                return value;
            });
        } catch (e) {
            console.error('[Auth Read Error]:', e.message);
            return null;
        }
    };

    const removeData = async (id) => {
        try {
            await authCollection.doc(id).delete();
        } catch (e) {}
    };

    const creds = await readData('creds') || initAuthState().creds;

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
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }, logger)
        },
        saveCreds: () => writeData(creds, 'creds')
    };
}

// ── LÓGICA DE NEGOCIO Y NOTIFICACIONES ──

async function getGoogleDistanceMatrix(origin, destination) {
    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&key=${GOOGLE_MAPS_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== 'OK') {
            console.error('[ERROR GOOGLE MAPS API]', {
                status: data.status,
                message: data.error_message || 'Error desconocido en la respuesta de Google',
                origin,
                destination
            });
            return { distance: 'N/A', duration: 'N/A' };
        }

        const element = data.rows[0].elements[0];
        if (element.status !== 'OK') {
            console.error('[ERROR GOOGLE MAPS API]', {
                status: element.status,
                message: 'No se pudo calcular la ruta entre estos puntos.',
                origin,
                destination
            });
            return { distance: 'N/A', duration: 'N/A' };
        }

        return {
            distance: element.distance.text,
            duration: element.duration.text
        };
    } catch (error) {
        console.error('[ERROR GOOGLE MAPS API]', {
            status: error.response?.status || '500',
            message: error.message,
            origin,
            destination
        });
        return { distance: 'N/A', duration: 'N/A' };
    }
}

async function generateServiceCard(data) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: 'new', 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();
        const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet"><style>body { font-family: 'Poppins', sans-serif; margin: 0; background: #fff; width: 600px; height: 800px; }.card { width: 560px; height: 760px; margin: 20px; border-radius: 30px; background: #1a1a1a; color: white; position: relative; overflow: hidden; }.header { background: #f97316; padding: 40px; text-align: center; }.logo { font-size: 32px; font-weight: bold; letter-spacing: 2px; }.content { padding: 40px; }.info-box { background: #333; padding: 20px; border-radius: 20px; margin-bottom: 20px; }.label { color: #f97316; font-size: 14px; text-transform: uppercase; font-weight: bold; }.value { font-size: 20px; margin-top: 5px; }.footer { position: absolute; bottom: 40px; width: 100%; text-align: center; color: #666; font-size: 12px; }</style></head><body><div class="card"><div class="header"><div class="logo">J&J CONNECT</div><div style="font-size: 14px; opacity: 0.8;">PROGRAMACIÓN DE SERVICIO</div></div><div class="content"><div class="info-box"><div class="label">🗓️ Fecha y Hora</div><div class="value">${data.fecha} - ${data.hora}</div></div><div class="info-box"><div class="label">📍 Origen</div><div class="value">${data.origen}</div></div><div class="info-box"><div class="label">🏁 Destino</div><div class="value">${data.destino}</div></div><div class="info-box"><div class="label">🚐 Vehículo y Conductor</div><div class="value">Placa: ${data.placa} / ${data.conductor}</div></div></div><div class="footer">Nova Assistant - J&J</div></div></body></html>`;
        await page.setViewport({ width: 600, height: 800 });
        await page.setContent(html);
        const buffer = await page.screenshot({ type: 'png' });
        await browser.close();
        return buffer;
    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
}

// ── CONEXIÓN AL SOCKET DE WHATSAPP ──
async function connectToWhatsApp() {
    console.log('[Nova] 🔄 Iniciando motor Baileys con persistencia Cloud...');
    const { state, saveCreds } = await getFirestoreAuth();
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: true,
        markOnlineOnConnect: true,
        browser: ['Nova J&J', 'Chrome', '1.0.0'],
        getMessage: async (key) => { return { conversation: 'Mensaje recuperado por Nova' } }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeBase64 = await qrcode.toDataURL(qr);
            console.log('[Nova] 📲 NUEVO CÓDIGO QR GENERADO. Escanea desde el panel.');
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect.error instanceof Boom) 
                ? lastDisconnect.error.output.statusCode 
                : lastDisconnect.error?.code;

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`[Nova] ⚠️ Conexión cerrada. Razón: ${statusCode}. Reconectando: ${shouldReconnect}`);
            
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('[Nova] ❌ Sesión cerrada permanentemente. Limpiando Firestore...');
                try {
                    const snapshot = await authCollection.get();
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                } catch (e) {
                    console.error('[Purge Error]:', e.message);
                }
                connectionStatus = 'logged_out';
                qrCodeBase64 = '';
                setTimeout(connectToWhatsApp, 5000);
            }
        } else if (connection === 'open') {
            qrCodeBase64 = '';
            connectionStatus = 'connected';
            console.log('[Nova] ✅ NOVA ONLINE. Sesión cargada desde Firestore.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe || isJidBroadcast(msg.key.remoteJid)) return;

        const jid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const name = msg.pushName || jid.split('@')[0];

        // Registro en historial para el panel administrativo
        await db.collection('conversaciones').add({
            jid,
            cuerpo: text,
            tipo: 'entrante',
            leido: false,
            nombre: name,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });
    });
}

// ── ENDPOINTS API ──
const checkApiKey = (req, res, next) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
    next();
};

app.get('/status', checkApiKey, (req, res) => res.json({ 
    connected: connectionStatus === 'connected', 
    status: connectionStatus 
}));

app.get('/qr', checkApiKey, (req, res) => {
    if (connectionStatus === 'connected') return res.json({ connected: true });
    if (!qrCodeBase64) return res.status(202).json({ error: 'Generando QR...' });
    res.json({ qr: qrCodeBase64 }); 
});

app.post('/send-message', checkApiKey, async (req, res) => {
    const { jid, mensaje } = req.body;
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        const cleanJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
        await sock.sendMessage(cleanJid, { text: mensaje });
        res.json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: 'Fallo envío: ' + error.message }); 
    }
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    const data = req.body;
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        const jid = data.clienteTelefono.includes('@') ? data.clienteTelefono : `${data.clienteTelefono}@s.whatsapp.net`;
        const imageBuffer = await generateServiceCard(data);
        
        await sock.sendMessage(jid, { 
            image: imageBuffer, 
            caption: `¡Hola, *${data.clienteNombre}*! 👋 Soy *Nova*.\n\nTu servicio ha sido programado con éxito.\n\n¡Gracias por elegir J&J! 🚐💨` 
        });
        
        res.json({ success: true });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: 'Fallo envío notificación' }); 
    }
});

app.post('/notify-driver-on-way', checkApiKey, async (req, res) => {
    const { jid, origin, destination, driverName, plate } = req.body;
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });

    const matrix = await getGoogleDistanceMatrix(origin, destination);
    
    const message = `🚐 *TU CONDUCTOR ESTÁ EN CAMINO*\n\nHola, tu conductor *${driverName}* (Placa: ${plate}) ya se dirige hacia tu ubicación.\n\n📍 *Distancia:* ${matrix.distance}\n⏳ *Tiempo estimado:* ${matrix.duration}\n\nPrepárate para el abordaje. ¡J&J te desea un excelente viaje! 🌟`;

    try {
        const cleanJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
        await sock.sendMessage(cleanJid, { text: message });
        res.json({ success: true, matrix });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/restart', checkApiKey, async (req, res) => {
    console.log('[Nova] ⚠️ Solicitud de reinicio y purga recibida.');
    try {
        const snapshot = await authCollection.get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        res.json({ message: 'Sistema purgado. Reiniciando proceso...' });
        process.exit(0);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[Nova Engine] Escuchando en puerto: ${port}`);
    connectToWhatsApp();
});
