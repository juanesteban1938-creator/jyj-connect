/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * Versión: 2.5.0 (Diagnóstico Google Maps y Notificaciones en camino)
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
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || ''; // Configurada en Railway
const AUTH_PATH = path.join(__dirname, '.wwebjs_auth');

let qrCodeBase64 = ''; 
let isReady = false;
let authStatus = 'Iniciando sistema...';

/**
 * FUNCIÓN DE DIAGNÓSTICO: Consulta Google Distance Matrix
 * Obtiene distancia y tiempo estimado considerando tráfico real.
 */
async function getGoogleDistanceMatrix(origin, destination) {
    try {
        if (!GOOGLE_MAPS_KEY) throw new Error('API Key de Google Maps no configurada en el servidor.');

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&traffic_model=best_guess&departure_time=now&key=${GOOGLE_MAPS_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            throw {
                status: response.status,
                message: data.error_message || data.status,
                origin,
                destination
            };
        }

        const element = data.rows[0].elements[0];
        if (element.status !== 'OK') {
            return { distancia: 'N/A', tiempo: 'N/A' };
        }

        return {
            distancia: element.distance.text,
            tiempo: element.duration_in_traffic ? element.duration_in_traffic.text : element.duration.text
        };

    } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[ERROR GOOGLE MAPS API]');
        console.error('ESTADO:', error.status || 'FETCH_ERROR');
        console.error('MENSAJE:', error.message || 'Error desconocido al conectar con Google');
        console.error('ORIGEN INTENTADO:', origin);
        console.error('DESTINO INTENTADO:', destination);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return { distancia: 'N/A', tiempo: 'N/A' };
    }
}

function purgarSesionCorrupta() {
    console.log('[Nova] ⚠️ INICIANDO PURGA NUCLEAR DE SESIÓN...');
    try {
        if (fs.existsSync(AUTH_PATH)) {
            fs.rmSync(AUTH_PATH, { recursive: true, force: true });
            console.log('[Nova] ✅ Carpeta .wwebjs_auth eliminada correctamente.');
        }
    } catch (err) {
        console.error('[Nova] ❌ Error al eliminar carpeta de sesión:', err.message);
    }
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: AUTH_PATH }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    }
});

async function registrarAsientoContable(asiento) {
    try {
        const totalDebito = asiento.movimientos.filter(m => m.tipo === 'debito').reduce((a, b) => a + b.valor, 0);
        const totalCredito = asiento.movimientos.filter(m => m.tipo === 'credito').reduce((a, b) => a + b.valor, 0);
        
        await db.collection('asientos_contables').add({
            ...asiento,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
            totalDebito,
            totalCredito
        });
    } catch (e) {
        console.error('[Nova Contabilidad] Error:', e.message);
    }
}

