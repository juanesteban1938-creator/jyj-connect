/**
 * J&J CONNECT V2.0 - WhatsApp Bot Engine (Nova)
 * Empresa: Transportes Especiales J&J
 * Versión: 2.2.1 (Sync Corregido y Resolución de Servicios)
 */

const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const cors = require('cors');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const qrcode = require('qrcode');

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

let qrCodeBase64 = ''; 
let isReady = false;
let authStatus = 'Iniciando...';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

function resolveWAId(number) {
    let clean = number.toString().replace(/\D/g, '');
    if (!clean.startsWith('57')) clean = '57' + clean;
    return `${clean}@c.us`;
}

// Lógica de Procesamiento de Mensajes (Nova Brain)
client.on('message', async (msg) => {
    const contact = await msg.getContact();
    const jid = msg.from;
    const body = msg.body || '';

    // 1. Guardar en conversaciones para la Bandeja Nova
    await db.collection('conversaciones').add({
        jid,
        cuerpo: body,
        tipo: 'entrante',
        leido: false,
        nombre: contact.pushname || contact.name || jid.split('@')[0],
        fecha: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Identificar Soporte de Pago
    if (msg.hasMedia && (body.toLowerCase().includes('pago') || body.toLowerCase().includes('soporte') || body.toLowerCase().includes('transferencia') || body.toLowerCase().includes('comprobante'))) {
        try {
            // Buscamos un servicio programado o en anticipo para este número
            const rawPhone = jid.split('@')[0];
            const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
            
            // Consultar todos los servicios pendientes de este cliente
            const servicesSnap = await db.collection('services')
                .where('estadoPago', 'in', ['Pendiente', 'Anticipo', 'Pending'])
                .get();

            let matches = [];
            servicesSnap.forEach(doc => {
                const s = doc.data();
                const sPhone = (s.telefonoCliente || '').replace(/\D/g, '');
                if (sPhone.includes(cleanPhone)) {
                    matches.push({ id: doc.id, ...s });
                }
            });

            // Priorizar el servicio más reciente si hay varios
            if (matches.length > 0) {
                // Ordenar por fecha descendente
                matches.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                const targetService = matches[0];

                const valorTotal = Number(targetService.valorServicio) || 0;
                const anticipoActual = Number(targetService.anticipo) || 0;
                const saldoPendiente = Math.max(0, valorTotal - anticipoActual);
                
                // Actualizar Servicio en Firestore (Sincronización Total)
                await db.collection('services').doc(targetService.id).update({
                    estadoPago: 'Pagado',
                    anticipo: valorTotal,
                    saldo: 0,
                    metodoPago: 'Transferencia'
                });

                // REGISTRO Auditoría de Pagos
                await db.collection('pagos_aplicados').add({
                    servicioId: targetService.id,
                    consecutivo: targetService.consecutivo,
                    clienteNombre: targetService.clienteNombre || targetService.cliente,
                    telefonoCliente: targetService.telefonoCliente,
                    valorPago: saldoPendiente,
                    numeroTransaccion: 'WA-' + msg.id.id,
                    bancoOrigen: 'WHATSAPP-BOT',
                    bancoDestino: 'Transferencia',
                    saldoAnterior: saldoPendiente,
                    saldoNuevo: 0,
                    estadoPago: 'Pagado',
                    fecha: admin.firestore.FieldValue.serverTimestamp()
                });

                // Registrar para envío de correo
                if (targetService.emailCliente) {
                    await db.collection('pagos_pendientes_correo').add({
                        servicioId: targetService.id,
                        emailCliente: targetService.emailCliente,
                        consecutivo: targetService.consecutivo,
                        clienteNombre: targetService.clienteNombre || targetService.cliente,
                        valorPago: saldoPendiente,
                        pendiente: true,
                        fecha: admin.firestore.FieldValue.serverTimestamp()
                    });
                }

                await msg.reply(`✅ *¡PAGO REGISTRADO!* 📝\n\nHola, he procesado tu soporte para el servicio *${targetService.consecutivo}*.\n\n💰 *Monto Aplicado:* ${new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', minimumFractionDigits: 0}).format(saldoPendiente)}\n📊 *Estado:* Totalmente Pagado.\n\nEn breve recibirás la confirmación oficial en tu correo. ¡Gracias por tu puntualidad! ✨`);
            }
        } catch (err) {
            console.error('[Nova] Error procesando pago WA:', err);
        }
    }
});

async function generateServiceCard(data) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        const htmlContent = `
        <html>
        <head>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Poppins', sans-serif; margin: 0; background: #fff; width: 600px; height: 800px; }
                .card { width: 560px; height: 760px; margin: 20px; border-radius: 30px; background: #1a1a1a; color: white; position: relative; overflow: hidden; }
                .header { background: #f97316; padding: 40px; text-align: center; }
                .logo { font-size: 32px; font-weight: bold; letter-spacing: 2px; }
                .content { padding: 40px; }
                .info-box { background: #333; padding: 20px; border-radius: 20px; margin-bottom: 20px; }
                .label { color: #f97316; font-size: 14px; text-transform: uppercase; font-weight: bold; }
                .value { font-size: 20px; margin-top: 5px; }
                .footer { position: absolute; bottom: 40px; width: 100%; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <div class="logo">J&J CONNECT</div>
                    <div style="font-size: 14px; opacity: 0.8;">PROGRAMACIÓN DE SERVICIO</div>
                </div>
                <div class="content">
                    <div class="info-box">
                        <div class="label">🗓️ Fecha y Hora</div>
                        <div class="value">${data.fecha} - ${data.hora}</div>
                    </div>
                    <div class="info-box">
                        <div class="label">📍 Origen</div>
                        <div class="value">${data.origen}</div>
                    </div>
                    <div class="info-box">
                        <div class="label">🏁 Destino</div>
                        <div class="value">${data.destino}</div>
                    </div>
                    <div class="info-box">
                        <div class="label">🚐 Vehículo y Conductor</div>
                        <div class="value">Placa: ${data.placa} / ${data.conductor}</div>
                    </div>
                </div>
                <div class="footer">Nova Assistant - Transportes Especiales J&J</div>
            </div>
        </body>
        </html>
        `;

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
    try {
        qrCodeBase64 = await qrcode.toDataURL(qr);
    } catch(e) {
        console.error('[Nova] Error QR:', e.message);
    }
});

