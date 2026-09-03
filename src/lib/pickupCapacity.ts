/** The kitchen accepts at most five real orders for one pickup time. */
export const PICKUP_SLOT_CAPACITY = 5;

export interface PickupAllocation {
    serviceDate: string;
    pickupTime: string;
}
