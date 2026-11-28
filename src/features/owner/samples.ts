import type { LoadDetailProps } from "./load-detail";

// The owner mockups' sample loads (O13, O13e), for /dev/owner only.

const TRUCKS: LoadDetailProps["trucks"] = [
  { id: "t1", plate: "KAN 219 BT", type: "Covered truck, 30 tonnes", capacityKg: 30000, busy: false, driverName: "Sani Bello" },
  { id: "t2", plate: "KAN 108 MD", type: "Flatbed, 30 tonnes", capacityKg: 30000, busy: false, driverName: null },
  { id: "t3", plate: "KJA 482 XA", type: "Flatbed, 30 tonnes", capacityKg: 35000, busy: true, driverName: "Musa Ibrahim" },
];
const DRIVERS = [
  { id: "d1", name: "Sani Bello" },
  { id: "d2", name: "Musa Ibrahim" },
];

export const SAMPLE_LOAD: LoadDetailProps = {
  load: {
    id: "sample-load",
    ref: "FA-8M4T2",
    from: "Lagos",
    to: "Kano",
    goods: "Cartons of drinks",
    weightKg: 28000,
    quantity: 1400,
    unit: "cartons",
    truckType: "Covered truck, 30 tonnes",
    truckTypeId: "tt-covered",
    pickupFrom: "2026-11-27T07:00:00Z",
    pickupUntil: "2026-11-27T11:00:00Z",
    freightKobo: 160_000_000,
    payoutKobo: 153_600_000,
    band: "under ₦3m",
    offered: false,
    listFreightKobo: 160_000_000,
    sender: "Okafor Foods Ltd",
    senderTrips: 11,
    replied: false,
    forPlate: "KAN 219 BT",
    when: "Fri 27 Nov, morning",
  },
  tierLabel: "Gold",
  commissionBps: 400,
  advanceBps: 5000,
  trucks: TRUCKS,
  drivers: DRIVERS,
};

export const SAMPLE_OFFER: LoadDetailProps = {
  ...SAMPLE_LOAD,
  load: {
    ...SAMPLE_LOAD.load,
    id: "sample-offer",
    ref: "FA-4R2N8",
    to: "Onitsha",
    goods: "Cement",
    weightKg: 30000,
    quantity: 600,
    unit: "bags",
    truckType: "Tipper",
    freightKobo: 104_000_000,
    payoutKobo: 99_840_000,
    offered: true,
    listFreightKobo: 112_000_000,
    sender: "Ada Stores",
    senderTrips: 4,
    forPlate: "KAN 774 RD",
  },
  trucks: [{ id: "t4", plate: "KAN 774 RD", type: "Tipper", capacityKg: 30000, busy: false, driverName: "Bello Yusuf" }, ...TRUCKS],
  drivers: [{ id: "d3", name: "Bello Yusuf" }, ...DRIVERS],
};
