import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export const dynamic = 'force-dynamic';

/**
 * @fileOverview Endpoint de servidor para la generación de informes gerenciales.
 * Centraliza la lógica de IA en el backend para evitar bloqueos de CORS.
 */

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const { mes, anio, ingresos, egresos, utilidad } = input;

    // Validación de seguridad de credenciales en el servidor
    // Genkit busca automáticamente GOOGLE_GENAI_API_KEY o GEMINI_API_KEY
    if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      console.error('[API Reporte] Error: No se encontró la llave de API en las variables de entorno.');
      return NextResponse.json(
        { error: 'La llave de API de Google (GEMINI_API_KEY) no está configurada en el servidor.' },
        { status: 501 }
      );
    }

    // Ejecución de la IA a través de Genkit (Server Side)
    const response = await ai.generate({
      prompt: `Eres el Director Financiero de Transportes Especiales J&J. Tu tarea es redactar un "Informe de Desempeño para la Junta Directiva" correspondiente a ${mes} ${anio}.

Utiliza los siguientes datos financieros reales del mes:
- Ingresos Totales: \$${ingresos} COP
- Egresos Totales (Costos + Gastos): \$${egresos} COP
- Utilidad Neta: \$${utilidad} COP

Instrucciones de Redacción:
1. Párrafo 1: Resumen del estado financiero actual, analizando la relación ingresos/egresos y el margen de utilidad obtenido.
2. Párrafo 2: Análisis operativo y logístico. Menciona la importancia de la eficiencia operativa en el transporte especial de pasajeros.
3. Párrafo 3: Tres recomendaciones estratégicas concretas para el próximo mes (enfoque financiero o logístico).

Tono: Estrictamente formal, profesional, corporativo y sobrio. No uses emojis. Usa fuentes de autoridad.`,
    });

    if (!response.text) {
      throw new Error('La IA no devolvió contenido.');
    }

    return NextResponse.json({ informe: response.text });
  } catch (error: any) {
    console.error('Error en /api/reporte-gerencial:', error);
    
    // Captura específica de error de llave inválida para guiar al usuario
    if (error.message?.includes('API key not valid')) {
      return NextResponse.json(
        { error: 'La llave de API (GEMINI_API_KEY) proporcionada no es válida o ha expirado.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Fallo al conectar con Nova AI: ' + (error.message || 'Error desconocido') },
      { status: 500 }
    );
  }
}
