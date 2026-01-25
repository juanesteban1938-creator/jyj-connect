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
            <div ref={printableAreaRef} id="printable-area" className="p-6 bg-white text-gray-800 text-sm font-sans w-[21cm] mx-auto min-h-[29.7cm]">
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
                    <div className="flex items-center gap-4">
                        <Image src="https://i.ibb.co/3sS5257/logo-placeholder.png" alt="Logo J&J" width={80} height={80} />
                        <div>
                            <h1 className="text-xl font-bold tracking-wider text-gray-800">TRANSPORTE ESPECIALES J&J</h1>
                            <p className="text-xs">Laura Sthefania Galeano Velasquez | NIT: 1001060945</p>
                            <p className="text-xs">Teléfono: +57 314 2889955</p>
                            <p className="text-xs">Carrera 58 numero 130A-82, Bogotá</p>
                        </div>
                    </div>
                    <div className="text-right border border-gray-400 rounded-md p-2">
                        <p className="font-bold text-base">CUENTA DE COBRO</p>
                        <p className="font-bold text-red-600">No: {servicio.consecutivo}</p>
                        <p>FECHA: {format(fecha, 'dd/MM/yyyy')}</p>
                    </div>
                </div>

                <div className="border border-gray-400 rounded-md p-3 mb-4">
                    <p className="text-xs font-bold text-gray-500 mb-1">PARA:</p>
                    <p className="font-bold text-base">{servicio.cliente}</p>
                    <p className="text-sm">ID: {servicio.nitCliente}</p>
                    <p className="text-sm">Tel: {servicio.telefonoCliente}</p>
                </div>
                 
                <table className="w-full text-left mb-4 border-collapse border border-gray-400">
                    <thead>
                        <tr className="bg-gray-800 text-white">
                            <th className="p-2 border-r border-gray-300 text-center">Cant.</th>
                            <th className="p-2 border-r border-gray-300">Descripción del Servicio</th>
                            <th className="p-2 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-t border-gray-300">
                            <td className="p-2 border-r border-gray-300 text-center">1</td>
                            <td className="p-2 border-r border-gray-300">
                                <p className="font-medium">Transporte especial de pasajeros.</p>
                                <p className="text-xs text-gray-600">Vehículo: {placaVehiculo}. Ruta: {servicio.origen} a {servicio.destino}.</p>
                            </td>
                            <td className="p-2 text-right font-semibold">{currencyFormatter.format(servicio.valorServicio || 0)}</td>
                        </tr>
                        <tr style={{height: '100px'}}>
                           <td className="border-r border-gray-300"></td>
                           <td className="border-r border-gray-300"></td>
                           <td></td>
                        </tr>
                    </tbody>
                </table>
                
                <div className="flex justify-between items-start gap-4 mb-8">
                    <div className="w-2/3 border border-gray-400 rounded-md p-3">
                        <p className="font-bold mb-1 text-xs">INFORMACIÓN DE PAGO:</p>
                        <p>Consignar o transferir a la cuenta de Ahorros Bancolombia No. <span className="font-bold">032-053855-69</span> a nombre de Laura Galeano.</p>
                    </div>
                    <div className="w-1/3">
                        <div className="bg-gray-200 p-2 rounded-md">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">TOTAL:</span>
                                <span className="font-bold text-lg">{currencyFormatter.format(servicio.valorServicio || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-between items-end mt-16 pt-16">
                    <div className="w-1/2 text-center">
                         <div className="relative h-12 mb-1 mx-auto" style={{width: '150px'}}>
                            <Image src="https://i.ibb.co/b3h3YmX/firma-transparente.png" alt="Firma Laura Galeano" layout="fill" objectFit="contain" />
                        </div>
                        <div className="border-t-2 border-black pt-1 w-2/3 mx-auto">
                            <p className="font-semibold">Atentamente,</p>
                            <p>Laura Sthefania Galeano Velasquez</p>
                        </div>
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
