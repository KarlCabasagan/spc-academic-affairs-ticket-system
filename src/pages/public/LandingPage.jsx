import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Clock, CheckCircle } from "lucide-react";

const LandingPage = () => {
  const [ticketCode, setTicketCode] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (ticketCode.trim()) {
      navigate(`/track/${ticketCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-maroon-700 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
              <FileText size={40} className="text-white" />
            </div>
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
          <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
            <div className="relative">
              <Search
                size={22}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                placeholder="Enter ticket code (e.g., SPC-8X92)"
                className="w-full pl-14 pr-36 py-4 text-lg rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-6"
              >
                Track
              </button>
            </div>
          </form>

          {/* Example */}
          <p className="text-sm text-gray-400 mt-4">
            Example: SPC-8X92, SPC-AB12
          </p>
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
