import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Search, Filter, Ticket, PlusCircle, X } from "lucide-react";
import toast from "react-hot-toast";

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchTickets = async () => {
    try {
      let query = supabase
        .from("tickets")
        .select(
          `
          *,
          departments (name),
          personnel (name, avatar_url)
        `,
        )
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      if (departmentFilter) {
        query = query.eq("department_id", departmentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filtered = data || [];

      // Client-side search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.ticket_code.toLowerCase().includes(q) ||
            t.subject.toLowerCase().includes(q) ||
            t.affected_party.toLowerCase().includes(q),
        );
      }

      setTickets(filtered);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("*")
      .order("name");
    setDepartments(data || []);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchTickets();
  }, [statusFilter, departmentFilter, searchQuery]);

  // Real-time subscription for ticket changes
  useEffect(() => {
    const subscription = supabase
      .channel("tickets-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => fetchTickets(),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const clearFilters = () => {
    setStatusFilter("");
    setDepartmentFilter("");
    setSearchQuery("");
  };

  const hasActiveFilters = statusFilter || departmentFilter || searchQuery;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Tickets</h1>
          <p className="text-gray-500 mt-1">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link to="/admin/tickets/create" className="btn-primary">
          <PlusCircle size={18} />
          <span>Create Ticket</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, subject, or name..."
              className="input"
              style={{ paddingLeft: "3rem" }}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? "bg-gray-100" : ""}`}
          >
            <Filter size={18} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-maroon-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved and released">
                  Approved & Released
                </option>
                <option value="Disapproved and revised">
                  Disapproved & Revised
                </option>
                <option value="Approved and Recommended">
                  Approved & Recommended
                </option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="label">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="select"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn-ghost text-red-600 self-end"
              >
                <X size={16} />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tickets List */}
      <div className="card">
        {tickets.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/admin/tickets/${ticket.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <Ticket size={20} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-maroon-700">
                        {ticket.ticket_code}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-500">
                        #{ticket.sequential_id}
                      </span>
                    </div>
                    <p className="text-gray-900 truncate">{ticket.subject}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {ticket.affected_party}
                      {ticket.departments && ` • ${ticket.departments.name}`}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 ml-4">
                  {getStatusBadge(ticket.status)}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Ticket size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {hasActiveFilters
                ? "No tickets match your filters"
                : "No tickets yet"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-maroon-700 hover:text-maroon-800 text-sm font-medium mt-2"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
