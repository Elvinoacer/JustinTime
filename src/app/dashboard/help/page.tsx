"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  adminNotes?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  _count?: {
    messages: number;
  };
  messages?: Array<{
    id: string;
    message: string;
    authorId: string;
    authorRole: string;
    createdAt: string;
  }>;
}

type TicketUpdateAction =
  | "ADD_REPLY"
  | "REOPEN"
  | "CANCEL"
  | "ACK_RESOLVED"
  | "EDIT";

const faqs: FAQItem[] = [
  {
    id: "1",
    question: "How do I create my first service?",
    answer:
      "Navigate to the Services page from the sidebar, click 'Add New Service', fill in the details including title, description, pricing, and category. Make sure to add high-quality images to attract more customers!",
    category: "Getting Started",
  },
  {
    id: "2",
    question: "How do I update my profile information?",
    answer:
      "Go to Profile from the sidebar menu. You can update your bio, skills, work experience, education, portfolio items, and profile picture, then save your changes from the profile editor.",
    category: "Getting Started",
  },
  {
    id: "3",
    question: "How do I change my password?",
    answer:
      "Navigate to Settings → Security tab. Enter your current password, then your new password (must be at least 8 characters with uppercase, lowercase, and numbers). You'll receive an email confirmation after the change.",
    category: "Account & Security",
  },
  {
    id: "4",
    question: "How do I manage my bookings?",
    answer:
      "Visit the Bookings page to see all your appointments. You can filter by status (Pending, Confirmed, Completed, Cancelled), view booking details, and update booking statuses as work progresses.",
    category: "Bookings",
  },
  {
    id: "5",
    question: "Can I cancel a booking?",
    answer:
      "Yes, go to Bookings, find the booking you want to cancel, and update its status. Please communicate with your client before cancelling to maintain a good reputation.",
    category: "Bookings",
  },
  {
    id: "6",
    question: "How does payment work?",
    answer:
      "Customers pay through our secure IntaSend payment gateway. Your earnings and payouts are tracked in your wallet and earnings pages, where transfer status and timing are shown for each transaction.",
    category: "Payments",
  },
  {
    id: "7",
    question: "What are the benefits of Premium subscription?",
    answer:
      "Premium members get featured listings, advanced analytics, priority support, a premium badge on their profile, and appear higher in search results. Visit the Premium page to upgrade!",
    category: "Payments",
  },
];

const categories = [
  "All",
  "Getting Started",
  "Bookings",
  "Payments",
  "Reviews",
  "Account & Security",
  "Privacy",
];

const HelpPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Support ticket form state
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState("General");
  const [priority, setPriority] = useState("MEDIUM");
  const [relatedEntityType, setRelatedEntityType] = useState("BOOKING");
  const [relatedEntityId, setRelatedEntityId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [activeTicketActionId, setActiveTicketActionId] = useState<
    string | null
  >(null);
  const [replyByTicketId, setReplyByTicketId] = useState<
    Record<string, string>
  >({});
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("General");

  const fetchTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const url =
        statusFilter === "ALL"
          ? "/api/support/tickets"
          : `/api/support/tickets?status=${statusFilter}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
        toast.error("Failed to load support tickets");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load support tickets");
    } finally {
      setIsLoadingTickets(false);
    }
  }, [statusFilter]);

  // Fetch tickets on mount
  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const updateTicket = async (
    ticketId: string,
    action: TicketUpdateAction,
    payload: Record<string, string> = {},
    successMessage = "Ticket updated",
  ) => {
    try {
      setActiveTicketActionId(ticketId);

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
      await fetchTickets();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Ticket update failed",
      );
    } finally {
      setActiveTicketActionId(null);
    }
  };

  const beginEditingTicket = (ticket: SupportTicket) => {
    setEditingTicketId(ticket.id);
    setEditSubject(ticket.subject);
    setEditDescription(ticket.description);
    setEditCategory(ticket.category);
  };

  const cancelEditingTicket = () => {
    setEditingTicketId(null);
    setEditSubject("");
    setEditDescription("");
    setEditCategory("General");
  };

  const submitReply = async (ticket: SupportTicket) => {
    const message = (replyByTicketId[ticket.id] || "").trim();
    if (!message) {
      toast.error("Enter your reply before sending");
      return;
    }

    await updateTicket(
      ticket.id,
      "ADD_REPLY",
      { message },
      "Reply added to ticket",
    );

    setReplyByTicketId((current) => ({
      ...current,
      [ticket.id]: "",
    }));
  };

  const saveTicketEdit = async (ticket: SupportTicket) => {
    const nextSubject = editSubject.trim();
    const nextDescription = editDescription.trim();

    if (!nextSubject || !nextDescription) {
      toast.error("Subject and description are required");
      return;
    }

    await updateTicket(
      ticket.id,
      "EDIT",
      {
        subject: nextSubject,
        description: nextDescription,
        category: editCategory,
      },
      "Ticket details updated",
    );

    cancelEditingTicket();
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    const trimmedRelatedEntityId = relatedEntityId.trim();
    const needsReference =
      ticketCategory === "Payments" || ticketCategory === "Bookings";

    if (!trimmedSubject || !trimmedDescription) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (needsReference && !trimmedRelatedEntityId) {
      toast.error(
        "This category requires a booking, job, or invoice reference",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: trimmedSubject,
          description: trimmedDescription,
          category: ticketCategory,
          priority,
          relatedEntityType: needsReference ? relatedEntityType : undefined,
          relatedEntityId: needsReference ? trimmedRelatedEntityId : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit ticket");
      }

      // Clear form
      setSubject("");
      setDescription("");
      setTicketCategory("General");
      setPriority("MEDIUM");
      setRelatedEntityType("BOOKING");
      setRelatedEntityId("");

      // Refresh tickets
      await fetchTickets();

      toast.success(
        "Support ticket submitted successfully. Check your tickets below for updates.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit ticket",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-700";
      case "RESOLVED":
        return "bg-emerald-100 text-emerald-700";
      case "CLOSED":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case "LOW":
        return { color: "bg-gray-400", pulse: false };
      case "MEDIUM":
        return { color: "bg-blue-500", pulse: false };
      case "HIGH":
        return { color: "bg-orange-500", pulse: false };
      case "URGENT":
        return { color: "bg-red-500", pulse: true };
      default:
        return { color: "bg-gray-400", pulse: false };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2">
          Help & Support
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Find answers, submit tickets, or get in touch with our support team
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
        <Link
          href="/dashboard/settings?tab=security"
          className="p-3 sm:p-4 md:p-6 bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg sm:rounded-xl hover:shadow-md transition-shadow group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
            <span className="material-symbols-outlined text-white text-base sm:text-lg md:text-xl">
              shield
            </span>
          </div>
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
            Account Security
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Manage passwords and security settings
          </p>
          <span className="text-emerald-600 text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 md:mt-3 inline-flex items-center gap-0.5 sm:gap-1 group-hover:gap-1.5 transition-all">
            Go to Security
            <span className="material-symbols-outlined text-xs sm:text-sm">
              arrow_forward
            </span>
          </span>
        </Link>

        <Link
          href="/dashboard/premium"
          className="p-3 sm:p-4 md:p-6 bg-linear-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg sm:rounded-xl hover:shadow-md transition-shadow group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
            <span className="material-symbols-outlined text-white text-base sm:text-lg md:text-xl">
              workspace_premium
            </span>
          </div>
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
            Upgrade to Premium
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Unlock advanced features and benefits
          </p>
          <span className="text-purple-600 text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 md:mt-3 inline-flex items-center gap-0.5 sm:gap-1 group-hover:gap-1.5 transition-all">
            View Plans
            <span className="material-symbols-outlined text-xs sm:text-sm">
              arrow_forward
            </span>
          </span>
        </Link>

        <div className="p-3 sm:p-4 md:p-6 bg-linear-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg sm:rounded-xl hover:shadow-md transition-shadow xs:col-span-2 lg:col-span-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
            <span className="material-symbols-outlined text-white text-base sm:text-lg md:text-xl">
              headset_mic
            </span>
          </div>
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
            Contact Support
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Get help from our support team
          </p>
          <a
            href="mailto:support@gtss.software"
            className="text-blue-600 text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 md:mt-3 inline-flex items-center gap-0.5 sm:gap-1 truncate"
          >
            <span className="truncate">support@gtss.software</span>
            <span className="material-symbols-outlined text-xs sm:text-sm shrink-0">
              mail
            </span>
          </a>
        </div>
      </div>

      {/* Support Ticket Form */}
      <div className="mb-8 sm:mb-10 md:mb-12 bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 bg-linear-to-r from-emerald-50 to-teal-50">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
              support_agent
            </span>
            Submit a Support Request
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
            Can&apos;t find what you&apos;re looking for? Submit a ticket and
            we&apos;ll help you out!
          </p>
        </div>

        <form
          onSubmit={handleSubmitTicket}
          className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <div>
              <label
                htmlFor="subject"
                className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
              >
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900"
                placeholder="Brief description of your issue"
                required
              />
            </div>

            <div>
              <label
                htmlFor="ticketCategory"
                className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
              >
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="ticketCategory"
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900"
                required
              >
                <option value="General">General</option>
                <option value="Account">Account Issues</option>
                <option value="Payments">Payments & Billing</option>
                <option value="Technical">Technical Issues</option>
                <option value="Bookings">Bookings & Services</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
            >
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900"
            >
              <option value="LOW">Low - General inquiry</option>
              <option value="MEDIUM">Medium - Need assistance</option>
              <option value="HIGH">High - Important issue</option>
              <option value="URGENT">Urgent - Critical problem</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Priority may be normalized based on category and abuse prevention
              controls.
            </p>
          </div>

          {(ticketCategory === "Payments" || ticketCategory === "Bookings") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="relatedEntityType"
                  className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
                >
                  Related Reference Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="relatedEntityType"
                  value={relatedEntityType}
                  onChange={(e) => setRelatedEntityType(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900"
                >
                  <option value="BOOKING">Booking</option>
                  <option value="JOB">Job</option>
                  <option value="INVOICE">Invoice</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="relatedEntityId"
                  className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
                >
                  Reference ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="relatedEntityId"
                  type="text"
                  value={relatedEntityId}
                  onChange={(e) => setRelatedEntityId(e.target.value)}
                  placeholder="e.g. booking_123"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="description"
              className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900 resize-none"
              placeholder="Provide detailed information about your issue..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Be as specific as possible to help us resolve your issue quickly
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto"
          >
            {isSubmitting && (
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </form>
      </div>

      {/* My Support Tickets */}
      <div className="mb-8 sm:mb-10 md:mb-12 bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
              receipt_long
            </span>
            My Support Tickets
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
            Track the status of your submitted requests
          </p>
        </div>

        {/* Status Filter */}
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex gap-1.5 sm:gap-2 overflow-x-auto pb-2">
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ),
          )}
        </div>

        {/* Tickets List */}
        <div className="divide-y divide-gray-200">
          {isLoadingTickets ? (
            <div className="p-6 sm:p-8 md:p-12 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3 sm:mb-4" />
              <p className="text-sm text-gray-600">Loading your tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 sm:p-8 md:p-12 text-center">
              <span className="material-symbols-outlined text-4xl sm:text-5xl md:text-6xl text-gray-300 mb-3 sm:mb-4">
                inbox
              </span>
              <p className="text-sm sm:text-base text-gray-600 font-medium">
                No tickets found
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                {statusFilter === "ALL"
                  ? "Submit a ticket above to get started!"
                  : "Try changing the status filter"}
              </p>
            </div>
          ) : (
            tickets.map((ticket, index) => {
              const priorityInd = getPriorityIndicator(ticket.priority);
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-3 sm:p-4 md:p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mb-1.5 sm:mb-2">
                        <span className="text-xs font-mono text-gray-500 truncate">
                          #{ticket.id.slice(0, 8)}
                        </span>
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded ${getStatusColor(
                            ticket.status,
                          )}`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <div
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                              priorityInd.color
                            } ${priorityInd.pulse ? "animate-pulse" : ""}`}
                          />
                          <span className="text-xs text-gray-600">
                            {ticket.priority}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 truncate">
                          {ticket.category}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 truncate">
                        {ticket.subject}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Created{" "}
                        {new Date(ticket.createdAt).toLocaleDateString()}
                        {ticket._count?.messages
                          ? ` • ${ticket._count.messages} update${ticket._count.messages === 1 ? "" : "s"}`
                          : ""}
                      </p>
                      {ticket.relatedEntityType && ticket.relatedEntityId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Reference: {ticket.relatedEntityType} #
                          {ticket.relatedEntityId}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/help/tickets/${ticket.id}`}
                        className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        Open Thread
                      </Link>
                      <button
                        onClick={() =>
                          setExpandedTicket(
                            expandedTicket === ticket.id ? null : ticket.id,
                          )
                        }
                        className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                      >
                        <span
                          className={`material-symbols-outlined transition-transform text-base sm:text-lg ${
                            expandedTicket === ticket.id ? "rotate-180" : ""
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                    </div>
                  </div>

                  {expandedTicket === ticket.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 space-y-3 sm:space-y-4"
                    >
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                          Description:
                        </h4>
                        {editingTicketId === ticket.id ? (
                          <div className="space-y-2 sm:space-y-3">
                            <input
                              type="text"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                              placeholder="Ticket subject"
                            />
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                            >
                              <option value="General">General</option>
                              <option value="Account">Account</option>
                              <option value="Payments">Payments</option>
                              <option value="Technical">Technical</option>
                              <option value="Bookings">Bookings</option>
                            </select>
                            <textarea
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 resize-none"
                              placeholder="Update ticket details"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => saveTicketEdit(ticket)}
                                disabled={activeTicketActionId === ticket.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditingTicket}
                                disabled={activeTicketActionId === ticket.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap">
                              {ticket.description}
                            </p>
                            {ticket.messages?.[0] && (
                              <p className="text-xs text-gray-500 mt-2">
                                Latest update (
                                {ticket.messages[0].authorRole.toLowerCase()}):{" "}
                                {ticket.messages[0].message}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {ticket.adminNotes && (
                        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                          <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                            <span className="material-symbols-outlined text-xs sm:text-sm">
                              chat
                            </span>
                            Support Team Notes:
                          </h4>
                          <p className="text-xs sm:text-sm text-blue-800">
                            {ticket.adminNotes}
                          </p>
                        </div>
                      )}

                      {ticket.resolution && (
                        <div className="bg-emerald-50 p-3 sm:p-4 rounded-lg border border-emerald-200">
                          <h4 className="text-xs sm:text-sm font-semibold text-emerald-900 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                            <span className="material-symbols-outlined text-xs sm:text-sm">
                              check_circle
                            </span>
                            Resolution:
                          </h4>
                          <p className="text-xs sm:text-sm text-emerald-800">
                            {ticket.resolution}
                          </p>
                        </div>
                      )}

                      {editingTicketId !== ticket.id && (
                        <div className="space-y-2 sm:space-y-3">
                          <label className="block text-xs sm:text-sm font-semibold text-gray-900">
                            Add Reply
                          </label>
                          <textarea
                            value={replyByTicketId[ticket.id] || ""}
                            onChange={(e) =>
                              setReplyByTicketId((current) => ({
                                ...current,
                                [ticket.id]: e.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 resize-none"
                            placeholder="Add details, updates, or follow-up information"
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => submitReply(ticket)}
                              disabled={activeTicketActionId === ticket.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Send Reply
                            </button>

                            {(ticket.status === "OPEN" ||
                              ticket.status === "IN_PROGRESS") && (
                              <>
                                <button
                                  onClick={() => beginEditingTicket(ticket)}
                                  disabled={activeTicketActionId === ticket.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Edit Ticket
                                </button>
                                <button
                                  onClick={() =>
                                    updateTicket(
                                      ticket.id,
                                      "CANCEL",
                                      {},
                                      "Ticket cancelled",
                                    )
                                  }
                                  disabled={activeTicketActionId === ticket.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Cancel Ticket
                                </button>
                              </>
                            )}

                            {(ticket.status === "RESOLVED" ||
                              ticket.status === "CLOSED") && (
                              <button
                                onClick={() =>
                                  updateTicket(
                                    ticket.id,
                                    "REOPEN",
                                    {},
                                    "Ticket reopened",
                                  )
                                }
                                disabled={activeTicketActionId === ticket.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-yellow-200 text-yellow-800 hover:bg-yellow-50 disabled:opacity-50"
                              >
                                Reopen
                              </button>
                            )}

                            {ticket.status === "RESOLVED" && (
                              <button
                                onClick={() =>
                                  updateTicket(
                                    ticket.id,
                                    "ACK_RESOLVED",
                                    {},
                                    "Ticket acknowledged and closed",
                                  )
                                }
                                disabled={activeTicketActionId === ticket.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Acknowledge Resolution
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
            search
          </span>
          <input
            type="text"
            aria-label="Search FAQs"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6 md:mb-8 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === category
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden mb-8 sm:mb-10 md:mb-12">
        <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
            {filteredFAQs.length}{" "}
            {filteredFAQs.length === 1 ? "question" : "questions"} found
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredFAQs.length === 0 ? (
            <div className="p-6 sm:p-8 md:p-12 text-center">
              <span className="material-symbols-outlined text-4xl sm:text-5xl md:text-6xl text-gray-300 mb-3 sm:mb-4">
                search_off
              </span>
              <p className="text-sm sm:text-base text-gray-600 font-medium">
                No results found
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            filteredFAQs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-3 sm:p-4 md:p-6 hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() =>
                    setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
                  }
                  className="w-full flex items-start justify-between gap-2 sm:gap-3 md:gap-4 text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                        {faq.category}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors truncate">
                      {faq.question}
                    </h3>
                  </div>
                  <span
                    className={`material-symbols-outlined text-gray-400 shrink-0 transition-transform text-base sm:text-lg ${
                      expandedFAQ === faq.id ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {expandedFAQ === faq.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 sm:mt-3 md:mt-4 pl-3 sm:pl-4 border-l-2 border-emerald-500"
                  >
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
