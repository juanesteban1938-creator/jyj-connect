/**
 * SCRIPT DE DIAGNÓSTICO AISLADO PARA GOOGLE MAPS API
 * Propósito: Verificar el estado de la llave y la respuesta de Google Cloud.
 * Ejecución: node test-maps.js
 */

require('dotenv').config();

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function runDiagnostic() {
    console.log('\n=========================================');
    console.log('🔎 NOVA - DIAGNÓSTICO GOOGLE MAPS');
    console.log('=========================================\n');

    if (!API_KEY) {
        console.error('❌ ERROR CRÍTICO: No se detectó GOOGLE_MAPS_API_KEY.');
        console.log('Asegúrate de tener un archivo .env en esta carpeta o las variables configuradas en el entorno.\n');
        return;
    }

    // Datos de prueba realistas en Bogotá para validar la API
    const origen = 'Calle 100 # 15-20, Bogotá, Colombia';
    const destino = 'Aeropuerto El Dorado, Bogotá, Colombia';

    console.log('📤 Enviando Petición de Prueba a Distance Matrix API...');
    console.log(`📍 Origen: ${origen}`);
    console.log(`🏁 Destino: ${destino}\n`);

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origen)}&destinations=${encodeURIComponent(destino)}&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log('-----------------------------------------');
        console.log('📦 RESPUESTA INTEGRAL DEL SERVIDOR:');
        console.log(JSON.stringify(data, null, 2));
        console.log('-----------------------------------------\n');

        // Análisis Lógico de Resultados y Veredicto
        if (data.status === 'OK') {
            const element = data.rows[0].elements[0];
            
            if (element.status === 'OK') {
                console.log('✅ VEREDICTO: ¡LA API FUNCIONA CORRECTAMENTE!');
                console.log(`📊 Datos obtenidos: ${element.distance.text} en ${element.duration.text}.`);
            } else if (element.status === 'ZERO_RESULTS') {
                console.log('⚠️ VEREDICTO: API ACTIVA pero NO encontró ruta.');
                console.log('Causa: Puede que las direcciones sean demasiado ambiguas o no haya conexión vial terrestre.');
            } else {
                console.log(`❌ VEREDICTO: FALLO INTERNO DE RUTA - ${element.status}`);
            }
        } else if (data.status === 'REQUEST_DENIED') {
            console.log('❌ VEREDICTO: ACCESO DENEGADO (Request Denied).');
            console.log(`🛑 Mensaje de Google: "${data.error_message || 'Sin descripción'}"`);
            console.log('\nAcciones sugeridas:');
            console.log('1. Revisa si "Distance Matrix API" está HABILITADA en Google Cloud Console.');
            console.log('2. Verifica si la cuenta tiene un método de pago (Billing) activo.');
            console.log('3. Revisa si la API Key tiene restricciones de IP que bloqueen el origen (Railway).');
        } else if (data.status === 'OVER_QUERY_LIMIT') {
            console.log('❌ VEREDICTO: LÍMITE DE CUOTA ALCANZADO (Quota Exceeded).');
        } else {
            console.log(`❌ VEREDICTO: ERROR DE RESPUESTA - ${data.status}`);
        }

    } catch (error) {
        console.error('❌ ERROR FATAL DE RED:');
        console.error(error.message);
        console.log('\nNota: Este script requiere Node.js 18 o superior para usar fetch nativo.');
    }

    console.log('\n=========================================');
}

runDiagnostic();
