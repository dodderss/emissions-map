const { onCall, HttpsError } = require("firebase-functions/v2/https"); // Use onCall
const { defineSecret } = require("firebase-functions/params");
const axios = require("axios");


const DVLA_API_KEY = defineSecret("DVLA_API_KEY");

const deriveDetails = (data) => {
  const fuel = (data.fuelType || "").toUpperCase();
  const year = parseInt(data.yearOfManufacture, 10) || 0;
  let euroStatus = data.euroStatus || "UNKNOWN";

  let simpleFuel = "OTHER";
  if (fuel.includes("ELECTRIC")) simpleFuel = "ELECTRIC";
  else if (fuel.includes("DIESEL") || fuel.includes("HEAVY OIL")) simpleFuel = "DIESEL";
  else if (fuel.includes("PETROL") || fuel.includes("GAS")) simpleFuel = "PETROL";
  else if (fuel.includes("HYBRID")) simpleFuel = "HYBRID";

  if (euroStatus === "UNKNOWN") {
    if (simpleFuel === "ELECTRIC") euroStatus = "Zero Emission";
    else if (simpleFuel === "DIESEL") euroStatus = year >= 2015 ? "Euro 6" : "Euro 5";
    else if (simpleFuel === "PETROL") euroStatus = year >= 2006 ? "Euro 4" : "Euro 3";
  }

  return { simpleFuel, euroStatus };
};

exports.checkVehicle = onCall(
  {
    secrets: [DVLA_API_KEY],
    region: "us-central1",
  },
  async (request) => {
    // In onCall, the payload is in request.data
    const registration = request.data.registration;

    if (!registration) {
      throw new HttpsError("invalid-argument", "Registration required");
    }

    try {
      const response = await axios.post(
        "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
        { registrationNumber: registration },
        {
          headers: {
            "x-api-key": DVLA_API_KEY.value(),
            "Content-Type": "application/json"
          },
        }
      );

      const data = response.data;
      const { simpleFuel, euroStatus } = deriveDetails(data);

      // In onCall, you just return the object directly
      return {
        registration: data.registrationNumber,
        make: data.make,
        colour: data.colour,
        fuelType: simpleFuel,
        year: data.yearOfManufacture,
        euroStatus: euroStatus,
      };

    } catch (error) {
      console.error("DVLA Error:", error.response?.data || error.message);

      if (error.response?.status === 404) {
        throw new HttpsError("not-found", "Vehicle Not Found");
      }
      
      throw new HttpsError("internal", "Internal Server Error");
    }
  }
);