"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

const MIN_TOPIC_COUNT = 3;

const agendaDocumentFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fetchAgendas = async () => {
  const response = await fetch("/api/admin/agendas");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch agendas: ${response.statusText}`,
    );
  }
  return response.json();
};

const updateAgendas = async (updatedData) => {
  const response = await fetch("/api/admin/agendas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update agendas: ${response.statusText}`,
    );
  }

  return response.json();
};

const createAgendaId = () =>
  `agenda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatAgendaDate = (dateValue) => {
  if (!dateValue) {
    return "Day Month, Year";
  }

  const parsedDate = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Day Month, Year";
  }

  return agendaDocumentFormatter.format(parsedDate);
};

const formatAgendaTitle = (dateValue) => `Agenda ${formatAgendaDate(dateValue)}`;

const toInputDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ensureTopicList = (topics) => {
  const normalizedTopics = Array.isArray(topics)
    ? topics
        .map((topic) => (typeof topic === "string" ? topic : ""))
        .filter((_, index) => index < 20)
    : [];

  while (normalizedTopics.length < MIN_TOPIC_COUNT) {
    normalizedTopics.push("");
  }

  return normalizedTopics;
};

const normalizeAgenda = (agenda, index = 0) => {
  const safeAgenda =
    agenda && typeof agenda === "object" && !Array.isArray(agenda) ? agenda : {};
  const date = typeof safeAgenda.date === "string" ? safeAgenda.date : "";

  return {
    id:
      typeof safeAgenda.id === "string" && safeAgenda.id.trim()
        ? safeAgenda.id
        : `agenda-${index}`,
    date,
    title: formatAgendaTitle(date),
    present: typeof safeAgenda.present === "string" ? safeAgenda.present : "",
    chairman:
      typeof safeAgenda.chairman === "string" ? safeAgenda.chairman : "",
    secretary:
      typeof safeAgenda.secretary === "string" ? safeAgenda.secretary : "",
    minuteChecker:
      typeof safeAgenda.minuteChecker === "string"
        ? safeAgenda.minuteChecker
        : "",
    minuteValidator:
      typeof safeAgenda.minuteValidator === "string"
        ? safeAgenda.minuteValidator
        : "",
    meetingInitiation:
      typeof safeAgenda.meetingInitiation === "string"
        ? safeAgenda.meetingInitiation
        : "",
    boardMembersMeetUp:
      typeof safeAgenda.boardMembersMeetUp === "string"
        ? safeAgenda.boardMembersMeetUp
        : "",
    meetingStart:
      typeof safeAgenda.meetingStart === "string" ? safeAgenda.meetingStart : "",
    topics: ensureTopicList(safeAgenda.topics),
    meetingConcludes:
      typeof safeAgenda.meetingConcludes === "string"
        ? safeAgenda.meetingConcludes
        : "",
    nextMeetingDate:
      typeof safeAgenda.nextMeetingDate === "string"
        ? safeAgenda.nextMeetingDate
        : "",
    topicsForNextMeeting:
      typeof safeAgenda.topicsForNextMeeting === "string"
        ? safeAgenda.topicsForNextMeeting
        : "",
  };
};

const normalizeAgendas = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((agenda, index) => normalizeAgenda(agenda, index))
    .sort((left, right) => right.date.localeCompare(left.date));
};

const createAgendaFromDate = (dateValue) =>
  normalizeAgenda({
    id: createAgendaId(),
    date: dateValue,
  });

const createPreviewPlaceholderAgenda = () =>
  normalizeAgenda({
    id: "agenda-preview-placeholder",
    date: "",
  });

const cloneAgenda = (agenda) => normalizeAgenda(JSON.parse(JSON.stringify(agenda)));

const SignatureLine = ({ label, value }) => (
  <div className="flex-1 min-w-[180px]">
    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
      {label}
    </div>
    <div className="mt-6 border-b border-gray-400 pb-1 text-sm text-gray-800 min-h-[28px]">
      {value || "\u00A0"}
    </div>
  </div>
);

const AgendaPage = ({ title, children, pageLabel }) => (
  <section className="rounded-[28px] border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-10">
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-500">
          Culture Connection
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl">
          {title}
        </h3>
      </div>
      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
        {pageLabel}
      </span>
    </div>
    {children}
  </section>
);

const PreviewListItem = ({ label, value }) => (
  <li className="rounded-2xl border border-gray-200 px-4 py-4">
    <div className="flex items-start gap-3">
      <span className="mt-1 text-lg font-bold text-purple-600">•</span>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold text-gray-900">{label}</div>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
          {value || " "}
        </div>
      </div>
    </div>
  </li>
);

const AgendaPreview = ({ agenda }) => {
  const resolvedAgenda = agenda || createPreviewPlaceholderAgenda();

  const title = `Culture Connection Agenda - ${formatAgendaDate(
    resolvedAgenda.date,
  )}`;

  return (
    <div className="space-y-6">
      <AgendaPage title={title} pageLabel="Page 1">
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Present
            </div>
            <div className="mt-3 min-h-[180px] whitespace-pre-wrap rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm leading-6 text-gray-700">
              {resolvedAgenda.present || " "}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Chairman
              </div>
              <div className="mt-3 text-sm text-gray-800">
                {resolvedAgenda.chairman || " "}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Secretary
              </div>
              <div className="mt-3 text-sm text-gray-800">
                {resolvedAgenda.secretary || " "}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Minute checker
              </div>
              <div className="mt-3 text-sm text-gray-800">
                {resolvedAgenda.minuteChecker || " "}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-6">
          <SignatureLine label="Chairman" value={resolvedAgenda.chairman} />
          <SignatureLine label="Secretary" value={resolvedAgenda.secretary} />
          <SignatureLine
            label="Minute validator"
            value={resolvedAgenda.minuteValidator}
          />
        </div>
      </AgendaPage>

      <AgendaPage title={title} pageLabel="Page 2">
        <ul className="space-y-4">
          <PreviewListItem
            label="Meeting initiation"
            value={resolvedAgenda.meetingInitiation}
          />
          <PreviewListItem
            label="Board members meet up"
            value={resolvedAgenda.boardMembersMeetUp}
          />
          <PreviewListItem
            label="Meeting start"
            value={resolvedAgenda.meetingStart}
          />
          {resolvedAgenda.topics.map((topic, index) => (
            <PreviewListItem
              key={`topic-${index}`}
              label={`Topic ${index + 1}`}
              value={topic}
            />
          ))}
          <PreviewListItem
            label="Meeting concludes"
            value={resolvedAgenda.meetingConcludes}
          />
          <PreviewListItem
            label="Next date for meeting"
            value={resolvedAgenda.nextMeetingDate}
          />
          <PreviewListItem
            label="Topics for next meeting"
            value={resolvedAgenda.topicsForNextMeeting}
          />
        </ul>

        <div className="mt-10 flex flex-wrap gap-6">
          <SignatureLine label="Chairman" value={resolvedAgenda.chairman} />
          <SignatureLine label="Secretary" value={resolvedAgenda.secretary} />
          <SignatureLine
            label="Minute validator"
            value={resolvedAgenda.minuteValidator}
          />
        </div>
      </AgendaPage>
    </div>
  );
};

const AgendaEditor = ({
  agenda,
  onFieldChange,
  onTopicChange,
  onAddTopic,
  onRemoveTopic,
}) => (
  <div className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Meeting details</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Agenda date
          </span>
          <input
            type="date"
            value={agenda.date}
            onChange={(event) => onFieldChange("date", event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">
            Agenda title
          </div>
          <div className="mt-2 text-sm font-semibold text-purple-900">
            {agenda.title}
          </div>
        </div>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Present
          </span>
          <textarea
            value={agenda.present}
            onChange={(event) => onFieldChange("present", event.target.value)}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
            placeholder="List attendees, one per line or separated by commas."
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Chairman
          </span>
          <input
            type="text"
            value={agenda.chairman}
            onChange={(event) => onFieldChange("chairman", event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Secretary
          </span>
          <input
            type="text"
            value={agenda.secretary}
            onChange={(event) => onFieldChange("secretary", event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Minute checker
          </span>
          <input
            type="text"
            value={agenda.minuteChecker}
            onChange={(event) =>
              onFieldChange("minuteChecker", event.target.value)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Minute validator
          </span>
          <input
            type="text"
            value={agenda.minuteValidator}
            onChange={(event) =>
              onFieldChange("minuteValidator", event.target.value)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>
      </div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Agenda structure</h3>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Meeting initiation
          </span>
          <textarea
            value={agenda.meetingInitiation}
            onChange={(event) =>
              onFieldChange("meetingInitiation", event.target.value)
            }
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Board members meet up
          </span>
          <textarea
            value={agenda.boardMembersMeetUp}
            onChange={(event) =>
              onFieldChange("boardMembersMeetUp", event.target.value)
            }
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Meeting start
          </span>
          <textarea
            value={agenda.meetingStart}
            onChange={(event) => onFieldChange("meetingStart", event.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600">
              Topics
            </h4>
            <button
              type="button"
              onClick={onAddTopic}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              + Add Topic
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {agenda.topics.map((topic, index) => (
              <div
                key={`agenda-topic-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    Topic {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveTopic(index)}
                    disabled={agenda.topics.length <= MIN_TOPIC_COUNT}
                    className="text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={topic}
                  onChange={(event) => onTopicChange(index, event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Meeting concludes
          </span>
          <textarea
            value={agenda.meetingConcludes}
            onChange={(event) =>
              onFieldChange("meetingConcludes", event.target.value)
            }
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Next date for meeting
          </span>
          <textarea
            value={agenda.nextMeetingDate}
            onChange={(event) =>
              onFieldChange("nextMeetingDate", event.target.value)
            }
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Topics for next meeting
          </span>
          <textarea
            value={agenda.topicsForNextMeeting}
            onChange={(event) =>
              onFieldChange("topicsForNextMeeting", event.target.value)
            }
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>
      </div>
    </section>
  </div>
);

export default function AgendaManagement() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.admin === true;
  const isCommitteeOnly = user?.publicMetadata?.committee === true && !isAdmin;
  const queryClient = useQueryClient();

  const [selectedAgendaId, setSelectedAgendaId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftAgenda, setDraftAgenda] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newAgendaDate, setNewAgendaDate] = useState(new Date());

  const {
    data: rawAgendas = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["agendas"],
    queryFn: fetchAgendas,
  });

  const agendas = normalizeAgendas(rawAgendas);
  const resolvedSelectedAgendaId =
    selectedAgendaId && agendas.some((agenda) => agenda.id === selectedAgendaId)
      ? selectedAgendaId
      : agendas[0]?.id || null;

  const selectedAgenda =
    agendas.find((agenda) => agenda.id === resolvedSelectedAgendaId) || null;

  const mutation = useMutation({
    mutationFn: updateAgendas,
    onSuccess: (updatedAgendas) => {
      const normalizedAgendas = normalizeAgendas(updatedAgendas);
      queryClient.setQueryData(["agendas"], normalizedAgendas);

      if (draftAgenda) {
        setSelectedAgendaId(draftAgenda.id);
      } else if (normalizedAgendas[0]) {
        setSelectedAgendaId(normalizedAgendas[0].id);
      }

      setIsEditing(false);
      setDraftAgenda(null);
      setGeneralError(null);
    },
    onError: (mutationError) => {
      setGeneralError(
        mutationError.message || "An error occurred while saving agendas.",
      );
    },
  });

  const handleSelectAgenda = (agendaId) => {
    if (isEditing && draftAgenda?.id !== agendaId) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes. Discard them and switch agendas?",
      );

      if (!shouldDiscard) {
        return;
      }

      setIsEditing(false);
      setDraftAgenda(null);
      setGeneralError(null);
    }

    setSelectedAgendaId(agendaId);
  };

  const handleEditAgenda = () => {
    if (!selectedAgenda) {
      return;
    }

    setDraftAgenda(cloneAgenda(selectedAgenda));
    setGeneralError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftAgenda(null);
    setGeneralError(null);
    setIsEditing(false);
  };

  const handleDraftFieldChange = (field, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      const nextAgenda = {
        ...currentAgenda,
        [field]: value,
      };

      if (field === "date") {
        nextAgenda.title = formatAgendaTitle(value);
      }

      return nextAgenda;
    });
  };

  const handleTopicChange = (topicIndex, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      const nextTopics = [...currentAgenda.topics];
      nextTopics[topicIndex] = value;

      return {
        ...currentAgenda,
        topics: nextTopics,
      };
    });
  };

  const handleAddTopic = () => {
    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            topics: [...currentAgenda.topics, ""],
          }
        : currentAgenda,
    );
  };

  const handleRemoveTopic = (topicIndex) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda || currentAgenda.topics.length <= MIN_TOPIC_COUNT) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.filter((_, index) => index !== topicIndex),
      };
    });
  };

  const handleSaveAgenda = () => {
    if (!draftAgenda) {
      return;
    }

    if (!draftAgenda.date) {
      setGeneralError("Agenda date is required.");
      return;
    }

    if (
      agendas.some(
        (agenda) =>
          agenda.id !== draftAgenda.id && agenda.date === draftAgenda.date,
      )
    ) {
      setGeneralError(
        `An agenda for ${formatAgendaDate(draftAgenda.date)} already exists.`,
      );
      return;
    }

    const normalizedDraft = normalizeAgenda(draftAgenda);
    const updatedAgendas = agendas.map((agenda) =>
      agenda.id === normalizedDraft.id ? normalizedDraft : agenda,
    );

    mutation.mutate(updatedAgendas);
  };

  const handleCreateAgenda = (selectedDate) => {
    const normalizedDate = toInputDateValue(selectedDate);

    if (!normalizedDate) {
      return;
    }

    if (agendas.some((agenda) => agenda.date === normalizedDate)) {
      setGeneralError(
        `An agenda for ${formatAgendaDate(normalizedDate)} already exists.`,
      );
      setIsDatePickerOpen(false);
      return;
    }

    const newAgenda = createAgendaFromDate(normalizedDate);
    const updatedAgendas = [newAgenda, ...agendas];

    setDraftAgenda(newAgenda);
    setSelectedAgendaId(newAgenda.id);
    setIsDatePickerOpen(false);
    setNewAgendaDate(selectedDate);
    setGeneralError(null);
    mutation.mutate(updatedAgendas);
  };

  if (isLoading) {
    return <p className="py-4 text-center text-gray-500">Loading agendas...</p>;
  }

  if (isError) {
    return (
      <p className="py-4 text-center text-red-600">
        Error loading agendas: {error?.message || "Unknown error"}
      </p>
    );
  }

  return (
    <div className="mt-6 rounded border bg-gray-50 p-4">
      <div className="mb-6 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Agenda</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isCommitteeOnly
              ? "Committee members can review agendas in read-only mode."
              : "Create and maintain meeting agendas based on the official template."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && selectedAgenda && !isEditing && (
            <button
              type="button"
              onClick={handleEditAgenda}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Edit Agenda
            </button>
          )}

          {isAdmin && isEditing && (
            <>
              <button
                type="button"
                onClick={handleSaveAgenda}
                disabled={mutation.isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={mutation.isPending}
                className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-400"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {generalError && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {generalError}
        </p>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-1/4 lg:w-1/5">
          <div className="max-h-[80vh] overflow-y-auto rounded-md border bg-white p-4 shadow">
            <div className="sticky top-0 z-10 mb-4 border-b bg-white pb-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-700">Sections</h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen((current) => !current)}
                    className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                  >
                    + New Agenda
                  </button>
                )}
              </div>

              {isAdmin && isDatePickerOpen && (
                <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">
                    Pick a date
                  </div>
                  <DatePicker
                    inline
                    selected={newAgendaDate}
                    onChange={(date) => {
                      if (date) {
                        handleCreateAgenda(date);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {agendas.length === 0 ? (
              <p className="text-sm text-gray-500">
                No agendas yet.
                {isAdmin ? " Create the first one from the date picker." : ""}
              </p>
            ) : (
              <ul className="space-y-2">
                {agendas.map((agenda) => (
                  <li key={agenda.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectAgenda(agenda.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        resolvedSelectedAgendaId === agenda.id
                          ? "bg-purple-100 font-semibold text-purple-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {agenda.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="min-h-[60vh] md:w-3/4 lg:w-4/5">
          {isEditing && draftAgenda && isAdmin ? (
            <AgendaEditor
              agenda={draftAgenda}
              onFieldChange={handleDraftFieldChange}
              onTopicChange={handleTopicChange}
              onAddTopic={handleAddTopic}
              onRemoveTopic={handleRemoveTopic}
            />
          ) : (
            <AgendaPreview agenda={selectedAgenda} />
          )}
        </main>
      </div>
    </div>
  );
}
