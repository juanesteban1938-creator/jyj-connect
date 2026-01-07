'use client';

import type { Servicio } from "@/app/dashboard/servicios/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Banknote, Landmark, Hash, CheckCircle, Clock, AlertCircle } from "lucide-react";

type Props = {
    servicio: Servicio;
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const InfoRow = ({ label, value, icon: Icon }: { label: string, value: string | React.ReactNode, icon?: React.ElementType }) => (
    <div className="flex justify-between items-center py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {Icon && <Icon className="h-4 w-4" />}
            <span>{label}</span>
        </div>
        <span className="font-semibold text-sm">{value}</span>
    </div>
);

export function ResumenServicio({ servicio }: Props) {

    const venta = servicio.valorServicio || 0;
    const costo = servicio.costoOperacion || 0;
    const ganancia = venta - costo;
    const saldo = servicio.saldo ?? (venta - (servicio.anticipo ?? 0));

    const getEstadoBadge = (estado: Servicio['estadoPago']) => {
        switch (estado) {
            case 'Pagado':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle className="mr-1 h-3 w-3"/>Pagado</Badge>;
            case 'Pendiente':
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="mr-1 h-3 w-3"/>Pendiente</Badge>;
            case 'Anticipo':
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200"><Clock className="mr-1 h-3 w-3"/>Anticipo</Badge>;
            case 'Anulado':
                return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3"/>Anulado</Badge>;
            default:
                return <Badge variant="secondary">{estado}</Badge>;
        }
    };
    
    return (
        <div className="space-y-4 p-1">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Resumen Financiero</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <InfoRow label="Estado del Pago" value={getEstadoBadge(servicio.estadoPago)} />
                        <InfoRow label="Método de Pago" value={servicio.metodoPago} />
                        <Separator />
                        <InfoRow label="Valor Venta" value={currencyFormatter.format(venta)} />
                        {servicio.estadoPago === 'Anticipo' && <InfoRow label="Anticipo Recibido" value={currencyFormatter.format(servicio.anticipo || 0)} />}
                        <InfoRow label="Costo Operación" value={currencyFormatter.format(costo)} />
                        <Separator />
                        <InfoRow label="Ganancia" value={<span className="font-bold text-green-600">{currencyFormatter.format(ganancia)}</span>} />
                        <InfoRow label="Cartera Pendiente" value={<span className="font-bold text-red-600">{currencyFormatter.format(saldo)}</span>} />
                    </div>
                </CardContent>
            </Card>
            
            {servicio.metodoPago === 'Transferencia' && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Detalles de Transferencia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <InfoRow label="Número de Comprobante" value={servicio.numeroComprobante || 'No disponible'} icon={Hash} />
                            <InfoRow label="Banco" value={servicio.banco || 'No disponible'} icon={Landmark} />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