client.on('message', async (msg) => {
    const contact = await msg.getContact();
    const jid = msg.from;
    const body = msg.body || '';

    await db.collection('conversaciones').add({
        jid,
        cuerpo: body,
        tipo: 'entrante',
        leido: false,
        nombre: contact.pushname || contact.name || jid.split('@')[0],
        fecha: admin.firestore.FieldValue.serverTimestamp()
    });

    if (msg.hasMedia && (body.toLowerCase().includes('pago') || body.toLowerCase().includes('soporte') || body.toLowerCase().includes('transferencia') || body.toLowerCase().includes('comprobante'))) {
        try {
            const transaccionId = 'WA-' + msg.id.id;
            const duplicateCheck = await db.collection('pagos_aplicados').where('numeroTransaccion', '==', transaccionId).limit(1).get();
            if (!duplicateCheck.empty) return;

            const rawPhone = jid.split('@')[0];
            const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
            const servicesSnap = await db.collection('services').where('estadoPago', 'in', ['Pendiente', 'Anticipo']).get();

            let matches = [];
            servicesSnap.forEach(doc => {
                const s = doc.data();
                const sPhone = (s.telefonoCliente || '').replace(/\D/g, '');
                if (sPhone.includes(cleanPhone)) matches.push({ id: doc.id, ...s });
            });

            if (matches.length > 0) {
                matches.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                const targetService = matches[0];
                const valorTotal = Number(targetService.valorServicio) || 0;
                const anticipoActual = Number(targetService.anticipo) || 0;
                const saldoPendiente = Math.max(0, valorTotal - anticipoActual);
                
                await db.collection('services').doc(targetService.id).update({
                    estadoPago: 'Pagado',
                    anticipo: valorTotal,
                    saldo: 0,
                    metodoPago: 'Transferencia'
                });

                await db.collection('pagos_aplicados').add({
                    servicioId: targetService.id,
                    consecutivo: targetService.consecutivo,
                    clienteNombre: targetService.clienteNombre || targetService.cliente,
                    telefonoCliente: targetService.telefonoCliente,
                    valorPago: saldoPendiente,
                    numeroTransaccion: transaccionId,
                    bancoOrigen: 'WHATSAPP-BOT',
                    bancoDestino: 'Transferencia',
                    saldoAnterior: saldoPendiente,
                    saldoNuevo: 0,
                    estadoPago: 'Pagado',
                    fecha: admin.firestore.FieldValue.serverTimestamp()
                });

                await registrarAsientoContable({
                    concepto: `Recaudo Automático Nova (WhatsApp): Servicio ${targetService.consecutivo}`,
                    sourceId: targetService.id,
                    sourceModule: 'pagos',
                    movimientos: [
                        { cuentaCodigo: '1110', cuentaNombre: 'Bancos', tipo: 'debito', valor: saldoPendiente },
                        { cuentaCodigo: '1305', cuentaNombre: 'Cuentas por Cobrar Clientes', tipo: 'credito', valor: saldoPendiente, terceroNombre: targetService.cliente, terceroNit: targetService.nitCliente }
                    ]
                });

                await msg.reply(`✅ *¡PAGO RECIBIDO!* 📝\n\nHe procesado tu soporte para el servicio *${targetService.consecutivo}*.\n\n💰 *Monto:* ${new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', minimumFractionDigits: 0}).format(saldoPendiente)}\n📊 *Estado:* Totalmente Pagado.\n\nEn breve recibirás la confirmación oficial en tu correo. ¡Gracias! ✨`);
            }
        } catch (err) {
            console.error('[Nova] Error en detección de pago:', err);
        }
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
    authStatus = 'Código QR listo. Escanea ahora.';
    console.log('[Nova] Evento QR disparado. Generando base64...');
    try { 
        qrCodeBase64 = await qrcode.toDataURL(qr); 
    } catch(e) { 
        console.error('[Nova] Error generando imagen QR:', e.message); 
    }
});

client.on('ready', () => { 
    isReady = true; 
    qrCodeBase64 = ''; 
    authStatus = 'Conectada y operando.'; 
    console.log('[Nova] Cliente inicializado correctamente.');
});

client.on('auth_failure', (msg) => {
    console.error('[Nova] Fallo de autenticación crítico:', msg);
    authStatus = 'Sesión inválida. Purgando archivos...';
    qrCodeBase64 = '';
    purgarSesionCorrupta();
    setTimeout(() => {
        client.initialize().catch(err => console.error('[Nova] Error post-auth-failure:', err.message));
    }, 5000);
});

client.on('disconnected', (reason) => { 
    isReady = false; 
    authStatus = 'Desconectado: ' + reason; 
    console.log('[Nova] Cliente desconectado. Razón:', reason);
    qrCodeBase64 = '';
    if (reason === 'LOGOUT' || reason === 'NAVIGATION_TIMEOUT') {
        purgarSesionCorrupta();
    }
    setTimeout(() => {
        console.log('[Nova] Re-inicializando cliente tras desconexión...');
        client.initialize().catch(err => console.error('[Nova] Error en re-init:', err.message));
    }, 5000);
});

const checkApiKey = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
    next();
};

