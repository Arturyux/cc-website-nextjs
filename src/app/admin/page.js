"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import UserManagement from "@/components/admin/UserManagement";
import Link from "next/link";

export default function AdminPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const isAdmin = user?.publicMetadata?.admin === true;

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn || !isAdmin) {
        redirect("/");
      }
    }
  }, [isLoaded, isSignedIn, isAdmin]);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading admin access...
      </div>
    );
  }

  if (isSignedIn && isAdmin) {
    return (
      <>
        <Link
            href="/"
            className="block w-full text-center text-2xl px-4 py-2 text-purple-700 hover:bg-purple-50 rounded font-semibold"
          >
            Home
        </Link>
        <main className="container mx-auto px-4 py-24 md:py-32">
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h1 className="text-3xl font-bold text-purple-700 mb-6 border-b pb-3">
              Admin Panel
            </h1>
            <p className="mb-4 text-gray-700">
              Welcome, Admin {user?.firstName || user?.fullName || "User"}!
            </p>

            <UserManagement />
          </div>
        </main>
      </>
    );
  }

  return null;
}
