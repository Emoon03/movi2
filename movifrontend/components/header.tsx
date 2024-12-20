"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { User, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"

// Interface to define the structure of the User object
interface User {
  id: number
  username: string
  profile_img: string | null
}

// Helper function to parse a JWT token and extract payload
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1] // Extract the payload part of the token
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload) // Convert the payload to a JSON object
  } catch (error) {
    console.error('Error parsing JWT:', error)
    return null
  }
}

export function Header() {
  const router = useRouter() // Next.js router for navigation
  const [user, setUser] = useState<User | null>(null) // State for storing user information
  const [open, setOpen] = useState(false) // State for dropdown menu visibility

  useEffect(() => {
    // Retrieve token and user data from localStorage
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    console.log('=== Auth Debug Logs ===')
    console.log('Token:', token)
    console.log('Raw User Data:', userData)
    
    if (token) {
      try {
        let userInfo: User | null = null

        if (userData) {
          // Parse user data if available in localStorage
          userInfo = JSON.parse(userData)
        } else {
          // Extract user info from the token if user data is not in localStorage
          const decodedToken = parseJwt(token)
          console.log('Decoded token:', decodedToken)
          
          if (decodedToken && decodedToken.id && decodedToken.username) {
            userInfo = {
              id: decodedToken.id,
              username: decodedToken.username,
              profile_img: null
            }
            // Save the extracted user info in localStorage
            localStorage.setItem('user', JSON.stringify(userInfo))
          }
        }

        if (userInfo) {
          console.log('Setting user:', userInfo)
          setUser(userInfo) // Update user state with the retrieved info
        } else {
          console.log('No valid user info found')
          localStorage.removeItem('token') // Clear invalid token
          localStorage.removeItem('user') // Clear invalid user data
        }
      } catch (error) {
        console.error('Error setting up user:', error)
        localStorage.removeItem('token') // Handle errors by clearing storage
        localStorage.removeItem('user')
      }
    }
  }, []) // Run on component mount

  // Function to handle user logout
  const handleLogout = () => {
    console.log('Logging out...')
    localStorage.removeItem('token') // Remove token from localStorage
    localStorage.removeItem('user') // Remove user data from localStorage
    setUser(null) // Clear user state
    router.push('/login') // Redirect to login page
  }

  return (
    <header className="bg-[#1a1f2c] text-white py-4 shadow-md relative z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo link */}
        <Link href="/" className="text-2xl font-bold">
          Movi
        </Link>
        <div className="flex items-center gap-6">
          {/* Conditional rendering based on user authentication */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Display the username */}
              <span className="text-sm font-medium text-gray-200">
                {user.username}
              </span>
              {/* Dropdown menu for user options */}
              <DropdownMenuPrimitive.Root 
                open={open} 
                onOpenChange={(newOpen) => {
                  console.log('Dropdown state changing to:', newOpen)
                  setOpen(newOpen)
                }}
              >
                <DropdownMenuPrimitive.Trigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-full bg-[#2a2f3c] hover:bg-[#3a3f4c] focus:ring-2 focus:ring-blue-500"
                    onClick={() => console.log('Dropdown trigger clicked')}
                  >
                    {/* User profile image or fallback icon */}
                    {user.profile_img ? (
                      <img
                        src={user.profile_img}
                        alt={user.username}
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <User className="h-4 w-4 text-gray-200" />
                    )}
                  </Button>
                </DropdownMenuPrimitive.Trigger>

                {/* Dropdown content */}
                <DropdownMenuPrimitive.Portal>
                  <DropdownMenuPrimitive.Content
                    align="end"
                    className="z-50 min-w-[200px] mt-2 bg-[#2a2f3c] text-white rounded-md shadow-lg border border-gray-700 p-2 radix-dropdown-content"
                    sideOffset={5}
                  >
                    {/* View Profile Option */}
                    <DropdownMenuPrimitive.Item className="relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-[#3a3f4c] hover:text-white">
                      <Link href={`/profile/${user.username}`} className="w-full flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        View Profile
                      </Link>
                    </DropdownMenuPrimitive.Item>

                    {/* Separator */}
                    <DropdownMenuPrimitive.Separator className="my-1 h-px bg-gray-700" />

                    {/* Logout Option */}
                    <DropdownMenuPrimitive.Item 
                      onClick={handleLogout}
                      className="relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-[#3a3f4c] text-red-400 hover:text-red-300"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuPrimitive.Item>
                  </DropdownMenuPrimitive.Content>
                </DropdownMenuPrimitive.Portal>
              </DropdownMenuPrimitive.Root>
            </div>
          ) : (
            // Render sign-in option if no user is logged in
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="text-sm text-gray-200 hover:text-white transition-colors"
              >
                Sign in?
              </Link>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-full bg-[#2a2f3c] hover:bg-[#3a3f4c] focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  console.log('Login button clicked, redirecting to login')
                  router.push('/login')
                }}
              >
                <User className="h-4 w-4 text-gray-200" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
