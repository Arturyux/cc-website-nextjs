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
import CombinedFileManager from "@/components/admin/DriveManagment/CombinedFileManager";

const adminSections = [
  { key: "users", label: "User Management", component: UserManagement },
  { key: "cards", label: "Activities/Cards", component: CardManagement },
  { key: "boardMembers", label: "Board Members", component: BoardMemberManagement },
  { key: "linktree", label: "Linktree Links", component: LinktreeManagement },
  { key: "sponsors", label: "Sponsors", component: SponsorManagement },
  { key: "discord", label: "Discord Bot", component: DiscordBotControl },
  { key: "driveFiles", label: "Drive Files", component: CombinedFileManager },
];

export default function AdminPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const isAdmin = user?.publicMetadata?.admin === true;
  const [activeSectionKey, setActiveSectionKey] = useState(adminSections[0].key);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirect("/");
    }
  }, [isLoaded, isSignedIn]);

  const handleSectionChange = (event) => {
    setActiveSectionKey(event.target.value);
  };

  const ActiveComponent = adminSections.find(
    (section) => section.key === activeSectionKey,
  )?.component;

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading admin access...
      </div>
    );
  }

  if (!isSignedIn || !isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Access Denied. You must be an administrator.
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 min-h-screen">
        <div className="flex flex-col sm:flex-row justify-center sm:items-center mb-6 border-b pb-4 gap-4">
          <h1 className="text-3xl text-center font-bold text-purple-700">
            Admin Panel
          </h1>
        </div>
        <p className="mb-6 text-3xl text-center text-black">
          Welcome, {user?.firstName || user?.fullName || "Admin"}!
        </p>

        <div className="flex flex-col items-center gap-4">
          <label
            htmlFor="admin-section-select"
            className="block text-2xl font-Main font-bold"
          >
            Admin Configuration Options:
          </label>
          <select
            id="admin-section-select"
            value={activeSectionKey}
            onChange={handleSectionChange}
            className="block w-full max-w-xs mx-auto text-Main border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
          >
            {adminSections.map((section) => (
              <option key={section.key} value={section.key}>
                {section.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-8">
          {ActiveComponent ? (
            <ActiveComponent />
          ) : (
            <p className="text-center">Select a section to manage.</p>
          )}
        </div>
      </div>
    </main>
  );
}
