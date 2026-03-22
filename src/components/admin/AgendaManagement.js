"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

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

const fetchAdminUsers = async () => {
  const response = await fetch("/api/admin/users");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch users: ${response.statusText}`,
    );
  }
  return response.json();
};

const fetchAttendanceTemplates = async () => {
  const response = await fetch("/api/admin/agenda-attendance-templates");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        `Failed to fetch attendance templates: ${response.statusText}`,
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

const updateAttendanceTemplates = async (updatedTemplates) => {
  const response = await fetch("/api/admin/agenda-attendance-templates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedTemplates),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        `Failed to update attendance templates: ${response.statusText}`,
    );
  }

  return response.json();
};

const createAgendaId = () =>
  `agenda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createTopicId = () =>
  `agenda-topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createAttendanceTemplateId = () =>
  `attendance-template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

const normalizeTopic = (topic, index = 0) => {
  if (typeof topic === "string") {
    return {
      id: createTopicId(),
      label: `Topic ${index + 1}`,
      content: topic,
    };
  }

  const safeTopic =
    topic && typeof topic === "object" && !Array.isArray(topic) ? topic : {};

  return {
    id:
      typeof safeTopic.id === "string" && safeTopic.id.trim()
        ? safeTopic.id
        : createTopicId(),
    label:
      typeof safeTopic.label === "string" && safeTopic.label.trim()
        ? safeTopic.label
        : `Topic ${index + 1}`,
    content:
      typeof safeTopic.content === "string" ? safeTopic.content : "",
    voting: {
      enabled:
        safeTopic.voting && typeof safeTopic.voting === "object"
          ? safeTopic.voting.enabled === true
          : false,
      reason:
        safeTopic.voting &&
        typeof safeTopic.voting === "object" &&
        typeof safeTopic.voting.reason === "string"
          ? safeTopic.voting.reason
          : "",
      approve:
        safeTopic.voting &&
        typeof safeTopic.voting === "object" &&
        Array.isArray(safeTopic.voting.approve)
          ? safeTopic.voting.approve.filter((member) => typeof member === "string")
          : [],
      disapprove:
        safeTopic.voting &&
        typeof safeTopic.voting === "object" &&
        Array.isArray(safeTopic.voting.disapprove)
          ? safeTopic.voting.disapprove.filter((member) => typeof member === "string")
          : [],
      abstain:
        safeTopic.voting &&
        typeof safeTopic.voting === "object" &&
        Array.isArray(safeTopic.voting.abstain)
          ? safeTopic.voting.abstain.filter((member) => typeof member === "string")
          : [],
    },
  };
};

const createEmptyTopic = (index) => ({
  id: createTopicId(),
  label: `Topic ${index + 1}`,
  content: "",
  voting: {
    enabled: false,
    reason: "",
    approve: [],
    disapprove: [],
    abstain: [],
  },
});

const ensureTopicList = (topics) => {
  return Array.isArray(topics)
    ? topics
        .slice(0, 20)
        .map((topic, index) => normalizeTopic(topic, index))
    : [];
};

const normalizeAttendanceTemplate = (template, index = 0) => {
  const safeTemplate =
    template && typeof template === "object" && !Array.isArray(template)
      ? template
      : {};

  return {
    id:
      typeof safeTemplate.id === "string" && safeTemplate.id.trim()
        ? safeTemplate.id
        : `${createAttendanceTemplateId()}-${index}`,
    name: typeof safeTemplate.name === "string" ? safeTemplate.name : "",
    members: Array.isArray(safeTemplate.members)
      ? safeTemplate.members.filter((member) => typeof member === "string")
      : [],
  };
};

const normalizeAttendanceTemplates = (templates) => {
  if (!Array.isArray(templates)) {
    return [];
  }

  return templates
    .map((template, index) => normalizeAttendanceTemplate(template, index))
    .filter((template) => template.name.trim());
};

const normalizeAgenda = (agenda, index = 0) => {
  const safeAgenda =
    agenda && typeof agenda === "object" && !Array.isArray(agenda) ? agenda : {};
  const date = typeof safeAgenda.date === "string" ? safeAgenda.date : "";
  const legacyPresent =
    typeof safeAgenda.present === "string" ? safeAgenda.present : "";
  const presentMembers = Array.isArray(safeAgenda.presentMembers)
    ? safeAgenda.presentMembers.filter((member) => typeof member === "string")
    : legacyPresent
      ? legacyPresent
          .split(/\n|,/)
          .map((member) => member.trim())
          .filter(Boolean)
      : [];
  const minuteChecker =
    typeof safeAgenda.minuteChecker === "string"
      ? safeAgenda.minuteChecker
      : typeof safeAgenda.minuteValidator === "string"
        ? safeAgenda.minuteValidator
        : "";

  return {
    id:
      typeof safeAgenda.id === "string" && safeAgenda.id.trim()
        ? safeAgenda.id
        : `agenda-${index}`,
    date,
    title: formatAgendaTitle(date),
    presentMembers,
    chairman:
      typeof safeAgenda.chairman === "string" ? safeAgenda.chairman : "",
    secretary:
      typeof safeAgenda.secretary === "string" ? safeAgenda.secretary : "",
    minuteChecker,
    meetingInitiation:
      typeof safeAgenda.meetingInitiation === "string"
        ? safeAgenda.meetingInitiation
        : "",
    boardMembersMeetUp:
      typeof safeAgenda.boardMembersMeetUp === "string"
        ? safeAgenda.boardMembersMeetUp
        : "",
    meetingStartTime:
      typeof safeAgenda.meetingStartTime === "string"
        ? safeAgenda.meetingStartTime
        : "",
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
        <h3 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
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

const VotePatternButton = ({ templates, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={templates.length === 0}
        className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Saved patterns
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 min-w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          {templates.length === 0 ? (
            <div className="px-2 py-1 text-xs text-gray-500">
              No saved patterns yet.
            </div>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onApply(template.id);
                  setIsOpen(false);
                }}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                {template.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

const PreviewListItem = ({ label, value, children }) => (
  <li className="rounded-2xl border border-gray-200 px-4 py-4">
    <div className="flex items-start gap-3">
      <span className="mt-1 text-lg font-bold text-purple-600">•</span>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold text-gray-900">{label}</div>
        {children ? (
          <div className="mt-2">{children}</div>
        ) : (
          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
            {value || " "}
          </div>
        )}
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
            <div className="mt-3 min-h-[180px] rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm leading-6 text-gray-700">
              {resolvedAgenda.presentMembers.length > 0 ? (
                <ul className="space-y-2">
                  {resolvedAgenda.presentMembers.map((member) => (
                    <li key={member}>{member}</li>
                  ))}
                </ul>
              ) : (
                <div>&nbsp;</div>
              )}
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
            value={resolvedAgenda.minuteChecker}
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
          <PreviewListItem label="Meeting start">
            <div className="text-sm font-semibold leading-6 text-gray-900">
              {resolvedAgenda.meetingStartTime || " "}
            </div>
          </PreviewListItem>
          {resolvedAgenda.topics.map((topic, index) => (
            <PreviewListItem
              key={topic.id || `topic-${index}`}
              label={topic.label || `Topic ${index + 1}`}
            >
              <div className="space-y-3">
                <div className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {topic.content || " "}
                </div>
                {topic.voting?.enabled ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Voting
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Reason:</span>{" "}
                      {topic.voting.reason || " "}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      <div>
                        <span className="font-semibold text-gray-900">Approve:</span>{" "}
                        {(topic.voting.approve || []).join(", ") || " "}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Disapprove:</span>{" "}
                        {(topic.voting.disapprove || []).join(", ") || " "}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Obstain:</span>{" "}
                        {(topic.voting.abstain || []).join(", ") || " "}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </PreviewListItem>
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
            value={resolvedAgenda.minuteChecker}
          />
        </div>
      </AgendaPage>
    </div>
  );
};

const SortableTopicItem = ({
  topic,
  index,
  presentMembers,
  attendanceTemplates,
  onTopicLabelChange,
  onTopicChange,
  onToggleTopicVoting,
  onTopicVotingReasonChange,
  onAddVoteMember,
  onRemoveVoteMember,
  onApplyVotePattern,
  onRemoveTopic,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-gray-200 bg-white p-3 ${
        isDragging ? "shadow-xl ring-2 ring-purple-200" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="cursor-grab rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-500 active:cursor-grabbing"
            aria-label={`Drag ${topic.label || `Topic ${index + 1}`}`}
            {...attributes}
            {...listeners}
          >
            Drag
          </button>
          <span className="text-sm font-medium text-gray-700">
            {topic.label || `Topic ${index + 1}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemoveTopic(index)}
          className="text-xs font-semibold text-red-600"
        >
          Remove
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Topic name
          </span>
          <input
            type="text"
            value={topic.label}
            onChange={(event) =>
              onTopicLabelChange(index, event.target.value)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Topic notes
          </span>
          <textarea
            value={topic.content}
            onChange={(event) => onTopicChange(index, event.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          />
        </label>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-gray-700">Voting</div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={topic.voting?.enabled === true}
                onChange={(event) =>
                  onToggleTopicVoting(index, event.target.checked)
                }
              />
              Enable
            </label>
          </div>

          {topic.voting?.enabled ? (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Reason of vote
                </span>
                <textarea
                  value={topic.voting.reason}
                  onChange={(event) =>
                    onTopicVotingReasonChange(index, event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                />
              </label>

              {[
                ["approve", "Approve"],
                ["disapprove", "Disapprove"],
                ["abstain", "Obstain"],
              ].map(([voteKey, voteLabel]) => {
                const selectedMembers = topic.voting?.[voteKey] || [];
                const availableMembers = presentMembers.filter(
                  (member) => !selectedMembers.includes(member),
                );

                return (
                  <div
                    key={`${topic.id}-${voteKey}`}
                    className="rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-800">
                        {voteLabel}
                      </div>
                      <VotePatternButton
                        templates={attendanceTemplates}
                        onApply={(templateId) =>
                          onApplyVotePattern(index, voteKey, templateId)
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map((member) => (
                        <button
                          key={`${voteKey}-${member}`}
                          type="button"
                          onClick={() => onRemoveVoteMember(index, voteKey, member)}
                          className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 ring-1 ring-gray-200"
                        >
                          {member} <span className="text-red-500">×</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3">
                      <select
                        value=""
                        onChange={(event) => {
                          if (event.target.value) {
                            onAddVoteMember(index, voteKey, event.target.value);
                          }
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                      >
                        <option value="">Add present person to {voteLabel}</option>
                        {availableMembers.map((member) => (
                          <option key={`${voteKey}-option-${member}`} value={member}>
                            {member}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const AgendaEditor = ({
  agenda,
  presentOptions,
  roleOptions,
  attendanceTemplates,
  presentDropdownOpen,
  onTogglePresentDropdown,
  onAddPresentMember,
  onRemovePresentMember,
  attendanceTemplateDraftName,
  onAttendanceTemplateDraftNameChange,
  onSaveAttendanceTemplate,
  onApplyAttendanceTemplate,
  onFieldChange,
  onTopicLabelChange,
  onTopicChange,
  onTopicDragEnd,
  onToggleTopicVoting,
  onTopicVotingReasonChange,
  onAddVoteMember,
  onRemoveVoteMember,
  onApplyVotePattern,
  onAddTopic,
  onRemoveTopic,
  sensors,
}) => (
  <div className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Meeting details</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Present
          </span>
          <div className="rounded-xl border border-gray-300 bg-gray-50 p-3">
            <div className="flex flex-wrap items-start gap-2">
              {agenda.presentMembers.map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() => onRemovePresentMember(member)}
                  className="rounded-full bg-white px-3 py-1 text-sm text-gray-700 shadow-sm ring-1 ring-gray-200"
                >
                  {member} <span className="text-red-500">×</span>
                </button>
              ))}

              <div className="relative">
                <button
                  type="button"
                  onClick={onTogglePresentDropdown}
                  className="rounded-full bg-purple-600 px-3 py-1 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  +
                </button>

                {presentDropdownOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                    <div className="max-h-64 overflow-y-auto">
                      {presentOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No admins available.
                        </div>
                      ) : (
                        presentOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => onAddPresentMember(option)}
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {option}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                Additional notes
              </span>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="text"
                  value={attendanceTemplateDraftName}
                  onChange={(event) =>
                    onAttendanceTemplateDraftNameChange(event.target.value)
                  }
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  placeholder="Write a name"
                />
                <button
                  type="button"
                  onClick={onSaveAttendanceTemplate}
                  className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Save Pattern
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {attendanceTemplates.length === 0 ? (
                  <span className="text-sm text-gray-500">
                    No saved attendance patterns yet.
                  </span>
                ) : (
                  attendanceTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onApplyAttendanceTemplate(template.id)}
                      className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100"
                    >
                      {template.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Chairman
          </span>
          <select
            value={agenda.chairman}
            onChange={(event) => onFieldChange("chairman", event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          >
            <option value="">Select chairman</option>
            {roleOptions.map((option) => (
              <option key={`chairman-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Secretary
          </span>
          <select
            value={agenda.secretary}
            onChange={(event) => onFieldChange("secretary", event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          >
            <option value="">Select secretary</option>
            {roleOptions.map((option) => (
              <option key={`secretary-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Minute checker
          </span>
          <select
            value={agenda.minuteChecker}
            onChange={(event) =>
              onFieldChange("minuteChecker", event.target.value)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
          >
            <option value="">Select minute checker</option>
            {roleOptions.map((option) => (
              <option key={`minute-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
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

        <div className="grid gap-4 md:grid-cols-[180px]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Start time
            </span>
            <input
              type="time"
              value={agenda.meetingStartTime}
              onChange={(event) =>
                onFieldChange("meetingStartTime", event.target.value)
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
              step="60"
            />
          </label>
        </div>

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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onTopicDragEnd}
          >
            <SortableContext
              items={agenda.topics.map((topic) => topic.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-4 space-y-3">
                {agenda.topics.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                    No topics yet. Use "+ Add Topic" when you want to add one.
                  </div>
                ) : null}
                {agenda.topics.map((topic, index) => (
                  <SortableTopicItem
                    key={topic.id}
                    topic={topic}
                    index={index}
                    presentMembers={agenda.presentMembers}
                    attendanceTemplates={attendanceTemplates}
                    onTopicLabelChange={onTopicLabelChange}
                    onTopicChange={onTopicChange}
                    onToggleTopicVoting={onToggleTopicVoting}
                    onTopicVotingReasonChange={onTopicVotingReasonChange}
                    onAddVoteMember={onAddVoteMember}
                    onRemoveVoteMember={onRemoveVoteMember}
                    onApplyVotePattern={onApplyVotePattern}
                    onRemoveTopic={onRemoveTopic}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
  const [isPresentDropdownOpen, setIsPresentDropdownOpen] = useState(false);
  const [attendanceTemplateDraftName, setAttendanceTemplateDraftName] =
    useState("");
  const createAgendaButtonRef = useRef(null);
  const datePopoverRef = useRef(null);
  const presentDropdownRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

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
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users", "agenda"],
    queryFn: fetchAdminUsers,
    enabled: isAdmin || isCommitteeOnly,
  });
  const { data: rawAttendanceTemplates = [] } = useQuery({
    queryKey: ["agenda", "attendanceTemplates"],
    queryFn: fetchAttendanceTemplates,
    enabled: isAdmin,
  });
  const attendanceTemplates = normalizeAttendanceTemplates(
    rawAttendanceTemplates,
  );

  const adminOptions = useMemo(() => {
    if (!Array.isArray(users)) {
      return [];
    }

    return users
      .filter((user) => Boolean(user?.isAdmin))
      .map((user) =>
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim(),
      )
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }, [users]);
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
  const attendanceTemplateMutation = useMutation({
    mutationFn: updateAttendanceTemplates,
    onSuccess: (updatedTemplates) => {
      queryClient.setQueryData(
        ["agenda", "attendanceTemplates"],
        normalizeAttendanceTemplates(updatedTemplates),
      );
      setAttendanceTemplateDraftName("");
      setGeneralError(null);
    },
    onError: (mutationError) => {
      setGeneralError(
        mutationError.message ||
          "An error occurred while saving attendance templates.",
      );
    },
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isDatePickerOpen &&
        !datePopoverRef.current?.contains(event.target) &&
        !createAgendaButtonRef.current?.contains(event.target)
      ) {
        setIsDatePickerOpen(false);
      }

      if (
        isPresentDropdownOpen &&
        !presentDropdownRef.current?.contains(event.target)
      ) {
        setIsPresentDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDatePickerOpen, isPresentDropdownOpen]);

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
    setIsPresentDropdownOpen(false);
    setAttendanceTemplateDraftName("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftAgenda(null);
    setGeneralError(null);
    setIsPresentDropdownOpen(false);
    setAttendanceTemplateDraftName("");
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

      return nextAgenda;
    });
  };

  const handleTopicLabelChange = (topicIndex, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex ? { ...topic, label: value } : topic,
        ),
      };
    });
  };

  const handleTopicChange = (topicIndex, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex ? { ...topic, content: value } : topic,
        ),
      };
    });
  };

  const handleAddTopic = () => {
    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            topics: [
              ...currentAgenda.topics,
              createEmptyTopic(currentAgenda.topics.length),
            ],
          }
        : currentAgenda,
    );
  };

  const handleTopicDragEnd = (event) => {
    const { active, over } = event;

    if (!active?.id || !over?.id || active.id === over.id) {
      return;
    }

    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      const oldIndex = currentAgenda.topics.findIndex(
        (topic) => topic.id === active.id,
      );
      const newIndex = currentAgenda.topics.findIndex(
        (topic) => topic.id === over.id,
      );

      if (oldIndex === -1 || newIndex === -1) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: arrayMove(currentAgenda.topics, oldIndex, newIndex),
      };
    });
  };

  const handleToggleTopicVoting = (topicIndex, enabled) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex
            ? {
                ...topic,
                voting: enabled
                  ? {
                      enabled: true,
                      reason: topic.voting?.reason || "",
                      approve: topic.voting?.approve || [],
                      disapprove: topic.voting?.disapprove || [],
                      abstain: topic.voting?.abstain || [],
                    }
                  : {
                      enabled: false,
                      reason: "",
                      approve: [],
                      disapprove: [],
                      abstain: [],
                    },
              }
            : topic,
        ),
      };
    });
  };

  const handleTopicVotingReasonChange = (topicIndex, value) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex
            ? {
                ...topic,
                voting: {
                  ...topic.voting,
                  enabled: true,
                  reason: value,
                },
              }
            : topic,
        ),
      };
    });
  };

  const handleAddVoteMember = (topicIndex, voteKey, memberName) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) => {
          if (index !== topicIndex) {
            return topic;
          }

          const nextVoting = {
            enabled: true,
            reason: topic.voting?.reason || "",
            approve: (topic.voting?.approve || []).filter(
              (member) => member !== memberName,
            ),
            disapprove: (topic.voting?.disapprove || []).filter(
              (member) => member !== memberName,
            ),
            abstain: (topic.voting?.abstain || []).filter(
              (member) => member !== memberName,
            ),
          };

          nextVoting[voteKey] = [...nextVoting[voteKey], memberName];

          return {
            ...topic,
            voting: nextVoting,
          };
        }),
      };
    });
  };

  const handleRemoveVoteMember = (topicIndex, voteKey, memberName) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) =>
          index === topicIndex
            ? {
                ...topic,
                voting: {
                  ...topic.voting,
                  [voteKey]: (topic.voting?.[voteKey] || []).filter(
                    (member) => member !== memberName,
                  ),
                },
              }
            : topic,
        ),
      };
    });
  };

  const handleAddPresentMember = (memberName) => {
    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda || currentAgenda.presentMembers.includes(memberName)) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        presentMembers: [...currentAgenda.presentMembers, memberName],
      };
    });

    setIsPresentDropdownOpen(false);
  };

  const handleRemovePresentMember = (memberName) => {
    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            presentMembers: currentAgenda.presentMembers.filter(
              (member) => member !== memberName,
            ),
          }
        : currentAgenda,
    );
  };

  const handleSaveAttendanceTemplate = () => {
    if (!draftAgenda || draftAgenda.presentMembers.length === 0) {
      setGeneralError("Select present people before saving a pattern.");
      return;
    }

    const normalizedName = attendanceTemplateDraftName.trim();
    if (!normalizedName) {
      setGeneralError("Write a name before saving a pattern.");
      return;
    }

    if (
      attendanceTemplates.some(
        (template) =>
          template.name.toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      setGeneralError(`A saved pattern named "${normalizedName}" already exists.`);
      return;
    }

    attendanceTemplateMutation.mutate([
      ...attendanceTemplates,
      {
        id: createAttendanceTemplateId(),
        name: normalizedName,
        members: draftAgenda.presentMembers,
      },
    ]);
  };

  const handleApplyAttendanceTemplate = (templateId) => {
    const selectedTemplate = attendanceTemplates.find(
      (template) => template.id === templateId,
    );

    if (!selectedTemplate) {
      return;
    }

    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            presentMembers: selectedTemplate.members,
          }
        : currentAgenda,
    );
  };

  const handleApplyVotePattern = (topicIndex, voteKey, templateId) => {
    const selectedTemplate = attendanceTemplates.find(
      (template) => template.id === templateId,
    );

    if (!selectedTemplate) {
      return;
    }

    setDraftAgenda((currentAgenda) => {
      if (!currentAgenda) {
        return currentAgenda;
      }

      return {
        ...currentAgenda,
        topics: currentAgenda.topics.map((topic, index) => {
          if (index !== topicIndex) {
            return topic;
          }

          const presentMemberSet = new Set(currentAgenda.presentMembers);
          const templateMembers = selectedTemplate.members.filter((member) =>
            presentMemberSet.has(member),
          );

          return {
            ...topic,
            voting: {
              ...topic.voting,
              enabled: true,
              approve:
                voteKey === "approve"
                  ? templateMembers
                  : (topic.voting?.approve || []).filter(
                      (member) => !templateMembers.includes(member),
                    ),
              disapprove:
                voteKey === "disapprove"
                  ? templateMembers
                  : (topic.voting?.disapprove || []).filter(
                      (member) => !templateMembers.includes(member),
                    ),
              abstain:
                voteKey === "abstain"
                  ? templateMembers
                  : (topic.voting?.abstain || []).filter(
                      (member) => !templateMembers.includes(member),
                    ),
            },
          };
        }),
      };
    });
  };

  const handleRemoveTopic = (topicIndex) => {
    setDraftAgenda((currentAgenda) =>
      currentAgenda
        ? {
            ...currentAgenda,
            topics: currentAgenda.topics.filter((_, index) => index !== topicIndex),
          }
        : currentAgenda,
    );
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
        <aside className="relative md:w-1/4 lg:w-1/5">
          <div className="max-h-[80vh] overflow-y-auto rounded-md border bg-white p-4 shadow">
            <div className="sticky top-0 z-10 mb-4 border-b bg-white pb-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-700">Sections</h3>
                {isAdmin && (
                  <button
                    type="button"
                    ref={createAgendaButtonRef}
                    onClick={() => setIsDatePickerOpen((current) => !current)}
                    className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                  >
                    + New Agenda
                  </button>
                )}
              </div>
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

          {isAdmin && isDatePickerOpen && (
            <div
              ref={datePopoverRef}
              className="absolute left-0 right-0 top-full z-30 mt-3 md:left-full md:right-auto md:top-0 md:ml-3 md:mt-0"
            >
              <div className="w-fit rounded-2xl border border-purple-100 bg-white p-3 shadow-2xl">
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
            </div>
          )}
        </aside>

        <main className="min-h-[60vh] md:w-3/4 lg:w-4/5">
          {isEditing && draftAgenda && isAdmin ? (
            <div ref={presentDropdownRef}>
              <AgendaEditor
                agenda={draftAgenda}
                presentOptions={adminOptions.filter(
                  (option) => !draftAgenda.presentMembers.includes(option),
                )}
                roleOptions={draftAgenda.presentMembers}
                attendanceTemplates={attendanceTemplates}
                presentDropdownOpen={isPresentDropdownOpen}
                onTogglePresentDropdown={() =>
                  setIsPresentDropdownOpen((current) => !current)
                }
                onAddPresentMember={handleAddPresentMember}
                onRemovePresentMember={handleRemovePresentMember}
                attendanceTemplateDraftName={attendanceTemplateDraftName}
                onAttendanceTemplateDraftNameChange={
                  setAttendanceTemplateDraftName
                }
                onSaveAttendanceTemplate={handleSaveAttendanceTemplate}
                onApplyAttendanceTemplate={handleApplyAttendanceTemplate}
                onFieldChange={handleDraftFieldChange}
                onTopicLabelChange={handleTopicLabelChange}
                onTopicChange={handleTopicChange}
                onTopicDragEnd={handleTopicDragEnd}
                onToggleTopicVoting={handleToggleTopicVoting}
                onTopicVotingReasonChange={handleTopicVotingReasonChange}
                onAddVoteMember={handleAddVoteMember}
                onRemoveVoteMember={handleRemoveVoteMember}
                onApplyVotePattern={handleApplyVotePattern}
                onAddTopic={handleAddTopic}
                onRemoveTopic={handleRemoveTopic}
                sensors={sensors}
              />
            </div>
          ) : (
            <AgendaPreview agenda={selectedAgenda} />
          )}
        </main>
      </div>
    </div>
  );
}
