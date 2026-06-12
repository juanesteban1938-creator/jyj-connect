'use server';
/**
 * @fileOverview Flujo de IA para la generación de informes de junta directiva.
 * 
 * - generarInformeGerencial: Genera un análisis ejecutivo basado en métricas contables.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const InformeGerencialInputSchema = z.object({
  mes: z.string(),
  anio: z.string(),
  ingresos: z.number(),
  egresos: z.number(),
  utilidad: z.number(),
});

export type InformeGerencialInput = z.infer<typeof InformeGerencialInputSchema>;

const InformeGerencialOutputSchema = z.object({
  informe: z.string().describe('El texto del informe ejecutivo redactado en 3 párrafos.'),
});

export type InformeGerencialOutput = z.infer<typeof InformeGerencialOutputSchema>;

export async function generarInformeGerencial(input: InformeGerencialInput): Promise<InformeGerencialOutput> {
  return generarInformeGerencialFlow(input);
}

const prompt = ai.definePrompt({
  name: 'informeGerencialPrompt',
  input: { schema: InformeGerencialInputSchema },
  output: { schema: InformeGerencialOutputSchema },
  prompt: `Eres el Director Financiero de Transportes Especiales J&J. Tu tarea es redactar un "Informe de Desempeño para la Junta Directiva" correspondiente a {{mes}} {{anio}}.

Utiliza los siguientes datos financieros reales:
- Ingresos Totales: ${{ingresos}} COP
- Egresos Totales (Costos + Gastos): ${{egresos}} COP
- Utilidad Neta: ${{utilidad}} COP

Instrucciones de Redacción:
1. Párrafo 1: Resumen del estado financiero actual, analizando la relación ingresos/egresos y el margen de utilidad.
2. Párrafo 2: Análisis operativo y logístico. Menciona la importancia de la eficiencia en el transporte especial de pasajeros.
3. Párrafo 3: Tres recomendaciones estratégicas concretas para el próximo mes (financieras o logísticas).

Tono: Estrictamente formal, profesional, corporativo y sobrio. No uses emojis. Usa fuentes de autoridad.`,
});

const generarInformeGerencialFlow = ai.defineFlow(
  {
    name: 'generarInformeGerencialFlow',
    inputSchema: InformeGerencialInputSchema,
    outputSchema: InformeGerencialOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
