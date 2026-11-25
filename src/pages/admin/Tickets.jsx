import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { TICKET_STATUSES, getStatusMeta } from "../../lib/ticketStatus";
import { Search, Filter, Ticket, PlusCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

const Tickets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || "",
  );
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(() =>
    Boolean(searchParams.get("status")),
  );

  // Sync statusFilter when URL query parameter changes externally (e.g. from Dashboard links)
  useEffect(() => {
    const paramStatus = searchParams.get("status") || "";
    setStatusFilter(paramStatus);
    setPage(1);
  }, [searchParams]);

  const handleStatusChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus) {
      nextParams.set("status", nextStatus);
    } else {
      nextParams.delete("status");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const fetchTickets = useCallback(async () => {
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
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter]);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      if (!error) {
        setDepartments(data || []);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time subscription using current fetchTickets callback
  useEffect(() => {
    const channel = supabase
      .channel("tickets-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => {
          fetchTickets();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    let list = tickets;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.ticket_code?.toLowerCase().includes(q) ||
          String(t.sequential_id ?? "").includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.affected_party?.toLowerCase().includes(q) ||
          t.departments?.name?.toLowerCase().includes(q) ||
          t.personnel?.name?.toLowerCase().includes(q),
      );
    }

    if (sortBy === "oldest") {
      return [...list].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );
    }
    if (sortBy === "code") {
      return [...list].sort((a, b) =>
        (a.ticket_code || "").localeCompare(b.ticket_code || ""),
      );
    }

    return list;
  }, [tickets, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTickets.slice(start, start + PAGE_SIZE);
  }, [filteredTickets, currentPage]);

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

  const clearFilters = () => {
    handleStatusChange("");
    setDepartmentFilter("");
    setSearchQuery("");
    setSortBy("newest");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    statusFilter || departmentFilter || searchQuery.trim(),
  );

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
          <p className="text-gray-500 mt-1 tabular-nums">
            {filteredTickets.length} ticket
            {filteredTickets.length !== 1 ? "s" : ""}{" "}
            {hasActiveFilters ? "matching filters" : "total"}
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by code, #id, subject, name, or department…"
              className="input"
              style={{ paddingLeft: "3rem" }}
            />
          </div>

          {/* Sort */}
          <select
            aria-label="Sort tickets"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="select sm:w-44"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="code">Code (A–Z)</option>
          </select>

          {/* Filter Toggle */}
          <button
            type="button"
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
              <label htmlFor="ticket-status-filter" className="label">
                Status
              </label>
              <select
                id="ticket-status-filter"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="select"
              >
                <option value="">All Statuses</option>
                {TICKET_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="ticket-dept-filter" className="label">
                Department
              </label>
              <select
                id="ticket-dept-filter"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
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
                type="button"
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
        {paginatedTickets.length > 0 ? (
          <>
            <div className="divide-y divide-gray-100">
              {paginatedTickets.map((ticket) => (
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
                        <span className="font-semibold text-maroon-700 tabular-nums">
                          {ticket.ticket_code}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-500 tabular-nums">
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                <span className="tabular-nums">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filteredTickets.length)} of{" "}
                  {filteredTickets.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="btn-secondary px-3 py-1.5"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                    <span>Prev</span>
                  </button>
                  <span className="px-2 tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="btn-secondary px-3 py-1.5"
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
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
                type="button"
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
