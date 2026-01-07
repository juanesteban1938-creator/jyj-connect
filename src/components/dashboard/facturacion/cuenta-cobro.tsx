'use client';

import type { Servicio } from "@/app/dashboard/servicios/page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import QRCode from 'qrcode';

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

    useEffect(() => {
        if (servicio && servicio.consecutivo) {
            QRCode.toDataURL(servicio.consecutivo, { errorCorrectionLevel: 'H' }, function (err, url) {
                if (err) console.error(err)
                setQrCodeUrl(url);
            })
        }
    }, [servicio]);
    
    const handlePrint = () => {
        const printContent = document.getElementById("printable-area");
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
                                        margin: 0.5in; 
                                    }
                                    body { -webkit-print-color-adjust: exact; }
                                    .no-print { display: none; }
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
            <div id="printable-area" className="p-8 bg-white text-black text-xs font-sans">
                <header className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                        <p className="font-bold">Transportes Especiales J&J S.A.S</p>
                        <p>NIT. 901.123.456-7</p>
                        <p>Carrera 100 # 25 - 30, Bogotá D.C.</p>
                        <p>Tel. 3101234567</p>
                    </div>
                     <div className="flex items-start justify-end">
                        <div className="text-center">
                            <p className="font-bold">CUENTA DE COBRO No</p>
                            <div className="border-2 border-black p-2 mt-1">
                                <span className="font-bold">{servicio.consecutivo}</span>
                            </div>
                        </div>
                    </div>
                </header>
                
                 <div className="border-2 border-black">
                     <div className="border-b-2 border-black text-center font-bold p-1">FECHA DE EXPEDICION</div>
                        <div className="grid grid-cols-3 text-center">
                            <div className="border-r-2 border-black">
                                <div className="border-b-2 border-black font-bold">AÑO</div>
                                <div>{format(fecha, 'yyyy')}</div>
                            </div>
                            <div className="border-r-2 border-black">
                                <div className="border-b-2 border-black font-bold">MES</div>
                                <div>{format(fecha, 'MM')}</div>
                            </div>
                            <div>
                                <div className="border-b-2 border-black font-bold">DIA</div>
                                <div>{format(fecha, 'dd')}</div>
                            </div>
                        </div>
                 </div>
                
                <div className="my-6 space-y-1">
                    <p className="font-bold">NOMBRE DEL CLIENTE: {servicio.cliente}</p>
                    <p className="font-bold">NIT DEL CLIENTE: {servicio.nitCliente}</p>
                </div>


                <div className="mb-4 border-2 border-black p-2">
                     <p className="font-bold mb-2">DEBE A:</p>
                     <div className="border-t-2 border-l-2 border-r-2 border-black grid grid-cols-3">
                        <div className="border-b-2 border-r-2 border-black p-1"><span className="font-bold">NOMBRES Y APELLIDOS</span></div>
                        <div className="col-span-2 border-b-2 border-black p-1"><span className="font-bold">NÚMERO DE IDENTIFICACION:</span></div>
                     </div>
                      <div className="border-l-2 border-r-2 border-black grid grid-cols-3">
                        <div className="border-b-2 border-r-2 border-black p-1 h-12 flex items-center">JUAN ESTEBAN OVALLE PINEDA</div>
                        <div className="col-span-2 border-b-2 border-black p-1 flex items-center justify-between">
                            <span>1.023.940.641</span>
                            <div className="border-l-2 border-black h-full flex items-center pl-2 ml-2">
                                <span className="mr-2">DV</span>
                                <span className="font-bold">9</span>
                            </div>
                        </div>
                     </div>
                     <div className="border-l-2 border-r-2 border-b-2 border-black grid grid-cols-5">
                        <div className="col-span-2 border-r-2 border-black p-1"><span className="font-bold">DIRECCIÓN:</span></div>
                        <div className="border-r-2 border-black p-1"><span className="font-bold">TELEFONO</span></div>
                        <div className="col-span-2 p-1"><span className="font-bold">CIUDAD</span></div>
                     </div>
                      <div className="border-l-2 border-r-2 border-b-2 border-black grid grid-cols-5 h-10">
                        <div className="col-span-2 border-r-2 border-black p-1 flex items-center">CALLE 34 B SUR # 3A-16</div>
                        <div className="border-r-2 border-black p-1 flex items-center">3058532676</div>
                        <div className="col-span-2 p-1 flex items-center">BOGOTA</div>
                     </div>
                </div>

                <div className="border-2 border-black">
                    <div className="grid grid-cols-12 bg-gray-200 font-bold border-b-2 border-black">
                        <div className="col-span-1 p-2 border-r-2 border-black text-center">CANTIDAD</div>
                        <div className="col-span-8 p-2 border-r-2 border-black">CONCEPTO</div>
                        <div className="col-span-3 p-2 text-center">VALOR DE LA OPERACIÓN</div>
                    </div>
                    <div className="grid grid-cols-12 min-h-[160px]">
                        <div className="col-span-1 p-2 border-r-2 border-black text-center">1</div>
                        <div className="col-span-8 p-2 border-r-2 border-black">
                           <p className="font-bold">CONCEPTO DE:</p>
                           <p>Transporte especial de pasajeros con el vehiculo {placaVehiculo} en la ruta {servicio.origen} - {servicio.destino}.</p>
                        </div>
                        <div className="col-span-3 p-2 text-right">{currencyFormatter.format(servicio.valorServicio || 0)}</div>
                    </div>
                    <div className="grid grid-cols-12 bg-gray-200 font-bold border-t-2 border-black">
                         <div className="col-span-9 p-2 border-r-2 border-black text-right">TOTAL GENERAL</div>
                         <div className="col-span-3 p-2 text-right">{currencyFormatter.format(servicio.valorServicio || 0)}</div>
                    </div>
                </div>
                
                <div className="mt-4 border-2 border-black p-2">
                    <p className="font-bold">NOTA: POR FAVOR REALIZAR TRANSFERENCIA A LA CUENTA DE AHORROS No: 032-053858-69 DE BANCO BANCOLOMBIA AHORROS A MI NOMBRE</p>
                </div>
                
                <div className="mt-8 flex justify-between items-end">
                    <div className="w-64">
                         <div className="w-full">
                            <Image src="https://i.ibb.co/qFPM4pf4/firma.png" alt="Firma Juan Esteban Ovalle" width={180} height={50} objectFit="contain" />
                        </div>
                        <div className="border-t-2 border-black pt-1 mt-1">
                             <p className="font-bold">JUAN ESTEBAN OVALLE PINEDA</p>
                            <p className="font-bold">C.C. Ó NIT: 1023940641</p>
                        </div>
                    </div>
                    <div className="text-right">
                       {qrCodeUrl && <Image src={qrCodeUrl} alt="Código QR" width={80} height={80} />}
                       <p className="text-[8px] mt-1">Verifica autenticidad</p>
                    </div>
                </div>
            </div>
            </ScrollArea>

            <Separator className="my-4" />

            <div className="flex justify-end gap-2 p-4 pt-0 no-print">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / Guardar PDF
                </Button>
            </div>
        </div>
    )
}
