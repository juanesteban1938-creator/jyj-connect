import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardHomePage() {
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Página de Inicio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">Bienvenido a J&J Connect V2.0</p>
        </CardContent>
      </Card>
    </div>
  );
}
