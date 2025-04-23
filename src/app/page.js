"use client";

import Blop from "@/components/Blop";
import Background from "@/components/Background";
import ActivitiesPage from "@/pages/ActivitiesPage";
import Main from "@/pages/Main";
import BoardMembers from "@/pages/BoardMembers";
import SponsorsCarousel from "@/pages/SponsorsCarousel";
import Header from "@/components/Header";
import DropPath from "@/components/DropPath";

export default function Home() {
  return (
    <>
      <Background />
      {/* <DropPath /> */}
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
    </>
  );
}