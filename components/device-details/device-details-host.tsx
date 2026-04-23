"use client";

import { DeviceDetailsAside } from "./device-details-aside";
import { useDeviceDetailsContext } from "@/lib/device-details/context";

export function DeviceDetailsHost() {
  const { isOpen, deviceDetails, closeDeviceDetails } = useDeviceDetailsContext();

  return (
    <DeviceDetailsAside
      isOpen={isOpen}
      deviceDetails={deviceDetails}
      onClose={closeDeviceDetails}
    />
  );
}