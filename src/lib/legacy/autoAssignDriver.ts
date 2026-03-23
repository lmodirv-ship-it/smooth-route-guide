/**
 * Auto-assign nearest available driver to a delivery order.
 * 
 * Queries Firebase `drivers` collection for online + available drivers,
 * calculates distance from pickup location, and assigns the closest one.
 */

import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { supabase } from "./firestoreClient";

interface DriverCandidate {
  id: string;
  uid: string;
  fullName: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentLat?: number;
  currentLng?: number;
  distance: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find and assign the nearest online+available driver to an order.
 * Returns the assigned driver info or null if none found.
 */
export async function assignNearestDriver(
  orderId: string,
  pickupLat: number,
  pickupLng: number
): Promise<DriverCandidate | null> {
  console.log("[AutoAssign] Looking for available drivers near:", pickupLat, pickupLng);

  // Query Firebase drivers collection for online + available
  const driversRef = collection(db, "drivers");
  const q = query(
    driversRef,
    where("isOnline", "==", true),
    where("isAvailable", "==", true)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log("[AutoAssign] No online/available drivers found");
    return null;
  }

  // Also get Supabase driver records for location data
  const { data: supaDrivers } = await supabase
    .from("drivers")
    .select("id, user_id, current_lat, current_lng, status")
    .eq("status", "active");

  const supaMap = new Map(
    (supaDrivers || []).map((d: any) => [d.user_id, d])
  );

  // Build candidate list with distances
  const candidates: DriverCandidate[] = [];

  for (const driverDoc of snapshot.docs) {
    const data = driverDoc.data();
    const uid = driverDoc.id;

    // Get location from Supabase driver record
    const supaDriver = supaMap.get(uid) as any;
    const lat = supaDriver?.current_lat || data.currentLat;
    const lng = supaDriver?.current_lng || data.currentLng;

    if (lat && lng) {
      const distance = haversineDistance(pickupLat, pickupLng, Number(lat), Number(lng));
      candidates.push({
        id: supaDriver?.id || uid,
        uid,
        fullName: data.fullName || "",
        isOnline: true,
        isAvailable: true,
        currentLat: Number(lat),
        currentLng: Number(lng),
        distance,
      });
    } else {
      // Include drivers without location but with max distance
      candidates.push({
        id: supaDriver?.id || uid,
        uid,
        fullName: data.fullName || "",
        isOnline: true,
        isAvailable: true,
        distance: 9999,
      });
    }
  }

  if (candidates.length === 0) {
    console.log("[AutoAssign] No candidates with location data");
    return null;
  }

  // Sort by distance (nearest first)
  candidates.sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0];

  console.log("[AutoAssign] Nearest driver:", nearest.fullName, "at", nearest.distance.toFixed(2), "km");

  // Assign the order to this driver
  // Update in Supabase-compatible layer (which writes to Firestore 'orders')
  await supabase.from("delivery_orders").update({
    driver_id: nearest.id,
    status: "driver_assigned",
    updated_at: new Date().toISOString(),
  }).eq("id", orderId);

  // Mark driver as unavailable in Firebase
  try {
    await updateDoc(doc(db, "drivers", nearest.uid), {
      isAvailable: false,
    });
  } catch (e) {
    console.warn("[AutoAssign] Could not update driver availability:", e);
  }

  console.log("[AutoAssign] Order", orderId, "assigned to driver", nearest.uid);
  return nearest;
}

/**
 * Release a driver (make available again) after delivery completion.
 */
export async function releaseDriver(driverUid: string) {
  try {
    await updateDoc(doc(db, "drivers", driverUid), {
      isAvailable: true,
    });
    console.log("[AutoAssign] Driver", driverUid, "released and available");
  } catch (e) {
    console.warn("[AutoAssign] Could not release driver:", e);
  }
}
