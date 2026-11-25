import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, CheckCircle, X } from "lucide-react";
import { normalizeTicketCode } from "../../lib/ticketStatus";

const RECENT_TICKETS_KEY = "spc_recent_tickets";

const readRecentTickets = () => {
  try {
    const raw = localStorage.getItem(RECENT_TICKETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
};

const LandingPage = () => {
  const [codeSuffix, setCodeSuffix] = useState("");
  const [validationError, setValidationError] = useState("");
  const [recentTickets, setRecentTickets] = useState(() => readRecentTickets());
  const navigate = useNavigate();

  const handleCodeChange = (e) => {
    const raw = e.target.value;
    setValidationError("");

    const cleaned = raw
      .toUpperCase()
      .replace(/^(SPC-?)+/i, "")
      .replace(/[^A-Z0-9]/g, "");
    setCodeSuffix(cleaned);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const { fullCode, isValid } = normalizeTicketCode(codeSuffix);

    if (!isValid) {
      setValidationError(
        "Please enter at least 3 characters after SPC- (for example, 8X92).",
      );
      return;
    }

    setValidationError("");
    navigate(`/track/${fullCode}`);
  };

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_TICKETS_KEY);
    } catch {
      // Ignore storage errors
    }
    setRecentTickets([]);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="mb-8">
            <img
              src="/icon-192.png"
              alt="SPC Logo"
              className="w-20 h-20 rounded-3xl mx-auto shadow-lg object-cover"
            />
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Track Your Document
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-lg mx-auto">
            Enter your ticket code to check the current status of your document
            request.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearch}
            className="relative max-w-xl mx-auto"
            noValidate
          >
            <div className="relative flex items-center">
              <Search
                size={20}
                className="absolute left-4 text-gray-400 pointer-events-none"
              />
              <span
                aria-hidden="true"
                className="absolute left-11 font-mono font-semibold text-maroon-700 select-none"
              >
                SPC-
              </span>
              <input
                type="text"
                aria-label="Ticket code suffix"
                value={codeSuffix}
                onChange={handleCodeChange}
                placeholder="8X92"
                maxLength={12}
                className={`w-full pl-22 pr-32 py-4 text-lg font-mono uppercase rounded-2xl border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-transparent transition-all ${
                  validationError ? "border-red-400" : "border-gray-200"
                }`}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-6"
              >
                Track
              </button>
            </div>
            {validationError && (
              <p
                role="alert"
                className="text-sm text-red-600 mt-2 text-left pl-2"
              >
                {validationError}
              </p>
            )}
          </form>

          {/* Example */}
          <p className="text-sm text-gray-400 mt-4">
            Example: SPC-8X92, SPC-AB12 (paste full code or 4-character suffix)
          </p>

          {/* Recent Lookups */}
          {recentTickets.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Recent:</span>
              {recentTickets.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => navigate(`/track/${code}`)}
                  className="px-3 py-1 rounded-full bg-gray-100 hover:bg-maroon-50 hover:text-maroon-700 text-xs font-mono font-medium text-gray-700 transition-colors"
                >
                  {code}
                </button>
              ))}
              <button
                type="button"
                onClick={clearRecent}
                aria-label="Clear recent tickets"
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-gray-100 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="w-14 h-14 bg-maroon-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-maroon-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Easy Tracking
              </h3>
              <p className="text-gray-500 text-sm">
                Simply enter your ticket code to instantly view your document
                status.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="w-14 h-14 bg-maroon-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-maroon-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Real-time Updates
              </h3>
              <p className="text-gray-500 text-sm">
                Get instant updates whenever your document status changes.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="w-14 h-14 bg-maroon-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-maroon-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Transparent Process
              </h3>
              <p className="text-gray-500 text-sm">
                Know exactly where your document is in the approval process.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
