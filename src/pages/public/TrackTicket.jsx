import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ThumbsUp,
  Search,
} from "lucide-react";

const TrackTicket = () => {
  const { ticketCode } = useParams();
  const [ticket, setTicket] = useState(null);
  const [personnel, setPersonnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("tickets")
          .select(
            `
            id,
            ticket_code,
            subject,
            status,
            remarks,
            received_at,
            personnel_id,
            department_id,
            departments (name)
          `,
          )
          .eq("ticket_code", ticketCode.toUpperCase())
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            setError(
              "Ticket not found. Please check your ticket code and try again.",
            );
          } else {
            throw fetchError;
          }
          return;
        }

        setTicket(data);

        // Fetch personnel if exists
        if (data.personnel_id) {
          const { data: personnelData } = await supabase
            .from("personnel")
            .select("name, avatar_url")
            .eq("id", data.personnel_id)
            .single();
          setPersonnel(personnelData);
        }
      } catch (err) {
        console.error("Error fetching ticket:", err);
        setError(
          "An error occurred while fetching the ticket. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (ticketCode) {
      fetchTicket();
    }
  }, [ticketCode]);

  const getStatusConfig = (status) => {
    switch (status) {
      case "Pending":
        return {
          icon: Clock,
          color: "text-yellow-600",
          bg: "bg-yellow-100",
          label: "Pending",
        };
      case "Approved and released":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-100",
          label: "Approved & Released",
        };
      case "Disapproved and revised":
        return {
          icon: XCircle,
          color: "text-red-600",
          bg: "bg-red-100",
          label: "Disapproved & Revised",
        };
      case "Approved and Recommended":
        return {
          icon: ThumbsUp,
          color: "text-blue-600",
          bg: "bg-blue-100",
          label: "Approved & Recommended",
        };
      default:
        return {
          icon: Clock,
          color: "text-gray-600",
          bg: "bg-gray-100",
          label: status,
        };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Looking up your ticket...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ticket Not Found
          </h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link to="/" className="btn-primary inline-flex">
            <Search size={18} />
            <span>Search Again</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ticket.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex-1 px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-maroon-700 mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Search</span>
        </Link>

        {/* Ticket Card */}
        <div className="card p-6 sm:p-8 animate-slideUp">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Ticket Code</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {ticket.ticket_code}
              </h1>
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bg}`}
            >
              <StatusIcon size={18} className={statusConfig.color} />
              <span className={`font-medium text-sm ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Subject */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                <Tag size={20} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium text-gray-900">{ticket.subject}</p>
              </div>
            </div>

            {/* Department */}
            {ticket.departments && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Origin Department</p>
                  <p className="font-medium text-gray-900">
                    {ticket.departments.name}
                  </p>
                </div>
              </div>
            )}

            {/* Received By */}
            {personnel && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {personnel.avatar_url ? (
                    <img
                      src={personnel.avatar_url}
                      alt={personnel.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Received By</p>
                  <p className="font-medium text-gray-900">{personnel.name}</p>
                </div>
              </div>
            )}

            {/* Date Received */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                <Calendar size={20} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date Received</p>
                <p className="font-medium text-gray-900">
                  {formatDate(ticket.received_at)}
                </p>
              </div>
            </div>

            {/* Remarks */}
            {ticket.remarks && (
              <div className="p-4 bg-maroon-50 rounded-xl border border-maroon-100">
                <p className="text-sm text-maroon-700 font-medium mb-1">
                  Remarks
                </p>
                <p className="text-maroon-900">{ticket.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-gray-400 text-sm mt-6">
          For inquiries, please visit the Academic Affairs Office.
        </p>
      </div>
    </div>
  );
};

export default TrackTicket;
