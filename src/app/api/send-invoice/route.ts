import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const to = formData.get('to') as string;
    const nroFactura = formData.get('nroFactura') as string;
    const pdfFile = formData.get('pdf') as File;

    if (!to || !nroFactura || !pdfFile) {
      return NextResponse.json({ message: 'Faltan datos requeridos.' }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: 'cymeyvdehchdnrrf',
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      subject: `📄 Cuenta de Cobro ${nroFactura} - Transportes Especial J&J`,
      html: `
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
      `,
      attachments: [
          {
              filename: 'Cuenta_de_Cobro_JJ.pdf',
              content: pdfBuffer,
              contentType: 'application/pdf'
          }
      ]
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: `Correo enviado a ${to}.` });

  } catch (error: any) {
    console.error('Error en /api/send-invoice:', error);
    return NextResponse.json({ message: 'Error al enviar el correo: ' + error.message }, { status: 500 });
  }
}
