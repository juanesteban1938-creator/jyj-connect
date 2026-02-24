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

export function CuentaCobro({ servicio }: Props) {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isSending, setIsSending] = useState(false);
    const printableAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (servicio && servicio.consecutivo) {
            QRCode.toDataURL(`Validación J&J: ${servicio.consecutivo}`, { errorCorrectionLevel: 'H', width: 100, margin: 1 }, function (err, url) {
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
            <ScrollArea className="h-[75vh] w-full border rounded-md bg-muted/20">
            <div ref={printableAreaRef} id="printable-area" className="p-10 bg-white text-gray-800 text-sm font-sans w-[21.59cm] mx-auto min-h-[27.94cm] shadow-sm">
                
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <Image src="https://i.ibb.co/3sS5257/logo-placeholder.png" alt="Logo J&J" width={100} height={100} className="object-contain" />
                    </div>
                    <div className="text-right">
                        <div className="border-2 border-gray-800 p-3 rounded-none inline-block min-w-[200px]">
                            <p className="font-bold text-base text-center border-b-2 border-gray-800 pb-1 mb-1">CUENTA DE COBRO</p>
                            <p className="font-bold text-lg text-center">No: {servicio.consecutivo}</p>
                            <p className="text-sm text-center font-medium mt-1">FECHA: {format(fecha, 'dd/MM/yyyy')}</p>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black tracking-tighter text-gray-900 mb-1">TRANSPORTE ESPECIALES J&J</h1>
                    <p className="text-sm font-bold text-gray-700">Laura Sthefania Galeano Velasquez | NIT: 1001060945</p>
                    <p className="text-xs text-gray-500">Transportes.especialesjyj@gmail.com | Cel: +57 314 2889955</p>
                </div>
                
                {/* Client Section - Bordered Box */}
                <div className="border-2 border-gray-800 p-4 mb-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-black text-gray-900 mb-1">DATOS DEL CLIENTE:</p>
                            <p className="font-black text-lg leading-tight uppercase">{servicio.cliente}</p>
                            <p className="text-sm font-medium mt-1">NIT / C.C: {servicio.nitCliente}</p>
                        </div>
                        <div className="flex flex-col justify-end text-right">
                            <div className="flex items-center justify-end gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-gray-600"/>
                                <span className="font-medium">ORIGEN: {servicio.origen}</span>
                            </div>
                            <div className="flex items-center justify-end gap-2 text-sm mt-1">
                                <Phone className="h-4 w-4 text-gray-600"/>
                                <span className="font-medium">TELÉFONO: {servicio.telefonoCliente}</span>
                            </div>
                        </div>
                    </div>
                </div>
                 
                {/* Items Table */}
                <div className="border-2 border-gray-800 mb-6">
                    <table className="w-full text-left">
                        <thead className="bg-gray-800 text-white">
                            <tr>
                                <th className="p-3 w-16 text-center border-r border-white">CANT.</th>
                                <th className="p-3 border-r border-white font-bold">DESCRIPCIÓN DEL SERVICIO</th>
                                <th className="p-3 w-40 text-right font-bold">VALOR UNIT.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="min-h-[150px]">
                                <td className="p-4 text-center align-top border-r border-gray-800 font-bold">1</td>
                                <td className="p-4 align-top border-r border-gray-800">
                                    <p className="font-black text-base uppercase mb-2">Transporte especial de pasajeros</p>
                                    <div className="space-y-1 text-gray-700">
                                        <p className="flex items-center gap-2"><span className="font-bold">Vehículo:</span> {placaVehiculo}</p>
                                        <p className="flex items-center gap-2"><span className="font-bold">Trayecto:</span> {servicio.origen} <span className="text-gray-400">➔</span> {servicio.destino}</p>
                                        {servicio.paradasAdicionales.length > 0 && (
                                            <p className="text-xs italic mt-2"><span className="font-bold">Incluye:</span> {servicio.paradasAdicionales.join(', ')}</p>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right align-top font-black text-lg">
                                    {currencyFormatter.format(servicio.valorServicio || 0)}
                                </td>
                            </tr>
                            {/* Empty space filler */}
                            <tr className="h-20">
                                <td className="border-r border-gray-800"></td>
                                <td className="border-r border-gray-800"></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                {/* Total Section */}
                <div className="flex justify-end mb-8">
                     <div className="w-full max-w-[300px]">
                        <div className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
                            <span className="font-black text-sm">TOTAL A PAGAR:</span>
                            <span className="font-black text-2xl">{currencyFormatter.format(servicio.valorServicio || 0)}</span>
                        </div>
                    </div>
                </div>
                
                {/* Payment Info - Bordered Box */}
                <div className="border-2 border-dashed border-gray-400 p-4 mb-12 bg-gray-50">
                     <p className="font-black mb-2 text-xs text-gray-900 tracking-widest uppercase">MÉTODOS DE PAGO DISPONIBLES:</p>
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center bg-blue-600 text-white font-bold rounded-full">B</div>
                        <div>
                            <p className="font-black text-base">TRANSFERENCIA BANCARIA (BANCOLOMBIA)</p>
                            <p className="text-sm font-medium">Cuenta de Ahorros No: <span className="bg-yellow-200 px-1">032-053855-69</span></p>
                            <p className="text-xs text-gray-600">A nombre de: LAURA STHEFANIA GALEANO VELASQUEZ</p>
                        </div>
                     </div>
                </div>
                
                {/* Footer Section: Signature & QR */}
                <div className="mt-auto flex justify-between items-end border-t-2 border-gray-100 pt-8">
                    <div className="w-1/2">
                        <div className="relative h-20 mb-2 w-48">
                            <Image src="https://i.ibb.co/b3h3YmX/firma-transparente.png" alt="Firma Laura Galeano" fill className="object-contain object-left" />
                        </div>
                        <div className="border-t-2 border-gray-900 pt-2 w-64">
                            <p className="font-black text-sm uppercase">Atentamente,</p>
                            <p className="font-bold text-gray-700">LAURA STHEFANIA GALEANO VELASQUEZ</p>
                            <p className="text-xs text-gray-500">C.C. 1.001.060.945</p>
                        </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end">
                       <div className="bg-gray-50 p-2 border border-gray-200 rounded-lg">
                            {qrCodeUrl && <Image src={qrCodeUrl} alt="Código QR Validación" width={100} height={100} className="mix-blend-multiply" />}
                       </div>
                       <p className="text-[9px] mt-2 font-black text-gray-400 uppercase tracking-widest">Código de Verificación Electrónica</p>
                       <p className="text-[10px] text-gray-400 font-mono">{servicio.id.slice(0,18).toUpperCase()}</p>
                    </div>
                </div>

            </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 p-6 bg-white border-t no-print">
                 <Button onClick={handleSendEmail} disabled={isSending || !servicio.emailCliente} variant="outline" className="h-12 px-6 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold">
                    <Mail className="mr-2 h-5 w-5" />
                    {isSending ? 'Enviando Documento...' : 'Enviar por Correo'}
                </Button>
                <Button onClick={handlePrint} className="h-12 px-8 bg-gray-900 hover:bg-gray-800 text-white font-bold">
                    <Printer className="mr-2 h-5 w-5" />
                    Imprimir / Exportar PDF
                </Button>
            </div>
        </div>
    )
}