app.get('/status', checkApiKey, (req, res) => res.json({ connected: isReady, status: authStatus }));

app.get('/qr', checkApiKey, (req, res) => {
    if (isReady) return res.json({ connected: true });
    if (!qrCodeBase64) {
        return res.status(202).json({ error: 'QR no generado aún. El navegador está cargando.' });
    }
    res.json({ qr: qrCodeBase64 }); 
});

app.post('/restart', checkApiKey, async (req, res) => {
    console.log('[Nova] Solicitud de reinicio profundo recibida.');
    try {
        isReady = false;
        qrCodeBase64 = '';
        authStatus = 'Reiniciando motor...';
        try { await client.logout(); } catch(e) {}
        try { await client.destroy(); } catch(e) {}
        purgarSesionCorrupta();
        client.initialize().catch(err => console.error('[Nova] Fallo en initialize post-restart:', err.message));
        res.json({ success: true, message: 'Reinicio profundo con purga de archivos iniciado.' });
    } catch (error) { 
        console.error('[Nova] Error crítico en /restart:', error.message);
        res.status(500).json({ error: error.message }); 
    }
});

app.post('/send-message', checkApiKey, async (req, res) => {
    const { jid, mensaje } = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no conectada' });
    try { await client.sendMessage(jid, mensaje); res.json({ success: true }); } catch (error) { res.status(500).json({ error: 'Error envío.' }); }
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    const data = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no conectada' });
    try {
        const jid = data.clienteTelefono.includes('@') ? data.clienteTelefono : `${data.clienteTelefono}@c.us`;
        const imageBase64 = await generateServiceCard(data);
        const media = new MessageMedia('image/png', imageBase64, 'servicio.png');
        await client.sendMessage(jid, media);
        const msg = `¡Hola, *${data.clienteNombre}*! 👋 Soy *Nova*.\n\nTu servicio ha sido programado con éxito. Arriba te envío la tarjeta con los detalles. 🚐💨`;
        await client.sendMessage(jid, msg);
        await db.collection('notificaciones_whatsapp').add({ clienteNombre: data.clienteNombre, clienteTelefono: data.clienteTelefono, tipo: 'servicio_programado', mensaje: msg, estado: 'enviado', fecha: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Fallo envío.' }); }
});

/**
 * ENDPOINT: Notificación de Conductor en Camino
 * Incluye cálculo de distancia y tiempo vía Google Maps
 */
app.post('/notify-driver-on-way', checkApiKey, async (req, res) => {
    const { jid, clienteNombre, origen, conductorNombre, placa, conductorLat, conductorLng } = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no conectada' });

    try {
        const conductorPos = `${conductorLat},${conductorLng}`;
        // Obtener datos reales de Google Maps con el nuevo diagnóstico
        const mapsData = await getGoogleDistanceMatrix(conductorPos, origen);

        const mensaje = `🚐 *¡TU CONDUCTOR VA EN CAMINO!* 🏁\n\nHola *${clienteNombre}*, te informamos que *${conductorNombre}* ya se dirige hacia tu ubicación.\n\n📍 *Recogida en:* ${origen}\n🚐 *Vehículo:* ${placa}\n\n━━━━━━━━━━━━━━━━\n📏 *Distancia:* ${mapsData.distancia}\n⏳ *Tiempo Estimado:* ${mapsData.tiempo}\n━━━━━━━━━━━━━━━━\n\n_Nova Assistant - J&J Connect_`;

        await client.sendMessage(jid, mensaje);
        res.json({ success: true, maps: mapsData });
    } catch (error) {
        console.error('[Nova Notify] Error:', error.message);
        res.status(500).json({ error: 'Fallo al enviar notificación de seguimiento.' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[Nova Server] Activo en puerto ${port}. Proyecto: ${admin.app().options.projectId}`);
    client.initialize().then(() => {
        console.log('[Nova] Browser lanzado. Esperando estado...');
    }).catch(err => console.error('[Nova] Error inicial lanzando navegador:', err.message));
});
