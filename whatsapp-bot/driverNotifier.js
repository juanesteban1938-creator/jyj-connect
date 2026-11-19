/**
 * J&J CONNECT - Driver Notification Module
 * Monitorea asignaciones de servicios en tiempo real y gestiona notificaciones manuales.
 * Versión: Fix Anti-Colisión, Cifrado Atómico y Mutex de Envío
 */

const admin = require('firebase-admin');

let isListenerActive = false;
const sendingLock = new Map(); // Mapa de bloqueos: serviceId -> timestamp

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
 * Envía una notificación de WhatsApp a un conductor específico.
 * @param {Function} getSock - Función que retorna la instancia activa de Baileys
 * @param {Object} db - Instancia de Firestore Admin
 * @param {string} serviceId - ID del servicio a notificar
 * @param {Map} msgRetryCache - Mapa compartido para persistencia de cifrado
 */
async function sendDriverNotification(getSock, db, serviceId, msgRetryCache) {
    const sock = getSock();
    if (!db || !sock) throw new Error('Servicios de motor no disponibles');

    const serviceRef = db.collection('services').doc(serviceId);
    const doc = await serviceRef.get();

    if (!doc.exists) throw new Error('El servicio no existe en la base de datos');

    const service = doc.data();
    const driverId = service.conductorId;
    const driverName = service.conductor || 'Conductor';
    const driverPhoneRaw = service.conductorTelefono;

    if (!driverId || !driverPhoneRaw) {
        throw new Error('El servicio no tiene un conductor asignado con teléfono válido');
    }

    // Formatear JID de WhatsApp (Colombia)
    let cleanPhone = driverPhoneRaw.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '57' + cleanPhone;
    const jid = `${cleanPhone}@s.whatsapp.net`;

    // ── SISTEMA DE BLOQUEO (MUTEX) ──
    const lockKey = `${serviceId}-${jid}`;
    const now = Date.now();
    if (sendingLock.has(lockKey)) {
        const lastSend = sendingLock.get(lockKey);
        if (now - lastSend < 15000) { // Bloqueo de 15 segundos
            console.log(`[Nova-Conductores] ⏳ Envío omitido por cooldown: ${driverName} (${serviceId})`);
            return { success: true, status: 'locked' };
        }
    }
    sendingLock.set(lockKey, now);

    // FIX: Validar disponibilidad en WhatsApp y calentar llaves de cifrado
    const [waCheck] = await sock.onWhatsApp(jid);
    const targetJid = waCheck?.exists ? waCheck.jid : jid;

    // Preparar datos para la plantilla
    const fechaRaw = service.fecha || '';
    const fecha = fechaRaw.includes('T') ? fechaRaw.split('T')[0] : fechaRaw;
    const horaRaw = service.hora || 'Por definir';
    const hora = formatTime12h(horaRaw);
    
    const clienteNombre = service.clienteNombre || service.cliente || 'Por definir';
    const clienteTelefono = service.telefonoCliente || 'No suministrado';
    const origen = service.origen || 'Consultar Panel';
    const destino = service.destino || 'Consultar Panel';
    
    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(origen)}&navigate=yes`;

    const message = `🚐 *ASIGNACIÓN DE SERVICIO — TRANSPORTES ESPECIALES J&J*

Hola *${driverName}*, soy *Nova*, tu asistente virtual de *Transportes Especiales J&J*. Te informo que se te ha asignado un nuevo servicio:

📅 *Fecha:* ${fecha}
⏰ *Hora de recogida:* ${hora}

👤 *Cliente:* ${clienteNombre}
📞 *Teléfono:* ${clienteTelefono}

📍 *Punto de recogida:* ${origen}
🚗 *Abrir ruta en Waze:* ${wazeUrl}

🏁 *Destino:* ${destino}

✨ Recuerda estar en el punto de recogida al menos *5 minutos antes* de la hora programada y asegurarte de que el vehículo se encuentre limpio y en óptimas condiciones para prestar un excelente servicio.

Por favor confirma de recibido. ¡Buen viaje!`;

    // Enviar mensaje vía Baileys
    const sent = await sock.sendMessage(targetJid, { text: message });
    
    // FIX CIFRADO: Guardar inmediatamente en caché de reintentos
    if (sent && msgRetryCache) {
        msgRetryCache.set(sent.key.id, sent.message);
    }
    
    // Actualizar registro en Firestore
    await serviceRef.update({
        driverNotified: true,
        notifiedDriverId: driverId,
        driverNotifiedAt: new Date().toISOString()
    });

    console.log(`[Nova-Conductores] 📨 Notificación enviada exitosamente a ${driverName} (${serviceId})`);
    
    // Limpiar bloqueo después de 15s
    setTimeout(() => sendingLock.delete(lockKey), 15000);

    return { success: true, driver: driverName };
}

/**
 * Inicia el escucha de cambios en la colección de servicios para notificar conductores automáticamente.
 */
async function startDriverAssignmentNotifier(getSock, db, msgRetryCache) {
    if (isListenerActive) return;
    if (!db || !getSock) return;
    
    isListenerActive = true;
    console.log('[Nova-Asignaciones] ✅ Escuchando nuevos servicios en tiempo real...');

    let isInitialLoad = true;
    const servicesRef = db.collection('services');

    servicesRef.onSnapshot(snapshot => {
        if (isInitialLoad) {
            isInitialLoad = false;
            return;
        }

        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const service = change.doc.data();
                const serviceId = change.doc.id;

                const driverId = service.conductorId;
                const notifiedDriverId = service.notifiedDriverId;
                const status = service.estado;

                // Solo si el conductor ha cambiado o es nuevo y no está finalizado/cancelado
                if (driverId && status !== 'Cancelado' && status !== 'Finalizado' && notifiedDriverId !== driverId) {
                    try {
                        await sendDriverNotification(getSock, db, serviceId, msgRetryCache);
                    } catch (error) {
                        console.error('[Nova-Asignaciones] ❌ Error en notificación automática:', error.message);
                    }
                }
            }
        });
    }, error => {
        console.error('[Nova-Asignaciones] ❌ Fallo en el listener de Firestore:', error.message);
    });
}

module.exports = { startDriverAssignmentNotifier, sendDriverNotification };
