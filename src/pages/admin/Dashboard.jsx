import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import {
  Ticket,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

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

  const fetchDashboardData = async () => {
    try {
      // Fetch all tickets for stats
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("id, ticket_code, subject, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate stats
      const pending = tickets.filter((t) => t.status === "Pending").length;
      const approved = tickets.filter(
        (t) => t.status === "Approved and released",
      ).length;
      const disapproved = tickets.filter(
        (t) => t.status === "Disapproved and revised",
      ).length;
      const recommended = tickets.filter(
        (t) => t.status === "Approved and Recommended",
      ).length;

      setStats({
        total: tickets.length,
        pending,
        approved,
        disapproved,
        recommended,
      });

      // Set recent tickets (last 5)
      setRecentTickets(tickets.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time subscription for ticket changes
  useEffect(() => {
    const subscription = supabase
      .channel("dashboard-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => fetchDashboardData(),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const StatCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}
        >
          <Icon size={24} className={color} />
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <span className="badge-pending">Pending</span>;
      case "Approved and released":
        return <span className="badge-approved">Released</span>;
      case "Disapproved and revised":
        return <span className="badge-disapproved">Disapproved</span>;
      case "Approved and Recommended":
        return <span className="badge-recommended">Recommended</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin" />
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
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Ticket size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {ticket.ticket_code}
                    </p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">
                      {ticket.subject}
                    </p>
                  </div>
                </div>
                {getStatusBadge(ticket.status)}
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
