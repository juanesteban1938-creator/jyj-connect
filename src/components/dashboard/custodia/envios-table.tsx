
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  MapPin, 
  Calendar, 
  Clock, 
  UserPlus, 
  Eye, 
  XCircle,
  AlertTriangle,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Envio } from '@/lib/custodia-types';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

interface Props {
  data: Envio[];
  isLoading: boolean;
  onAsignar: (envio: Envio) => void;
  onCancelar: (id: string) => void;
}

export function EnviosTable({ data, isLoading, onAsignar, onCancelar }: Props) {
  
  const getStatusBadge = (estado: Envio['estado']) => {
    switch (estado) {
      case 'programado':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200 uppercase text-[9px] font-black">Programado</Badge>;
      case 'en_transito':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 uppercase text-[9px] font-black">En Tránsito</Badge>;
      case 'entregado':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black">Entregado</Badge>;
      case 'requiere_revision_manual':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 uppercase text-[9px] font-black animate-pulse">Revisión Manual</Badge>;
      default:
        return <Badge variant="outline" className="uppercase text-[9px] font-black">{estado}</Badge>;
    }
  };

  return (
    <div className="overflow-x-auto w-full">
      <Table className="min-w-full">
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-b border-slate-100">
            <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">ID / Consecutivo</TableHead>
            <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Fecha y Hora</TableHead>
            <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Ruta de Custodia</TableHead>
            <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Conductor</TableHead>
            <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400 text-right">Valor Declarado</TableHead>
            <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400 text-right">Tarifa Total</TableHead>
            <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400 text-center">Estado</TableHead>
            <TableHead className="w-[50px] p-5"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={8} className="p-20 text-center text-slate-400 uppercase font-black text-xs animate-pulse">Consultando envíos...</TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="p-20 text-center text-slate-400 uppercase font-black text-xs opacity-40">No hay envíos registrados</TableCell></TableRow>
          ) : (
            data.map((envio) => (
              <TableRow key={envio.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                <TableCell className="p-5">
                  <Badge variant="outline" className="font-black text-orange-600 border-orange-100 bg-orange-50/30">
                    {envio.consecutivo}
                  </Badge>
                </TableCell>
                
                <TableCell className="p-5">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-700 uppercase">{envio.fecha}</span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {envio.hora}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="p-5">
                  <div className="flex items-center gap-2 max-w-[200px]">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-slate-800 truncate" title={envio.origen}>{envio.origen}</span>
                      <ArrowRight className="h-2 w-2 text-slate-300 my-0.5" />
                      <span className="text-[10px] font-black text-slate-500 truncate" title={envio.destino}>{envio.destino}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="p-5">
                  {envio.conductorNombre ? (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                        {envio.conductorNombre.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase truncate max-w-[120px]">
                        {envio.conductorNombre}
                      </span>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onAsignar(envio)}
                      className="h-8 rounded-lg border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 text-[10px] font-black uppercase px-3 animate-pulse"
                    >
                      <UserPlus className="h-3 w-3 mr-1.5" /> Sin Asignar
                    </Button>
                  )}
                </TableCell>

                <TableCell className="p-5 text-right">
                  <span className="text-xs font-bold text-slate-500">
                    {currencyFormatter.format(envio.valorDeclarado)}
                  </span>
                </TableCell>

                <TableCell className="p-5 text-right">
                  <span className="text-sm font-black text-slate-900">
                    {currencyFormatter.format(envio.tarifaTotal)}
                  </span>
                </TableCell>

                <TableCell className="p-5 text-center">
                  {getStatusBadge(envio.estado)}
                </TableCell>

                <TableCell className="p-5 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl shadow-xl border-slate-100">
                      <DropdownMenuItem className="rounded-lg font-bold text-xs py-2.5">
                        <Eye className="mr-2 h-4 w-4 text-slate-400" /> Ver Detalles
                      </DropdownMenuItem>
                      {!envio.conductorId && (
                        <DropdownMenuItem onClick={() => onAsignar(envio)} className="rounded-lg font-bold text-xs py-2.5 text-orange-600 bg-orange-50/50">
                          <UserCheck className="mr-2 h-4 w-4" /> Asignar Conductor
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem onClick={() => onCancelar(envio.id)} className="text-red-600 rounded-lg font-bold text-xs py-2.5 hover:bg-red-50">
                        <XCircle className="mr-2 h-4 w-4" /> Cancelar Envío
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
