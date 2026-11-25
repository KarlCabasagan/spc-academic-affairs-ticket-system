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
import { FileSpreadsheet, Download, AlertCircle } from "lucide-react";
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

  const rows = Object.keys(byMonth)
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
        pendingPct: total > 0 ? `${((pending / total) * 100).toFixed(1)}%` : "0%",
        released,
        releasedPct:
          total > 0 ? `${((released / total) * 100).toFixed(1)}%` : "0%",
        recommended,
        recommendedPct:
          total > 0 ? `${((recommended / total) * 100).toFixed(1)}%` : "0%",
        disapproved,
        disapprovedPct:
          total > 0 ? `${((disapproved / total) * 100).toFixed(1)}%` : "0%",
      };
    });

  return rows;
};

const Reports = () => {
  const [startDate, setStartDate] = useState(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return toLocalDateInputValue(oneYearAgo);
  });
  const [endDate, setEndDate] = useState(() => toLocalDateInputValue());
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
      pendingPct: total > 0 ? `${((pending / total) * 100).toFixed(1)}%` : "0%",
      released,
      releasedPct:
        total > 0 ? `${((released / total) * 100).toFixed(1)}%` : "0%",
      recommended,
      recommendedPct:
        total > 0 ? `${((recommended / total) * 100).toFixed(1)}%` : "0%",
      disapproved,
      disapprovedPct:
        total > 0 ? `${((disapproved / total) * 100).toFixed(1)}%` : "0%",
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

      // Lazy-load SheetJS only when exporting
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

        // Guarantee unique Excel-safe sheet name (<= 31 chars, e.g. "Sep 2026")
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          Preview monthly summaries and export tickets to Excel.
        </p>
      </div>

      {/* Export Card */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <FileSpreadsheet size={24} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Export to Excel</h2>
            <p className="text-sm text-gray-500">
              Download tickets with monthly breakdown
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Date Range + Department */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startDate" className="label">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="reportDepartment" className="label">
                Department
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
              className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>Start date must be on or before end date.</span>
            </div>
          )}

          {/* Ticket Count Preview */}
          {!isDateRangeInvalid && (
            <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600 tabular-nums">
                {loadingPreview ? (
                  "Loading ticket summary…"
                ) : (
                  <>
                    <span className="font-semibold text-gray-900">
                      {previewTickets.length}
                    </span>{" "}
                    ticket{previewTickets.length !== 1 ? "s" : ""} found in
                    selected range
                  </>
                )}
              </p>
            </div>
          )}

          {/* Export Button */}
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
            className="btn-primary w-full"
          >
            {exporting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download size={18} />
                <span>Export to Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Monthly Summary Preview */}
      {!isDateRangeInvalid && monthlySummary.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Monthly Summary Preview
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Released</th>
                  <th className="px-4 py-3 text-right">Recommended</th>
                  <th className="px-4 py-3 text-right">Disapproved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 tabular-nums">
                {monthlySummary.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {row.total}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.pending} ({row.pendingPct})
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.released} ({row.releasedPct})
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.recommended} ({row.recommendedPct})
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.disapproved} ({row.disapprovedPct})
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200 tabular-nums">
                <tr>
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right">{totals.total}</td>
                  <td className="px-4 py-3 text-right">
                    {totals.pending} ({totals.pendingPct})
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totals.released} ({totals.releasedPct})
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totals.recommended} ({totals.recommendedPct})
                  </td>
                  <td className="px-4 py-3 text-right">
                    {totals.disapproved} ({totals.disapprovedPct})
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-gray-500 space-y-2">
        <p>
          <strong>Summary Tab:</strong> Monthly breakdown with status counts and
          percentages (Pending, Released, Recommended, Disapproved).
        </p>
        <p>
          <strong>Monthly Tabs:</strong> Separate sheets for each month
          containing detailed ticket data.
        </p>
      </div>
    </div>
  );
};

export default Reports;
