
/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * Versión: 2.6.0 (Tarifas Dinámicas Firestore + Google Maps)
 */

const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const cors = require('cors');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Inicialización de Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'jj-connect--18988325-5ab9e'
    });
}
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'jj-connect-2026';
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || ''; 
const AUTH_PATH = path.join(__dirname, '.wwebjs_auth');

let qrCodeBase64 = ''; 
let isReady = false;
let authStatus = 'Iniciando sistema...';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
});

/**
 * CONSULTA GOOGLE DISTANCE MATRIX
 */
async function getGoogleDistanceMatrix(origin, destination) {
    try {
        if (!GOOGLE_MAPS_KEY) throw new Error('API Key de Google Maps no configurada.');

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&traffic_model=best_guess&departure_time=now&key=${GOOGLE_MAPS_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') throw new Error(data.error_message || data.status);

        const element = data.rows[0].elements[0];
        if (element.status !== 'OK') return { distancia: 'N/A', tiempo: 'N/A' };

        return {
            distancia: element.distance.text,
            tiempo: element.duration_in_traffic ? element.duration_in_traffic.text : element.duration.text
        };
    } catch (error) {
        console.error('[ERROR GOOGLE MAPS API]', error.message);
        return { distancia: 'N/A', tiempo: 'N/A' };
    }
}

/**
 * CÁLCULO DE TARIFA DINÁMICA (FIRESTORE + MAPS)
 * @param {string} tipoVehiculo - 'Moto', 'Van' o 'Blindado'
 * @param {string} origen
 * @param {string} destino
 * @param {number} valorDeclarado
 */
async function calcularTarifaCustodia(tipoVehiculo, origen, destino, valorDeclarado = 0) {
    try {
        // 1. Obtener distancia de Google
        const mapsData = await getGoogleDistanceMatrix(origen, destino);
        if (mapsData.distancia === 'N/A') throw new Error('No se pudo calcular la distancia.');

        // Extraer número de la cadena (ej: "12.5 km" -> 12.5)
        const distanciaKm = parseFloat(mapsData.distancia.replace(/[^\d.-]/g, ''));

        // 2. Obtener tarifas maestras de Firestore
        const ratesDoc = await db.collection('configuracion').doc('tarifas_envio').get();
        if (!ratesDoc.exists) throw new Error('Configuración de tarifas no encontrada en Firestore.');
        
        const r = ratesDoc.data();
        const v = tipoVehiculo.toLowerCase();

        // 3. Mapeo de parámetros por categoría
        let base = 0;
        let kmExtra = 0;

        if (v.includes('moto')) {
            base = r.tarifa_moto_base || 15000;
            kmExtra = r.tarifa_moto_km || 1200;
        } else if (v.includes('van')) {
            base = r.tarifa_van_base || 35000;
            kmExtra = r.tarifa_van_km || 2500;
        } else {
            // Default: Blindado / Auto
            base = r.tarifa_blindado_base || 120000;
            kmExtra = r.tarifa_blindado_km || 5500;
        }

        // 4. Aplicación de la fórmula J&J
        const costoArranque = base;
        const costoRecorrido = distanciaKm * kmExtra;
        const primaSeguro = valorDeclarado * ((r.porcentaje_custodia || 1.5) / 100);
        
        const totalRaw = costoArranque + costoRecorrido + primaSeguro;
        const totalRedondeado = Math.ceil(totalRaw / 100) * 100; // Redondeo a la centena superior

        return {
            total: totalRedondeado,
            distancia: mapsData.distancia,
            tiempo: mapsData.tiempo,
            totalFmt: currencyFormatter.format(totalRedondeado),
            desglose: {
                base: currencyFormatter.format(costoArranque),
                recorrido: currencyFormatter.format(costoRecorrido),
                seguro: currencyFormatter.format(primaSeguro)
            }
        };
    } catch (error) {
        console.error('[Nova Tarifador] Fallo Crítico:', error.message);
        return null;
    }
}

function purgarSesionCorrupta() {
    try {
        if (fs.existsSync(AUTH_PATH)) {
            fs.rmSync(AUTH_PATH, { recursive: true, force: true });
            console.log('[Nova] ✅ Sesión purgada.');
        }
    } catch (err) {
        console.error('[Nova] ❌ Error purga:', err.message);
    }
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: AUTH_PATH }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('message', async (msg) => {
    const contact = await msg.getContact();
    const jid = msg.from;
    const body = (msg.body || '').toLowerCase();

    // Log de conversación
    await db.collection('conversaciones').add({
        jid,
        cuerpo: msg.body,
        tipo: 'entrante',
        leido: false,
        nombre: contact.pushname || contact.name || jid.split('@')[0],
        fecha: admin.firestore.FieldValue.serverTimestamp()
    });

    /**
     * LÓGICA DE COTIZACIÓN AUTOMÁTICA (BETA)
     * Detecta palabras clave para ofrecer cotización dinámica
     */
    if (body.includes('cuánto cuesta') || body.includes('cotizar') || body.includes('valor del envío')) {
        await msg.reply('¡Hola! 👋 Soy *Nova*. Para darte una tarifa exacta necesito: \n\n1. Dirección de recogida.\n2. Dirección de entrega.\n3. Valor de la mercancía.\n\n_Estamos procesando tarifas dinámicas en tiempo real._');
    }
});

async function generateServiceCard(data) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        const htmlContent = `<html><head><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet"><style>body { font-family: 'Poppins', sans-serif; margin: 0; background: #fff; width: 600px; height: 800px; }.card { width: 560px; height: 760px; margin: 20px; border-radius: 30px; background: #1a1a1a; color: white; position: relative; overflow: hidden; }.header { background: #f97316; padding: 40px; text-align: center; }.logo { font-size: 32px; font-weight: bold; letter-spacing: 2px; }.content { padding: 40px; }.info-box { background: #333; padding: 20px; border-radius: 20px; margin-bottom: 20px; }.label { color: #f97316; font-size: 14px; text-transform: uppercase; font-weight: bold; }.value { font-size: 20px; margin-top: 5px; }.footer { position: absolute; bottom: 40px; width: 100%; text-align: center; color: #666; font-size: 12px; }</style></head><body><div class="card"><div class="header"><div class="logo">J&J CONNECT</div><div style="font-size: 14px; opacity: 0.8;">PROGRAMACIÓN DE SERVICIO</div></div><div class="content"><div class="info-box"><div class="label">🗓️ Fecha y Hora</div><div class="value">${data.fecha} - ${data.hora}</div></div><div class="info-box"><div class="label">📍 Origen</div><div class="value">${data.origen}</div></div><div class="info-box"><div class="label">🏁 Destino</div><div class="value">${data.destino}</div></div><div class="info-box"><div class="label">🚐 Vehículo y Conductor</div><div class="value">Placa: ${data.placa} / ${data.conductor}</div></div></div><div class="footer">Nova Assistant - Transportes Especiales J&J</div></div></body></html>`;
        await page.setViewport({ width: 600, height: 800 });
        await page.setContent(htmlContent);
        const buffer = await page.screenshot({ type: 'png' });
        await browser.close();
        return buffer.toString('base64');
    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
}

