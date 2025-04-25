"use client";

import Blop from "@/components/Blop";
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
      <div className="relative z-10 p-8 mt-50">
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
        <section id="sponsors-section" className="mb-[10vh]">
          <SponsorsCarousel />
        </section>
      </div>
      <footer className="bg-gray-50 border-t border-gray-200 mt-16 py-6">
      <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
        <p className="mb-1">
          &copy; 2025 Culture Connection
        </p>
        <p>
          website made by Artur Burlakin
        </p>
      </div>
    </footer>
    </>
  );
}