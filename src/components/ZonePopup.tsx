import { Popup } from "react-map-gl/mapbox";
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  CheckCircleIcon, 
  XCircleIcon 
} from "@heroicons/react/24/solid";
import { type Zone, type VehicleDetails } from "../types";

interface ZonePopupProps {
  popupData: { longitude: number; latitude: number; foundZones: Zone[] } | null;
  selectedZone: Zone | null;
  vehicle: VehicleDetails | null;
  onClose: () => void;
  onSelectZone: (zone: Zone | null) => void;
  checkCompliance: (v: VehicleDetails, z: Zone) => boolean;
}

const ZoneBadge = ({ type, color }: { type: string; color: string }) => (
  <span
    className="text-[10px] uppercase font-black text-white px-2 py-0.5 rounded-full tracking-wider shadow-sm"
    style={{ backgroundColor: color }}
  >
    {type.replace("-", " ")}
  </span>
);

export const ZonePopup = ({
  popupData,
  selectedZone,
  vehicle,
  onClose,
  onSelectZone,
  checkCompliance
}: ZonePopupProps) => {
  if (!popupData) return null;

  return (
    <Popup
      longitude={popupData.longitude}
      latitude={popupData.latitude}
      anchor="bottom"
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
      className="z-50"
      maxWidth="320px"
      offset={15}
    >
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-full text-white transition-all z-30"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>

        {/* LIST VIEW */}
        {popupData.foundZones.length > 1 && selectedZone === null && (
          <div className="pt-5 pb-4 px-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
              {popupData.foundZones.length} Areas Found
            </h3>
            <div className="space-y-2">
              {popupData.foundZones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => onSelectZone(zone)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: zone.color }} />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{zone.name}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{zone.type}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DETAIL VIEW */}
        {selectedZone && (
          <div className="flex flex-col">
            <div className="relative h-20 w-full flex items-end p-4 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundColor: selectedZone.color }} />
              <div className="absolute inset-0 bg-linear-to-t from-white via-transparent to-transparent" />
              <div className="relative z-10 flex items-center gap-2 w-full justify-between">
                <div className="flex items-center gap-2">
                  {popupData.foundZones.length > 1 && (
                    <button onClick={() => onSelectZone(null)} className="p-1 bg-white/50 rounded-lg hover:bg-white transition-colors">
                      <ChevronLeftIcon className="w-4 h-4 text-slate-700" />
                    </button>
                  )}
                  <ZoneBadge type={selectedZone.type} color={selectedZone.color} />
                </div>
                {!vehicle && (
                  <span className="font-mono font-black text-slate-700 text-[11px] bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100">
                    {selectedZone.price}
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 text-left">
              <h3 className="text-xl font-black text-slate-900 leading-none mb-3 tracking-tight">{selectedZone.name}</h3>
              {vehicle ? (
                <div className={`mb-5 rounded-2xl p-4 border-2 ${checkCompliance(vehicle, selectedZone) ? "bg-emerald-50/50 border-emerald-100 text-emerald-900" : "bg-rose-50/50 border-rose-100 text-rose-900"}`}>
                  <div className="flex items-center gap-2 font-black text-[11px] mb-1.5 uppercase tracking-widest">
                    {checkCompliance(vehicle, selectedZone) ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <XCircleIcon className="w-5 h-5 text-rose-500" />}
                    {checkCompliance(vehicle, selectedZone) ? "Eligible / Free" : "Charge Applies"}
                  </div>
                  <p className="text-[12px] font-medium opacity-70 leading-relaxed">{checkCompliance(vehicle, selectedZone) ? "Your vehicle meets standards." : `Vehicle not compliant. Cost: ${selectedZone.price}.`}</p>
                </div>
              ) : (
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-6 italic">{selectedZone.description}</p>
              )}

              {selectedZone.status === "active" && selectedZone.payment_link && (
                <a
                  href={selectedZone.payment_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center w-full text-center text-xs font-black py-3.5 px-4 rounded-xl text-white shadow-xl transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: selectedZone.color, boxShadow: `0 10px 20px -10px ${selectedZone.color}` }}
                >
                  {vehicle ? (checkCompliance(vehicle, selectedZone) ? "VIEW RULES" : `PAY ${selectedZone.price} NOW`) : "CHECK VEHICLE OR PAY"}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
};