// components/Events/EditEventModal.js
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ColorPicker from "@/components/ColorPicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.1 } },
};

const verifyAttendee = async ({ eventId, attendeeUserId, verified }) => {
    const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, attendeeUserId, verified, action: 'verify' }),
    });
    if (!response.ok) {
        let errorData = { message: `Request failed with status ${response.status}` };
        try { errorData = await response.json(); } catch (e) {}
        if (response.status === 403) { throw new Error(errorData.message || "You do not have permission to verify attendees."); }
        throw new Error(errorData.message || "Failed to update verification status");
    }
    return response.json();
};

const removeAttendee = async ({ eventId, attendeeUserId }) => {
    const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, attendeeUserId, action: 'remove' }),
    });
     if (!response.ok) {
        let errorData = { message: `Request failed with status ${response.status}` };
        try { errorData = await response.json(); } catch (e) {}
        if (response.status === 403) { throw new Error(errorData.message || "You do not have permission to remove attendees."); }
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
        try { errorData = await response.json(); } catch (e) {}
        if (response.status === 403) { throw new Error(errorData.message || "You do not have permission to freeze users."); }
        throw new Error(errorData.message || "Failed to freeze unverified users");
    }
    return response.json();
};


export default function EditEventModal({
  isOpen,
  onClose,
  eventData,
  editEventMutation,
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [attendees, setAttendees] = useState(false);
  const [cardColor, setCardColor] = useState("bg-white");
  const [isLimitEnabled, setIsLimitEnabled] = useState(false);
  const [limitValue, setLimitValue] = useState(0);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [inDescription, setInDescription] = useState([{ title: "", description: "" }]);
  const [freezeNotAllowed, setFreezeNotAllowed] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  const [error, setError] = useState("");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef(null);
  const queryClient = useQueryClient();

  const queryData = queryClient.getQueryData(['events']);
  const liveEventData = queryData?.find(e => e.id === eventData?.id) || eventData;

  const verifyAttendeeMutation = useMutation({
      mutationFn: verifyAttendee,
      onSuccess: (updatedEvent) => {
          queryClient.setQueryData(['events'], (oldData) =>
              oldData?.map(event => event.id === updatedEvent.id ? updatedEvent : event) || []
          );
          setError("");
      },
      onError: (error) => { setError(`Verification failed: ${error.message}`); },
  });

  const removeAttendeeMutation = useMutation({
      mutationFn: removeAttendee,
      onSuccess: (updatedEvent) => {
          queryClient.setQueryData(['events'], (oldData) =>
              oldData?.map(event => event.id === updatedEvent.id ? updatedEvent : event) || []
          );
          setError("");
      },
      onError: (error) => { setError(`Failed to remove attendee: ${error.message}`); },
  });

   const freezeMutation = useMutation({
      mutationFn: freezeUnverified,
      onSuccess: (data) => {
          alert(`Successfully processed freeze request: ${data.message || (data.frozenCount + ' users frozen')}`);
      },
      onError: (error) => {
          console.error("Freeze Error:", error);
          setError(`Freeze failed: ${error.message}`);
      }
  });

  useEffect(() => {
    const currentData = liveEventData || eventData;
    if (currentData) {
      setTitle(currentData.title || "");
      const eventDate = currentData.date ? new Date(currentData.date) : new Date();
      setDate(isNaN(eventDate.getTime()) ? new Date() : eventDate);
      setDescription(currentData.description || "");
      setLocation(currentData.location || "");
      setImageUrl(currentData.imageUrl || "");
      setAttendees(typeof currentData.attendees === 'boolean' ? currentData.attendees : false);
      setCardColor(currentData.cardColor || "bg-white");
      setIsLimitEnabled(typeof currentData.isLimitEnabled === 'boolean' ? currentData.isLimitEnabled : false);
      setLimitValue(typeof currentData.attendanceLimit === 'number' ? currentData.attendanceLimit : 0);
      setCardEnabled(typeof currentData.cardEnabled === 'boolean' ? currentData.cardEnabled : true);
      setInDescription(currentData.inDescription && currentData.inDescription.length > 0 ? currentData.inDescription : [{ title: "", description: "" }]);
      setFreezeNotAllowed(typeof currentData.freezenotallow === 'boolean' ? currentData.freezenotallow : true);
      setIsClosed(typeof currentData.closed === 'boolean' ? currentData.closed : false);
      setError("");
    } else {
       setTitle(""); setDate(new Date()); setDescription(""); setLocation(""); setImageUrl("");
       setAttendees(false); setCardColor("bg-white"); setIsLimitEnabled(false); setLimitValue(0);
       setCardEnabled(true); setInDescription([{ title: "", description: "" }]); setFreezeNotAllowed(true);
       setIsClosed(false);
       setActiveTab("main"); setError("");
    }
     setIsColorPickerOpen(false);
  }, [liveEventData, eventData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setIsColorPickerOpen(false);
      }
    };
    if (isColorPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isColorPickerOpen]);

  const handleInDescriptionChange = (index, field, value) => {
    const updatedDetails = [...inDescription];
    updatedDetails[index][field] = value;
    setInDescription(updatedDetails);
  };

  const addInDescriptionItem = () => {
    setInDescription([...inDescription, { title: "", description: "" }]);
  };

  const removeInDescriptionItem = (index) => {
    if (inDescription.length <= 1) return;
    const updatedDetails = inDescription.filter((_, i) => i !== index);
    setInDescription(updatedDetails);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave(false);
  };

  const handleResetAttendees = () => {
    if (!liveEventData || !liveEventData.id) { setError("Cannot reset attendees: Event data is missing."); return; }
    if (confirm("Are you sure you want to reset the attendee list for this event? This cannot be undone.")) { handleSave(true); }
  };

  const handleSave = (resetAttendeesFlag = false) => {
    setError("");
    if (!title || !date || !description || !location) { setError("Please fill in required fields on the Main Card tab."); setActiveTab('main'); return; }
    if (!liveEventData || !liveEventData.id) { setError("Cannot save event: Original event data is missing."); return; }
    if (isLimitEnabled && (!Number.isInteger(limitValue) || limitValue <= 0)) { setError("Attendance limit must be a positive whole number when enabled."); setActiveTab('main'); return; }
    const finalInDescription = inDescription.filter(item => item.title?.trim() || item.description?.trim());
    const updatedEventData = {
        id: liveEventData.id, title, date: date.toISOString(), description, location, imageUrl,
        attendees, cardColor, isLimitEnabled,
        attendanceLimit: isLimitEnabled ? limitValue : null,
        cardEnabled, resetAttendees: resetAttendeesFlag,
        inDescription: finalInDescription,
        freezenotallow: freezeNotAllowed,
        closed: isClosed,
    };
    editEventMutation.mutate(updatedEventData, {
      onSuccess: (updatedEventFromServer) => {
        if (resetAttendeesFlag) {
            queryClient.setQueryData(['events'], (oldData) => {
                 if (!oldData) return oldData;
                 return oldData.map(event =>
                    event.id === updatedEventFromServer.id
                    ? { ...event, attendeesCounter: [], attendeeDetails: [] }
                    : event
                 );
            });
            alert("Attendees reset successfully!");
        } else {
            onClose();
        }
      },
      onError: (apiError) => { setError(apiError.message || "Failed to update event."); },
    });
  };

  const handleColorSelect = (selectedColorClass) => {
      setCardColor(selectedColorClass); setIsColorPickerOpen(false);
  };

  const handleVerifyToggle = (attendeeUserId, currentVerifiedStatus) => {
      if (!liveEventData || !liveEventData.id) return;
      setError("");
      verifyAttendeeMutation.mutate({
          eventId: liveEventData.id,
          attendeeUserId: attendeeUserId,
          verified: !currentVerifiedStatus,
      });
  };

  const handleRemoveAttendee = (attendeeUserId) => {
      if (!liveEventData || !liveEventData.id) return;
      if (confirm(`Are you sure you want to remove this attendee (${attendeeUserId}) from the event?`)) {
          setError("");
          removeAttendeeMutation.mutate({
              eventId: liveEventData.id,
              attendeeUserId: attendeeUserId,
          });
      }
  };

  const handleFreezeClick = () => {
      if (!liveEventData || !liveEventData.id) return;
      if (confirm("Are you sure you want to freeze all currently unverified attendees for this event? This will prevent them from attending future events until unfrozen.")) {
          setError("");
          freezeMutation.mutate({ eventId: liveEventData.id });
      }
  };

  if (!isOpen || !liveEventData) return null;

  const attendeesList = liveEventData.attendeeDetails || [];
  const confirmedAttendees = attendeesList.filter(att => !att.waiting);
  const waitingListAttendees = attendeesList.filter(att => att.waiting);
  const displayAttendees = [...confirmedAttendees, ...waitingListAttendees];

  const hasUnverified = attendeesList.some(att => !att.verified);
  const isModifyingAttendees = editEventMutation.isPending || verifyAttendeeMutation.isPending || removeAttendeeMutation.isPending || freezeMutation.isPending;

  return (
    <motion.div
      className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-50 flex justify-center items-center p-4"
      initial="hidden" animate="visible" exit="exit" variants={modalVariants} onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} variants={modalVariants}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-20 bg-white rounded-full p-1" aria-label="Close modal">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="flex border-b">
            <button type="button" onClick={() => setActiveTab('main')} className={`flex-1 py-2 px-4 text-center text-sm font-medium focus:outline-none ${activeTab === 'main' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'}`}>Main Card</button>
            <button type="button" onClick={() => setActiveTab('details')} className={`flex-1 py-2 px-4 text-center text-sm font-medium focus:outline-none ${activeTab === 'details' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'}`}>More Details</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 max-h-[calc(90vh-160px)] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:border-r">
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              {activeTab === 'main' && (
                <div className="space-y-4">
                  <div><label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input type="text" id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required /></div>
                  <div><label htmlFor="edit-date" className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label><ReactDatePicker id="edit-date" selected={date} onChange={(d) => setDate(d)} showTimeSelect dateFormat="Pp" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" wrapperClassName="w-full" required /></div>
                  <div><label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">Description *</label><textarea id="edit-description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required></textarea></div>
                  <div><label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-1">Location *</label><input type="text" id="edit-location" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required /></div>
                  <div><label htmlFor="edit-imageUrl" className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label><input type="url" id="edit-imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" /></div>
                  <div className="relative" ref={colorPickerRef}><label className="block text-sm font-medium text-gray-700 mb-1">Card Color (Optional)</label><button type="button" onClick={() => setIsColorPickerOpen(!isColorPickerOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"><span className="flex items-center"><span className={`inline-block w-5 h-5 rounded mr-2 border border-gray-400 ${cardColor}`}></span>{cardColor}</span><svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isColorPickerOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button><AnimatePresence>{isColorPickerOpen && ( <motion.div initial="hidden" animate="visible" exit="exit" variants={dropdownVariants} className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto"><ColorPicker onSelectColor={handleColorSelect} /></motion.div> )}</AnimatePresence></div>
                  <div className="flex items-center pt-2 border-t">
                      <input id="edit-cardEnabled" type="checkbox" checked={cardEnabled} onChange={(e) => setCardEnabled(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                      <label htmlFor="edit-cardEnabled" className="ml-2 block text-sm font-medium text-gray-900">Card Enabled (Visible to Users)</label>
                  </div>
                  <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center">
                          <input id="edit-attendees" type="checkbox" checked={attendees} onChange={(e) => setAttendees(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                          <label htmlFor="edit-attendees" className="ml-2 block text-sm text-gray-900">Allow Attendance Tracking</label>
                      </div>
                      {attendees && (
                          <div className="pl-6 space-y-2">
                              <div className="flex items-center">
                                  <input id="edit-limit-enabled" type="checkbox" checked={isLimitEnabled} onChange={(e) => setIsLimitEnabled(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                  <label htmlFor="edit-limit-enabled" className="ml-2 block text-sm text-gray-900">Enable Attendance Limit</label>
                              </div>
                              {isLimitEnabled && (
                                  <div>
                                      <label htmlFor="edit-limit-value" className="block text-sm font-medium text-gray-700 mb-1">Limit Value *</label>
                                      <input type="number" id="edit-limit-value" value={limitValue} onChange={(e) => setLimitValue(parseInt(e.target.value, 10) || 0)} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
                  <div className="flex items-center pt-2 border-t">
                      <input
                          id="edit-freezeNotAllowed"
                          type="checkbox"
                          checked={freezeNotAllowed}
                          onChange={(e) => setFreezeNotAllowed(e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit-freezeNotAllowed" className="ml-2 block text-sm font-medium text-gray-900">
                          Disallow Frozen Users (Enforce Freeze)
                      </label>
                  </div>
                  <div className="flex items-center pt-2 border-t">
                      <input
                          id="edit-isClosed"
                          type="checkbox"
                          checked={isClosed}
                          onChange={(e) => setIsClosed(e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="edit-isClosed" className="ml-2 block text-sm font-medium text-gray-900">
                          Close Event (Prevent Unattending)
                      </label>
                  </div>
                </div>
              )}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Detailed Information Sections</h3>
                  {inDescription.map((item, index) => (
                    <div key={index} className="p-3 border rounded-md space-y-2 relative bg-gray-50">
                      <label htmlFor={`edit-detail-title-${index}`} className="block text-sm font-medium text-gray-700">Section Title (Optional)</label>
                      <input type="text" id={`edit-detail-title-${index}`} placeholder="e.g., Schedule, What to Bring" value={item.title} onChange={(e) => handleInDescriptionChange(index, 'title', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                      <label htmlFor={`edit-detail-text-${index}`} className="block text-sm font-medium text-gray-700">Section Text *</label>
                      <textarea id={`edit-detail-text-${index}`} rows="3" placeholder="Enter details for this section..." value={item.description} onChange={(e) => handleInDescriptionChange(index, 'description', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required={!item.title}></textarea>
                      {inDescription.length > 1 && ( <button type="button" onClick={() => removeInDescriptionItem(index)} className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 bg-white rounded-full" aria-label="Remove section"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button> )}
                    </div>
                  ))}
                  <button type="button" onClick={addInDescriptionItem} className="mt-2 px-3 py-1.5 border border-dashed border-gray-400 text-sm text-gray-600 rounded hover:bg-gray-100">+ Add Section</button>
                </div>
              )}
              <div className="pt-4 flex justify-end space-x-3 border-t mt-4">
                  <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition" disabled={isModifyingAttendees}>Cancel</button>
                  <button type="submit" className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition ${ isModifyingAttendees ? "opacity-50 cursor-not-allowed" : "" }`} disabled={isModifyingAttendees}>{editEventMutation.isPending ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
            <div className="p-4 md:p-6 space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-medium text-gray-800">
                        Attendees ({confirmedAttendees.length}
                        {liveEventData.isLimitEnabled && typeof liveEventData.attendanceLimit === 'number' ? `/${liveEventData.attendanceLimit}` : ''})
                        {waitingListAttendees.length > 0 && ` + ${waitingListAttendees.length} Waiting`}
                    </h3>
                     <button
                      type="button"
                      onClick={handleResetAttendees}
                      className={`px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 border border-red-300 text-xs transition ${isModifyingAttendees ? "opacity-50 cursor-not-allowed" : ""}`}
                      disabled={isModifyingAttendees || !attendees}
                      title={!attendees ? "Enable attendance tracking first" : "Reset Attendee List"}
                    >
                      Reset List
                    </button>
                </div>
                {displayAttendees.length > 0 ? (
                    <ul className="space-y-1 text-sm text-gray-600 max-h-48 overflow-y-auto border rounded p-2">
                        {displayAttendees.map((attendee) => {
                            const isVerifyingCurrent = verifyAttendeeMutation.isPending && verifyAttendeeMutation.variables?.attendeeUserId === attendee.userID;
                            const isRemovingCurrent = removeAttendeeMutation.isPending && removeAttendeeMutation.variables?.attendeeUserId === attendee.userID;
                            const isProcessingCurrent = isVerifyingCurrent || isRemovingCurrent;

                            return (
                                <li key={attendee.userID} className={`flex items-center justify-between px-2 py-1.5 rounded ${attendee.waiting ? 'bg-yellow-50' : 'bg-gray-50'} ${isProcessingCurrent ? 'opacity-50' : ''}`}>
                                    <span className="break-words mr-2 flex-1">
                                        {attendee.fullName}
                                        {attendee.waiting && <span className="text-xs text-yellow-700 ml-1">(Waiting)</span>}
                                    </span>
                                     <div className="flex items-center space-x-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleVerifyToggle(attendee.userID, attendee.verified)}
                                            disabled={isProcessingCurrent || verifyAttendeeMutation.isPending}
                                            className={`p-1 rounded-full transition-colors ${attendee.verified ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'} ${isVerifyingCurrent ? 'cursor-wait' : ''} ${isProcessingCurrent || verifyAttendeeMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            aria-label={attendee.verified ? "Mark as not verified" : "Mark as verified"}
                                        >
                                             {attendee.verified ? ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg> )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAttendee(attendee.userID)}
                                            disabled={isProcessingCurrent || removeAttendeeMutation.isPending}
                                            className={`p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors ${isRemovingCurrent ? 'cursor-wait' : ''} ${isProcessingCurrent || removeAttendeeMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            aria-label="Remove attendee"
                                        >
                                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.326.418C2.895 4.812 2 5.777 2 7v6.5A2.5 2.5 0 0 0 4.5 16h11a2.5 2.5 0 0 0 2.5-2.5V7c0-1.223-.895-2.188-1.674-2.389a18.634 18.634 0 0 0-2.326-.418v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25v.443c-.795.077-1.58.22-2.326.418a18.634 18.634 0 0 0-2.326-.418v-.443Z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                ) : ( <p className="text-sm text-gray-500 italic">No attendees or waiting list users.</p> )}
                {!attendees && ( <p className="text-sm text-orange-600 italic mt-2">Attendance tracking is disabled for this event.</p> )}

                 {attendees && attendeesList.length > 0 && hasUnverified && (
                    <div className="mt-4 pt-4 border-t">
                        <button
                            type="button"
                            onClick={handleFreezeClick}
                            className={`w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 border border-yellow-300 text-sm transition ${isModifyingAttendees ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={isModifyingAttendees}
                        >
                            {freezeMutation.isPending ? "Freezing..." : "Freeze All Unverified Users"}
                        </button>
                        <p className="text-xs text-gray-500 mt-1 text-center">This action cannot be undone here.</p>
                    </div>
                )}
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
