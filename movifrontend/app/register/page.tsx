'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function Register() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, password, profile_img: null }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Registration failed.');
        return;
      }

      const data = await response.json();
      alert('Registration successful. You can now log in!');
      console.log('Registered user:', data.user);
      window.location.href = '/login';
    } catch (err) {
      console.error('Error during registration:', err);
      alert('An error occurred.');
    }
  };



  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>Create a new account to access Movi</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Username</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full mt-4">Register</Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-center w-full">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Login here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}

