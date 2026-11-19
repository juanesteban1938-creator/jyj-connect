/**
 * J&J CONNECT - Driver Notification Module
 * Monitorea asignaciones de servicios en tiempo real y gestiona notificaciones manuales.
 */

const admin = require('firebase-admin');

let isListenerActive = false;

/**
 * Envía una notificación de WhatsApp a un conductor específico.
 * @param {Object} sock - Instancia de Baileys WA Socket
 * @param {Object} db - Instancia de Firestore Admin
 * @param {string} serviceId - ID del servicio a notificar
 */
async function sendDriverNotification(sock, db, serviceId) {
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

    // Preparar datos para la plantilla
    const fechaRaw = service.fecha || '';
    const fecha = fechaRaw.includes('T') ? fechaRaw.split('T')[0] : fechaRaw;
    const hora = service.hora || 'Por definir';
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
    await sock.sendMessage(jid, { text: message });
    
    // Actualizar registro en Firestore
    await serviceRef.update({
        driverNotified: true,
        notifiedDriverId: driverId,
        driverNotifiedAt: new Date().toISOString()
    });

    console.log(`[Nova-Asignaciones] 📨 Notificación enviada a ${driverName} (${serviceId})`);
    return { success: true, driver: driverName };
}

/**
 * Inicia el escucha de cambios en la colección de servicios para notificar conductores automáticamente.
 */
async function startDriverAssignmentNotifier(sock, db) {
    if (isListenerActive) return;
    if (!db || !sock) return;
    
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

                if (driverId && status !== 'Cancelado' && status !== 'Finalizado' && notifiedDriverId !== driverId) {
                    try {
                        await sendDriverNotification(sock, db, serviceId);
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
