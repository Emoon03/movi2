'use client'

import { Header } from '@/components/header'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Login() {

  const handleLogout = () => {
    localStorage.removeItem('token'); 
    // alert('You have been logged out.');

    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle>Logout</CardTitle>
            <CardDescription>Click below to confirm you want to logout</CardDescription>
          </CardHeader>
          <div className="flex items-center justify-center mt-6">
            <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2">
              Logout
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
