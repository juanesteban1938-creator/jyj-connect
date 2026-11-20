
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirección del lado del cliente para mejorar el tiempo de respuesta inicial
    // y evitar sobrecarga del servidor en el arranque de la vista previa.
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#f4f6f8]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-2 w-32 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Sincronizando Nova...
        </p>
      </div>
    </div>
  );
}
