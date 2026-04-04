"use client";

import { updateSupportTicket } from "@/app/actions/admin";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Headphones,
  MessageSquare,
  MoreVertical,
  Tag,
  XCircle,
  Zap,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  adminNotes: string | null;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string | null; email: string | null; role: string };
}

interface EnhancedSupportTicketsTableProps {
  tickets: SupportTicket[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export default function EnhancedSupportTicketsTable({
  tickets,
  total,
  currentPage,
  totalPages,
}: EnhancedSupportTicketsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [status, setStatus] = useState("");

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return {
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: CheckCircle2,
        };
      case "CLOSED":
        return {
          bg: "bg-slate-100",
          text: "text-slate-700",
          border: "border-slate-200",
          icon: XCircle,
        };
      case "IN_PROGRESS":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: Clock,
        };
      default:
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          border: "border-yellow-200",
          icon: AlertTriangle,
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          border: "border-red-200",
          icon: Zap,
        };
      case "HIGH":
        return {
          bg: "bg-orange-100",
          text: "text-orange-700",
          border: "border-orange-200",
          icon: AlertTriangle,
        };
      case "MEDIUM":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: Clock,
        };
      default:
        return {
          bg: "bg-slate-100",
          text: "text-slate-700",
          border: "border-slate-200",
          icon: Clock,
        };
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpenEdit = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.adminNotes || "");
    setResolution(ticket.resolution || "");
    setStatus(ticket.status);
  };

  const handleUpdate = async () => {
    if (!selectedTicket) return;

    startTransition(async () => {
      const result = await updateSupportTicket(selectedTicket.id, {
        status,
        adminNotes,
        resolution,
      });

      if (result.success) {
        setSelectedTicket(null);
        router.refresh();
      } else {
        alert("Failed to update ticket");
      }
    });
  };

  const handleExport = () => {
    const escapeCsv = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = [
      [
        "Ticket ID",
        "Subject",
        "Category",
        "Priority",
        "Status",
        "User",
        "User Role",
        "Description",
        "Admin Notes",
        "Resolution",
        "Created At",
        "Updated At",
      ],
      ...tickets.map((ticket) => [
        ticket.id,
        ticket.subject,
        ticket.category,
        ticket.priority,
        ticket.status,
        ticket.user.name || "Unknown",
        ticket.user.role,
        ticket.description,
        ticket.adminNotes || "",
        ticket.resolution || "",
        new Date(ticket.createdAt).toISOString(),
        new Date(ticket.updatedAt).toISOString(),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm sm:shadow-lg border border-slate-100 overflow-hidden">
        {/* Table Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              All Tickets
            </h2>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden">
          <div className="divide-y divide-slate-100">
            {tickets.map((ticket, index) => {
              const statusConfig = getStatusConfig(ticket.status);
              const priorityConfig = getPriorityConfig(ticket.priority);
              const StatusIcon = statusConfig.icon;
              const PriorityIcon = priorityConfig.icon;

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-indigo-50/30 transition-all duration-200 cursor-pointer"
                  onClick={() => handleOpenEdit(ticket)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-700" />
                      </div>
                      <span className="font-mono text-xs text-slate-500">
                        #{ticket.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span className="hidden xs:inline">
                        {ticket.status.replace("_", " ")}
                      </span>
                    </span>
                  </div>

                  {/* Subject & User */}
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2">
                      {ticket.subject}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <User className="w-3 h-3" />
                      <span>{ticket.user.name || "Unknown"}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                        {ticket.user.role}
                      </span>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{ticket.category}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <PriorityIcon className="w-3 h-3" />
                        <span>{ticket.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {tickets.length === 0 && (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
                  <Headphones className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium text-sm">
                  No tickets found
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your filters
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Ticket Info
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Subject & Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Category & Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket, index) => {
                const statusConfig = getStatusConfig(ticket.status);
                const priorityConfig = getPriorityConfig(ticket.priority);
                const StatusIcon = statusConfig.icon;
                const PriorityIcon = priorityConfig.icon;

                return (
                  <motion.tr
                    key={ticket.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-indigo-50/30 transition-all duration-200 cursor-pointer"
                    onClick={() => handleOpenEdit(ticket)}
                  >
                    {/* Ticket Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                          <MessageSquare className="w-5 h-5 text-indigo-700" />
                        </div>
                        <div>
                          <p className="font-mono text-xs text-slate-500 mb-1">
                            #{ticket.id.slice(-6).toUpperCase()}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar className="w-3 h-3" />
                            {formatDate(ticket.createdAt)}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {daysSinceCreated === 0
                              ? "Today"
                              : `${daysSinceCreated}d ago`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {(ticket.user.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {ticket.user.name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ticket.user.email}
                          </p>
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded mt-1 uppercase">
                            {ticket.user.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Subject & Description */}
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-slate-900 mb-1 line-clamp-1">
                          {ticket.subject}
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>
                    </td>

                    {/* Category & Priority */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {ticket.category}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${priorityConfig.bg} ${priorityConfig.text} border ${priorityConfig.border}`}
                        >
                          <PriorityIcon className="w-3 h-3" />
                          {ticket.priority}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {ticket.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(ticket);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors group/btn"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400 group-hover/btn:text-indigo-600" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {tickets.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <Headphones className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No tickets found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {tickets.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {total.toLocaleString()}
                </span>{" "}
                tickets
              </p>

              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => router.push(`?page=${currentPage - 1}`)}
                  className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => router.push(`?page=${pageNum}`)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => router.push(`?page=${currentPage + 1}`)}
                  className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                      <h3 className="text-lg sm:text-xl font-bold">
                        Manage Ticket
                      </h3>
                    </div>
                    <p className="text-indigo-100 text-xs sm:text-sm font-mono">
                      ID: {selectedTicket.id.slice(-12).toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* User Info */}
                <div className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                      {(selectedTicket.user.name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-slate-900">
                        {selectedTicket.user.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {selectedTicket.user.email}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 uppercase">
                    {selectedTicket.user.role}
                  </span>
                </div>

                {/* Ticket Details */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      Category
                    </p>
                    <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-slate-900">
                        {selectedTicket.category}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      Priority
                    </p>
                    <div
                      className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg border ${
                        selectedTicket.priority === "URGENT"
                          ? "bg-red-50 border-red-200 text-red-700"
                          : selectedTicket.priority === "HIGH"
                            ? "bg-orange-50 border-orange-200 text-orange-700"
                            : "bg-blue-50 border-blue-200 text-blue-700"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-sm font-medium">
                        {selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subject & Description */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Subject
                  </p>
                  <p className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedTicket.subject}
                  </p>
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-500 border-t border-b border-slate-100 py-3 sm:py-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>
                      Created: {formatDate(selectedTicket.createdAt)} at{" "}
                      {formatTime(selectedTicket.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>
                      Updated: {formatDate(selectedTicket.updatedAt)} at{" "}
                      {formatTime(selectedTicket.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Status Update */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Status
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                      {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(
                        (s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
                              status === s
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Admin Notes (Internal)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full p-3 sm:p-4 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[60px] sm:min-h-[80px] text-sm"
                      placeholder="Add internal notes visible only to admins..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Resolution (Public)
                    </label>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full p-3 sm:p-4 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[80px] sm:min-h-[100px] text-sm"
                      placeholder="Enter resolution details visible to the user..."
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col xs:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 sm:px-6 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium border border-slate-200 transition-colors order-2 xs:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={isPending}
                    className="px-4 sm:px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 rounded-lg text-sm font-bold transition-all disabled:opacity-50 order-1 xs:order-2"
                  >
                    {isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
