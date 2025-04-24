// src/app/admin/page.js
"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

// Import Management Components
import UserManagement from "@/components/admin/UserManagement";
import CardManagement from "@/components/admin/CardManagement";
import BoardMemberManagement from "@/components/admin/BoardMemberManagement";
import LinktreeManagement from "@/components/admin/LinktreeManagement";
import SponsorManagement from "@/components/admin/SponsorManagement";
import DiscordBotControl from "@/components/admin/DiscordBotControl";

const adminSections = [
  { key: 'users', label: 'User Management', component: UserManagement },
  { key: 'cards', label: 'Activities/Cards', component: CardManagement },
  { key: 'boardMembers', label: 'Board Members', component: BoardMemberManagement },
  { key: 'linktree', label: 'Linktree Links', component: LinktreeManagement },
  { key: 'sponsors', label: 'Sponsors', component: SponsorManagement },
  { key: 'discord', label: 'Discord Bot', component: DiscordBotControl },
];

export default function AdminPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const isAdmin = user?.publicMetadata?.admin === true;

  // State to track the currently selected section
  const [activeSectionKey, setActiveSectionKey] = useState(adminSections[0].key);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirect("/");
    }
  }, [isLoaded, isSignedIn]);

  const handleSectionChange = (event) => {
    setActiveSectionKey(event.target.value);
  };

  const ActiveComponent = adminSections.find(section => section.key === activeSectionKey)?.component;

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading admin access...
      </div>
    );
  }

  if (isSignedIn && isAdmin) {
    return (
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 min-h-screen">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b pb-4 gap-4">
            <h1 className="text-3xl font-bold text-purple-700">
              Admin Panel
            </h1>
          </div>

          <p className="mb-6 text-gray-700">
            Welcome, Admin {user?.firstName || user?.fullName || "User"}!
          </p>
          <p className="block text-center mx-auto w-full text-2xl font-Main font-bold">Admin Configuration options</p>
            <div>
              <select
                id="admin-section-select"
                value={activeSectionKey}
                onChange={handleSectionChange}
                className="block w-full mx-auto sm:w-auto text-Main border-gray-300 rounded-md shadow-sm"
              >
                {adminSections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>
          <div className="mt-4">
            {ActiveComponent ? <ActiveComponent /> : <p>Select a section.</p>}
          </div>
        </div>
      </main>
    );
  }

  return null;
}
