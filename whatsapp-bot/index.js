/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * Versión: 3.8.0 (Railway Robustness Update)
 * Propósito: Solución definitiva a la persistencia y generación de QR.
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

// ── INICIALIZACIÓN DE EXPRESS ──
const app = express();

/**
 * 🚨 PRIORIDAD ABSOLUTA: Healthcheck para Railway
 */
app.get('/health', (req, res) => res.status(200).send('OK'));

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'jj-connect-2026';
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || ''; 

let sock = null;
let qrCodeBase64 = '';
let connectionStatus = 'initializing';

const logger = pino({ level: 'silent' });

/**
 * ADAPTADOR DE FIREBASE PARA BAILEYS (Nube Atómica)
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

    const credsData = await readData('creds');
    const creds = credsData || initAuthState().creds;

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

// ── GENERACIÓN DE IMÁGENES (PUPPETEER) ──
async function generateServiceCard(data) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: 'new', 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ] 
        });
        const page = await browser.newPage();
        const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet"><style>body { font-family: 'Poppins', sans-serif; margin: 0; background: #fff; width: 600px; height: 800px; }.card { width: 560px; height: 760px; margin: 20px; border-radius: 40px; background: #0f172a; color: white; position: relative; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); }.header { background: #f97316; padding: 50px 40px; text-align: center; }.logo { font-size: 38px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; }.content { padding: 40px; }.info-box { background: rgba(255,255,255,0.05); padding: 25px; border-radius: 25px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); }.label { color: #f97316; font-size: 12px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px; margin-bottom: 8px; }.value { font-size: 22px; font-weight: bold; line-height: 1.2; }.footer { position: absolute; bottom: 40px; width: 100%; text-align: center; color: rgba(255,255,255,0.3); font-size: 10px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; }</style></head><body><div class="card"><div class="header"><div class="logo">J&J Connect</div><div style="font-size: 12px; font-weight: 900; margin-top: 5px; opacity: 0.8; letter-spacing: 2px;">CONFIRMACIÓN DE SERVICIO</div></div><div class="content"><div class="info-box"><div class="label">📍 Recogida</div><div class="value">${data.origen}</div></div><div class="info-box"><div class="label">🏁 Destino</div><div class="value">${data.destino}</div></div><div class="info-box"><div class="label">📅 Programación</div><div class="value">${data.fecha} — ${data.hora}</div></div><div class="info-box"><div class="label">🚐 Unidad Asignada</div><div class="value">${data.placa} / ${data.conductor}</div></div></div><div class="footer">Nova AI Assistant — v3.8</div></div></body></html>`;
        await page.setViewport({ width: 600, height: 800 });
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const buffer = await page.screenshot({ type: 'png' });
        await browser.close();
        return buffer;
    } catch (err) {
        if (browser) await browser.close();
        console.error('[Card Gen Error]:', err.message);
        throw err;
    }
}

// ── CONEXIÓN AL SOCKET DE WHATSAPP ──
async function connectToWhatsApp() {
    console.log('[Nova] 🔄 Iniciando motor Baileys...');
    const { state, saveCreds } = await getFirestoreAuth();
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: true,
        markOnlineOnConnect: true,
        browser: ['Nova J&J', 'Chrome', '1.0.0'],
        getMessage: async () => ({ conversation: 'Mensaje recuperado' })
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeBase64 = await qrcode.toDataURL(qr);
            connectionStatus = 'waiting_qr';
            console.log('[Nova] 📲 NUEVO CÓDIGO QR DISPONIBLE.');
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect.error instanceof Boom) 
                ? lastDisconnect.error.output.statusCode 
                : lastDisconnect.error?.code;

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[Nova] ⚠️ Conexión cerrada (${statusCode}). Reconectando: ${shouldReconnect}`);
            
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('[Nova] ❌ Sesión cerrada permanentemente. Purgando Firestore...');
                const snapshot = await authCollection.get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                connectionStatus = 'logged_out';
                qrCodeBase64 = '';
                setTimeout(connectToWhatsApp, 5000);
            }
        } else if (connection === 'open') {
            qrCodeBase64 = '';
            connectionStatus = 'connected';
            console.log('[Nova] ✅ SISTEMA ONLINE Y VINCULADO.');
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
    if (!qrCodeBase64) return res.status(202).json({ error: 'Generando...' });
    res.json({ qr: qrCodeBase64 }); 
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    const data = req.body;
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        const jid = data.clienteTelefono.includes('@') ? data.clienteTelefono : `${data.clienteTelefono}@s.whatsapp.net`;
        const imageBuffer = await generateServiceCard(data);
        
        await sock.sendMessage(jid, { 
            image: imageBuffer, 
            caption: `¡Hola, *${data.clienteNombre}*! 👋 Soy *Nova*.\n\nTu servicio ha sido programado con éxito. He adjuntado tu ficha de viaje.\n\n¡Gracias por elegir J&J! 🚐💨` 
        });
        
        await db.collection('notificaciones_whatsapp').add({
            clienteNombre: data.clienteNombre,
            clienteTelefono: data.clienteTelefono,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
            estado: 'enviado',
            tipo: 'Confirmación de Servicio'
        });

        res.json({ success: true });
    } catch (error) { 
        console.error('[Notification Error]:', error.message);
        res.status(500).json({ error: 'Fallo envío notificación' }); 
    }
});

app.post('/restart', checkApiKey, async (req, res) => {
    try {
        const snapshot = await authCollection.get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log('[Nova] 🔄 Reinicio forzado solicitado.');
        res.json({ message: 'Reiniciando...' });
        process.exit(0);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => { 
    console.log('Nova Engine activo en puerto', PORT); 
    connectToWhatsApp();
});
