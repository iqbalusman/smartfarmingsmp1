import { Activity, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom"; // atau next/link jika Next.js

function DropdownMenu() {
  const [open, setOpen] = useState(false);

  const toggleDropdown = () => setOpen(!open);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md w-full text-left"
      >
        <Activity className="w-5 h-5" />
        <span>Monitoring</span>
        <ChevronDown className="w-4 h-4 ml-auto" />
      </button>
      {open && (
        <div className="ml-6 mt-1 space-y-1">
          <Link
            to="/monitoring/irigasitetes"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Irigasi Tetes
          </Link>
          <Link
            to="/hidroponik"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Hidroponik
          </Link>
        </div>
      )}
    </div>
  );
}
