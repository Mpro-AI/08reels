import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Suspense fallback={<div className="text-muted-foreground">載入中...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
