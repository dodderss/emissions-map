import { useState } from "react";
import {
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  TicketIcon,
  MapIcon,
  TruckIcon,
} from "@heroicons/react/24/solid";
import { type Zone, type VehicleDetails } from "../types";
import { NumberPlateInput } from "./NumberPlateInput";
import { RouteChecker } from "./RouteChecker";
// import { NativeAd } from "./NativeAd";

interface ZoneToolbarProps {
  zones: Zone[];
  vehicle: VehicleDetails | null;
  filterMode: "all" | "compliant" | "non-compliant";
  hoveredZoneId: string | null;
  onVehicleCheck: (v: VehicleDetails | null) => void;
  onClearVehicle: () => void;
  onFilterChange: (mode: "all" | "compliant" | "non-compliant") => void;
  onZoneClick: (zone: Zone) => void;
  onHoverZone: (id: string | null) => void;
  checkCompliance: (v: VehicleDetails, z: Zone) => boolean;
  onRouteFound: (geoJson: any) => void;
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
  onRouteFound,
}: ZoneToolbarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "route">("map"); // NEW: Tab State

  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");

  return (
    <div
      className={`
        absolute z-10 transition-all duration-300 ease-in-out
        top-4 left-1/2 -translate-x-1/2 w-[94%] max-w-sm
        md:left-4 md:translate-x-0 md:w-80
        bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20
        max-h-[85vh] flex flex-col
      `}
    >
      <div className="p-4">
        {/* Header with Mobile Toggle */}
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

        {/* Global Reg Input */}
        <NumberPlateInput
          key={vehicle ? vehicle.registration : "empty"}
          onVehicleCheck={(v) => {
            onVehicleCheck(v);
            if (v) setIsExpanded(true);
          }}
        />

        {/* Vehicle Card */}
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

      {/* EXPANDABLE AREA */}
      <div
        className={`overflow-y-auto scrollbar-hide px-4 pb-4 flex-1 ${isExpanded ? "block" : "hidden md:block"}`}
      >
        {/* 1. NEW: TAB SWITCHER */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === "map"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <MapIcon className="w-4 h-4" />
            All Zones
          </button>
          <button
            onClick={() => setActiveTab("route")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === "route"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <TruckIcon className="w-4 h-4" />
            Route
          </button>
        </div>

        {/* 2. TAB CONTENT */}
        {activeTab === "map" ? (
          // --- EXISTING MAP LIST VIEW ---
          <>
            {vehicle && (
              <div className="mb-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
                  Filter View
                </div>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => onFilterChange("all")}
                    className={`py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-tight ${filterMode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => onFilterChange("compliant")}
                    className={`py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-tight flex items-center justify-center gap-1 ${filterMode === "compliant" ? "bg-emerald-500 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <CheckCircleIcon className="w-3 h-3" />
                    Free
                  </button>
                  <button
                    onClick={() => onFilterChange("non-compliant")}
                    className={`py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-tight flex items-center justify-center gap-1 ${filterMode === "non-compliant" ? "bg-rose-500 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <TicketIcon className="w-3 h-3" />
                    Charge
                  </button>
                </div>
              </div>
            )}

            {/* {hasComplianceIssues && (
              <NativeAd vehicleName={vehicle?.make || "Car"} />
            )} */}

            <div className="space-y-1 mt-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
                Available Zones
              </div>
              {zones.map((zone) => {
                let StatusIcon = null;
                if (vehicle) {
                  const isCompliant = checkCompliance(vehicle, zone);
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
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        {zone.price}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <RouteChecker
            zones={zones}
            vehicle={vehicle}
            onRouteFound={onRouteFound}
            checkCompliance={checkCompliance}
            origin={routeOrigin}
            setOrigin={setRouteOrigin}
            destination={routeDestination}
            setDestination={setRouteDestination}
          />
        )}
      </div>
    </div>
  );
};
