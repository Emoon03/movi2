'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Login failed.');
        return;
      }

      const data = await response.json();

      // Save the token in localStorage
      localStorage.setItem('token', data.token); 
      // alert('Login successful!');
      console.log('Logged-in user:', data.user);

      // Redirect to a protected route or dashboard
      window.location.href = '/';
    } catch (err) {
      console.error('Error during login:', err);
      alert('An error occurred.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full mt-4">Login</Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-center w-full">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:underline">
                Register here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}

