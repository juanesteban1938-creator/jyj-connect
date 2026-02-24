'use client';

import type { Servicio } from "@/app/dashboard/servicios/page";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Printer, Mail } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import QRCode from 'qrcode';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Props = {
    servicio: Servicio;
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export function CuentaCobro({ servicio }: Props) {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isSending, setIsSending] = useState(false);
    const printableAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (servicio && servicio.consecutivo) {
            QRCode.toDataURL(`Validación VIANOVA: ${servicio.consecutivo}`, { 
                errorCorrectionLevel: 'H', 
                width: 100, 
                margin: 1 
            }, function (err, url) {
                if (err) console.error(err)
                setQrCodeUrl(url);
            })
        }
    }, [servicio]);
    
    const handlePrint = () => {
        const printContent = printableAreaRef.current;
        if (printContent) {
            const newWindow = window.open('', '_blank');
            if(newWindow) {
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>Cuenta de Cobro ${servicio.consecutivo}</title>
                            <script src="https://cdn.tailwindcss.com"><\/script>
                            <style>
                                @media print {
                                    @page { size: letter; margin: 0; }
                                    body { -webkit-print-color-adjust: exact; background-color: white !important; margin: 0; padding: 0; }
                                    .page { 
                                        margin: 0 !important; 
                                        padding: 48px 64px !important; 
                                        box-shadow: none !important; 
                                        width: 100% !important; 
                                        max-width: none !important; 
                                        min-height: 0 !important; 
                                        transform: scale(0.95);
                                        transform-origin: top center;
                                    }
                                    .no-print { display: none !important; }
                                    section { page-break-inside: avoid; }
                                }
                                body { font-family: 'Arial', sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px 0; }
                            </style>
                        </head>
                        <body>
                            <div class="flex justify-center">
                                ${printContent.outerHTML}
                            </div>
                             <script>
                                window.onload = function() {
                                    window.print();
                                    setTimeout(function() { window.close(); }, 500);
                                }
                            <\/script>
                        </body>
                    </html>
                `);
                newWindow.document.close();
            }
        }
    }

    const handleSendEmail = async () => {
        if (!servicio.emailCliente) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'El cliente no tiene un correo electrónico registrado.',
            });
            return;
        }

        const input = printableAreaRef.current;
        if (!input) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo generar el contenido de la factura.',
            });
            return;
        }
        
        setIsSending(true);

        try {
            const canvas = await html2canvas(input, { scale: 2 });
            const pdf = new jsPDF('p', 'mm', 'letter');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 0;
            pdf.addImage(canvas, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            
            const pdfBlob = pdf.output('blob');
            
            const formData = new FormData();
            formData.append('to', servicio.emailCliente);
            formData.append('nroFactura', servicio.consecutivo);
            formData.append('pdf', pdfBlob, 'Cuenta_de_Cobro_JJ.pdf');

            const response = await fetch('/api/send-invoice', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                toast({
                    title: '¡Correo Enviado!',
                    description: `La cuenta de cobro ha sido enviada a ${servicio.emailCliente}.`,
                });
            } else {
                 const result = await response.json();
                 toast({
                    variant: 'destructive',
                    title: 'Error al Enviar',
                    description: result.message || 'Ocurrió un error en el servidor.',
                });
            }
        } catch (error: any) {
            console.error("Error generating or sending PDF:", error);
            toast({
                variant: 'destructive',
                title: 'Error Inesperado',
                description: error.message || 'Ocurrió un problema al generar o enviar el PDF.',
            });
        } finally {
            setIsSending(false);
        }
    }
    
    let fecha;
    try {
        fecha = new Date(servicio.fecha);
    } catch(e) {
        fecha = new Date();
    }

    const placaVehiculo = servicio.vehiculo.split('•')[1]?.trim() || servicio.vehiculo;
    
    return (
        <div className="p-4 bg-[#f0f0f0] rounded-lg">
            <ScrollArea className="h-[85vh] w-full border rounded-md">
                <div 
                    ref={printableAreaRef} 
                    id="printable-area" 
                    className="page bg-white text-black text-[12px] font-sans mx-auto"
                    style={{ 
                        width: '100%',
                        maxWidth: '816px', 
                        minHeight: '1056px',
                        margin: '32px auto',
                        padding: '48px 64px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* HEADER — dos columnas */}
                    <section className="flex justify-between items-start mb-5" style={{ pageBreakInside: 'avoid' }}>
                        <div className="flex items-center gap-4">
                            <Image 
                                src="https://i.ibb.co/zhzhTrvV/logo-cxc.png" 
                                alt="Logo Vianova" 
                                width={120} 
                                height={68} 
                                className="object-contain"
                                style={{ height: '68px', width: 'auto' }}
                            />
                            {qrCodeUrl && (
                                <Image 
                                    src={qrCodeUrl} 
                                    alt="QR Empresa" 
                                    width={68} 
                                    height={68} 
                                    className="object-contain border border-gray-200"
                                />
                            )}
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg">CUENTA DE COBRO No: {servicio.consecutivo}</p>
                            <p className="font-medium text-base">{format(fecha, 'dd/MM/yyyy')}</p>
                        </div>
                    </section>

                    {/* DATOS DEL CLIENTE — centrado */}
                    <section className="text-center mb-6" style={{ pageBreakInside: 'avoid' }}>
                        <h1 
                            style={{ fontSize: '18px', letterSpacing: '3px', marginBottom: '4px' }} 
                            className="font-bold uppercase leading-tight"
                        >
                            {servicio.cliente}
                        </h1>
                        <p style={{ marginTop: '3px', fontSize: '14px' }} className="font-bold">
                            NIT {servicio.nitCliente}
                        </p>
                        <p style={{ marginTop: '2px', fontSize: '14px' }} className="text-gray-700">
                            {servicio.emailCliente}
                        </p>
                    </section>

                    {/* SECCIÓN PRESTADOR (JUAN ESTEBAN) — tabla con bordes grises */}
                    <section className="mb-5" style={{ pageBreakInside: 'avoid' }}>
                        <p className="font-bold mb-1">Prestado a</p>
                        <table className="w-full border-collapse border border-[#999]">
                            <tbody>
                                <tr>
                                    <td className="border border-[#999] p-3 font-medium">Cliente: Juan Esteban Ovalle Pineda</td>
                                    <td className="border border-[#999] p-3 text-right">1.023.940.641</td>
                                </tr>
                                <tr>
                                    <td className="border border-[#999] p-3">DIRECCION: CALLE 34 B SUR # 3A-16</td>
                                    <td className="border border-[#999] p-3 text-right">
                                        <span className="font-bold uppercase">Telefono:</span> 3058532676 | <span className="font-bold uppercase">BOGOTA</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* TABLA DE SERVICIOS */}
                    <section className="mb-5" style={{ pageBreakInside: 'avoid' }}>
                        <div className="bg-[#9e9e9e] text-white py-2 px-4 text-center font-bold text-sm tracking-wider">
                            DETALLE DA OPERACIÓN
                        </div>
                        <table className="w-full border-collapse border border-[#999]">
                            <thead>
                                <tr className="bg-[#1a5fa8] text-white">
                                    <th className="border border-[#999] p-3 w-12 text-center">#</th>
                                    <th className="border border-[#999] p-3 text-left">DESCRIPCIÓN DEL SERVICO</th>
                                    <th className="border border-[#999] p-3 text-right">VALOR UNITARIO</th>
                                    <th className="border border-[#999] p-3 text-right">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-[#999] p-4 text-center align-top font-bold">1</td>
                                    <td className="border border-[#999] p-4 align-top">
                                        <p className="font-bold uppercase text-sm mb-2 tracking-tight">Transporte especial de pasajeros</p>
                                        <div className="space-y-1 text-gray-700">
                                            <p><span className="font-bold">Vehículo:</span> {placaVehiculo}</p>
                                            <p><span className="font-bold">Trayecto:</span> {servicio.origen} ➔ {servicio.destino}</p>
                                            {servicio.paradasAdicionales.length > 0 && (
                                                <p className="text-[10px] italic mt-2"><span className="font-bold">Incluye:</span> {servicio.paradasAdicionales.join(', ')}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="border border-[#999] p-4 text-right align-top font-bold">
                                        {currencyFormatter.format(servicio.valorServicio || 0)}
                                    </td>
                                    <td className="border border-[#999] p-4 text-right align-top font-bold">
                                        {currencyFormatter.format(servicio.valorServicio || 0)}
                                    </td>
                                </tr>
                                <tr className="bg-[#d6d6d6]">
                                    <td colSpan={3} className="border border-[#999] p-3 text-right font-bold text-sm uppercase">TOTAL</td>
                                    <td className="border border-[#999] p-3 text-right font-bold text-sm">
                                        {currencyFormatter.format(servicio.valorServicio || 0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* PAGO — párrafo simple */}
                    <section className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                        <p className="text-sm font-medium">
                            Por favor, realize su transferancie a Cuenta-Ahorros 99642554661 de Bancolombia de Bancombia
                        </p>
                    </section>

                    {/* FIRMA */}
                    <section className="mt-auto flex flex-col items-start pt-5" style={{ pageBreakInside: 'avoid' }}>
                        <div className="mb-2">
                            <Image 
                                src="https://i.ibb.co/qYMKZWVt/firma-cxc.png" 
                                alt="Firma Juan Esteban Ovalle Pineda" 
                                width={150} 
                                height={44} 
                                className="object-contain"
                                style={{ height: '44px', width: 'auto' }}
                            />
                        </div>
                        <div className="w-72 border-t border-gray-800 pt-2">
                            <p className="font-bold text-base uppercase">Juan Esteban Ovalle Pineda</p>
                        </div>
                    </section>
                </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 p-6 bg-white border-t no-print">
                 <Button onClick={handleSendEmail} disabled={isSending || !servicio.emailCliente} variant="outline" className="h-12 px-6 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold">
                    <Mail className="mr-2 h-5 w-5" />
                    {isSending ? 'Enviando Documento...' : 'Enviar por Correo'}
                </Button>
                <Button onClick={handlePrint} className="h-12 px-8 bg-[#1a5fa8] hover:bg-[#154d85] text-white font-bold uppercase tracking-widest">
                    <Printer className="mr-2 h-5 w-5" />
                    Imprimir Documento
                </Button>
            </div>
        </div>
    )
}
