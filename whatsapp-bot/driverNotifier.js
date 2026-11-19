/**
 * J&J CONNECT - Driver Notification Module
 * Monitorea asignaciones de servicios en tiempo real y notifica vía WhatsApp.
 */

const admin = require('firebase-admin');

let isListenerActive = false;

/**
 * Inicia el escucha de cambios en la colección de servicios para notificar conductores.
 * @param {Object} sock - Instancia de Baileys WA Socket
 * @param {Object} db - Instancia de Firestore Admin
 */
async function startDriverAssignmentNotifier(sock, db) {
    if (isListenerActive) return;
    if (!db || !sock) return;
    
    isListenerActive = true;
    console.log('[Nova-Asignaciones] ✅ Escuchando nuevos servicios en tiempo real...');

    let isInitialLoad = true;
    const servicesRef = db.collection('services');

    // Listener en tiempo real
    servicesRef.onSnapshot(snapshot => {
        // Ignorar carga inicial de documentos existentes para evitar spam al reiniciar el servidor
        if (isInitialLoad) {
            isInitialLoad = false;
            return;
        }

        snapshot.docChanges().forEach(async (change) => {
            // Solo procesar si el documento es nuevo o fue modificado
            if (change.type === 'added' || change.type === 'modified') {
                const service = change.doc.data();
                const serviceId = change.doc.id;

                const driverId = service.conductorId;
                const notifiedDriverId = service.notifiedDriverId;
                const status = service.estado;

                /**
                 * REGLAS DE DISPARO:
                 * 1. Debe tener un conductor asignado.
                 * 2. No debe estar cancelado ni finalizado.
                 * 3. El conductor asignado no debe ser el mismo que ya fue notificado (evita duplicados).
                 */
                if (driverId && status !== 'Cancelado' && status !== 'Finalizado' && notifiedDriverId !== driverId) {
                    try {
                        const driverName = service.conductor || 'Conductor';
                        const driverPhoneRaw = service.conductorTelefono;
                        
                        if (!driverPhoneRaw) {
                            console.warn(`[Nova-Asignaciones] ⚠️ No se pudo notificar a ${driverName}: Falta teléfono.`);
                            return;
                        }

                        // Formatear JID de WhatsApp (Colombia)
                        let cleanPhone = driverPhoneRaw.replace(/\D/g, '');
                        if (cleanPhone.length === 10) cleanPhone = '57' + cleanPhone;
                        const jid = `${cleanPhone}@s.whatsapp.net`;

                        // Limpiar formatos de datos
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
                        
                        // Actualizar bandera de notificación en Firestore para evitar re-envíos
                        await servicesRef.doc(serviceId).update({
                            driverNotified: true,
                            notifiedDriverId: driverId,
                            driverNotifiedAt: new Date().toISOString()
                        });

                        console.log(`[Nova-Asignaciones] 📨 Notificación enviada a ${driverName} para el servicio ${service.consecutivo || serviceId}`);

                    } catch (error) {
                        console.error('[Nova-Asignaciones] ❌ Error procesando notificación:', error.message);
                    }
                }
            }
        });
    }, error => {
        console.error('[Nova-Asignaciones] ❌ Fallo crítico en el listener de Firestore:', error.message);
    });
}

module.exports = { startDriverAssignmentNotifier };