client.on('ready', () => {
    isReady = true;
    qrCodeBase64 = '';
    authStatus = 'Listo para operar.';
    console.log('[Nova] Sistema sincronizado con Firestore:', admin.app().options.projectId);
});

client.on('disconnected', (reason) => {
    isReady = false;
    authStatus = 'Desconectado.';
    client.initialize().catch(console.error);
});

const checkApiKey = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
    next();
};

app.get('/status', checkApiKey, (req, res) => {
    res.json({ connected: isReady, status: authStatus });
});

app.get('/qr', checkApiKey, (req, res) => {
    if (isReady) return res.json({ connected: true });
    if (!qrCodeBase64) return res.status(404).json({ error: 'QR no generado' });
    res.json({ qr: qrCodeBase64 }); 
});

app.post('/restart', checkApiKey, async (req, res) => {
    try {
        await client.logout();
        await client.destroy();
        isReady = false;
        qrCodeBase64 = '';
        authStatus = 'Reiniciando...';
        client.initialize();
        res.json({ success: true, message: 'Reinicio iniciado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-message', checkApiKey, async (req, res) => {
    const { jid, mensaje } = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no está conectada' });

    try {
        await client.sendMessage(jid, mensaje);
        res.json({ success: true });
    } catch (error) {
        console.error('[Nova] Error al enviar mensaje:', error.message);
        res.status(500).json({ error: 'Fallo al enviar mensaje.' });
    }
});

app.post('/send-file', checkApiKey, async (req, res) => {
    const { jid, fileBase64, fileName, mimeType } = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no está conectada' });

    try {
        const media = new MessageMedia(mimeType, fileBase64, fileName);
        await client.sendMessage(jid, media);
        res.json({ success: true });
    } catch (error) {
        console.error('[Nova] Error al enviar archivo:', error.message);
        res.status(500).json({ error: 'Fallo al enviar archivo.' });
    }
});

app.post('/send-service-notification', checkApiKey, async (req, res) => {
    const data = req.body;
    if (!isReady) return res.status(503).json({ error: 'Nova no está conectada' });

    try {
        const jid = resolveWAId(data.clienteTelefono);
        const imageBase64 = await generateServiceCard(data);
        const media = new MessageMedia('image/png', imageBase64, 'servicio.png');

        await client.sendMessage(jid, media);
        const msg = `¡Hola, *${data.clienteNombre}*! 👋 Soy *Nova*, asistente de *Transportes Especiales J&J*.\n\nTu servicio ha sido programado con éxito. Arriba te envío la tarjeta con los detalles. 🚐💨`;
        await client.sendMessage(jid, msg);

        await db.collection('notificaciones_whatsapp').add({
          clienteNombre: data.clienteNombre,
          clienteTelefono: data.clienteTelefono,
          tipo: 'servicio_programado',
          mensaje: msg,
          estado: 'enviado',
          fecha: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[Nova] Error de envío:', error);
        res.status(500).json({ error: 'Fallo al enviar notificación.' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`[Nova Server] Sincronizado con: ${admin.app().options.projectId}`);
    client.initialize().catch(err => console.error('[Nova] Error de inicialización:', err));
});