client.on('qr', async (qr) => {
    isReady = false;
    authStatus = 'Esperando escaneo QR...';
    try { qrCodeBase64 = await qrcode.toDataURL(qr); } catch(e) {}
});

client.on('ready', () => { 
    isReady = true; 
    qrCodeBase64 = ''; 
    authStatus = 'Conectada y operando.'; 
});

const checkApiKey = (req, res, next) => {
    if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
    next();
};

app.get('/status', checkApiKey, (req, res) => res.json({ connected: isReady, status: authStatus }));

app.get('/qr', checkApiKey, (req, res) => {
    if (isReady) return res.json({ connected: true });
    if (!qrCodeBase64) return res.status(202).json({ error: 'Generando QR...' });
    res.json({ qr: qrCodeBase64 }); 
});

/**
 * ENDPOINT: Obtener Cotización Dinámica
 */
app.post('/get-quote', checkApiKey, async (req, res) => {
    const { tipoVehiculo, origen, destino, valorDeclarado } = req.body;
    const cotizacion = await calcularTarifaCustodia(tipoVehiculo, origen, destino, valorDeclarado);
    
    if (!cotizacion) return res.status(500).json({ error: 'Fallo al calcular cotización' });
    res.json(cotizacion);
});

app.post('/send-message', checkApiKey, async (req, res) => {
    const { jid, mensaje } = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova desconectada' });
    try { await client.sendMessage(jid, mensaje); res.json({ success: true }); } catch (error) { res.status(500).json({ error: 'Fallo envío' }); }
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    const data = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova desconectada' });
    try {
        const jid = data.clienteTelefono.includes('@') ? data.clienteTelefono : `${data.clienteTelefono}@c.us`;
        const imageBase64 = await generateServiceCard(data);
        const media = new MessageMedia('image/png', imageBase64, 'servicio.png');
        await client.sendMessage(jid, media);
        const msg = `¡Hola, *${data.clienteNombre}*! 👋 Soy *Nova*.\n\nTu servicio ha sido programado con éxito. Arriba te envío la tarjeta con los detalles. 🚐💨`;
        await client.sendMessage(jid, msg);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Fallo envío' }); }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[Nova Server] Operando con Tarifas Dinámicas J&J.`);
    client.initialize();
});
