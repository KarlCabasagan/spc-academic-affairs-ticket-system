import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import { getStatusMeta } from "../../lib/ticketStatus";
import { formatShortDateTime } from "../../lib/dateUtils";
import {
  Ticket,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const StatCard = ({ icon, label, value, color, bgColor }) => {
  const CardIcon = icon;
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            {value}
          </p>
        </div>
        <div
          className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}
        >
          <CardIcon size={24} className={color} />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    disapproved: 0,
    recommended: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const { data: tickets, error: fetchError } = await supabase
        .from("tickets")
        .select(
          `
          id,
          ticket_code,
          subject,
          affected_party,
          status,
          received_at,
          created_at,
          departments (name)
        `,
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const list = tickets || [];
      const pending = list.filter((t) => t.status === "Pending").length;
      const approved = list.filter(
        (t) => t.status === "Approved and released",
      ).length;
      const disapproved = list.filter(
        (t) => t.status === "Disapproved and revised",
      ).length;
      const recommended = list.filter(
        (t) => t.status === "Approved and Recommended",
      ).length;

      setStats({
        total: list.length,
        pending,
        approved,
        disapproved,
        recommended,
      });

      setRecentTickets(list.slice(0, 5));
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard overview. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time subscription for ticket changes
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => {
          fetchDashboardData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  const getStatusBadge = (status) => {
    const meta = getStatusMeta(status);
    switch (meta.tone) {
      case "pending":
        return <span className="badge-pending">{meta.shortLabel}</span>;
      case "approved":
        return <span className="badge-approved">{meta.shortLabel}</span>;
      case "disapproved":
        return <span className="badge-disapproved">{meta.shortLabel}</span>;
      case "recommended":
        return <span className="badge-recommended">{meta.shortLabel}</span>;
      default:
        return <span className="badge">{meta.shortLabel}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto my-12">
        <AlertCircle size={36} className="text-red-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Unable to Load Dashboard
        </h2>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="btn-primary"
        >
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.full_name?.split(" ")[0] || "User"}!
          </h1>
          <p className="text-gray-500 mt-1">
            Here&apos;s an overview of your ticket system.
          </p>
        </div>
        <Link to="/admin/tickets/create" className="btn-primary">
          <PlusCircle size={18} />
          <span>Create Ticket</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Ticket}
          label="Total Tickets"
          value={stats.total}
          color="text-maroon-700"
          bgColor="bg-maroon-100"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        <StatCard
          icon={CheckCircle}
          label="Released"
          value={stats.approved}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          icon={ThumbsUp}
          label="Recommended"
          value={stats.recommended}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          icon={XCircle}
          label="Disapproved"
          value={stats.disapproved}
          color="text-red-600"
          bgColor="bg-red-100"
        />
      </div>

      {/* Recent Tickets */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Recent Tickets</h2>
          </div>
          <Link
            to="/admin/tickets"
            className="text-sm text-maroon-700 hover:text-maroon-800 font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        {recentTickets.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/admin/tickets/${ticket.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Ticket size={18} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 tabular-nums">
                      {ticket.ticket_code}
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-gray-500 truncate tabular-nums">
                      {ticket.affected_party}
                      {ticket.departments?.name &&
                        ` • ${ticket.departments.name}`}
                      {ticket.received_at &&
                        ` • ${formatShortDateTime(ticket.received_at)}`}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">{getStatusBadge(ticket.status)}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Ticket size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tickets yet</p>
            <Link
              to="/admin/tickets/create"
              className="text-maroon-700 hover:text-maroon-800 text-sm font-medium mt-2 inline-block"
            >
              Create your first ticket
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
