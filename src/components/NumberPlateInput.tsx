// --- NumberPlateInput.tsx Component ---
import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

interface VehicleDetails {
  registration: string;
  make: string;
  fuelType: string;
  year: number;
  euroStatus: string; // "Euro 6", "Euro 4", etc.
}

interface NumberPlateInputProps {
  onVehicleCheck: (vehicle: VehicleDetails | null) => void;
}

export const NumberPlateInput = ({ onVehicleCheck }: NumberPlateInputProps) => {
  const [vrm, setVrm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // REPLACE THIS WITH YOUR DEPLOYED FIREBASE URL
  const API_URL =
    "https://us-central1-emissions-map-uk.cloudfunctions.net/checkVehicle";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vrm) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration: vrm }),
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error("Vehicle not found");
        throw new Error("Search failed");
      }

      const data: VehicleDetails = await response.json();
      onVehicleCheck(data); // Pass data up to App.tsx
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error checking vehicle");
      onVehicleCheck(null); // Reset if failed
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSearch} className="relative group">
        {/* UK Plate Styling */}
        <div className="flex items-center w-full bg-[#fcd116] rounded-md border-2 border-black/10 shadow-sm overflow-hidden h-12">
          {/* Blue GB Strip */}
          <div className="h-full w-8 bg-[#003399] flex flex-col items-center justify-center gap-0.5 z-10">
            {/* UK Flag SVG */}
            <svg viewBox="0 0 60 30" className="w-4 h-3">
              <rect width="60" height="30" fill="#012169" />
              <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
              <path
                d="M0,0 L60,30 M60,0 L0,30"
                stroke="#C8102E"
                strokeWidth="4"
              />
              <path
                d="M30,0 L30,30 M0,15 L60,15"
                stroke="#fff"
                strokeWidth="10"
              />
              <path
                d="M30,0 L30,30 M0,15 L60,15"
                stroke="#C8102E"
                strokeWidth="6"
              />
            </svg>
            <span className="text-[8px] font-bold text-white leading-none">
              UK
            </span>
          </div>

          {/* Input Area */}
          <input
            type="text"
            value={vrm}
            onChange={(e) =>
              setVrm(e.target.value.toUpperCase().replace(/\s/g, ""))
            }
            placeholder="ENTER REG"
            className="flex-1 bg-[#fcd116] text-black font-mono text-xl md:text-2xl font-bold uppercase placeholder-yellow-600/50 outline-none px-2 tracking-widest text-center h-full"
            maxLength={8}
          />

          {/* Search Button */}
          <button
            type="submit"
            disabled={loading}
            className="bg-black/10 hover:bg-black/20 h-full px-3 text-black/70 transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <MagnifyingGlassIcon className="w-6 h-6" />
            )}
          </button>
        </div>
        <div className="absolute inset-0 rounded-md ring-4 ring-black/5 pointer-events-none"></div>
        {error && (
          <div className="absolute top-14 left-0 w-full text-center text-xs font-bold text-red-600 bg-red-50 p-1 rounded">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};
