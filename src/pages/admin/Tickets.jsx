import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { TICKET_STATUSES } from "../../lib/ticketStatus";
import { formatShortDateTime } from "../../lib/dateUtils";
import StatusBadge from "../../components/ui/StatusBadge";
import { TableSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import {
  Search,
  Ticket,
  PlusCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

const Tickets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    Pending: 0,
    "Approved and Recommended": 0,
    "Approved and released": 0,
    "Disapproved and revised": 0,
  });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || "",
  );
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

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

      const countQuery = supabase.from("tickets").select("status");

      const [ticketsRes, countsRes] = await Promise.all([query, countQuery]);

      if (ticketsRes.error) throw ticketsRes.error;
      setTickets(ticketsRes.data || []);

      if (!countsRes.error && countsRes.data) {
        const nextCounts = {
          all: countsRes.data.length,
          Pending: 0,
          "Approved and Recommended": 0,
          "Approved and released": 0,
          "Disapproved and revised": 0,
        };
        countsRes.data.forEach((row) => {
          if (Object.hasOwn(nextCounts, row.status)) {
            nextCounts[row.status] += 1;
          }
        });
        setStatusCounts(nextCounts);
      }
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

  const statusTabs = [
    { value: "", label: "All", count: statusCounts.all },
    ...TICKET_STATUSES.map((s) => ({
      value: s.value,
      label: s.shortLabel,
      count: statusCounts[s.value] || 0,
    })),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Ticket Registry
          </h1>
          <p className="text-sm text-ink-muted mt-1 tabular-nums">
            {filteredTickets.length} docket
            {filteredTickets.length !== 1 ? "s" : ""}{" "}
            {hasActiveFilters ? "matching current filters" : "recorded"}
          </p>
        </div>
        <Link
          to="/admin/tickets/create"
          className="btn-primary self-start sm:self-auto"
        >
          <PlusCircle size={16} />
          <span>Create Ticket</span>
        </Link>
      </div>

      {/* Status Tabs */}
      <div
        role="tablist"
        aria-label="Filter tickets by status"
        className="flex flex-wrap gap-1.5 border-b border-border pb-3"
      >
        {statusTabs.map((tab) => {
          const active = statusFilter === tab.value;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleStatusChange(tab.value)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-md text-xs font-semibold cursor-pointer ${
                active
                  ? "bg-maroon-700 text-white"
                  : "bg-surface border border-border text-ink-muted hover:text-ink hover:bg-rail/60"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-rail text-ink-muted"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="card p-3.5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
            />
            <input
              type="text"
              aria-label="Search tickets"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search code, #id, subject, name, department…"
              className="input"
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>

          <select
            aria-label="Filter by department"
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(1);
            }}
            className="select md:w-52"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort tickets"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="select md:w-40"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="code">Code (A–Z)</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-ghost text-[#991b1b] shrink-0"
            >
              <X size={15} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Registry Table / List */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : paginatedTickets.length > 0 ? (
        <div className="card overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-rail/60">
                  <th className="eyebrow px-4 py-3">Docket Code</th>
                  <th className="eyebrow px-4 py-3">Subject &amp; Party</th>
                  <th className="eyebrow px-4 py-3">Department</th>
                  <th className="eyebrow px-4 py-3">Received By</th>
                  <th className="eyebrow px-4 py-3">Received</th>
                  <th className="eyebrow px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {paginatedTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-canvas transition-colors"
                  >
                    <td className="px-4 py-3.5 align-top whitespace-nowrap">
                      <Link
                        to={`/admin/tickets/${ticket.id}`}
                        className="font-mono font-semibold text-maroon-700 hover:underline tabular-nums"
                      >
                        {ticket.ticket_code}
                      </Link>
                      <p className="font-mono text-xs text-ink-muted tabular-nums mt-0.5">
                        #{ticket.sequential_id}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 align-top max-w-xs">
                      <Link
                        to={`/admin/tickets/${ticket.id}`}
                        className="font-medium text-ink hover:text-maroon-700 block truncate"
                      >
                        {ticket.subject}
                      </Link>
                      <p className="text-xs text-ink-muted truncate mt-0.5">
                        {ticket.affected_party}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 align-top text-ink-muted">
                      {ticket.departments?.name || "—"}
                    </td>
                    <td className="px-4 py-3.5 align-top text-ink-muted">
                      {ticket.personnel?.name || "—"}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs text-ink-muted whitespace-nowrap tabular-nums">
                      {formatShortDateTime(ticket.received_at)}
                    </td>
                    <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                      <StatusBadge status={ticket.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Rows */}
          <div className="md:hidden divide-y divide-border">
            {paginatedTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/admin/tickets/${ticket.id}`}
                className="block p-4 hover:bg-canvas transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-maroon-700 tabular-nums">
                      {ticket.ticket_code}
                    </span>
                    <span className="font-mono text-xs text-ink-muted tabular-nums">
                      #{ticket.sequential_id}
                    </span>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="text-sm font-medium text-ink">{ticket.subject}</p>
                <p className="text-xs text-ink-muted tabular-nums">
                  {ticket.affected_party}
                  {ticket.departments?.name && ` · ${ticket.departments.name}`}
                  {ticket.received_at &&
                    ` · ${formatShortDateTime(ticket.received_at)}`}
                </p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-rail/30 text-xs text-ink-muted">
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
                  className="btn-secondary min-h-[36px] px-2.5 py-1 text-xs"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>
                <span className="px-1.5 font-mono tabular-nums text-ink">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-secondary min-h-[36px] px-2.5 py-1 text-xs"
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Ticket}
            title={
              hasActiveFilters
                ? "No tickets match your filters"
                : "No tickets recorded yet"
            }
            description={
              hasActiveFilters
                ? "Try clearing your search query or changing the selected status tab."
                : "Create your first OVPAA ticket to start tracking document flow."
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              ) : (
                <Link to="/admin/tickets/create" className="btn-primary">
                  <PlusCircle size={16} />
                  <span>Create Ticket</span>
                </Link>
              )
            }
          />
        </div>
      )}
    </div>
  );
};

export default Tickets;
