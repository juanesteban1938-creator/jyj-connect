'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Monitor } from "lucide-react";

export default function MonitoreoPage() {
  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Monitoreo</h1>
        <p className="page-subtitle">Seguimiento en tiempo real de la operación J&J.</p>
      </header>
      
      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle>Estado de la Flota</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            El sistema de monitoreo GPS se encuentra en proceso de sincronización con Nova...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
