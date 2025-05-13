"use client";

import Background from "@/components/Background";
import ActivitiesPage from "@/pages/ActivitiesPage";
import Main from "@/pages/Main";
import BoardMembers from "@/pages/BoardMembers";
import SponsorsCarousel from "@/pages/SponsorsCarousel";
import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Background />
      <div className="relative z-10 p-8 mt-30">
        <Header />
        <section id="home-section">
          <Main />
        </section>
        <section className="h-[30vh]"></section>
        <section id="events-section">
          <ActivitiesPage />
        </section>
        <section id="team-section">
          <BoardMembers />
        </section>
        <section id="sponsors-section">
          <SponsorsCarousel />
        </section>
      </div>
      <footer className="bg-gray-50 border-t border-gray-200 py-6">
      <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
        <p className="mb-1">
          &copy; 2025 Culture Connection
        </p>
        <p>
          by Artur Burlakin
        </p>
      </div>
    </footer>
    </>
  );
}