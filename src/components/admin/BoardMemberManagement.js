"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PropTypes from "prop-types";

const staticPositions = [
  "President",
  "Vice-President",
  "Secretary",
  "Treasurer",
  "Social Media",
  "Head of Committee",
  "Event Director",
  "Committee Member",
  "Volunteer",
];

const fetchMembers = async () => {
  const response = await fetch("/api/admin/member");
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch members: ${response.statusText}`,
    );
  }
  return response.json();
};

const createMember = async (newMemberData) => {
  const response = await fetch("/api/admin/member", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newMemberData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to create member: ${response.statusText}`,
    );
  }
  return response.json();
};

const updateMember = async (updatedMemberData) => {
  const response = await fetch("/api/admin/member", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedMemberData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update member: ${response.statusText}`,
    );
  }
  return response.json();
};

const deleteMember = async (memberId) => {
  const response = await fetch(`/api/admin/member?id=${memberId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to delete member: ${response.statusText}`,
    );
  }
  return response.json();
};

function MemberForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  availablePositions,
}) {
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    contact: "",
    imageUrl: "",
    bio: "",
    ...initialData,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.position) {
      alert("Please select a position.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded shadow-md border"
    >
      <h3 className="text-lg font-medium mb-4">
        {initialData ? "Edit Member" : "Add New Member"}
      </h3>
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label
          htmlFor="position"
          className="block text-sm font-medium text-gray-700"
        >
          Position
        </label>
        <select
          name="position"
          id="position"
          value={formData.position}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
        >
          <option value="" disabled>
            -- Select a position --
          </option>
          {availablePositions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="contact"
          className="block text-sm font-medium text-gray-700"
        >
          Contact (Optional)
        </label>
        <input
          type="text"
          name="contact"
          id="contact"
          value={formData.contact}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label
          htmlFor="imageUrl"
          className="block text-sm font-medium text-gray-700"
        >
          Image URL (Optional)
        </label>
        <input
          type="url"
          name="imageUrl"
          id="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          placeholder="https://example.com/image.jpg"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-gray-700"
        >
          Bio (Optional)
        </label>
        <textarea
          name="bio"
          id="bio"
          value={formData.bio}
          onChange={handleChange}
          rows="3"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        ></textarea>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 rounded text-white text-sm ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting
            ? "Saving..."
            : initialData
              ? "Update Member"
              : "Add Member"}
        </button>
      </div>
    </form>
  );
}

MemberForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  availablePositions: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default function BoardMemberManagement() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [generalError, setGeneralError] = useState(null);

  const {
    data: members = [],
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["boardMembers"],
    queryFn: fetchMembers,
  });

  const handleMutationSuccess = (action) => {
    console.log(`Member ${action} successful`);
    queryClient.invalidateQueries({ queryKey: ["boardMembers"] });
    setIsFormOpen(false);
    setEditingMember(null);
    setGeneralError(null);
  };

  const handleMutationError = (error, action) => {
    console.error(`Error ${action} member:`, error);
    setGeneralError(
      error.message || `An error occurred while ${action} member.`,
    );
  };

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => handleMutationSuccess("creation"),
    onError: (error) => handleMutationError(error, "creating"),
  });

  const updateMutation = useMutation({
    mutationFn: updateMember,
    onSuccess: () => handleMutationSuccess("update"),
    onError: (error) => handleMutationError(error, "updating"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => handleMutationSuccess("deletion"),
    onError: (error) => handleMutationError(error, "deleting"),
  });

  const handleAddClick = () => {
    setEditingMember(null);
    setIsFormOpen(true);
    setGeneralError(null);
  };

  const handleEditClick = (member) => {
    setEditingMember(member);
    setIsFormOpen(true);
    setGeneralError(null);
  };

  const handleDeleteClick = (memberId, memberName) => {
    if (
      window.confirm(`Are you sure you want to delete member "${memberName}"?`)
    ) {
      setGeneralError(null);
      deleteMutation.mutate(memberId);
    }
  };

  const handleFormSubmit = (formData) => {
    setGeneralError(null);
    if (editingMember) {
      updateMutation.mutate({ ...formData, id: editingMember.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMember(null);
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="bg-gray-50 p-4 rounded border mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Manage Board Members
        </h2>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
          disabled={isMutating || isFormOpen}
        >
          Add New Member
        </button>
      </div>

      {generalError && (
        <p className="text-red-600 bg-red-100 border border-red-400 rounded p-2 my-2 text-sm">
          Error: {generalError}
        </p>
      )}

      {isFormOpen && (
        <div className="my-6">
          <MemberForm
            initialData={editingMember}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            availablePositions={staticPositions}
          />
        </div>
      )}

      {isLoading && <p>Loading members...</p>}

      {isError && !isLoading && (
        <p className="text-red-500">
          Error loading members: {fetchError?.message}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-4 text-gray-500"
                  >
                    No board members found.
                  </td>
                </tr>
              )}
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {member.id}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt={member.name}
                        className="h-10 w-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">No Image</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {member.position}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {member.contact || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditClick(member)}
                      disabled={isMutating || isFormOpen}
                      className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(member.id, member.name)}
                      disabled={isMutating}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
