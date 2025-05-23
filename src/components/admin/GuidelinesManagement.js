"use client";

import { useState, useEffect, useRef, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TipTapToolbar from "../TipTapToolbar";

const fetchGuidelines = async () => {
  const response = await fetch("/api/admin/guidelines");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch guidelines: ${response.statusText}`,
    );
  }
  return response.json();
};

const updateGuidelines = async (updatedData) => {
  const response = await fetch("/api/admin/guidelines", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update guidelines: ${response.statusText}`,
    );
  }
  return response.json();
};

const TipTapEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: true,
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      TextStyle,
      Color,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none p-3 border border-t-0 border-gray-300 rounded-b-md min-h-[150px] bg-white",
      },
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable) {
      const currentEditorContent = editor.getHTML();
      if (currentEditorContent !== content) {
        setTimeout(() => {
          editor.commands.setContent(content, false);
        }, 0);
      }
    }
  }, [content, editor]);

  return (
    <div>
      <TipTapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default function GuidelinesManagement() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.admin === true;

  const queryClient = useQueryClient();
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState([]);
  const [generalError, setGeneralError] = useState(null);

  const sectionRefs = useRef({});
  const localIdPrefix = useId();

  const {
    data: guidelines = [],
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["guidelines"],
    queryFn: fetchGuidelines,
    onSuccess: (data) => {
      const safeData = Array.isArray(data) ? data : [];
      if (safeData.length > 0 && !activeSectionId) {
        setActiveSectionId(safeData[0].id);
      }
      setEditData(JSON.parse(JSON.stringify(safeData)));
    },
    enabled: !isEditing,
  });

  const mutation = useMutation({
    mutationFn: updateGuidelines,
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["guidelines"], updatedData);
      setIsEditing(false);
      setGeneralError(null);
      const safeUpdatedData = Array.isArray(updatedData) ? updatedData : [];
      if (safeUpdatedData.length > 0) {
        if (!safeUpdatedData.find((s) => s.id === activeSectionId)) {
          setActiveSectionId(safeUpdatedData[0].id);
        }
      } else {
        setActiveSectionId(null);
      }
    },
    onError: (error) => {
      setGeneralError(
        error.message || "An error occurred while saving guidelines.",
      );
    },
  });

  useEffect(() => {
    if (activeSectionId && sectionRefs.current[activeSectionId] && !isEditing) {
      sectionRefs.current[activeSectionId].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [activeSectionId, isEditing, guidelines]);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditData(JSON.parse(JSON.stringify(guidelines || [])));
      setGeneralError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(JSON.parse(JSON.stringify(guidelines || [])));
    setGeneralError(null);
  };

  const handleSaveChanges = () => {
    if (editData.some((section) => !section.title.trim())) {
      setGeneralError("All sections must have a title.");
      return;
    }
    setGeneralError(null);
    mutation.mutate(editData);
  };

  const handleSectionTitleChange = (index, newTitle) => {
    const updated = [...editData];
    updated[index].title = newTitle;
    setEditData(updated);
  };

  const handleSectionContentChange = (index, newContent) => {
    const updated = [...editData];
    updated[index].content = newContent;
    setEditData(updated);
  };

  const handleAddSection = () => {
    const newSection = {
      id: `${localIdPrefix}-new-${Date.now()}`,
      title: "New Section",
      content: "<p>Start writing here...</p>",
    };
    setEditData([...editData, newSection]);
  };

  const handleDeleteSection = (indexToDelete) => {
    if (
      window.confirm(
        `Are you sure you want to delete the section "${editData[indexToDelete].title}"?`,
      )
    ) {
      setEditData(editData.filter((_, index) => index !== indexToDelete));
    }
  };

  const handleNavLinkClick = (sectionId) => {
    setActiveSectionId(sectionId);
  };

  const getHighlightedContent = (content) => {
    if (!searchTerm.trim() || typeof content !== 'string') return content;
    try {
      const regex = new RegExp(`(?<!<[^>]*)${searchTerm}(?![^<]*>)`, "gi");
      return content.replace(regex, (match) => `<mark class="bg-yellow-300">${match}</mark>`);
    } catch (e) {
      console.error("Error during highlighting:", e);
      return content;
    }
  };

  if (isLoading && !isEditing) {
    return <p className="text-center text-gray-500 py-4">Loading guidelines...</p>;
  }

  if (isError && !isEditing) {
    return (
      <p className="text-center text-red-600 py-4">
        Error loading guidelines: {fetchError?.message || "Unknown error"}
      </p>
    );
  }

  if (isEditing && isAdmin) {
    return (
      <div className="bg-gray-50 p-4 rounded border mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Edit Guidelines
          </h2>
          <div className="space-x-2">
            <button
              onClick={handleSaveChanges}
              disabled={mutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={mutation.isPending}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>

        {generalError && (
          <p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
            Error: {generalError}
          </p>
        )}

        {(Array.isArray(editData) ? editData : []).map((section, index) => (
          <div
            key={section.id || `edit-${index}`}
            className="mb-8 p-4 border rounded-md bg-white shadow-sm"
          >
            <div className="mb-3">
              <label
                htmlFor={`${localIdPrefix}-title-${section.id || index}`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Section Title
              </label>
              <input
                type="text"
                id={`${localIdPrefix}-title-${section.id || index}`}
                value={section.title}
                onChange={(e) => handleSectionTitleChange(index, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div className="mb-3">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Content
              </label>
              <TipTapEditor
                content={section.content}
                onChange={(newContent) => handleSectionContentChange(index, newContent)}
              />
            </div>
            <button
              onClick={() => handleDeleteSection(index)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-medium"
            >
              Delete Section
            </button>
          </div>
        ))}
        <button
          onClick={handleAddSection}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
        >
          + Add New Section
        </button>
      </div>
    );
  }

  const displayableGuidelines = Array.isArray(guidelines) ? guidelines : [];
  if (displayableGuidelines.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded border mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Association Guidelines
          </h2>
          {isAdmin && (
            <button
              onClick={handleEditToggle}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Edit Guidelines
            </button>
          )}
        </div>
        <p className="text-center text-gray-500 py-4">
          No guidelines have been added yet.
          {isAdmin && " Admins can add guidelines in edit mode."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded border mt-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h2 className="text-2xl font-semibold text-gray-800">
          Association Guidelines
        </h2>
        {isAdmin && (
          <button
            onClick={handleEditToggle}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Edit Guidelines
          </button>
        )}
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search guidelines..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-1/4 lg:w-1/5 p-4 border rounded-md bg-white shadow max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 sticky top-0 bg-white py-2 z-10 border-b">
            Sections
          </h3>
          <ul className="space-y-2">
            {displayableGuidelines.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => handleNavLinkClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                    ${
                      activeSectionId === section.id
                        ? "bg-purple-100 text-purple-700 font-semibold"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="md:w-3/4 lg:w-4/5 p-4 border rounded-md bg-white shadow min-h-[60vh] max-h-[80vh] overflow-y-auto">
          {displayableGuidelines.map((section) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => (sectionRefs.current[section.id] = el)}
              className="mb-8 scroll-mt-20"
            >
              <h3 className="text-xl font-bold text-purple-700 mb-3 pb-2 border-b border-purple-200">
                {section.title}
              </h3>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: getHighlightedContent(section.content),
                }}
              />
            </section>
          ))}
          {displayableGuidelines.length > 0 &&
            !displayableGuidelines.find((s) => s.id === activeSectionId) &&
            activeSectionId && (
              <p className="text-gray-500">
                The selected section could not be found. Please choose another
                from the navigation.
              </p>
            )}
          {displayableGuidelines.length > 0 && !activeSectionId && (
            <p className="text-gray-500">
              Select a section from the navigation to view its content.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
