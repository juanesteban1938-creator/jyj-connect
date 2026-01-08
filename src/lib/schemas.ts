import { z } from 'zod';

// Esquema para send-invoice-flow
export const SendInvoiceInputSchema = z.object({
  to: z.string().email(),
  nroFactura: z.string(),
  pdfBuffer: z.instanceof(Buffer),
});
export type SendInvoiceInput = z.infer<typeof SendInvoiceInputSchema>;

export const SendInvoiceOutputSchema = z.object({ success: z.boolean(), message: z.string() });
export type SendInvoiceOutput = z.infer<typeof SendInvoiceOutputSchema>;


// Esquema para send-test-email
export const SendTestEmailOutputSchema = z.object({ success: z.boolean(), message: z.string() });
export type SendTestEmailOutput = z.infer<typeof SendTestEmailOutputSchema>;
