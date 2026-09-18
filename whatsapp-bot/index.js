/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * DEPLOY-ID: 2026-ALPHA-01 (FORCE_CLEAN)
 */
console.log('[DEPLOY-ID: 2026-ALPHA-01]');
const { 
    default: makeWASocket, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    isJidBroadcast,
    proto,
    initAuthCreds,
    Browsers
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const qrcode = require('qrcode');
const pino = require('pino');

const app = express();

// 1. PRIORIDAD ABSOLUTA: Healthcheck para Railway
app.get('/health', (req, res) => res.status(200).send('OK'));

app.use(cors()); 
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'jj-connect-2026';

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
    console.log('[Firebase] SDK Conectado para Persistencia.');
} catch (error) {
    console.error('[Firebase] Error de inicialización:', error.message);
}

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
                        if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
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

async function generateServiceCard(data) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: 'new', 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        const html = `<html><body style="font-family:sans-serif; background:#0f172a; color:white; padding:40px; width:500px;">
            <h1 style="color:#f97316;">J&J Connect</h1>
            <div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:20px;">
                <p>📍 <b>Origen:</b> ${data.origen}</p>
                <p>🏁 <b>Destino:</b> ${data.destino}</p>
                <p>🚐 <b>Unidad:</b> ${data.placa}</p>
                <p>👤 <b>Conductor:</b> ${data.conductor}</p>
            </div>
        </body></html>`;
        await page.setContent(html);
        const buffer = await page.screenshot({ type: 'png' });
        await browser.close();
        return buffer;
    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
}

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
                console.log('[Nova] ✅ SISTEMA ONLINE - LISTO PARA COMANDOS');
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

const checkApiKey = (req, res, next) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
    next();
};

app.get('/status', checkApiKey, (req, res) => res.json({ connected: connectionStatus === 'connected', status: connectionStatus }));
app.get('/qr', checkApiKey, (req, res) => {
    if (connectionStatus === 'connected') return res.json({ connected: true });
    res.json({ qr: qrCodeBase64 }); 
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    if (connectionStatus !== 'connected') return res.status(503).json({ error: 'Nova desconectada' });
    try {
        const data = req.body;
        const jid = `${data.clienteTelefono.replace(/\D/g, '')}@s.whatsapp.net`;
        const buffer = await generateServiceCard(data);
        await sock.sendMessage(jid, { image: buffer, caption: `Confirmación de servicio para *${data.clienteNombre}*.` });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Fallo envío' }); }
});

app.listen(PORT, '0.0.0.0', () => { 
    console.log(`[DEPLOY-ID: 2026-ALPHA-01] Puerto: ${PORT}`);
    connectToWhatsApp();
});