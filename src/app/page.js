"use client";

import Blop from "@/components/Blop";
import ActivitiesPage from "@/pages/ActivitiesPage";
import Main from "@/pages/Main";
import BoardMembers from "@/pages/BoardMembers";
import SponsorsCarousel from "@/pages/SponsorsCarousel";
import Header from "@/components/Header";
import DropPath from "@/components/DropPath";


export default function Home() {
  return (
    <>
      {/* <DropPath /> */}
      <div className="relative z-10 p-8 mt-50">
        <Header />
        <section>
        <Main />
        </section>
        <section className="h-[30vh]"></section>
        <ActivitiesPage />
        <section>
        <BoardMembers />
        </section>
        <section className="mb-[10vh]">
        <SponsorsCarousel />
        </section>
        
      </div>
    </>
  );
}