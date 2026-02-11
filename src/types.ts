export interface Zone {
  id: string;
  name: string;
  type: string;
  ruleType?: string;
  status: "active" | "review" | "cancelled";
  url: string;
  color: string;
  price: string;
  payment_link: string;
  description: string;
  // Dynamic viewport fields from JSON
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface VehicleDetails {
  registration: string;
  make: string;
  fuelType: string;
  year: number;
  euroStatus: string;
}
