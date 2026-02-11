import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import { functions } from "../firebase";
import type { VehicleDetails } from "../types";

export const NumberPlateInput = ({
  onVehicleCheck,
}: {
  onVehicleCheck: (v: VehicleDetails | null) => void;
}) => {
  const [vrm, setVrm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vrm || loading) return;
    setLoading(true);
    setError(null);
    try {
      const checkVehicle = httpsCallable(functions, "checkVehicle");
      const result = await checkVehicle({ registration: vrm });
      onVehicleCheck(result.data as VehicleDetails);
    } catch (err: any) {
      setError("Vehicle not found");
      onVehicleCheck(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <form
        onSubmit={handleSearch}
        className="flex items-center w-full bg-[#fcd116] rounded-xl border-2 border-black/5 shadow-sm overflow-hidden h-12"
      >
        {/* Blue GB Strip */}
        <div className="h-full w-7 bg-[#003399] flex flex-col items-center justify-center shrink-0">
          <span className="text-[7px] font-bold text-white leading-none">
            UK
          </span>
        </div>

        {/* Input - Added pr-2 and adjusted font size for mobile compatibility */}
        <input
          type="text"
          value={vrm}
          onChange={(e) =>
            setVrm(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
          placeholder="ENTER REG"
          className="flex-1 min-w-0 bg-[#fcd116] text-black font-mono text-lg font-bold uppercase placeholder-black/20 outline-none px-2 tracking-wider text-center h-full"
          maxLength={8}
        />

        {/* Submit Button - Added min-width and distinct background for visibility */}
        <button
          type="submit"
          disabled={loading}
          className="h-full w-12 bg-black/10 hover:bg-black/20 flex items-center justify-center shrink-0 border-l border-black/5 transition-all active:scale-95"
          aria-label="Search"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="w-6 h-6 text-black/70" />
          )}
        </button>
      </form>

      {error && (
        <div className="mt-2 text-center text-[11px] font-bold text-rose-600 bg-rose-50 py-1 rounded-lg border border-rose-100 animate-pulse">
          {error}
        </div>
      )}
    </div>
  );
};

