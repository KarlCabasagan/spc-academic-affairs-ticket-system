import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  toLocalDateInputValue,
  localDateRangeToISO,
  formatMonthKey,
  formatMonthLabel,
  formatExcelSheetName,
  formatShortDate,
} from "../../lib/dateUtils";
import { TableSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { FileSpreadsheet, Download, AlertCircle, Calendar } from "lucide-react";
import toast from "react-hot-toast";

const buildMonthlySummary = (tickets) => {
  const byMonth = {};

  tickets.forEach((ticket) => {
    const key = formatMonthKey(ticket.created_at);
    const label = formatMonthLabel(ticket.created_at);
    const sheetBase = formatExcelSheetName(ticket.created_at);

    if (!byMonth[key]) {
      byMonth[key] = {
        key,
        label,
        sheetBase,
        tickets: [],
      };
    }
    byMonth[key].tickets.push(ticket);
  });

  return Object.keys(byMonth)
    .sort()
    .map((key) => {
      const group = byMonth[key];
      const total = group.tickets.length;
      const pending = group.tickets.filter((t) => t.status === "Pending").length;
      const released = group.tickets.filter(
        (t) => t.status === "Approved and released",
      ).length;
      const recommended = group.tickets.filter(
        (t) => t.status === "Approved and Recommended",
      ).length;
      const disapproved = group.tickets.filter(
        (t) => t.status === "Disapproved and revised",
      ).length;

      return {
        key,
        label: group.label,
        sheetBase: group.sheetBase,
        tickets: group.tickets,
        total,
        pending,
        pendingPct: total > 0 ? `${((pending / total) * 100).toFixed(1)}%` : "0.0%",
        released,
        releasedPct:
          total > 0 ? `${((released / total) * 100).toFixed(1)}%` : "0.0%",
        recommended,
        recommendedPct:
          total > 0 ? `${((recommended / total) * 100).toFixed(1)}%` : "0.0%",
        disapproved,
        disapprovedPct:
          total > 0 ? `${((disapproved / total) * 100).toFixed(1)}%` : "0.0%",
      };
    });
};

const DATE_PRESETS = [
  {
    id: "this_month",
    label: "This Month",
    getRange: () => {
      const now = new Date();
      return {
        start: toLocalDateInputValue(
          new Date(now.getFullYear(), now.getMonth(), 1),
        ),
        end: toLocalDateInputValue(now),
      };
    },
  },
  {
    id: "last_30",
    label: "Last 30 Days",
    getRange: () => {
      const now = new Date();
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return {
        start: toLocalDateInputValue(past),
        end: toLocalDateInputValue(now),
      };
    },
  },
  {
    id: "this_quarter",
    label: "This Quarter",
    getRange: () => {
      const now = new Date();
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: toLocalDateInputValue(new Date(now.getFullYear(), qMonth, 1)),
        end: toLocalDateInputValue(now),
      };
    },
  },
  {
    id: "ytd",
    label: "Year to Date",
    getRange: () => {
      const now = new Date();
      return {
        start: toLocalDateInputValue(new Date(now.getFullYear(), 0, 1)),
        end: toLocalDateInputValue(now),
      };
    },
  },
  {
    id: "last_12m",
    label: "Last 12 Months",
    getRange: () => {
      const now = new Date();
      const past = new Date(now);
      past.setFullYear(past.getFullYear() - 1);
      return {
        start: toLocalDateInputValue(past),
        end: toLocalDateInputValue(now),
      };
    },
  },
];

