import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import { formatShortDateTime } from "../../lib/dateUtils";
import StatusBadge from "../../components/ui/StatusBadge";
import { DashboardSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import {
  Ticket,
  PlusCircle,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  Building2,
  UserCog,
} from "lucide-react";

const METRIC_ITEMS = [
  {
    key: "total",
    label: "Total Logged",
    href: "/admin/tickets",
    toneClass: "text-ink",
  },
  {
    key: "pending",
    label: "Pending Review",
    href: "/admin/tickets?status=Pending",
    toneClass: "text-[#92400e]",
  },
  {
    key: "recommended",
    label: "Recommended",
    href: "/admin/tickets?status=Approved%20and%20Recommended",
    toneClass: "text-[#1e40af]",
  },
  {
    key: "approved",
    label: "Released",
    href: "/admin/tickets?status=Approved%20and%20released",
    toneClass: "text-[#166534]",
  },
  {
    key: "disapproved",
    label: "Disapproved",
    href: "/admin/tickets?status=Disapproved%20and%20revised",
    toneClass: "text-[#991b1b]",
  },
];

const Dashboard = () => {
  const { profile, isSuperAdmin } = useAuth();
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

      setRecentTickets(list.slice(0, 6));
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

  const distribution = useMemo(() => {
    const total = stats.total || 0;
    const pct = (count) => (total > 0 ? (count / total) * 100 : 0);
    return [
      {
        label: "Pending",
        count: stats.pending,
        pct: pct(stats.pending),
        barClass: "bg-amber-500",
      },
      {
        label: "Recommended",
        count: stats.recommended,
        pct: pct(stats.recommended),
        barClass: "bg-blue-600",
      },
      {
        label: "Released",
        count: stats.approved,
        pct: pct(stats.approved),
        barClass: "bg-emerald-600",
      },
      {
        label: "Disapproved",
        count: stats.disapproved,
        pct: pct(stats.disapproved),
        barClass: "bg-red-600",
      },
    ];
  }, [stats]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto my-12">
        <div className="w-11 h-11 rounded-lg bg-[#fdf1f1] border border-[#f4c5c5] flex items-center justify-center mx-auto mb-3.5">
          <AlertCircle size={20} className="text-[#991b1b]" />
        </div>
        <h2 className="text-base font-semibold text-ink mb-1">
          Unable to Load Dashboard
        </h2>
        <p className="text-sm text-ink-muted mb-5">{error}</p>
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
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Staff"}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Live queue summary and recent OVPAA ticket activity.
          </p>
        </div>
        <Link to="/admin/tickets/create" className="btn-primary self-start sm:self-auto">
          <PlusCircle size={16} />
          <span>Create Ticket</span>
        </Link>
      </div>

      {/* Connected Metric Strip */}
      <section
        aria-label="Ticket queue metrics"
        className="card grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border overflow-hidden"
      >
        {METRIC_ITEMS.map((item) => {
          const count = stats[item.key];
          const share =
            item.key === "total"
              ? "All recorded dockets"
              : stats.total > 0
                ? `${((count / stats.total) * 100).toFixed(1)}% of total`
                : "0.0% of total";

          return (
            <Link
              key={item.key}
              to={item.href}
              className="group p-4 sm:p-5 hover:bg-rail/60 transition-colors flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">{item.label}</span>
                <ArrowRight
                  size={13}
                  className="text-ink-subtle opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <p
                className={`font-mono text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums ${item.toneClass}`}
              >
                {count}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">{share}</p>
            </Link>
          );
        })}
      </section>

      {/* Queue Distribution Bar */}
      {stats.total > 0 && (
        <section className="card p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">
              Queue Status Distribution
            </h2>
            <span className="text-xs text-ink-muted tabular-nums">
              {stats.total} total docket{stats.total !== 1 ? "s" : ""}
            </span>
          </div>

          <div
            className="h-2.5 w-full rounded-full bg-rail overflow-hidden flex"
            role="img"
            aria-label="Ticket status distribution bar"
          >
            {distribution.map(
              (seg) =>
                seg.count > 0 && (
                  <div
                    key={seg.label}
                    style={{ width: `${seg.pct}%` }}
                    className={`${seg.barClass} h-full transition-opacity`}
                    title={`${seg.label}: ${seg.count} (${seg.pct.toFixed(1)}%)`}
                  />
                ),
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-muted tabular-nums">
            {distribution.map((seg) => (
              <span key={seg.label} className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${seg.barClass}`} />
                <span>{seg.label}:</span>
                <span className="font-semibold text-ink">{seg.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Split: Recent Dockets + Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Docket Feed */}
        <section className="lg:col-span-8 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-ink">Recent Tickets</h2>
            <Link
              to="/admin/tickets"
              className="text-xs font-semibold text-maroon-700 hover:text-maroon-800 inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {recentTickets.length > 0 ? (
            <div className="divide-y divide-border">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/admin/tickets/${ticket.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-canvas transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-maroon-700 tabular-nums">
                        {ticket.ticket_code}
                      </span>
                      <span className="text-sm font-medium text-ink truncate">
                        {ticket.subject}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted truncate tabular-nums">
                      {ticket.affected_party}
                      {ticket.departments?.name &&
                        ` · ${ticket.departments.name}`}
                      {ticket.received_at &&
                        ` · ${formatShortDateTime(ticket.received_at)}`}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={ticket.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Ticket}
              title="No tickets recorded yet"
              description="Log an incoming academic affairs request to begin tracking."
              action={
                <Link to="/admin/tickets/create" className="btn-primary">
                  <PlusCircle size={16} />
                  <span>Create First Ticket</span>
                </Link>
              }
            />
          )}
        </section>

        {/* Quick Operations Rail */}
        <aside className="lg:col-span-4 panel-recessed p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Quick Operations</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Common daily OVPAA registry shortcuts.
            </p>
          </div>

          <div className="space-y-2">
            <Link
              to="/admin/tickets/create"
              className="flex items-center justify-between p-3 rounded-md bg-surface border border-border hover:border-border-strong text-sm font-medium text-ink transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <PlusCircle size={16} className="text-maroon-700" />
                <span>Log New Ticket</span>
              </span>
              <ArrowRight size={14} className="text-ink-subtle" />
            </Link>

            <Link
              to="/admin/tickets?status=Pending"
              className="flex items-center justify-between p-3 rounded-md bg-surface border border-border hover:border-border-strong text-sm font-medium text-ink transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <Clock size={16} className="text-[#92400e]" />
                <span>Review Pending Queue</span>
              </span>
              <ArrowRight size={14} className="text-ink-subtle" />
            </Link>

            <Link
              to="/admin/reports"
              className="flex items-center justify-between p-3 rounded-md bg-surface border border-border hover:border-border-strong text-sm font-medium text-ink transition-colors"
            >
              <span className="inline-flex items-center gap-2.5">
                <FileSpreadsheet size={16} className="text-[#166534]" />
                <span>Export Monthly Report</span>
              </span>
              <ArrowRight size={14} className="text-ink-subtle" />
            </Link>

            {isSuperAdmin && (
              <>
                <Link
                  to="/admin/departments"
                  className="flex items-center justify-between p-3 rounded-md bg-surface border border-border hover:border-border-strong text-sm font-medium text-ink transition-colors"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Building2 size={16} className="text-ink-muted" />
                    <span>Manage Departments</span>
                  </span>
                  <ArrowRight size={14} className="text-ink-subtle" />
                </Link>
                <Link
                  to="/admin/team"
                  className="flex items-center justify-between p-3 rounded-md bg-surface border border-border hover:border-border-strong text-sm font-medium text-ink transition-colors"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <UserCog size={16} className="text-ink-muted" />
                    <span>Manage Team Access</span>
                  </span>
                  <ArrowRight size={14} className="text-ink-subtle" />
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
