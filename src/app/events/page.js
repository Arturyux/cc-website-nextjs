"use client";

import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/Header";
import { BackgroundEvent } from "@/components/Background";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import GenericActivityModal from "@/components/ActivitiesModal/GenericActivityModal";
import AddEventModal from "@/components/Events/AddEventModal";
import EventManageModal from "@/components/Events/EventManageModal";
import ScannerModal from "@/components/ScannerModal";
import { AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQrcode } from "@fortawesome/free-solid-svg-icons";
import "react-datepicker/dist/react-datepicker.css";

const fetchEvents = async () => {
  const response = await fetch("/api/events");
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch events. Status: ${response.status}. ${errorData}`,
    );
  }
  return response.json();
};

const createEvent = async (newEventData) => {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newEventData),
  });
  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {}
    if (response.status === 403) {
      throw new Error(
        errorData.message || "You do not have permission to create events.",
      );
    }
    throw new Error(errorData.message || "Failed to create event");
  }
  return response.json();
};

const editEvent = async (updatedEventData) => {
  if (!updatedEventData || !updatedEventData.id) {
    throw new Error("Event ID is required for editing.");
  }
  const response = await fetch("/api/events", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedEventData),
  });
  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {}
    if (response.status === 403) {
      throw new Error(
        errorData.message || "You do not have permission to edit events.",
      );
    }
    throw new Error(errorData.message || "Failed to update event");
  }
  return response.json();
};

const deleteEvent = async (eventId) => {
  const response = await fetch(`/api/events?id=${eventId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {}
    throw new Error(errorData.message || "Failed to delete event");
  }
  return response.json();
};

const attendUnattendEvent = async ({ eventId, action }) => {
  const response = await fetch("/api/events", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, action }),
  });
  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {}
    throw new Error(errorData.message || "Failed to update attendance");
  }
  return response.json();
};

const verifyAttendee = async ({ eventId, attendeeUserId, verified }) => {
  const response = await fetch("/api/events", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, attendeeUserId, verified, action: "verify" }),
  });
  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {}
    if (response.status === 403) {
      throw new Error(
        errorData.message || "You do not have permission to verify attendees.",
      );
    }
    throw new Error(errorData.message || "Failed to update verification status");
  }
  return response.json();
};

const removeAttendee = async ({ eventId, attendeeUserId }) => {
  const response = await fetch("/api/events", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, attendeeUserId, action: "remove" }),
  });
  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {}
    if (response.status === 403) {
      throw new Error(
        errorData.message || "You do not have permission to remove attendees.",
      );
    }
    throw new Error(errorData.message || "Failed to remove attendee");
  }
  return response.json();
};

const freezeUnverified = async ({ eventId }) => {
  const response = await fetch("/api/events/freeze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId }),
  });
  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {}
    if (response.status === 403) {
      throw new Error(
        errorData.message || "You do not have permission to freeze users.",
      );
    }
    throw new Error(errorData.message || "Failed to freeze unverified users");
  }
  return response.json();
};

const scanEventQrCodeApi = async (scannedData) => {
  const response = await fetch("/api/qr/event-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scannedData }),
  });
  if (!response.ok) {
    let errorData = { message: `Request failed with status ${response.status}` };
    try {
      errorData = await response.json();
    } catch (e) {}
    throw new Error(errorData.message || "Scan processing failed");
  }
  return response.json();
};

const fetchAllUsers = async () => {
  const response = await fetch("/api/user");
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: `Request failed with status ${response.status}` }));
    throw new Error(errorData.message || "Failed to fetch users");
  }
  return response.json();
};

