'use client';

import type { Servicio } from "@/app/dashboard/servicios/page";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Printer, Mail, MapPin, Phone } from "lucide-react";
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

const JJLogoWithWings = () => (
     <div className="flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 53 45" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-500 -mr-3">
            <path d="M22.259 13.232C19.982 9.248 16.517 7.02 12.016 7.02C5.972 7.02 1 11.237 1 18.067c0 3.231 1.054 5.926 2.822 7.746 1.107-5.068 4.303-8.841 8.358-10.742a18.375 18.375 0 014.08-1.282l5.999-0.657z" stroke="currentColor" strokeWidth="2"/>
            <path d="M36.19 19.359c3.966-.34 7.23-1.637 9.507-3.766 2.502-2.34 3.823-5.328 3.823-8.572C49.52 2.651 46.541 1 42.13 1c-3.714 0-6.84 1.5-8.913 3.968-.946 1.127-1.638 2.38-2.072 3.69" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <div className="relative">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.5L3.5 7.5v9L12 21.5l8.5-5v-9L12 2.5z" fill="#1E3A8A" stroke="#FBBF24" strokeWidth="1.5"/>
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#FBBF24">J&J</text>
            </svg>
        </div>
        <svg width="40" height="40" viewBox="0 0 53 45" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-500 -ml-3 transform scale-x-[-1]">
             <path d="M22.259 13.232C19.982 9.248 16.517 7.02 12.016 7.02C5.972 7.02 1 11.237 1 18.067c0 3.231 1.054 5.926 2.822 7.746 1.107-5.068 4.303-8.841 8.358-10.742a18.375 18.375 0 014.08-1.282l5.999-0.657z" stroke="currentColor" strokeWidth="2"/>
            <path d="M36.19 19.359c3.966-.34 7.23-1.637 9.507-3.766 2.502-2.34 3.823-5.328 3.823-8.572C49.52 2.651 46.541 1 42.13 1c-3.714 0-6.84 1.5-8.913 3.968-.946 1.127-1.638 2.38-2.072 3.69" stroke="currentColor" strokeWidth="2"/>
        </svg>
    </div>
);

export function CuentaCobro({ servicio }: Props) {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isSending, setIsSending] = useState(false);
    const printableAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (servicio && servicio.consecutivo) {
            QRCode.toDataURL(`Servicio: ${servicio.consecutivo}`, { errorCorrectionLevel: 'H', width: 64, margin: 1 }, function (err, url) {
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
                                    @page { 
                                        size: letter;
                                        margin: 0; 
                                    }
                                    body { -webkit-print-color-adjust: exact; }
                                    .no-print { display: none; }
                                    .printable-area {
                                        width: 8.5in;
                                        height: 11in;
                                        box-sizing: border-box;
                                        padding: 0.5in;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            ${printContent.innerHTML}
                             <script>
                                window.onload = function() {
                                    window.print();
                                    setTimeout(function() { window.close(); }, 1);
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

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: '¡Correo Enviado!',
                    description: `La cuenta de cobro ha sido enviada a ${servicio.emailCliente}.`,
                });
            } else {
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
        <div className="p-1">
            <ScrollArea className="h-[70vh] w-full">
            <div ref={printableAreaRef} id="printable-area" className="p-8 bg-white text-gray-800 text-sm font-sans w-[21cm]">
                <header className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <JJLogoWithWings />
                    </div>
                    <div className="text-right">
                         <div className="bg-slate-200 p-2 rounded-md text-slate-800">
                             <p className="font-bold">CUENTA DE COBRO No: {servicio.consecutivo}</p>
                             <p className="font-bold">FECHA: {format(fecha, 'dd/MM/yyyy')}</p>
                         </div>
                    </div>
                </header>

                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-wider">TRANSPORTE ESPECIALES J&J</h1>
                    <p className="text-xs">Laura Sthefania Galeano Velasquez | NIT: 1001060945</p>
                </div>
                 <hr className="mb-4" />

                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-500">PARA:</p>
                    <p className="font-bold">{servicio.cliente}</p>
                    <p className="text-xs">ID. {servicio.nitCliente}</p>
                    <div className="flex items-center gap-4 text-xs mt-1">
                        <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-500"/>
                            <span>UBICACIÓN: Calle 34 B Sur # 3A-16, Bogotá</span>
                        </div>
                         <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-500"/>
                            <span>Tel: {servicio.telefonoCliente}</span>
                        </div>
                    </div>
                </div>
                 
                <table className="w-full text-left mb-6">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th className="p-2 w-16 text-center">Cant.</th>
                            <th className="p-2">Descripción del Servicio</th>
                            <th className="p-2 w-32 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-2 text-center">1</td>
                            <td className="p-2">
                                <p>Transporte especial de pasajeros (Vehículo {placaVehiculo}).</p>
                                <p className="text-xs text-gray-600">Ruta: {servicio.origen} hasta {servicio.destino}.</p>
                            </td>
                            <td className="p-2 text-right">{currencyFormatter.format(servicio.valorServicio || 0)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div className="flex justify-end mb-6">
                    <div className="bg-slate-800 text-white p-2 rounded-md">
                        <span className="font-bold">TOTAL A PAGAR: {currencyFormatter.format(servicio.valorServicio || 0)}</span>
                    </div>
                </div>

                <div className="border border-slate-300 p-3 rounded-md text-xs mb-6">
                    <p className="font-bold mb-1">INFORMACIÓN DE PAGO:</p>
                    <p>Transferir a Ahorros Bancolombia No: 032-053855-69 a nombre de Laura Galeano.</p>
                </div>
                
                <div className="flex justify-between items-end">
                    <div>
                         <p className="text-xs font-mono">VALLE PINEDA 40641</p>
                    </div>
                    <div className="text-center">
                       {qrCodeUrl && <Image src={qrCodeUrl} alt="Código QR" width={64} height={64} />}
                       <p className="text-[10px] mt-1 text-gray-500">Verifica autenticidad</p>
                    </div>
                </div>

            </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 p-4 pt-0 no-print">
                 <Button onClick={handleSendEmail} disabled={isSending || !servicio.emailCliente} className="bg-blue-600 hover:bg-blue-700">
                    <Mail className="mr-2 h-4 w-4" />
                    {isSending ? 'Enviando...' : 'Enviar por Correo'}
                </Button>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / Guardar PDF
                </Button>
            </div>
        </div>
    )
}
