'use client';

import type { Servicio } from "@/app/dashboard/servicios/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Truck, Briefcase, Phone, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    servicio: Servicio;
}

const InfoRow = ({ label, value, icon: Icon, iconClassName }: { label: string, value: string | React.ReactNode, icon?: React.ElementType, iconClassName?: string }) => (
    <div className="flex items-start gap-3 py-2">
        {Icon && <Icon className={cn("h-4 w-4 mt-1 text-muted-foreground", iconClassName)} />}
        <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-semibold text-sm">{value}</span>
        </div>
    </div>
);


export function InfoServicioCard({ servicio }: Props) {

    const placa = servicio.vehiculo.split('•')[1]?.trim() || servicio.vehiculo;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Información del Servicio</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <InfoRow label="Cliente" value={servicio.cliente} icon={Briefcase} iconClassName="text-primary" />
                    <InfoRow label="Contacto" value={servicio.telefonoCliente} icon={Phone} iconClassName="text-primary" />
                    <InfoRow label="Conductor Asignado" value={servicio.conductor} icon={User} iconClassName="text-primary" />
                    <InfoRow label="Vehículo / Placa" value={placa} icon={Truck} iconClassName="text-primary" />
                    <div className="sm:col-span-2">
                        <Separator className="my-2"/>
                    </div>
                    <InfoRow label="Dirección de Recogida" value={servicio.origen} icon={MapPin} iconClassName="text-green-600" />
                    <InfoRow label="Hora de Recogida" value={servicio.hora} icon={Clock} iconClassName="text-primary" />
                    <InfoRow label="Dirección de Destino" value={servicio.destino} icon={MapPin} iconClassName="text-red-600" />
                </div>
            </CardContent>
        </Card>
    );
}
