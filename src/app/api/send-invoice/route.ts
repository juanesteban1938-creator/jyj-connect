import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API ROUTE: Envío de correos a través del Puente Railway.
 */
export async function POST(request: Request) {
  let input;
  try {
    const rawBody = await request.text();
    input = rawBody.trim() ? JSON.parse(rawBody) : null;
    if (!input) throw new Error("Cuerpo vacío");
  } catch (e) {
    return NextResponse.json({ message: 'Error: Petición JSON malformada.' }, { status: 400 });
  }

  try {
    const { to, nroFactura, pdfBase64, servicioData } = input;

    if (!to || !nroFactura) {
      return NextResponse.json({ message: 'Faltan datos requeridos.' }, { status: 400 });
    }

    const bridgeUrl = process.env.RAILWAY_BOT_URL || 'https://focused-harmony-production.up.railway.app';
    const apiKey = process.env.RAILWAY_API_KEY || 'jj-connect-2026';

    let subject = '';
    let html = '';
    let attachments: any[] = [];

    if (pdfBase64) {
      subject = `📄 Cuenta de Cobro ${nroFactura} - Transportes Especial J&J`;
      html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
              <h2 style="color: #000; font-family: 'Poppins', sans-serif;">Estimado(a) cliente, reciba un cordial saludo.</h2>
              <p>📄 <b>Tu Cuenta de Cobro está lista:</b> Hemos adjuntado el PDF oficial con todos los detalles de tu trayecto.</p>
              <br>
              <p>Cordialmente,</p>
              <p><strong>Departamento de Operaciones</strong></p>
          </div>
      `;
      attachments = [
          {
              filename: `Cuenta_de_Cobro_${nroFactura}.pdf`,
              content: pdfBase64,
              encoding: 'base64',
              contentType: 'application/pdf'
          }
      ];
    } else if (servicioData) {
      subject = `✅ Pago Confirmado - Cuenta de Cobro ${nroFactura}`;
      const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
      html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
              <h2 style="color: #000;">¡Pago Recibido con Éxito!</h2>
              <p>Confirmamos el pago de la cuenta <b>${nroFactura}</b> por valor de ${currencyFormatter.format(Number(servicioData.valor) || 0)}.</p>
          </div>
      `;
    }

    const response = await fetch(`${bridgeUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ to, subject, html, attachments })
    });

    const responseText = await response.text();
    let responseData;
    
    try {
        responseData = responseText.trim() ? JSON.parse(responseText) : null;
        if (!responseData) throw new Error("Respuesta vacía del puente");
    } catch (e) {
        throw new Error(`El servidor de Railway devolvió una respuesta inesperada. Detalle: ${responseText.substring(0, 50)}...`);
    }

    if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Error reportado por el puente de correo');
    }

    return NextResponse.json({ success: true, message: `Correo procesado para ${to}.` });

  } catch (error: any) {
    console.error('Error en /api/send-invoice:', error);
    return NextResponse.json({ message: 'Error: ' + error.message }, { status: 500 });
  }
}
