import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { FileSpreadsheet, Download } from "lucide-react";
import toast from "react-hot-toast";

const Reports = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketCount, setTicketCount] = useState(null);

  // Set default end date to current time on mount
  useEffect(() => {
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    setEndDate(formattedDate);

    // Default start date to 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    setStartDate(oneYearAgo.toISOString().split("T")[0]);
  }, []);

  // Fetch ticket count when dates change
  useEffect(() => {
    const fetchCount = async () => {
      if (!startDate || !endDate) {
        setTicketCount(null);
        return;
      }

      const { count, error } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);

      if (!error) {
        setTicketCount(count);
      }
    };

    fetchCount();
  }, [startDate, endDate]);

  const getMonthYear = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getMonthKey = (dateString) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const exportToExcel = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      // Fetch all tickets in date range
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          departments (name),
          personnel (name)
        `,
        )
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!tickets || tickets.length === 0) {
        toast.error("No tickets found in the selected date range");
        setLoading(false);
        return;
      }

      // Group tickets by month
      const ticketsByMonth = {};
      tickets.forEach((ticket) => {
        const monthKey = getMonthKey(ticket.created_at);
        const monthLabel = getMonthYear(ticket.created_at);
        if (!ticketsByMonth[monthKey]) {
          ticketsByMonth[monthKey] = {
            label: monthLabel,
            tickets: [],
          };
        }
        ticketsByMonth[monthKey].tickets.push(ticket);
      });

      // Lazy-load SheetJS only when exporting
      const XLSX = await import("xlsx");

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Create summary data
      const summaryData = Object.keys(ticketsByMonth)
        .sort()
        .map((monthKey) => {
          const monthData = ticketsByMonth[monthKey];
          const total = monthData.tickets.length;
          const pending = monthData.tickets.filter(
            (t) => t.status === "Pending",
          ).length;
          const released = monthData.tickets.filter(
            (t) => t.status === "Approved and released",
          ).length;
          const recommended = monthData.tickets.filter(
            (t) => t.status === "Approved and Recommended",
          ).length;
          const disapproved = monthData.tickets.filter(
            (t) => t.status === "Disapproved and revised",
          ).length;

          return {
            Month: monthData.label,
            "Total Tickets": total,
            Pending: pending,
            "Pending %":
              total > 0 ? `${((pending / total) * 100).toFixed(1)}%` : "0%",
            Released: released,
            "Released %":
              total > 0 ? `${((released / total) * 100).toFixed(1)}%` : "0%",
            Recommended: recommended,
            "Recommended %":
              total > 0 ? `${((recommended / total) * 100).toFixed(1)}%` : "0%",
            Disapproved: disapproved,
            "Disapproved %":
              total > 0 ? `${((disapproved / total) * 100).toFixed(1)}%` : "0%",
          };
        });

      // Add grand total row
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
        "Pending %":
          grandTotal > 0
            ? `${((grandPending / grandTotal) * 100).toFixed(1)}%`
            : "0%",
        Released: grandReleased,
        "Released %":
          grandTotal > 0
            ? `${((grandReleased / grandTotal) * 100).toFixed(1)}%`
            : "0%",
        Recommended: grandRecommended,
        "Recommended %":
          grandTotal > 0
            ? `${((grandRecommended / grandTotal) * 100).toFixed(1)}%`
            : "0%",
        Disapproved: grandDisapproved,
        "Disapproved %":
          grandTotal > 0
            ? `${((grandDisapproved / grandTotal) * 100).toFixed(1)}%`
            : "0%",
      });

      // Add summary sheet
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

      // Create monthly sheets
      Object.keys(ticketsByMonth)
        .sort()
        .forEach((monthKey) => {
          const monthData = ticketsByMonth[monthKey];
          const sheetData = monthData.tickets.map((ticket) => ({
            "Ticket Code": ticket.ticket_code,
            "#": ticket.sequential_id,
            Subject: ticket.subject,
            "Affected Party": ticket.affected_party,
            Department: ticket.departments?.name || "-",
            "Received By": ticket.personnel?.name || "-",
            Status: ticket.status,
            "Released To": ticket.released_to || "-",
            "Released At": ticket.released_at
              ? new Date(ticket.released_at).toLocaleDateString()
              : "-",
            Remarks: ticket.remarks || "-",
            "Date Received": new Date(ticket.received_at).toLocaleDateString(),
            "Created At": new Date(ticket.created_at).toLocaleDateString(),
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

          // Use short month name for sheet title
          const sheetName = monthData.label.substring(0, 12);
          XLSX.utils.book_append_sheet(workbook, monthSheet, sheetName);
        });

      // Generate file
      const fileName = `SPC_Tickets_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(`Exported ${tickets.length} tickets to Excel`);
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export tickets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          Export tickets to Excel with monthly summaries.
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
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Ticket Count Preview */}
          {ticketCount !== null && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {ticketCount}
                </span>{" "}
                ticket{ticketCount !== 1 ? "s" : ""} found in selected date
                range
              </p>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={exportToExcel}
            disabled={loading || !startDate || !endDate}
            className="btn-primary w-full"
          >
            {loading ? (
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
