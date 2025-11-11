'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().email({ message: '請輸入有效的電子郵件地址' }),
  password: z.string().min(6, { message: '密碼長度至少需要 6 個字元' }),
});

type UserFormValue = z.infer<typeof formSchema>;

// Simple inline SVG for Google Icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const { toast } = useToast();

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const redirectToDashboard = () => {
    const redirectUrl = searchParams.get('redirect') || '/';
    router.push(redirectUrl);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const success = await loginWithGoogle();
    if (success) {
      redirectToDashboard();
    } else {
      setIsGoogleLoading(false);
    }
  };
  
  const onSubmit = async (data: UserFormValue) => {
    setIsLoading(true);
    let success = false;
    if (isLoginView) {
        success = await loginWithEmail(data.email, data.password);
    } else {
        success = await signupWithEmail(data.email, data.password);
    }

    if (success) {
        redirectToDashboard();
    } else {
        setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
            <Icons.logo className="h-12 w-12 text-primary"/>
        </div>
        <CardTitle className="text-2xl font-headline">Reels 08小隊</CardTitle>
        <CardDescription>
            {isLoginView ? '登入您的帳號' : '建立一個新帳號'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>電子郵件</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密碼</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading ? '處理中...' : (isLoginView ? '登入' : '註冊')}
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">或繼續使用</span>
            </div>
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={isLoading || isGoogleLoading} onClick={handleGoogleLogin}>
            {isGoogleLoading ? (
              '處理中...'
            ) : (
              <>
                <GoogleIcon className="mr-2" />
                Google 帳號
              </>
            )}
        </Button>
        <p className="mt-4 px-8 text-center text-sm text-muted-foreground">
            <button onClick={() => setIsLoginView(!isLoginView)} className="underline underline-offset-4 hover:text-primary">
                {isLoginView ? '還沒有帳號嗎？註冊一個' : '已經有帳號了？直接登入'}
            </button>
        </p>
      </CardContent>
    </Card>
  );
}

    