const EventCard = ({
  event,
  onOpenModal,
  onOpenManageModal,
  user,
  isUserLoaded,
  attendUnattendMutation,
  canManageEvents,
  isUserFreezed,
}) => {
  const formatDateTime = (isoDateString) => {
    if (!isoDateString || typeof isoDateString !== "string")
      return { date: "N/A", time: "N/A" };
    try {
      const dateObj = new Date(isoDateString);
      if (isNaN(dateObj.getTime())) return { date: "Invalid Date", time: "" };
      const dateOptions = { year: "numeric", month: "long", day: "numeric" };
      const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: true };
      return {
        date: dateObj.toLocaleDateString(undefined, dateOptions),
        time: dateObj.toLocaleTimeString(undefined, timeOptions),
      };
    } catch (e) {
      return { date: "Error", time: "" };
    }
  };
  const { date, time } = formatDateTime(event.date);

  const attendeesList = Array.isArray(event.attendeeDetails)
    ? event.attendeeDetails
    : [];
  const confirmedAttendees = attendeesList.filter((att) => !att.waiting);
  const waitingList = attendeesList.filter((att) => att.waiting);
  const confirmedCount = confirmedAttendees.length;
  const waitingCount = waitingList.length;

  const limit = event.attendanceLimit;
  const isLimitActive =
    event.isLimitEnabled && typeof limit === "number" && limit > 0;
  const isFull = isLimitActive && confirmedCount >= limit;
  const isCardDisabled = event.cardEnabled === false;

  const currentUserEntry =
    isUserLoaded && user
      ? attendeesList.find((att) => att.userID === user.id)
      : null;
  const isCurrentUserConfirmed = !!currentUserEntry && !currentUserEntry.waiting;
  const isCurrentUserWaiting = !!currentUserEntry && currentUserEntry.waiting;

  const shouldEnforceFreeze = event.freezenotallow;
  const showFreezeMessage = isUserFreezed && shouldEnforceFreeze;
  const showFreezeWarning =
    shouldEnforceFreeze && isCurrentUserConfirmed && !isUserFreezed;

  const handleAttendUnattendClick = () => {
    if (
      !isUserLoaded ||
      !user ||
      attendUnattendMutation.isPending ||
      showFreezeMessage
    )
      return;
    if (isCurrentUserConfirmed && event.closed === true) return;

    const action =
      isCurrentUserConfirmed || isCurrentUserWaiting ? "unattend" : "attend";
    attendUnattendMutation.mutate({
      eventId: event.id,
      action: action,
    });
  };

  let buttonText = "";
  let buttonBgClass = "";
  let buttonTextClass = "";
  let buttonHoverBgClass = "";
  let isAttendButtonDisabled =
    (attendUnattendMutation.isPending &&
      attendUnattendMutation.variables?.eventId === event.id) ||
    showFreezeMessage ||
    (isCurrentUserConfirmed && event.closed === true);

  if (
    attendUnattendMutation.isPending &&
    attendUnattendMutation.variables?.eventId === event.id
  ) {
    buttonText = "Updating...";
    buttonBgClass = "bg-gray-200";
    buttonTextClass = "text-gray-500";
    buttonHoverBgClass = "hover:bg-gray-200";
    isAttendButtonDisabled = true;
  } else if (isCurrentUserConfirmed) {
    if (event.closed) {
      buttonText = "Attending (Locked)";
      buttonBgClass = "bg-green-200";
      buttonTextClass = "text-green-800";
      buttonHoverBgClass = "hover:bg-green-200";
      isAttendButtonDisabled = true;
    } else {
      buttonText = "Unattend";
      buttonBgClass = "bg-red-200";
      buttonTextClass = "text-red-800";
      buttonHoverBgClass = "hover:bg-red-300";
    }
  } else if (isCurrentUserWaiting) {
    buttonText = "Leave Waitlist";
    buttonBgClass = "bg-yellow-200";
    buttonTextClass = "text-yellow-800";
    buttonHoverBgClass = "hover:bg-yellow-300";
  } else {
    if (isFull) {
      buttonText = "Join Waitlist";
      buttonBgClass = "bg-orange-200";
      buttonTextClass = "text-orange-800";
      buttonHoverBgClass = "hover:bg-orange-300";
    } else {
      buttonText = "Attend";
      buttonBgClass = "bg-blue-200";
      buttonTextClass = "text-blue-800";
      buttonHoverBgClass = "hover:bg-blue-300";
    }
  }
  if (
    isAttendButtonDisabled &&
    !(
      attendUnattendMutation.isPending &&
      attendUnattendMutation.variables?.eventId === event.id
    )
  ) {
    buttonBgClass = "bg-gray-200";
    buttonTextClass = "text-gray-500";
    buttonHoverBgClass = "hover:bg-gray-200";
  }

  const showAttendanceSection = event.attendees && isUserLoaded && !!user;

  const manageButtonCountString = useMemo(() => {
    if (!canManageEvents || !event.attendees) return "";

    let countStr = `(${confirmedCount}`;
    if (isLimitActive) {
      countStr += `/${limit}`;
    }
    if (waitingCount > 0) {
      countStr += ` W: ${waitingCount}`;
    }
    countStr += ")";
    return countStr;
  }, [
    canManageEvents,
    event.attendees,
    confirmedCount,
    isLimitActive,
    limit,
    waitingCount,
  ]);

  return (
    <div
      className={`relative w-full h-full flex flex-col rounded-xl border-2 border-black shadow-black shadow-xl overflow-hidden ${
        event.cardColor || "bg-white"
      } ${
        isCardDisabled && canManageEvents
          ? "opacity-60 border-dashed border-gray-400"
          : ""
      }`}
    >
      {isCardDisabled && canManageEvents && (
        <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full z-10">
          Disabled
        </div>
      )}
      {event.imageUrl && (
        <div className="w-full h-40 bg-gray-200">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-xl font-semibold mb-2 text-gray-900">
          {event.title}
        </h3>
        <p className="text-gray-700 mb-1 text-sm">
          <span className="font-medium text-gray-800">Date:</span> {date}
        </p>
        <p className="text-gray-700 mb-1 text-sm">
          <span className="font-medium text-gray-800">Time:</span> {time}
        </p>
        <p className="text-gray-700 mb-3 text-sm">
          <span className="font-medium text-gray-800">Location:</span>{" "}
          {event.location}
        </p>
        <p className="text-gray-800 text-base mb-4 flex-grow line-clamp-3">
          {event.description}
        </p>

        {showFreezeWarning && (
          <p className="text-xs text-center p-2 rounded border border-yellow-400 mb-3 bg-yellow-100 text-yellow-800 font-medium">
            If you do not attend this event, your account will be frozen!
            Contact info@cultureconnection.se if needed!
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
                onClick={handleAttendUnattendClick}
                disabled={isAttendButtonDisabled}
                className={`w-full text-center p-3 mb-5 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 font-semibold ${buttonBgClass} ${buttonTextClass} ${buttonHoverBgClass} ${
                  attendUnattendMutation.isPending &&
                  attendUnattendMutation.variables?.eventId === event.id
                    ? "opacity-50 cursor-wait"
                    : ""
                } ${
                  isAttendButtonDisabled &&
                  !(
                    attendUnattendMutation.isPending &&
                    attendUnattendMutation.variables?.eventId === event.id
                  )
                    ? "cursor-not-allowed opacity-70"
                    : ""
                }`}
              >
                {buttonText}
                {manageButtonCountString && (
                  <span className="font-semibold text-black">
                    {" "}
                    {manageButtonCountString}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        <div
          className={`mt-auto pt-2 flex gap-2 ${
            !showAttendanceSection ? "mt-2 border-t border-gray-300 pt-2" : ""
          }`}
        >
          <button
            onClick={() => onOpenModal(event)}
            className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-gray-100/70 text-black font-semibold"
          >
            More Details
          </button>
          {canManageEvents && (
            <button
              onClick={() => onOpenManageModal(event)}
              className="flex-1 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5 bg-cyan-200 text-black font-semibold"
            >
              Manage/Edit{" "}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AddEventCard = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-white shadow-md rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors aspect-[3/4] md:aspect-auto min-h-[300px]"
      aria-label="Add new event"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span className="text-lg font-medium">Add New Event</span>
    </button>
  );
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
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [eventToManage, setEventToManage] = useState(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: eventsData,
    isLoading: isEventsLoading,
    isError: isEventsError,
    error: eventsError,
  } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    refetchInterval: 5000,
  });

  const canManageEvents =
    isUserLoaded &&
    user &&
    (user.publicMetadata?.admin === true ||
      user.publicMetadata?.committee === true);
  const isUserFreezed =
    isUserLoaded && user && user.publicMetadata?.freezed === true;

  const {
    data: allUsersData,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
  } = useQuery({
    queryKey: ["allUsers"],
    queryFn: fetchAllUsers,
    enabled: !!canManageEvents,
    refetchInterval: 300000,
    refetchOnWindowFocus: false,
  });

  const commonMutationOptions = {
    onError: (error) => {
      console.error("Mutation failed:", error);
      toast.error(`Error: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  };

  const attendUnattendMutation = useMutation({
    mutationFn: attendUnattendEvent,
    onMutate: async ({ eventId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previousEvents = queryClient.getQueryData(["events"]);
      queryClient.setQueryData(["events"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((event) => {
          if (event.id !== eventId) return event;

          const userIndex = event.attendeeDetails.findIndex(
            (att) => att.userID === user.id,
          );
          let newAttendeesCounter = [...event.attendeesCounter];
          let newAttendeeDetails = [...event.attendeeDetails];

          if (action === "attend") {
            const isWaiting =
              event.isLimitEnabled &&
              event.attendanceLimit > 0 &&
              event.attendeeDetails.filter((a) => !a.waiting).length >=
                event.attendanceLimit;
            const newUserDetails = {
              userID: user.id,
              waiting: isWaiting,
              verified: false,
              fullName: user.fullName || `User (${user.id.substring(5)})`,
              primaryEmailAddress:
                user.primaryEmailAddress?.emailAddress || null,
            };
            const newUserCounterEntry = {
              userID: user.id,
              waiting: isWaiting,
              verified: false,
            };

            if (userIndex === -1) {
              newAttendeeDetails.push(newUserDetails);
              newAttendeesCounter.push(newUserCounterEntry);
            } else {
              newAttendeeDetails[userIndex] = newUserDetails;
              newAttendeesCounter[userIndex] = newUserCounterEntry;
            }
          } else if (action === "unattend") {
            if (userIndex !== -1) {
              const wasWaiting = newAttendeeDetails[userIndex]?.waiting;
              newAttendeeDetails.splice(userIndex, 1);
              newAttendeesCounter.splice(userIndex, 1);

              if (!wasWaiting && event.isLimitEnabled) {
                const waitingUserIndex = newAttendeeDetails.findIndex(
                  (att) => att.waiting,
                );
                if (waitingUserIndex !== -1) {
                  newAttendeeDetails[waitingUserIndex].waiting = false;
                  const counterIndex = newAttendeesCounter.findIndex(
                    (att) =>
                      att.userID === newAttendeeDetails[waitingUserIndex].userID,
                  );
                  if (counterIndex !== -1)
                    newAttendeesCounter[counterIndex].waiting = false;
                }
              }
            }
          }
          return {
            ...event,
            attendeesCounter: newAttendeesCounter,
            attendeeDetails: newAttendeeDetails,
          };
        });
      });
      return { previousEvents };
    },
    onError: (err, variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events"], context.previousEvents);
      }
      console.error("Attend/Unattend failed:", err);
      toast.error(`Action failed: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      closeAddModal();
      toast.success("Event Created!");
    },
    onError: (error) => {
      console.error("Create Event Error:", error);
      toast.error(`Create failed: ${error.message}`);
    },
  });

  const editEventMutation = useMutation({
    mutationFn: editEvent,
    onMutate: async (updatedEventData) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previousEvents = queryClient.getQueryData(["events"]);
      queryClient.setQueryData(
        ["events"],
        (oldData) =>
          oldData?.map((event) =>
            event.id === updatedEventData.id
              ? {
                  ...event,
                  ...updatedEventData,
                  attendees: updatedEventData.attendees,
                  isLimitEnabled: updatedEventData.isLimitEnabled,
                  cardEnabled: updatedEventData.cardEnabled,
                  freezenotallow: updatedEventData.freezenotallow,
                  closed: updatedEventData.closed,
                  inDescription: updatedEventData.inDescription,
                  attendeesCounter: updatedEventData.resetAttendees
                    ? []
                    : event.attendeesCounter,
                  attendeeDetails: updatedEventData.resetAttendees
                    ? []
                    : event.attendeeDetails,
                }
              : event,
          ) || [],
      );
      return { previousEvents };
    },
    onError: (err, variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events"], context.previousEvents);
      }
      console.error("Edit Event Error:", err);
      throw err;
    },
    onSuccess: (data, variables) => {},
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteEvent,
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previousEvents = queryClient.getQueryData(["events"]);
      queryClient.setQueryData(
        ["events"],
        (oldData) => oldData?.filter((event) => event.id !== eventId) || [],
      );
      return { previousEvents, eventId };
    },
    onSuccess: (data, eventId, context) => {
      toast.success(data.message || "Event Deleted.");
      if (selectedEvent?.id === eventId) closeModal();
      if (eventToManage?.id === eventId) closeManageModal();
    },
    onError: (err, eventId, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events"], context.previousEvents);
      }
      console.error("Delete Event Error:", err);
      toast.error(`Delete failed: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const verifyAttendeeMutation = useMutation({
    mutationFn: verifyAttendee,
    onMutate: async ({ eventId, attendeeUserId, verified }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previousEvents = queryClient.getQueryData(["events"]);
      queryClient.setQueryData(
        ["events"],
        (oldData) =>
          oldData?.map((event) => {
            if (event.id !== eventId) return event;
            const attendeeIndex = event.attendeeDetails.findIndex(
              (att) => att.userID === attendeeUserId,
            );
            if (attendeeIndex === -1) return event;

            const newAttendeeDetails = [...event.attendeeDetails];
            newAttendeeDetails[attendeeIndex] = {
              ...newAttendeeDetails[attendeeIndex],
              verified: verified,
            };

            const counterIndex = event.attendeesCounter.findIndex(
              (att) => att.userID === attendeeUserId,
            );
            let newAttendeesCounter = event.attendeesCounter;
            if (counterIndex !== -1) {
              newAttendeesCounter = [...event.attendeesCounter];
              newAttendeesCounter[counterIndex] = {
                ...newAttendeesCounter[counterIndex],
                verified: verified,
              };
            }

            return {
              ...event,
              attendeeDetails: newAttendeeDetails,
              attendeesCounter: newAttendeesCounter,
            };
          }) || [],
      );
      return { previousEvents };
    },
    onError: (err, variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events"], context.previousEvents);
      }
      console.error("Verify Attendee Error:", err);
      throw err;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const removeAttendeeMutation = useMutation({
    mutationFn: removeAttendee,
    onMutate: async ({ eventId, attendeeUserId }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previousEvents = queryClient.getQueryData(["events"]);
      queryClient.setQueryData(
        ["events"],
        (oldData) =>
          oldData?.map((event) => {
            if (event.id !== eventId) return event;

            const removedUserDetail = event.attendeeDetails.find(
              (att) => att.userID === attendeeUserId,
            );
            const wasWaiting = removedUserDetail?.waiting;

            const newAttendeeDetails = event.attendeeDetails.filter(
              (att) => att.userID !== attendeeUserId,
            );
            const newAttendeesCounter = event.attendeesCounter.filter(
              (att) => att.userID !== attendeeUserId,
            );

            if (!wasWaiting && event.isLimitEnabled) {
              const waitingUserIndex = newAttendeeDetails.findIndex(
                (att) => att.waiting,
              );
              if (waitingUserIndex !== -1) {
                newAttendeeDetails[waitingUserIndex].waiting = false;
                const counterIndex = newAttendeesCounter.findIndex(
                  (att) =>
                    att.userID === newAttendeeDetails[waitingUserIndex].userID,
                );
                if (counterIndex !== -1)
                  newAttendeesCounter[counterIndex].waiting = false;
              }
            }
            return {
              ...event,
              attendeeDetails: newAttendeeDetails,
              attendeesCounter: newAttendeesCounter,
            };
          }) || [],
      );
      return { previousEvents };
    },
    onError: (err, variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(["events"], context.previousEvents);
      }
      console.error("Remove Attendee Error:", err);
      throw err;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const freezeUnverifiedMutation = useMutation({
    mutationFn: freezeUnverified,
    onSuccess: (data) => {
      toast.success(data.message || "Freeze request processed.");
    },
    onError: (error) => {
      console.error("Freeze Error:", error);
      toast.error(`Freeze failed: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const scanEventQrCodeMutation = useMutation({
    mutationFn: scanEventQrCodeApi,
    onSuccess: (data) => {
      toast.success(data.message || "Scan processed!");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      closeScannerModal();
    },
    onError: (error) => {
      console.error("Scan mutation failed:", error);
      toast.error(`Scan Error: ${error.message}`);
    },
  });

  const allEvents = eventsData || [];
  const visibleEvents = canManageEvents
    ? allEvents
    : allEvents.filter((event) => event.cardEnabled !== false);

  const openModal = (event) => {
    const formatDateTime = (isoDateString) => {
      if (!isoDateString) return { date: "N/A", time: "N/A" };
      try {
        const dateObj = new Date(isoDateString);
        if (isNaN(dateObj.getTime())) return { date: "Invalid Date", time: "" };
        const dateOptions = { year: "numeric", month: "long", day: "numeric" };
        const timeOptions = {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        };
        return {
          date: dateObj.toLocaleDateString(undefined, dateOptions),
          time: dateObj.toLocaleTimeString(undefined, timeOptions),
        };
      } catch (e) {
        return { date: "Error", time: "" };
      }
    };
    const { date, time } = formatDateTime(event.date);
    setSelectedEvent({ ...event, displayDate: date, displayTime: time });
    document.body.style.overflow = "hidden";
  };
  const closeModal = () => {
    setSelectedEvent(null);
    document.body.style.overflow = "";
  };
  const openAddModal = () => {
    setIsAddModalOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    document.body.style.overflow = "";
  };
  const openManageModal = (event) => {
    setEventToManage(event);
    setIsManageModalOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeManageModal = () => {
    setIsManageModalOpen(false);
    setEventToManage(null);
    document.body.style.overflow = "";
  };
  const openScannerModal = () => {
    if (!user) {
      toast.error("Please sign in.");
      return;
    }
    setIsScannerModalOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeScannerModal = () => {
    setIsScannerModalOpen(false);
    document.body.style.overflow = "";
  };

  const handleScanSuccess = (decodedText) => {
    if (scanEventQrCodeMutation.isPending) return;
    try {
      const data = JSON.parse(decodedText);
      if (data.type === "event_checkin" && data.eventId) {
        scanEventQrCodeMutation.mutate(decodedText);
      } else {
        toast.error("Scanned QR code is not for event check-in.");
      }
    } catch (e) {
      toast.error("Invalid QR code data format.");
    }
  };
  const handleScanError = (errorMessage) => {
    if (
      !errorMessage.toLowerCase().includes("permission") &&
      !errorMessage.toLowerCase().includes("not found")
    ) {
      toast.error(`Scanner Error: ${errorMessage}`);
    }
    console.error("Scanner Error:", errorMessage);
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <BackgroundEvent />
      <div className="flex flex-col min-h-screen">
        <div className="relative z-10 p-4 md:p-8 mt-24 md:mt-32 flex-grow md:mb-50">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <h1 className="text-3xl md:text-7xl font-Header text-mainColor font-bold text-center flex-grow">
                Upcoming Events
              </h1>
              <button
                onClick={openScannerModal}
                className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-md"
                title="Scan Event QR Code"
                aria-label="Scan Event QR Code"
                disabled={!isUserLoaded}
              >
                <FontAwesomeIcon icon={faQrcode} className="h-6 w-6" />
              </button>
            </div>

            {isEventsLoading && (
              <p className="text-center text-gray-500 text-lg">
                Loading events...
              </p>
            )}
            {isEventsError && (
              <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-300">
                Error loading events:{" "}
                {eventsError instanceof Error
                  ? eventsError.message
                  : "Unknown error"}
              </p>
            )}

            {!isEventsLoading && !isEventsError && (
              <>
                {visibleEvents.length === 0 && !canManageEvents && (
                  <p className="text-center text-gray-500 text-lg">
                    No upcoming events found. Check back soon!
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {canManageEvents && <AddEventCard onClick={openAddModal} />}
                  {visibleEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onOpenModal={openModal}
                      onOpenManageModal={openManageModal}
                      user={user}
                      isUserLoaded={isUserLoaded}
                      attendUnattendMutation={attendUnattendMutation}
                      canManageEvents={canManageEvents}
                      isUserFreezed={isUserFreezed}
                    />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>

        <footer className="bg-gray-50 border-t border-gray-200 py-6 relative z-10">
          <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
            <p className="mb-1">&copy; 2025 Culture Connection</p>
            <p>website made by Artur Burlakin</p>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {selectedEvent && (
          <GenericActivityModal
            isOpen={!!selectedEvent}
            onClose={closeModal}
            cardData={selectedEvent}
            motionVariants={modalVariants}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddEventModal
            isOpen={isAddModalOpen}
            onClose={closeAddModal}
            createEventMutation={createEventMutation}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isManageModalOpen && eventToManage && (
          <EventManageModal
            isOpen={isManageModalOpen}
            onClose={closeManageModal}
            eventData={eventToManage}
            isAdminOrCommittee={canManageEvents}
            usersData={allUsersData}
            isLoadingUsers={isLoadingUsers}
            isUsersError={isUsersError}
            usersError={usersError}
            verifyAttendeeMutation={verifyAttendeeMutation}
            removeAttendeeMutation={removeAttendeeMutation}
            freezeUnverifiedMutation={freezeUnverifiedMutation}
            editEventMutation={editEventMutation}
            deleteEventMutation={deleteEventMutation}
          />
        )}
      </AnimatePresence>

      <ScannerModal
        isOpen={isScannerModalOpen}
        onClose={closeScannerModal}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
      />
    </>
  );
}
