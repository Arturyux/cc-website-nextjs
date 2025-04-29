"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/Header";
import { BackgroundEvent } from "@/components/Background";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import GenericActivityModal from "@/components/ActivitiesModal/GenericActivityModal";
import AddEventModal from "@/components/Events/AddEventModal";
import EditEventModal from "@/components/Events/EditEventModal";
import { AnimatePresence } from "framer-motion";
import "react-datepicker/dist/react-datepicker.css";

const EventCard = ({
  event,
  onOpenModal,
  user,
  isUserLoaded,
  attendMutation,
  isAttendingMutationLoading,
  canViewAttendance,
  canManageEvents,
  onOpenEditModal,
  isUserFreezed,
}) => {
  const formatDateTime = (isoDateString) => {
    if (!isoDateString || typeof isoDateString !== "string") return { date: "N/A", time: "N/A" };
    try {
      const dateObj = new Date(isoDateString);
      if (isNaN(dateObj.getTime())) return { date: "Invalid Date", time: "" };
      const dateOptions = { year: "numeric", month: "long", day: "numeric" };
      const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: true };
      return { date: dateObj.toLocaleDateString(undefined, dateOptions), time: dateObj.toLocaleTimeString(undefined, timeOptions) };
    } catch (e) { return { date: "Error", time: "" }; }
  };
  const { date, time } = formatDateTime(event.date);

  const attendeesList = Array.isArray(event.attendeesCounter) ? event.attendeesCounter : [];
  const confirmedAttendees = attendeesList.filter(att => !att.waiting);
  const waitingList = attendeesList.filter(att => att.waiting);
  const confirmedCount = confirmedAttendees.length;
  const waitingCount = waitingList.length;

  const limit = event.attendanceLimit;
  const isLimitActive = event.isLimitEnabled && typeof limit === 'number' && limit > 0;
  const isFull = isLimitActive && confirmedCount >= limit;
  const isCardDisabled = event.cardEnabled === false;

  const currentUserEntry = isUserLoaded && user ? attendeesList.find(att => att.userID === user.id) : null;
  const isCurrentUserConfirmed = !!currentUserEntry && !currentUserEntry.waiting;
  const isCurrentUserWaiting = !!currentUserEntry && currentUserEntry.waiting;

  const shouldEnforceFreeze = typeof event.freezenotallow === 'boolean' ? event.freezenotallow : true;
  const showFreezeMessage = isUserFreezed && shouldEnforceFreeze;
  const showFreezeWarning = shouldEnforceFreeze && isCurrentUserConfirmed && !isUserFreezed;

  const handleAttendClick = () => {
      if (!isUserLoaded || !user || isAttendingMutationLoading || showFreezeMessage) return;
      if (isCurrentUserConfirmed && event.closed === true) return;
      attendMutation.mutate(event.id);
  };

  let buttonText = "";
  let buttonBgClass = "";
  let buttonTextClass = "";
  let buttonHoverBgClass = "";
  let isAttendButtonDisabled = isAttendingMutationLoading || showFreezeMessage || (isCurrentUserConfirmed && event.closed === true);

  if (isAttendingMutationLoading) {
    buttonText = "Updating...";
    buttonBgClass = "bg-gray-200";
    buttonTextClass = "text-gray-500";
    buttonHoverBgClass = "hover:bg-gray-200";
    isAttendButtonDisabled = true;
  } else if (isCurrentUserConfirmed) {
    if (event.closed === true) {
        buttonText = canViewAttendance ? `Attending (Locked)` : "Attending";
        buttonBgClass = "bg-green-200";
        buttonTextClass = "text-green-800";
        buttonHoverBgClass = "hover:bg-green-200";
        isAttendButtonDisabled = true;
    } else {
        buttonText = canViewAttendance ? `Attending (${confirmedCount}${isLimitActive ? `/${limit}` : ''})` : "Attending";
        buttonBgClass = "bg-green-200";
        buttonTextClass = "text-green-800";
        buttonHoverBgClass = "hover:bg-green-300";
    }
  } else if (isCurrentUserWaiting) {
    buttonText = canViewAttendance ? `Waiting List (${waitingCount} waiting)` : "Waiting List";
    buttonBgClass = "bg-yellow-200";
    buttonTextClass = "text-yellow-800";
    buttonHoverBgClass = "hover:bg-yellow-300";
  } else {
    if (isFull) {
      buttonText = canViewAttendance ? `Join Waitlist (${waitingCount} waiting)` : "Join Waitlist";
      buttonBgClass = "bg-orange-200";
      buttonTextClass = "text-orange-800";
      buttonHoverBgClass = "hover:bg-orange-300";
    } else {
      buttonText = canViewAttendance ? `Attend (${confirmedCount}${isLimitActive ? `/${limit}` : ''})` : "Attend";
      buttonBgClass = "bg-blue-200";
      buttonTextClass = "text-blue-800";
      buttonHoverBgClass = "hover:bg-blue-300";
    }
  }

  if (isAttendButtonDisabled && !isAttendingMutationLoading) {
      buttonBgClass = "bg-gray-200";
      buttonTextClass = "text-gray-500";
      buttonHoverBgClass = "hover:bg-gray-200";
  }

  const showAttendanceSection = event.attendees && isUserLoaded && user;

  return (
    <div className={`relative w-full h-full flex flex-col rounded-xl border-2 border-black shadow-black shadow-xl overflow-hidden ${event.cardColor || 'bg-white'} ${isCardDisabled && canManageEvents ? 'opacity-60 border-dashed border-gray-400' : ''}`}>
      {isCardDisabled && canManageEvents && (
          <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full z-10">
              Disabled
          </div>
      )}
      {event.imageUrl && ( <div className="w-full h-40 bg-gray-200"><img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} /></div> )}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-xl font-semibold mb-2 text-gray-900">{event.title}</h3>
        <p className="text-gray-700 mb-1 text-sm"><span className="font-medium text-gray-800">Date:</span> {date}</p>
        <p className="text-gray-700 mb-1 text-sm"><span className="font-medium text-gray-800">Time:</span> {time}</p>
        <p className="text-gray-700 mb-3 text-sm"><span className="font-medium text-gray-800">Location:</span> {event.location}</p>
        <p className="text-gray-800 text-base mb-4 flex-grow line-clamp-3">{event.description}</p>

        {showFreezeWarning && (
            <p className="text-xs text-center p-2 rounded border border-yellow-400 mb-3 bg-yellow-100 text-yellow-800 font-medium">
                If you do not attend this event, your account will be frozen! Contact info@cultureconnection.se if needed!
            </p>
        )}

        {showAttendanceSection && (
          <div className="mt-auto pt-2">
            {showFreezeMessage ? (
              <p className="text-center p-3 rounded border-2 mb-5 border-black bg-red-800/40 text-red-800 font-semibold">
                You are Freezed. Contact info@cultureconnection.se
              </p>
            ) : (
              <button
                onClick={handleAttendClick}
                disabled={isAttendButtonDisabled}
                className={`w-full text-center p-3 mb-5 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 font-semibold ${buttonBgClass} ${buttonTextClass} ${buttonHoverBgClass} ${isAttendingMutationLoading ? "opacity-50 cursor-wait" : ""} ${isAttendButtonDisabled && !isAttendingMutationLoading ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {buttonText}
              </button>
            )}
          </div>
        )}

        <div className={`mt-auto pt-2 flex gap-2 ${ !showAttendanceSection ? 'mt-2 border-t border-gray-300 pt-2' : '' }`}>
            <button onClick={() => onOpenModal(event)} className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-gray-100/70 text-black font-semibold">More Details</button>
            {canManageEvents && (<button onClick={() => onOpenEditModal(event)} className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-green-200 text-black font-semibold">Edit</button>)}
        </div>
      </div>
    </div>
  );
};

const AddEventCard = ({ onClick }) => {
    return (
        <button onClick={onClick} className="bg-white shadow-md rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors aspect-[3/4] md:aspect-auto min-h-[300px]" aria-label="Add new event">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className="text-lg font-medium">Add New Event</span>
        </button>
    );
};

const fetchEvents = async () => {
    const response = await fetch("/api/events");
    if (!response.ok) { const errorData = await response.text(); throw new Error(`Failed to fetch events. Status: ${response.status}. ${errorData}`); }
    return response.json();
};
const attendEvent = async (eventId) => {
    const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId }), });
    if (!response.ok) { let errorData = { message: `Request failed with status ${response.status}` }; try { errorData = await response.json(); } catch (e) {} throw new Error(errorData.message || "Failed to update attendance"); }
    return response.json();
};
const createEvent = async (newEventData) => {
     const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newEventData), });
    if (!response.ok) { let errorData = { message: `Request failed with status ${response.status}` }; try { errorData = await response.json(); } catch (e) {} if (response.status === 403) { throw new Error(errorData.message || "You do not have permission to create events."); } throw new Error(errorData.message || "Failed to create event"); }
    return response.json();
};
const editEvent = async (updatedEventData) => {
    if (!updatedEventData || !updatedEventData.id) { throw new Error("Event ID is required for editing."); }
    const response = await fetch("/api/events", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedEventData), });
    if (!response.ok) { let errorData = { message: `Request failed with status ${response.status}` }; try { errorData = await response.json(); } catch (e) {} if (response.status === 403) { throw new Error(errorData.message || "You do not have permission to edit events."); } throw new Error(errorData.message || "Failed to update event"); }
    return response.json();
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

export default function EventsPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const queryClient = useQueryClient();

  const { data: eventsData, isLoading: isEventsLoading, isError: isEventsError, error: eventsError } = useQuery({
      queryKey: ["events"],
      queryFn: fetchEvents,
      refetchInterval: 5000
  });

  const attendMutation = useMutation({
      mutationFn: attendEvent,
      onSuccess: (updatedEvent) => {
          queryClient.setQueryData(['events'], (oldData) => {
              if (!oldData) return [];
              return oldData.map(event =>
                  event.id === updatedEvent.id ? updatedEvent : event
              );
          });
      },
      onError: (error) => { alert(`Action failed: ${error.message}`); },
  });

  const createEventMutation = useMutation({
      mutationFn: createEvent,
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); },
      onError: (error) => { console.error("Create Event Error:", error); },
  });

  const editEventMutation = useMutation({
      mutationFn: editEvent,
      onSuccess: (updatedEvent) => {
           queryClient.setQueryData(['events'], (oldData) => {
              if (!oldData) return [];
              return oldData.map(event =>
                  event.id === updatedEvent.id ? updatedEvent : event
              );
          });
      },
      onError: (error) => { console.error("Edit Event Error:", error); },
  });

  const canManageEvents = isUserLoaded && user && (user.publicMetadata?.admin === true || user.publicMetadata?.committee === true);
  const canViewAttendance = canManageEvents;
  const isUserFreezed = isUserLoaded && user && user.publicMetadata?.freezed === true;
  const allEvents = eventsData || [];
  const visibleEvents = canManageEvents ? allEvents : allEvents.filter(event => event.cardEnabled !== false);

  const openModal = (event) => { const formatDateTime = (isoDateString) => { if (!isoDateString) return { date: "N/A", time: "N/A" }; try { const dateObj = new Date(isoDateString); if (isNaN(dateObj.getTime())) return { date: "Invalid Date", time: "" }; const dateOptions = { year: "numeric", month: "long", day: "numeric" }; const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: true }; return { date: dateObj.toLocaleDateString(undefined, dateOptions), time: dateObj.toLocaleTimeString(undefined, timeOptions) }; } catch (e) { return { date: "Error", time: "" }; } }; const { date, time } = formatDateTime(event.date); setSelectedEvent({ ...event, date: date, time: time }); document.body.style.overflow = "hidden"; };
  const closeModal = () => { setSelectedEvent(null); document.body.style.overflow = ""; };
  const openAddModal = () => { setIsAddModalOpen(true); document.body.style.overflow = "hidden"; };
  const closeAddModal = () => { setIsAddModalOpen(false); document.body.style.overflow = ""; };
  const openEditModal = (event) => { setEventToEdit(event); setIsEditModalOpen(true); document.body.style.overflow = "hidden"; };
  const closeEditModal = () => { setIsEditModalOpen(false); setEventToEdit(null); document.body.style.overflow = ""; };

  return (
    <>
      <BackgroundEvent />
      <div className="relative z-10 p-4 md:p-8 mt-24 md:mt-32">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center mb-6">
            <h1 className="text-3xl mb-10 md:text-7xl font-Header text-mainColor font-bold text-center">Upcoming Events</h1>
          </div>
          {isEventsLoading && ( <p className="text-center text-gray-500 text-lg">Loading events...</p> )}
          {isEventsError && ( <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-300">Error loading events: {eventsError instanceof Error ? eventsError.message : "Unknown error"}</p> )}
          {!isEventsLoading && !isEventsError && (
            <>
              {visibleEvents.length === 0 && !canManageEvents && ( <p className="text-center text-gray-500 text-lg">No upcoming events found. Check back soon!</p> )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {canManageEvents && <AddEventCard onClick={openAddModal} />}
                {visibleEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onOpenModal={openModal}
                    user={user}
                    isUserLoaded={isUserLoaded}
                    attendMutation={attendMutation}
                    isAttendingMutationLoading={attendMutation.isPending}
                    canViewAttendance={canViewAttendance}
                    canManageEvents={canManageEvents}
                    onOpenEditModal={openEditModal}
                    isUserFreezed={isUserFreezed}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
       <footer className="bg-gray-50 border-t border-gray-200 mt-16 py-6 relative z-10"><div className="container mx-auto px-4 text-center text-gray-600 text-sm"><p className="mb-1">&copy; 2025 Culture Connection</p><p>website made by Artur Burlakin</p></div></footer>
      <AnimatePresence>{selectedEvent && ( <GenericActivityModal isOpen={!!selectedEvent} onClose={closeModal} cardData={selectedEvent} motionVariants={modalVariants} /> )}</AnimatePresence>
      <AnimatePresence>{isAddModalOpen && ( <AddEventModal isOpen={isAddModalOpen} onClose={closeAddModal} createEventMutation={createEventMutation} /> )}</AnimatePresence>
      <AnimatePresence>
          {isEditModalOpen && eventToEdit && (
              <EditEventModal
                  isOpen={isEditModalOpen}
                  onClose={closeEditModal}
                  eventData={eventToEdit}
                  editEventMutation={editEventMutation}
              />
          )}
      </AnimatePresence>
    </>
  );
}
