"use client";

import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/Header";
import { BackgroundAchievements } from "@/components/Background";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AchievementBadge from "@/components/Achievements/AchievementBadge";
import AchievementModal from "@/components/Achievements/AchievementModal";
import AddEditAchievementModal from "@/components/Achievements/AddEditAchievementModal";
import QRCodeGrantModal from "@/components/Achievements/QRCodeGrantModal";
import ScannerModal from "@/components/ScannerModal";
import { AnimatePresence } from "framer-motion";
import toast, { Toaster } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';

const fetchAchievements = async () => {
    const response = await fetch("/api/achievements");
    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch achievements. Status: ${response.status}. ${errorData}`);
    }
    return response.json();
};

const createAchievement = async (newAchievementData) => {
    const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAchievementData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        throw new Error(errorData.message || "Failed to create achievement");
    }
    return response.json();
};

const editAchievement = async (updatedAchievementData) => {
    const response = await fetch("/api/achievements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAchievementData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        throw new Error(errorData.message || "Failed to update achievement");
    }
    return response.json();
};

const deleteAchievement = async (achievementId) => {
    const response = await fetch(`/api/achievements?id=${achievementId}`, {
        method: "DELETE",
    });
     if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        throw new Error(errorData.message || "Failed to delete achievement");
    }
    return response.json();
};

const patchUserAchievement = async (payload) => {
    let body = { ...payload };
    if (!body.action || !body.achievementId || !body.targetUserId) {
        throw new Error("Invalid payload for patchUserAchievement");
    }

    const response = await fetch("/api/achievements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
     if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        throw new Error(errorData.message || `Failed to ${body.action}`);
    }
    return response.json();
};

const fetchAllUsers = async () => {
    const response = await fetch('/api/user');
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        throw new Error(errorData.message || "Failed to fetch users");
    }
    return response.json();
};

const scanQrCodeApi = async (scannedData) => {
  const response = await fetch("/api/qr/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scannedData }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.message || `Scan processing failed with status ${response.status}`,
    );
  }
  return result;
};


export default function AchievementsPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const queryClient = useQueryClient();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [selectedAchievementForDetail, setSelectedAchievementForDetail] = useState(null);
  const [achievementToEdit, setAchievementToEdit] = useState(null);
  const [achievementForQrCode, setAchievementForQrCode] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const canManage = isUserLoaded && user && (user.publicMetadata?.admin === true || user.publicMetadata?.committee === true);
  const isAdmin = isUserLoaded && user && user.publicMetadata?.admin === true;

  const {
      data: achievementsData,
      isLoading: isAchievementsLoading,
      isError: isAchievementsError,
      error: achievementsError
  } = useQuery({
      queryKey: ["achievements"],
      queryFn: fetchAchievements,
      enabled: isUserLoaded,
  });

  const {
      data: allUsersData,
      isLoading: isLoadingUsers,
      isError: isUsersError,
      error: usersError
  } = useQuery({
      queryKey: ['allUsers'],
      queryFn: fetchAllUsers,
      enabled: !!canManage,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
  });


  const commonMutationOptions = {
     onError: (error, variables, context) => {
        console.error("Mutation failed:", error);
        toast.error(`Error: ${error.message}`);
     },
  };

  const createAchievementMutation = useMutation({
    mutationFn: createAchievement,
    ...commonMutationOptions,
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['achievements'] });
        closeAddEditModal();
        toast.success("Achievement created!");
    }
  });

  const editAchievementMutation = useMutation({
    mutationFn: editAchievement,
    ...commonMutationOptions,
     onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['achievements'] });
        closeAddEditModal();
        toast.success("Achievement updated!");
    }
  });

   const deleteAchievementMutation = useMutation({
    mutationFn: deleteAchievement,
    ...commonMutationOptions,
     onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['achievements'] });
        toast.success(data.message || "Achievement deleted.");
    }
  });

   const patchUserAchievementMutation = useMutation({
     mutationFn: patchUserAchievement,
     onMutate: async (payload) => {
       const { achievementId, targetUserId, action } = payload;
       await queryClient.cancelQueries({ queryKey: ['achievements'] });
       const previousAchievements = queryClient.getQueryData(['achievements']);
       queryClient.setQueryData(['achievements'], (oldData) => {
         if (!oldData) return oldData;
         const achIndex = oldData.findIndex(ach => ach.id === achievementId);
         if (achIndex === -1) return oldData;
         const achievementToUpdate = oldData[achIndex];
         const userHas = achievementToUpdate.userHas || [];
         const userIndex = userHas.findIndex(u => u.userID === targetUserId);
         let newUserEntry = null;
         let updatedUserHas = [...userHas];
         const currentUserEntry = userIndex !== -1 ? userHas[userIndex] : { userID: targetUserId, achived: false, attendanceCount: 0, score: null, date: null };

         if (action === 'setAchieved') {
           const { achieved } = payload;
           newUserEntry = {
             ...currentUserEntry,
             achived: achieved,
             date: achieved ? new Date().toISOString() : null,
             attendanceCount: achieved ? currentUserEntry.attendanceCount : 0,
             score: achieved ? currentUserEntry.score : null,
           };
         } else if (action === 'updateCount') {
           const { countChange } = payload;
           const newCount = Math.max(0, (currentUserEntry.attendanceCount || 0) + countChange);
           let achieved = currentUserEntry.achived;
           let date = currentUserEntry.date;
           if (!achieved && achievementToUpdate.attendanceNeed && newCount >= achievementToUpdate.attendanceNeed) {
               achieved = true;
               date = new Date().toISOString();
           }
           newUserEntry = {
             ...currentUserEntry,
             attendanceCount: newCount,
             achived: achieved,
             date: date,
           };
         } else if (action === 'updateScore') {
           const { score } = payload;
           newUserEntry = {
             ...currentUserEntry,
             score: (typeof score === 'number' && !isNaN(score)) ? score : 0,
           };
         } else {
           return oldData;
         }

         if (userIndex !== -1) {
           updatedUserHas[userIndex] = newUserEntry;
         } else {
           updatedUserHas.push(newUserEntry);
         }

         const updatedAchievement = {
           ...achievementToUpdate,
           userHas: updatedUserHas,
         };

         const newData = [...oldData];
         newData[achIndex] = updatedAchievement;
         return newData;
       });
       return { previousAchievements };
     },
     onError: (err, payload, context) => {
       toast.error(`Update failed: ${err.message}. Reverting.`);
       if (context?.previousAchievements) {
         queryClient.setQueryData(['achievements'], context.previousAchievements);
       }
       throw err;
     },
     onSettled: (data, error, payload, context) => {
       console.log("onSettled: Refetching achievements after mutation.");
       queryClient.invalidateQueries({ queryKey: ['achievements'] });
     },
   });

   const scanQrCodeMutation = useMutation({
     mutationFn: scanQrCodeApi,
     onSuccess: (data) => {
       toast.success(data.message || "Scan processed successfully!");
       queryClient.invalidateQueries({ queryKey: ["achievements"] });
       closeScannerModal();
     },
     onError: (error) => {
       console.error("Scan mutation failed:", error);
       toast.error(`Scan Error: ${error.message}`);
     },
   });

  const { groupedAchievements, sortedCategoryNames: allSortedCategoryNames } = useMemo(() => {
    if (!achievementsData) return { groupedAchievements: {}, sortedCategoryNames: [] };
    const visibleAchievements = achievementsData.filter(ach => ach.isEnabled || canManage);
    const groups = {};
    const categorySet = new Set();
    let hasUncategorized = false;
    visibleAchievements.forEach(ach => {
      const category = ach.category || "Uncategorized";
      if (category !== "Uncategorized") {
          categorySet.add(category);
      } else {
          hasUncategorized = true;
      }
      if (!groups[category]) { groups[category] = []; }
      groups[category].push(ach);
    });
    const sortedNames = Array.from(categorySet).sort((a, b) => a.localeCompare(b));
    if (hasUncategorized) {
        sortedNames.push("Uncategorized");
    }
    return { groupedAchievements: groups, sortedCategoryNames: sortedNames };
  }, [achievementsData, canManage]);


  const { displayedAchievements, displayMode, categoriesToDisplay } = useMemo(() => {
    if (!achievementsData) return { displayedAchievements: {}, displayMode: 'loading', categoriesToDisplay: [] };

    let processedAchievements = achievementsData.filter(ach => ach.isEnabled || canManage);

    processedAchievements.sort((a, b) => {
        const achievedCompare = (b.currentUserAchieved ? 1 : 0) - (a.currentUserAchieved ? 1 : 0);
        if (achievedCompare !== 0) {
            return achievedCompare;
        }
        return a.title.localeCompare(b.title);
    });

    let filteredForDisplay = processedAchievements;
    let finalDisplayMode = filterMode;

    if (filterMode === 'achieved') {
        filteredForDisplay = processedAchievements.filter(ach => ach.currentUserAchieved);
    } else if (filterMode === 'uncompleted') {
        filteredForDisplay = processedAchievements.filter(ach => !ach.currentUserAchieved);
    } else if (filterMode === 'category' && selectedCategory) {
        filteredForDisplay = processedAchievements.filter(ach => (ach.category || "Uncategorized") === selectedCategory);
    }

    const groups = {};
    filteredForDisplay.forEach(ach => {
        const category = ach.category || "Uncategorized";
        if (!groups[category]) { groups[category] = []; }
        groups[category].push(ach);
    });

    let categoriesToRender = Object.keys(groups).sort((a, b) => {
        if (a === "Uncategorized") return 1;
        if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
    });

    return {
        displayedAchievements: groups,
        displayMode: finalDisplayMode,
        categoriesToDisplay: categoriesToRender
    };

  }, [achievementsData, canManage, filterMode, selectedCategory]);


  const openDetailModal = (achievement) => {
    setSelectedAchievementForDetail(achievement);
    setIsDetailModalOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedAchievementForDetail(null);
    document.body.style.overflow = "";
  };

  const openAddModal = () => {
    setAchievementToEdit(null);
    setIsAddEditModalOpen(true);
    document.body.style.overflow = "hidden";
  };
  const openEditModal = (achievement) => {
    setAchievementToEdit(achievement);
    setIsAddEditModalOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setAchievementToEdit(null);
    document.body.style.overflow = "";
  };

  const openQrCodeModal = (achievement) => {
    setAchievementForQrCode(achievement);
    setIsQrCodeModalOpen(true);
    setIsDetailModalOpen(false);
    setSelectedAchievementForDetail(null);
    document.body.style.overflow = "hidden";
  };
  const closeQrCodeModal = () => {
    setIsQrCodeModalOpen(false);
    setAchievementForQrCode(null);
    document.body.style.overflow = "";
  };

  const openScannerModal = () => {
      if (!user) {
          toast.error("Please sign in to scan QR codes.");
          return;
      }
      setIsScannerModalOpen(true);
      document.body.style.overflow = "hidden";
  };
  const closeScannerModal = () => {
      setIsScannerModalOpen(false);
      document.body.style.overflow = "";
  };

  const handleAddEditSubmit = (achievementData) => {
    if (achievementToEdit) {
        editAchievementMutation.mutate(achievementData);
    } else {
        createAchievementMutation.mutate(achievementData);
    }
  };

  const handleDeleteClick = (achievementId) => {
       if (confirm(`Are you sure you want to delete achievement ${achievementId}? This cannot be undone.`)) {
           deleteAchievementMutation.mutate(achievementId);
           if (selectedAchievementForDetail?.id === achievementId) closeDetailModal();
           if (achievementToEdit?.id === achievementId) closeAddEditModal();
           if (achievementForQrCode?.id === achievementId) closeQrCodeModal();
       }
   };

   const handleFilterClick = (mode, category = null) => {
      setFilterMode(mode);
      setSelectedCategory(category);
  };

  const handleScanSuccess = (decodedText) => {
      if (scanQrCodeMutation.isPending) return;
      scanQrCodeMutation.mutate(decodedText);
  };

  const handleScanError = (errorMessage) => {
      toast.error(`Scanner Error: ${errorMessage}`);
  };


  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <BackgroundAchievements />
      <div className="relative z-10 p-4 md:p-8 mt-24 md:mt-32">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 className="text-5xl md:text-7xl font-Header text-mainColor font-bold text-center mx-auto sm:text-center flex-grow">
              Achievement Board
            </h1>
            <button
                onClick={openScannerModal}
                className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-md"
                title="Scan Achievement QR Code"
                aria-label="Scan Achievement QR Code"
                disabled={!isUserLoaded}
            >
                <FontAwesomeIcon icon={faQrcode} className="h-6 w-6" />
            </button>
          </div>

          {!isAchievementsLoading && !isAchievementsError && (achievementsData?.length > 0 || allSortedCategoryNames.length > 0) && (
            <div className="flex flex-wrap justify-center gap-2 mb-8 px-4">
              <button
                onClick={() => handleFilterClick('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
                           ${filterMode === 'all'
                             ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                             : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterClick('achieved')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500
                           ${filterMode === 'achieved'
                             ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                             : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              >
                My Badges
              </button>
              <button
                onClick={() => handleFilterClick('uncompleted')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500
                           ${filterMode === 'uncompleted'
                             ? 'bg-gray-600 text-white border-gray-700 shadow-sm'
                             : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              >
                Uncompleted
              </button>
              {allSortedCategoryNames.map((category) => (
                <button
                  key={category}
                  onClick={() => handleFilterClick('category', category)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500
                             ${filterMode === 'category' && selectedCategory === category
                               ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                               : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
          {canManage && (
            <button
                onClick={openAddModal}
                className="flex my-10 px-4 py-2 mx-auto w-64 bg-blue-400 font-bold justify-center text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                disabled={createAchievementMutation.isPending}
            >
                + Add Badge
            </button>
          )}

          {isAchievementsLoading && ( <p className="text-center text-gray-500 text-lg">Loading badges...</p> )}
          {isAchievementsError && ( <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-300">Error loading badges: {achievementsError instanceof Error ? achievementsError.message : "Unknown error"}</p> )}
          {!isAchievementsLoading && !isAchievementsError && categoriesToDisplay.length === 0 && (
             <p className="text-center text-gray-500 text-lg mt-10">
                {filterMode === 'achieved' ? 'You haven\'t achieved any badges yet!' :
                 filterMode === 'uncompleted' ? 'No uncompleted badges found (Great job!)' :
                 filterMode === 'category' && selectedCategory ? `No badges found in the '${selectedCategory}' category.` :
                 'No achievement badges found.'}
             </p>
          )}

          {!isAchievementsLoading && !isAchievementsError && categoriesToDisplay.length > 0 && (
            <>
              {categoriesToDisplay.map((category) => (
                <section key={category} className="mb-12">
                  <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 border-b-2 border-gray-300 pb-2 mb-6">
                    {category}
                  </h2>
                  <div className="bg-gray-400/80 p-4 md:p-6 rounded-lg shadow-xl border-4 border-gray-900/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 justify-items-center">
                      {displayedAchievements[category]?.map((achievement) => (
                        <AchievementBadge
                          key={achievement.id}
                          achievement={achievement}
                          isAdminView={canManage}
                          onOpenModal={openDetailModal}
                        />
                      ))}
                      {(!displayedAchievements[category] || displayedAchievements[category].length === 0) && (
                          <p className="col-span-full text-center text-gray-700 italic">No badges in this category for the current filter.</p>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </>
          )}
        </main>
      </div>
       <footer className="bg-gray-50 border-t border-gray-200 mt-16 py-6 relative z-10"><div className="container mx-auto px-4 text-center text-gray-600 text-sm"><p className="mb-1">&copy; 2025 Culture Connection</p><p>website made by Artur Burlakin</p></div></footer>

      <AchievementModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        achievementData={selectedAchievementForDetail}
        isAdminOrCommittee={canManage}
        onEdit={() => selectedAchievementForDetail && openEditModal(selectedAchievementForDetail)}
        onDelete={() => selectedAchievementForDetail && handleDeleteClick(selectedAchievementForDetail.id)}
        onOpenQrCodeModal={() => selectedAchievementForDetail && openQrCodeModal(selectedAchievementForDetail)}
      />

      <AddEditAchievementModal
        isOpen={isAddEditModalOpen}
        onClose={closeAddEditModal}
        onSubmit={handleAddEditSubmit}
        initialData={achievementToEdit}
        isLoading={createAchievementMutation.isPending || editAchievementMutation.isPending}
        error={createAchievementMutation.error?.message || editAchievementMutation.error?.message}
        availableCategories={allSortedCategoryNames}
      />

      <QRCodeGrantModal
         isOpen={isQrCodeModalOpen}
         onClose={closeQrCodeModal}
         achievementData={achievementForQrCode}
         patchUserMutation={patchUserAchievementMutation}
         isAdmin={isAdmin}
         usersData={allUsersData}
         isLoadingUsers={isLoadingUsers}
         isUsersError={isUsersError}
         usersError={usersError}
       />

       <ScannerModal
         isOpen={isScannerModalOpen}
         onClose={closeScannerModal}
         onScanSuccess={handleScanSuccess}
         onScanError={handleScanError}
       />

    </>
  );
}
