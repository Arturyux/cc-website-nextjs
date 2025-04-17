"use client";

import Blop from "@/components/Blop";
import ActivitiesPage from "@/pages/ActivitiesPage";
import Main from "@/pages/Main";
import BoardMembers from "@/pages/BoardMembers";
import Header from "@/components/Header";
import DropPath from "@/components/DropPath";


export default function Home() {
  return (
    <>
    <div>
      <Blop />
    </div>
      {/* <DropPath /> */}
      <div className="relative z-10 p-8 mt-50">
        <Main />
        <div className="h-[30vh]"></div>
        <ActivitiesPage />
        <BoardMembers />
        <Header />
      </div>
    </>
  );
}