const Reports = () => {
  const [startDate, setStartDate] = useState(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return toLocalDateInputValue(oneYearAgo);
  });
  const [endDate, setEndDate] = useState(() => toLocalDateInputValue());
  const [activePreset, setActivePreset] = useState("last_12m");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [previewTickets, setPreviewTickets] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isDateRangeInvalid = Boolean(startDate && endDate && startDate > endDate);

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
    const fetchPreview = async () => {
      if (!startDate || !endDate || isDateRangeInvalid) {
        setPreviewTickets([]);
        return;
      }

      setLoadingPreview(true);
      try {
        const { startISO, endISO } = localDateRangeToISO(startDate, endDate);
        let query = supabase
          .from("tickets")
          .select(
            `
            *,
            departments (name),
            personnel (name)
          `,
          )
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .order("created_at", { ascending: false });

        if (departmentFilter) {
          query = query.eq("department_id", departmentFilter);
        }

        const { data, error } = await query;
        if (error) throw error;
        setPreviewTickets(data || []);
      } catch (error) {
        console.error("Error loading report preview:", error);
        toast.error("Failed to load report preview");
        setPreviewTickets([]);
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [startDate, endDate, departmentFilter, isDateRangeInvalid]);

  const applyPreset = (preset) => {
    const { start, end } = preset.getRange();
    setStartDate(start);
    setEndDate(end);
    setActivePreset(preset.id);
  };

  const monthlySummary = useMemo(
    () => buildMonthlySummary(previewTickets),
    [previewTickets],
  );

  const totals = useMemo(() => {
    const total = previewTickets.length;
    const pending = previewTickets.filter((t) => t.status === "Pending").length;
    const released = previewTickets.filter(
      (t) => t.status === "Approved and released",
    ).length;
    const recommended = previewTickets.filter(
      (t) => t.status === "Approved and Recommended",
    ).length;
    const disapproved = previewTickets.filter(
      (t) => t.status === "Disapproved and revised",
    ).length;

    return {
      total,
      pending,
      pendingPct: total > 0 ? `${((pending / total) * 100).toFixed(1)}%` : "0.0%",
      released,
      releasedPct:
        total > 0 ? `${((released / total) * 100).toFixed(1)}%` : "0.0%",
      recommended,
      recommendedPct:
        total > 0 ? `${((recommended / total) * 100).toFixed(1)}%` : "0.0%",
      disapproved,
      disapprovedPct:
        total > 0 ? `${((disapproved / total) * 100).toFixed(1)}%` : "0.0%",
    };
  }, [previewTickets]);

  const exportToExcel = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (isDateRangeInvalid) {
      toast.error("Start date must be on or before end date");
      return;
    }

    setExporting(true);
    try {
      const { startISO, endISO } = localDateRangeToISO(startDate, endDate);
      let query = supabase
        .from("tickets")
        .select(
          `
          *,
          departments (name),
          personnel (name)
        `,
        )
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (departmentFilter) {
        query = query.eq("department_id", departmentFilter);
      }

      const { data: tickets, error } = await query;
      if (error) throw error;

      if (!tickets || tickets.length === 0) {
        toast.error("No tickets found in the selected date range");
        return;
      }

      const rowsByMonth = buildMonthlySummary(tickets);
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const summaryData = rowsByMonth.map((m) => ({
        Month: m.label,
        "Total Tickets": m.total,
        Pending: m.pending,
        "Pending %": m.pendingPct,
        Released: m.released,
        "Released %": m.releasedPct,
        Recommended: m.recommended,
        "Recommended %": m.recommendedPct,
        Disapproved: m.disapproved,
        "Disapproved %": m.disapprovedPct,
      }));

      const grandTotal = tickets.length;
      const grandPending = tickets.filter((t) => t.status === "Pending").length;
      const grandReleased = tickets.filter(
        (t) => t.status === "Approved and released",
      ).length;
      const grandRecommended = tickets.filter(
        (t) => t.status === "Approved and Recommended",
      ).length;
      const grandDisapproved = tickets.filter(
        (t) => t.status === "Disapproved and revised",
      ).length;

      summaryData.push({
        Month: "TOTAL",
        "Total Tickets": grandTotal,
        Pending: grandPending,
        "Pending %": `${((grandPending / grandTotal) * 100).toFixed(1)}%`,
        Released: grandReleased,
        "Released %": `${((grandReleased / grandTotal) * 100).toFixed(1)}%`,
        Recommended: grandRecommended,
        "Recommended %": `${((grandRecommended / grandTotal) * 100).toFixed(1)}%`,
        Disapproved: grandDisapproved,
        "Disapproved %": `${((grandDisapproved / grandTotal) * 100).toFixed(1)}%`,
      });

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet["!cols"] = [
        { wch: 18 },
        { wch: 14 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      const usedSheetNames = new Set(["Summary"]);

      rowsByMonth.forEach((monthGroup) => {
        const sheetData = monthGroup.tickets.map((ticket) => ({
          "Ticket Code": ticket.ticket_code,
          "#": ticket.sequential_id,
          Subject: ticket.subject,
          "Affected Party": ticket.affected_party,
          Department: ticket.departments?.name || "-",
          "Received By": ticket.personnel?.name || "-",
          Status: ticket.status,
          "Released To": ticket.released_to || "-",
          "Released At": ticket.released_at
            ? formatShortDate(ticket.released_at)
            : "-",
          Remarks: ticket.remarks || "-",
          "Date Received": formatShortDate(ticket.received_at),
          "Created At": formatShortDate(ticket.created_at),
        }));

        const monthSheet = XLSX.utils.json_to_sheet(sheetData);
        monthSheet["!cols"] = [
          { wch: 12 },
          { wch: 6 },
          { wch: 25 },
          { wch: 20 },
          { wch: 18 },
          { wch: 18 },
          { wch: 22 },
          { wch: 20 },
          { wch: 14 },
          { wch: 30 },
          { wch: 14 },
          { wch: 14 },
        ];

        const baseName = monthGroup.sheetBase.slice(0, 31);
        let sheetName = baseName;
        let suffix = 2;
        while (usedSheetNames.has(sheetName)) {
          sheetName = `${baseName.slice(0, 27)} (${suffix})`;
          suffix += 1;
        }
        usedSheetNames.add(sheetName);
        XLSX.utils.book_append_sheet(workbook, monthSheet, sheetName);
      });

      const fileName = `SPC_Tickets_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(`Exported ${tickets.length} tickets to Excel`);
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export tickets");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Reports &amp; Export
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Review monthly summaries and export multi-sheet Excel workbooks.
          </p>
        </div>
        <button
          type="button"
          onClick={exportToExcel}
          disabled={
            exporting ||
            loadingPreview ||
            !startDate ||
            !endDate ||
            isDateRangeInvalid ||
            previewTickets.length === 0
          }
          className="btn-primary self-start sm:self-auto"
        >
          <Download size={16} />
          <span>{exporting ? "Exporting…" : "Export Excel (.xlsx)"}</span>
        </button>
      </div>

      {/* Filter & Preset Controls */}
      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted mr-1">
            <Calendar size={13} />
            <span>Range:</span>
          </span>
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 min-h-[34px] rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activePreset === preset.id
                  ? "bg-maroon-700 text-white"
                  : "bg-rail text-ink-muted hover:text-ink border border-border"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <label htmlFor="startDate" className="label">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setActivePreset(null);
                setStartDate(e.target.value);
              }}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="label">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => {
                setActivePreset(null);
                setEndDate(e.target.value);
              }}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="reportDepartment" className="label">
              Origin Department
            </label>
            <select
              id="reportDepartment"
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
        </div>

        {isDateRangeInvalid && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-md bg-[#fdf1f1] border border-[#f4c5c5] text-sm text-[#991b1b]"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>Start date must be on or before end date.</span>
          </div>
        )}
      </section>

      {/* KPI Summary Strip */}
      {!isDateRangeInvalid && !loadingPreview && (
        <section className="card grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border">
          <div className="p-4">
            <p className="eyebrow">Total Matched</p>
            <p className="font-mono text-2xl font-semibold text-ink mt-1 tabular-nums">
              {totals.total}
            </p>
          </div>
          <div className="p-4">
            <p className="eyebrow">Pending</p>
            <p className="font-mono text-2xl font-semibold text-[#92400e] mt-1 tabular-nums">
              {totals.pending}
            </p>
            <p className="text-xs text-ink-muted tabular-nums">
              {totals.pendingPct}
            </p>
          </div>
          <div className="p-4">
            <p className="eyebrow">Recommended</p>
            <p className="font-mono text-2xl font-semibold text-[#1e40af] mt-1 tabular-nums">
              {totals.recommended}
            </p>
            <p className="text-xs text-ink-muted tabular-nums">
              {totals.recommendedPct}
            </p>
          </div>
          <div className="p-4">
            <p className="eyebrow">Released</p>
            <p className="font-mono text-2xl font-semibold text-[#166534] mt-1 tabular-nums">
              {totals.released}
            </p>
            <p className="text-xs text-ink-muted tabular-nums">
              {totals.releasedPct}
            </p>
          </div>
          <div className="p-4">
            <p className="eyebrow">Disapproved</p>
            <p className="font-mono text-2xl font-semibold text-[#991b1b] mt-1 tabular-nums">
              {totals.disapproved}
            </p>
            <p className="text-xs text-ink-muted tabular-nums">
              {totals.disapprovedPct}
            </p>
          </div>
        </section>
      )}

      {/* Monthly Summary Table / Loading / Empty */}
      {loadingPreview ? (
        <TableSkeleton rows={4} />
      ) : !isDateRangeInvalid && monthlySummary.length > 0 ? (
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">
              Monthly Summary Preview
            </h2>
            <span className="text-xs text-ink-muted tabular-nums">
              {monthlySummary.length} monthly sheet
              {monthlySummary.length !== 1 ? "s" : ""} + Summary
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-rail/60 border-b border-border">
                  <th className="eyebrow px-4 py-3">Month</th>
                  <th className="eyebrow px-4 py-3 text-right">Total</th>
                  <th className="eyebrow px-4 py-3 text-right">Pending</th>
                  <th className="eyebrow px-4 py-3 text-right">Recommended</th>
                  <th className="eyebrow px-4 py-3 text-right">Released</th>
                  <th className="eyebrow px-4 py-3 text-right">Disapproved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {monthlySummary.map((row) => (
                  <tr key={row.key} className="hover:bg-canvas transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ink">
                      {row.total}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-muted">
                      {row.pending} ({row.pendingPct})
                    </td>
                    <td className="px-4 py-3 text-right text-ink-muted">
                      {row.recommended} ({row.recommendedPct})
                    </td>
                    <td className="px-4 py-3 text-right text-ink-muted">
                      {row.released} ({row.releasedPct})
                    </td>
                    <td className="px-4 py-3 text-right text-ink-muted">
                      {row.disapproved} ({row.disapprovedPct})
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-rail/70 font-semibold text-ink border-t border-border-strong tabular-nums">
                <tr>
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {totals.total}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totals.pending} ({totals.pendingPct})
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totals.recommended} ({totals.recommendedPct})
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totals.released} ({totals.releasedPct})
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totals.disapproved} ({totals.disapprovedPct})
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ) : (
        !isDateRangeInvalid && (
          <div className="card">
            <EmptyState
              icon={FileSpreadsheet}
              title="No tickets in selected date range"
              description="Adjust the start date, end date, or department filter to preview data for export."
            />
          </div>
        )
      )}

      {/* Workbook Notes */}
      <div className="panel-recessed p-4 text-xs text-ink-muted space-y-1 prose-measure">
        <p>
          <span className="font-semibold text-ink">Summary Sheet:</span> Monthly
          totals with counts and percentages for Pending, Recommended, Released,
          and Disapproved statuses.
        </p>
        <p>
          <span className="font-semibold text-ink">Monthly Sheets:</span> One
          tab per month containing docket code, subject, affected party,
          department, receiving personnel, release destination, and remarks.
        </p>
      </div>
    </div>
  );
};

export default Reports;
