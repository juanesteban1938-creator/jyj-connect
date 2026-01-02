import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const loginBg = PlaceHolderImages.find((img) => img.id === 'login-background');

  return (
    <div className="h-screen w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="relative hidden bg-muted lg:block">
        {loginBg && (
          <Image
            src={loginBg.imageUrl}
            alt={loginBg.description}
            width={1200}
            height={1800}
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            data-ai-hint={loginBg.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 text-white">
          <h1 className="font-headline text-4xl font-bold">Transportes Especiales J&J</h1>
          <p className="font-body text-xl">J&J Connect</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <LoginForm />
      </div>
    </div>
  );
}
