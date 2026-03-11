'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type UserFormValue = z.infer<typeof formSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithEmail, signupWithEmail } = useAuth();

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
          <Icons.logo className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">08 Reels</CardTitle>
        <CardDescription>
          {isLoginView ? 'Sign in to your account' : 'Create a new account'}
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
                  <FormLabel>Email</FormLabel>
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>
        </Form>
        <p className="mt-4 px-8 text-center text-sm text-muted-foreground">
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="underline underline-offset-4 hover:text-primary"
          >
            {isLoginView ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
