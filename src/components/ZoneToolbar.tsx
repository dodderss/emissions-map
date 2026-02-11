import { useState } from "react";
import {
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  TicketIcon,
} from "@heroicons/react/24/solid";
import { type Zone, type VehicleDetails } from "../types"; // Adjust path as needed
import { NumberPlateInput } from "./NumberPlateInput";

interface ZoneToolbarProps {
  zones: Zone[];
  vehicle: VehicleDetails | null;
  filterMode: "all" | "compliant" | "non-compliant"; // Changed from boolean
  hoveredZoneId: string | null;
  onFilterChange: (mode: "all" | "compliant" | "non-compliant") => void;
  onVehicleCheck: (v: VehicleDetails | null) => void;
  onClearVehicle: () => void;
  onZoneClick: (zone: Zone) => void;
  onHoverZone: (id: string | null) => void;
  checkCompliance: (v: VehicleDetails, z: Zone) => boolean;
}

export const ZoneToolbar = ({
  zones,
  vehicle,
  filterMode,
  hoveredZoneId,
  onVehicleCheck,
  onClearVehicle,
  onFilterChange,
  onZoneClick,
  onHoverZone,
  checkCompliance,
}: ZoneToolbarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`
        absolute z-10 transition-all duration-300 ease-in-out
        /* Mobile: Centered at top */
        top-4 left-1/2 -translate-x-1/2 w-[94%] max-w-sm
        /* Desktop: Top-left */
        md:left-4 md:translate-x-0 md:w-80
        bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20
        max-h-[85vh] flex flex-col
      `}
    >
      {/* 1. Header & Plate Input */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
            <span className="text-xl">🇬🇧</span> Emissions Map
          </h1>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronDownIcon
              className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <NumberPlateInput
          key={vehicle ? vehicle.registration : "empty"}
          onVehicleCheck={(v) => {
            onVehicleCheck(v);
            if (v) setIsExpanded(true);
          }}
        />

        {vehicle && (
          <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 min-w-0 mr-2">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Active Vehicle
              </div>
              <div className="text-sm font-black text-slate-800 truncate">
                {vehicle.make}
                <span className="text-slate-400 font-mono text-xs ml-1 font-normal">
                  {vehicle.year}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap">
                {vehicle.euroStatus}
              </div>
              <button
                onClick={onClearVehicle}
                className="p-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Expandable Section */}
      <div
        className={`
        overflow-y-auto scrollbar-hide px-4 pb-4
        ${isExpanded ? "block" : "hidden md:block"}
      `}
      >
        {vehicle && (
          <div className="mb-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Filter View</div>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => onFilterChange('all')}
                className={`py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-tight ${filterMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All
              </button>
              <button
                onClick={() => onFilterChange('compliant')}
                className={`py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-tight flex items-center justify-center gap-1 ${filterMode === 'compliant' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <CheckCircleIcon className="w-3 h-3" />
                Free
              </button>
              <button
                onClick={() => onFilterChange('non-compliant')}
                className={`py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-tight flex items-center justify-center gap-1 ${filterMode === 'non-compliant' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <TicketIcon className="w-3 h-3" />
                Charge
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1 mt-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
            Available Zones
          </div>
          {zones.map((zone) => {
            let StatusIcon = null;
            let compliant = false;
            if (vehicle) {
              const isCompliant = checkCompliance(vehicle, zone);
              compliant = isCompliant;
              StatusIcon = isCompliant ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-rose-500" />
              );
            }
            return (
              <button
                key={zone.id}
                onMouseEnter={() => onHoverZone(zone.id)}
                onMouseLeave={() => onHoverZone(null)}
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all text-left border border-transparent ${
                  hoveredZoneId === zone.id
                    ? "bg-slate-100/50"
                    : "hover:bg-slate-50"
                }`}
                onClick={() => {
                  onZoneClick(zone);
                  if (window.innerWidth < 768) setIsExpanded(false);
                }}
              >
                {StatusIcon ? (
                  StatusIcon
                ) : (
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  ></span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-700 truncate">
                    {zone.name}
                  </span>
                  {compliant ? (
                    <></>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {zone.price}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
