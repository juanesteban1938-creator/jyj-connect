'use client';

import type { Servicio } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Truck, Briefcase, Phone, MapPin, Clock, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    servicio: Servicio;
}

const InfoRow = ({ label, value, icon: Icon, iconClassName }: { label: string, value: string | React.ReactNode, icon?: React.ElementType, iconClassName?: string }) => (
    <div className="flex items-start gap-3 py-2">
        {Icon && <Icon className={cn("h-4 w-4 mt-1 text-muted-foreground", iconClassName)} />}
        <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="font-semibold text-sm">{value}</div>
        </div>
    </div>
);

const formatearHora = (hora: string) => {
  if (!hora) return 'N/A';
  try {
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  } catch (e) {
    return hora;
  }
};

export function InfoServicioCard({ servicio }: Props) {

    const placa = servicio.vehiculoPlaca || servicio.vehiculo;
    
    const conductorDisplay = servicio.conductorTelefono 
        ? `${servicio.conductor} - ${servicio.conductorTelefono}`
        : servicio.conductor;

    return (
        <Card className="border-none shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b p-4">
                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800">Hoja de Ruta</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <InfoRow label="Cliente" value={servicio.cliente} icon={Briefcase} iconClassName="text-primary" />
                    <InfoRow label="Contacto Cliente" value={servicio.telefonoCliente} icon={Phone} iconClassName="text-primary" />
                    <InfoRow label="Conductor Asignado" value={conductorDisplay} icon={User} iconClassName="text-primary" />
                    <InfoRow label="Vehículo / Placa" value={<Badge variant="outline" className="font-black text-blue-600 bg-blue-50 border-blue-100">{placa}</Badge>} icon={Truck} iconClassName="text-primary" />
                    
                    <div className="sm:col-span-2">
                        <Separator className="my-4"/>
                    </div>

                    <div className="sm:col-span-2 space-y-6">
                        {/* RECOGIDA */}
                        <div className="relative pl-4 border-l-2 border-dashed border-emerald-200">
                            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Puntos de Recogida</p>
                            <div className="space-y-3">
                                {servicio.puntosRecogida?.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black flex items-center justify-center shrink-0">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm font-bold text-slate-700">{p}</p>
                                    </div>
                                )) || <p className="text-sm font-bold text-slate-700">{servicio.origen}</p>}
                            </div>
                        </div>

                        <div className="flex justify-start pl-2">
                            <ArrowDown className="h-4 w-4 text-slate-200" />
                        </div>

                        {/* DESTINO */}
                        <div className="relative pl-4 border-l-2 border-dashed border-rose-200">
                            <div className="absolute -left-[9px] bottom-0 h-4 w-4 rounded-full bg-rose-500 border-2 border-white shadow-sm" />
                            <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-2">Puntos de Destino</p>
                            <div className="space-y-3">
                                {servicio.puntosDestino?.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black flex items-center justify-center shrink-0">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm font-bold text-slate-700">{p}</p>
                                    </div>
                                )) || <p className="text-sm font-bold text-slate-700">{servicio.destino}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <Separator className="my-4"/>
                    </div>

                    <InfoRow label="Hora de Inicio Programada" value={formatearHora(servicio.hora)} icon={Clock} iconClassName="text-orange-500" />
                </div>
            </CardContent>
        </Card>
    );
}