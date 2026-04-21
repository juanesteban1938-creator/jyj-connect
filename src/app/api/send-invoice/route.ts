import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { to, nroFactura, pdfBase64, servicioData } = await request.json();

    if (!to || !nroFactura) {
      return NextResponse.json({ message: 'Faltan datos requeridos.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: 'cymeyvdehchdnrrf',
      },
    });

    let mailOptions: any = {
      from: process.env.SMTP_USER,
      to: to,
    };

    if (pdfBase64) {
      // Caso 1: Envío de Cuenta de Cobro con PDF adjunto
      mailOptions.subject = `📄 Cuenta de Cobro ${nroFactura} - Transportes Especial J&J`;
      mailOptions.html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
              <h2 style="color: #000; font-family: 'Poppins', sans-serif;">Estimado(a) cliente, reciba un cordial saludo.</h2>
              <p>¡Hola! Es un gusto saludarte de nuevo.</p>
              <p>En Transportes Especial J&J, creemos que la innovación debe acompañarte desde que abordas nuestro vehículo hasta que recibes tu documentación. Por eso, hemos optimizado nuestro sistema para que gestiones tus servicios de forma digital y sin complicaciones.</p>
              <p>📄 <b>Tu Cuenta de Cobro está lista:</b> Hemos adjuntado el PDF oficial con todos los detalles de tu trayecto. Nuestro compromiso es la transparencia y la agilidad en cada proceso.</p>
              <br>
              <p>Gracias por elegirnos como su aliado en movilidad. Quedamos a su disposición para cualquier consulta adicional.</p>
              <p>Cordialmente,</p>
              <div style="margin-top: 10px;">
                  <p style="margin: 0; font-weight: bold;">Departamento de Operaciones</p>
                  <p style="margin: 0;">Transportes.especialesjyj@gmail.com</p>
                  <p style="margin: 0;">Celular: +57 314 2889955</p>
                  <p style="margin: 0;">Carrera 58 numero 130A-82</p>
              </div>
          </div>
      `;
      mailOptions.attachments = [
          {
              filename: 'Cuenta_de_Cobro_JJ.pdf',
              content: Buffer.from(pdfBase64, 'base64'),
              contentType: 'application/pdf'
          }
      ];
    } else if (servicioData) {
      // Caso 2: Notificación de Pago Confirmado (Sin PDF) - Limpieza de NaN y Undefined
      const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
      const valorLimpio = Number(servicioData.valor) || 0;
      
      mailOptions.subject = `✅ Pago Confirmado - Cuenta de Cobro ${nroFactura}`;
      mailOptions.html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
              <h2 style="color: #000; font-family: 'Poppins', sans-serif;">¡Pago Recibido con Éxito!</h2>
              <p>Hola, <b>${servicioData.cliente || 'estimado cliente'}</b>. Esperamos que se encuentre muy bien.</p>
              <p>Le confirmamos que hemos recibido el pago correspondiente al servicio con número de cuenta de cobro: <b>${nroFactura}</b>.</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px dashed #ddd;">
                  <h3 style="margin-top: 0; color: #F97316;">Resumen del Servicio</h3>
                  <p style="margin: 5px 0;"><b>📅 Fecha:</b> ${servicioData.fecha ? new Date(servicioData.fecha).toLocaleDateString() : 'N/A'}</p>
                  <p style="margin: 5px 0;"><b>📍 Trayecto:</b> ${servicioData.origen || 'No especificado'} ➔ ${servicioData.destino || 'No especificado'}</p>
                  <p style="margin: 5px 0;"><b>💰 Valor Pagado:</b> ${currencyFormatter.format(valorLimpio)}</p>
                  <p style="margin: 5px 0;"><b>🚐 Vehículo/Conductor:</b> ${servicioData.vehiculo || 'Asignado'} / ${servicioData.conductor || 'Asignado'}</p>
              </div>
              <p>Gracias por elegir a <b>Transportes Especiales J&J</b>. Seguiremos trabajando para ofrecerle la mejor experiencia en movilidad.</p>
              <br>
              <p>Atentamente,</p>
              <div style="margin-top: 10px;">
                  <p style="margin: 0; font-weight: bold;">Departamento de Operaciones</p>
                  <p style="margin: 0;">Transportes.especialesjyj@gmail.com</p>
                  <p style="margin: 0;">Celular: +57 314 2889955</p>
                  <p style="margin: 0;">Carrera 58 numero 130A-82</p>
              </div>
          </div>
      `;
    } else {
      return NextResponse.json({ message: 'No se proporcionaron datos suficientes para el envío.' }, { status: 400 });
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: `Correo enviado a ${to}.` });

  } catch (error: any) {
    console.error('Error en /api/send-invoice:', error);
    return NextResponse.json({ message: 'Error: ' + error.message }, { status: 500 });
  }
}
