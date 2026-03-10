
'use client';

import type { Servicio } from "@/lib/types";
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
            QRCode.toDataURL(`Validación J&J Connect: ${servicio.consecutivo}`, { 
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
            toast({ variant: 'destructive', title: 'Error', description: 'El cliente no tiene correo registrado.' });
            return;
        }
        setIsSending(true);
        try {
            const canvas = await html2canvas(printableAreaRef.current!, { scale: 2 });
            const pdf = new jsPDF('p', 'mm', 'letter');
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 215.9, 279.4);
            const response = await fetch('/api/send-invoice', {
                method: 'POST',
                body: JSON.stringify({ to: servicio.emailCliente, nroFactura: servicio.consecutivo, pdfBase64: pdf.output('datauristring').split(',')[1] }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) toast({ title: '¡Correo Enviado!' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error al enviar' });
        } finally {
            setIsSending(false);
        }
    }
    
    return (
        <div className="bg-[#f0f0f0] p-0">
            <ScrollArea className="h-[85vh] w-full">
                <div 
                    ref={printableAreaRef} 
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
                    <section className="flex justify-between items-start mb-6" style={{ pageBreakInside: 'avoid' }}>
                        <div className="flex items-center gap-4">
                            <Image src="https://i.ibb.co/zhzhTrvV/logo-cxc.png" alt="Logo" width={120} height={68} className="object-contain" style={{ height: '68px', width: 'auto' }} />
                            {qrCodeUrl && <Image src={qrCodeUrl} alt="QR" width={68} height={68} className="border border-gray-200" />}
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg">CUENTA DE COBRO No: {servicio.consecutivo}</p>
                            <p className="font-medium text-base">{format(new Date(servicio.fecha), 'dd/MM/yyyy')}</p>
                        </div>
                    </section>

                    <section className="text-center mb-8" style={{ pageBreakInside: 'avoid' }}>
                        <h1 className="font-bold uppercase text-[18px]" style={{ letterSpacing: '3px', marginBottom: '8px' }}>{servicio.cliente}</h1>
                        <p className="font-bold text-[14px] mt-[6px]">NIT {servicio.nitCliente}</p>
                        <p className="text-gray-700 text-[14px] mt-[4px]">{servicio.emailCliente}</p>
                    </section>

                    <section className="mb-6" style={{ pageBreakInside: 'avoid' }}>
                        <p className="font-bold mb-1">Prestado a</p>
                        <table className="w-full border-collapse border border-[#999]">
                            <tbody>
                                <tr>
                                    <td className="border border-[#999] p-3 font-medium">Cliente: Juan Esteban Ovalle Pineda</td>
                                    <td className="border border-[#999] p-3 text-right">1.023.940.641</td>
                                </tr>
                                <tr>
                                    <td className="border border-[#999] p-3">DIRECCION: CALLE 34 B SUR # 3A-16</td>
                                    <td className="border border-[#999] p-3 text-right font-bold uppercase text-[10px]">Telefono: 3058532676 | BOGOTA</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section className="mb-6" style={{ pageBreakInside: 'avoid' }}>
                        <div className="bg-[#9e9e9e] text-white py-2 text-center font-bold text-sm tracking-wider uppercase">Detalle da operación</div>
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
                                    <td className="border border-[#999] p-4 text-center align-top font-bold text-sm">1</td>
                                    <td className="border border-[#999] p-4 align-top">
                                        <p className="font-bold uppercase text-sm mb-2">Transporte especial de pasajeros</p>
                                        <div className="text-gray-700 space-y-1">
                                            <p><span className="font-bold uppercase text-[10px]">Vehículo:</span> {servicio.vehiculoPlaca || servicio.vehiculo}</p>
                                            <p><span className="font-bold uppercase text-[10px]">Trayecto:</span> {servicio.origen} ➔ {servicio.destino}</p>
                                        </div>
                                    </td>
                                    <td className="border border-[#999] p-4 text-right align-top font-bold">{currencyFormatter.format(servicio.valorServicio || 0)}</td>
                                    <td className="border border-[#999] p-4 text-right align-top font-bold">{currencyFormatter.format(servicio.valorServicio || 0)}</td>
                                </tr>
                                <tr className="bg-[#d6d6d6]">
                                    <td colSpan={3} className="border border-[#999] p-3 text-right font-bold text-sm uppercase">Total a Pagar</td>
                                    <td className="border border-[#999] p-3 text-right font-bold text-sm">{currencyFormatter.format(servicio.valorServicio || 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section className="mb-10" style={{ pageBreakInside: 'avoid' }}>
                        <p className="text-sm font-medium">Por favor, realize su transferancie a Cuenta-Ahorros 99642554661 de Bancolombia.</p>
                    </section>

                    <section className="mt-auto flex flex-col items-start pt-6 border-t" style={{ pageBreakInside: 'avoid' }}>
                        <Image src="https://i.ibb.co/qYMKZWVt/firma-cxc.png" alt="Firma" width={150} height={44} className="object-contain mb-2" style={{ height: '44px', width: 'auto' }} />
                        <div className="w-72 border-t border-black pt-2">
                            <p className="font-bold text-sm uppercase">Juan Esteban Ovalle Pineda</p>
                            <p className="text-xs">Transportes Especiales J&J</p>
                        </div>
                    </section>
                </div>
            </ScrollArea>

            <div className="action-group p-6 bg-white border-t no-print">
                <Button onClick={handleSendEmail} disabled={isSending} variant="outline" className="btn-action border-blue-600 text-blue-600 hover:bg-blue-50 font-bold">
                    <Mail className="mr-2 h-5 w-5" /> {isSending ? 'Enviando...' : 'Enviar por Correo'}
                </Button>
                <Button onClick={handlePrint} className="btn-action bg-[#1a5fa8] hover:bg-[#154d85] text-white font-bold uppercase tracking-widest">
                    <Printer className="mr-2 h-5 w-5" /> Imprimir Documento
                </Button>
            </div>
        </div>
    )
}
