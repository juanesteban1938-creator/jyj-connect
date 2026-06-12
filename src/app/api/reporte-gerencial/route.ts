import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export const dynamic = 'force-dynamic';

/**
 * @fileOverview Endpoint de servidor para la generación de informes gerenciales.
 * Centraliza la lógica de IA en el backend para evitar bloqueos de CORS.
 */

export async function POST(request: Request) {
  // 1. Inyección de Console Log de validación (Debug solicitado)
  console.log("🔍 ESTADO DE LA LLAVE GEMINI:", process.env.GEMINI_API_KEY ? "CARGADA ✅" : "VACÍA ❌", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 7) + "..." : "");

  // 2. Validación estricta solicitada: Retorno 500 si la variable no existe en el entorno
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Error interno: La variable GEMINI_API_KEY no se está leyendo en el servidor." },
      { status: 500 }
    );
  }

  try {
    const input = await request.json();
    const { mes, anio, ingresos, egresos, utilidad } = input;

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
