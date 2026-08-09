import * as Location from "expo-location";
import { useEffect } from "react";

import { mobileApi } from "../api/services";
import type { TripState } from "../domain/types";

export function useForegroundTripLocation(tripId: string, state: TripState) {
  useEffect(() => {
    if (state !== "EN_ROUTE_PICKUP" && state !== "EN_ROUTE_DELIVERY") return;
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    void Location.requestForegroundPermissionsAsync().then(async (permission) => {
      if (!permission.granted || !active) return;
      subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 250, timeInterval: 60_000 }, (position) => {
        void mobileApi.updateLocation(tripId, position.coords.latitude, position.coords.longitude).catch(() => undefined);
      });
    });
    return () => { active = false; subscription?.remove(); };
  }, [state, tripId]);
}
