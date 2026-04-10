"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

type TicketUpdateAction =
  | "ADD_REPLY"
  | "REOPEN"
  | "CANCEL"
  | "ACK_RESOLVED"
  | "EDIT";

interface TicketMessage {
  id: string;
  authorId: string;
  authorRole: string;
  message: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface TicketDetail {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  adminNotes?: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  messages: TicketMessage[];
}

const EDITABLE_CATEGORIES = [
  "General",
  "Account",
  "Payments",
  "Technical",
  "Bookings",
] as const;

const RELATED_ENTITY_TYPES = ["BOOKING", "JOB", "INVOICE"] as const;

export default function TicketDetailPage() {
  const params = useParams();
  const paramId = params?.id;
  const ticketId = Array.isArray(paramId) ? paramId[0] : paramId || "";

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<TicketUpdateAction | null>(
    null,
  );
  const [replyMessage, setReplyMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("General");
  const [editRelatedEntityType, setEditRelatedEntityType] =
    useState<string>("BOOKING");
  const [editRelatedEntityId, setEditRelatedEntityId] = useState("");

  const requiresReference = useMemo(
    () => editCategory === "Payments" || editCategory === "Bookings",
    [editCategory],
  );

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load ticket");
      }

      setTicket(data.ticket);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load ticket",
      );
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void fetchTicket();
  }, [fetchTicket]);

  const startEditing = () => {
    if (!ticket) return;
    setEditSubject(ticket.subject);
    setEditDescription(ticket.description);
    setEditCategory(ticket.category);
    setEditRelatedEntityType(ticket.relatedEntityType || "BOOKING");
    setEditRelatedEntityId(ticket.relatedEntityId || "");
    setIsEditing(true);
  };

  const resetEditing = () => {
    setIsEditing(false);
    setEditSubject("");
    setEditDescription("");
    setEditCategory("General");
    setEditRelatedEntityType("BOOKING");
    setEditRelatedEntityId("");
  };

  const updateTicket = async (
    action: TicketUpdateAction,
    payload: Record<string, string> = {},
    successMessage = "Ticket updated",
  ) => {
    if (!ticketId) return;

    try {
      setActiveAction(action);

      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...payload,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update ticket");
      }

      toast.success(successMessage);
      await fetchTicket();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update ticket",
      );
    } finally {
      setActiveAction(null);
    }
  };

  const submitReply = async () => {
    const message = replyMessage.trim();
    if (!message) {
      toast.error("Reply message is required");
      return;
    }

    await updateTicket("ADD_REPLY", { message }, "Reply added");
    setReplyMessage("");
  };

  const saveEdit = async () => {
    const nextSubject = editSubject.trim();
    const nextDescription = editDescription.trim();
    const nextRelatedEntityId = editRelatedEntityId.trim();

    if (!nextSubject || !nextDescription) {
      toast.error("Subject and description are required");
      return;
    }

    if (requiresReference && !nextRelatedEntityId) {
      toast.error("Reference ID is required for this category");
      return;
    }

    await updateTicket(
      "EDIT",
      {
        subject: nextSubject,
        description: nextDescription,
        category: editCategory,
        relatedEntityType: requiresReference ? editRelatedEntityType : "",
        relatedEntityId: requiresReference ? nextRelatedEntityId : "",
      },
      "Ticket details updated",
    );

    resetEditing();
  };

  const statusColorClass = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "RESOLVED":
        return "bg-emerald-100 text-emerald-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-6 text-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-600">Loading ticket thread...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-6">
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 mb-4"
        >
          <span className="material-symbols-outlined text-base">
            arrow_back
          </span>
          Back to support
        </Link>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-700">
            Ticket not found or inaccessible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link
        href="/dashboard/help"
        className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 mb-4"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to support tickets
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-mono text-gray-500">
              #{ticket.id.slice(0, 8)}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${statusColorClass(ticket.status)}`}
            >
              {ticket.status.replace("_", " ")}
            </span>
            <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700">
              {ticket.priority}
            </span>
            <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
              {ticket.category}
            </span>
          </div>

          {!isEditing ? (
            <>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                {ticket.subject}
              </h1>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
                placeholder="Ticket subject"
              />

              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
              >
                {EDITABLE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {requiresReference && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={editRelatedEntityType}
                    onChange={(e) => setEditRelatedEntityType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
                  >
                    {RELATED_ENTITY_TYPES.map((entityType) => (
                      <option key={entityType} value={entityType}>
                        {entityType}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editRelatedEntityId}
                    onChange={(e) => setEditRelatedEntityId(e.target.value)}
                    placeholder="Reference ID"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
                  />
                </div>
              )}

              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 resize-none"
                placeholder="Ticket details"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={saveEdit}
                  disabled={activeAction !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Save changes
                </button>
                <button
                  onClick={resetEditing}
                  disabled={activeAction !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-3">
            <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(ticket.updatedAt).toLocaleString()}</span>
            {ticket.relatedEntityType && ticket.relatedEntityId && (
              <span>
                Context: {ticket.relatedEntityType} #{ticket.relatedEntityId}
              </span>
            )}
          </div>

          {!isEditing && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(ticket.status === "OPEN" ||
                ticket.status === "IN_PROGRESS") && (
                <>
                  <button
                    onClick={startEditing}
                    disabled={activeAction !== null}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Edit ticket
                  </button>
                  <button
                    onClick={() =>
                      updateTicket("CANCEL", {}, "Ticket cancelled")
                    }
                    disabled={activeAction !== null}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel ticket
                  </button>
                </>
              )}

              {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
                <button
                  onClick={() => updateTicket("REOPEN", {}, "Ticket reopened")}
                  disabled={activeAction !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-yellow-200 text-yellow-800 hover:bg-yellow-50 disabled:opacity-50"
                >
                  Reopen
                </button>
              )}

              {ticket.status === "RESOLVED" && (
                <button
                  onClick={() =>
                    updateTicket(
                      "ACK_RESOLVED",
                      {},
                      "Ticket acknowledged and closed",
                    )
                  }
                  disabled={activeAction !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  Acknowledge resolution
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Conversation
          </h2>

          <div className="space-y-3">
            {ticket.messages.length === 0 ? (
              <p className="text-sm text-gray-500">
                No conversation messages yet.
              </p>
            ) : (
              ticket.messages.map((message) => {
                const isAdmin = message.authorRole === "ADMIN";
                return (
                  <div
                    key={message.id}
                    className={`rounded-lg border px-3 py-2 ${
                      isAdmin
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900">
                        {message.author.name || (isAdmin ? "Support" : "You")}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                        {message.authorRole}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {message.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-xs font-semibold text-gray-900">
              Add reply
            </label>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 resize-none"
              placeholder="Share updates, questions, or requested details"
            />
            <button
              onClick={submitReply}
              disabled={activeAction !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Send reply
            </button>
          </div>
        </div>

        {(ticket.adminNotes || ticket.resolution) && (
          <div className="p-4 sm:p-6 bg-gray-50">
            {ticket.adminNotes && (
              <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-blue-900 mb-1">
                  Support notes
                </h3>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">
                  {ticket.adminNotes}
                </p>
              </div>
            )}
            {ticket.resolution && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-emerald-900 mb-1">
                  Resolution
                </h3>
                <p className="text-sm text-emerald-800 whitespace-pre-wrap">
                  {ticket.resolution}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
