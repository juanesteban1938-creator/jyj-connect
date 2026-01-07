'use client';

import type { Servicio } from "@/app/dashboard/servicios/page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import React from "react";

type Props = {
    servicio: Servicio;
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export function CuentaCobro({ servicio }: Props) {
    
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
                                    @page { size: letter; margin: 0.5in; }
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
        <div>
            <div id="printable-area" className="p-8 bg-white text-black text-sm font-sans">
                 <header className="mb-4">
                    <p><span className="font-bold">NOMBRE DEL CLIENTE:</span> {servicio.cliente}</p>
                    <p><span className="font-bold">NIT DEL CLIENTE:</span> {servicio.nitCliente}</p>
                 </header>


                <div className="mb-4 border-2 border-black p-2">
                     <p className="font-bold mb-2">DEBE A:</p>
                     <div className="border-t-2 border-l-2 border-r-2 border-black grid grid-cols-3">
                        <div className="border-b-2 border-r-2 border-black p-1"><span className="text-xs font-bold">NOMBRES Y APELLIDOS</span></div>
                        <div className="col-span-2 border-b-2 border-black p-1"><span className="text-xs font-bold">NÚMERO DE IDENTIFICACION:</span></div>
                     </div>
                      <div className="border-l-2 border-r-2 border-black grid grid-cols-3">
                        <div className="border-b-2 border-r-2 border-black p-1 h-12">JUAN ESTEBAN OVALLE PINEDA</div>
                        <div className="border-b-2 border-black p-1 flex items-center justify-between">
                            <span>1.023.940.641</span>
                            <div className="border-l-2 border-black h-full flex items-center pl-2 ml-2">
                                <span className="mr-2">DV</span>
                                <span className="font-bold">9</span>
                            </div>
                        </div>
                     </div>
                     <div className="border-l-2 border-r-2 border-b-2 border-black grid grid-cols-5">
                        <div className="col-span-2 border-r-2 border-black p-1"><span className="text-xs font-bold">DIRECCIÓN:</span></div>
                        <div className="border-r-2 border-black p-1"><span className="text-xs font-bold">TELEFONO</span></div>
                        <div className="col-span-2 p-1"><span className="text-xs font-bold">CIUDAD</span></div>
                     </div>
                      <div className="border-l-2 border-r-2 border-b-2 border-black grid grid-cols-5 h-10">
                        <div className="col-span-2 border-r-2 border-black p-1">CALLE 34 B SUR # 3A-16</div>
                        <div className="border-r-2 border-black p-1">3058532676</div>
                        <div className="col-span-2 p-1">BOGOTA</div>
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
                    <p className="font-bold text-xs">NOTA: POR FAVOR REALIZAR TRANSFERENCIA A LA CUENTA DE AHORROS No: 032-053858-69 DE BANCO BANCOLOMBIA AHORROS A MI NOMBRE</p>
                </div>
                
                <div className="mt-20 flex justify-between items-end">
                    <div>
                        <div className="border-t-2 border-black w-64 pt-1">
                             <p className="font-bold">JUAN ESTEBAN OVALLE PINEDA</p>
                            <p className="font-bold">C.C. Ó NIT: 1023940641</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs">
                            Transportes Especiales J&J S.A.S <br/>
                            NIT. 901.123.456-7 <br/>
                            Carrera 100 # 25 - 30, Bogotá D.C. <br/>
                            Tel. 3101234567
                        </p>
                    </div>
                </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-end no-print">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / Guardar PDF
                </Button>
            </div>
        </div>
    )
}
