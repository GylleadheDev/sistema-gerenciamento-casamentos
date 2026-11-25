export type Role = "ADMIN" | "COUPLE" | "GUEST"

export interface User {
  id: string
  name: string
  email: string
  role: "ADMIN" | "COUPLE"
  eventId?: string
}

export interface MenuTier {
  id: string
  name: string
  description: string
  pricePerAdult: number
  pricePerChild: number
  includesOpenBar: boolean
  highlight: string
}

export interface ExtraItem {
  id: string
  name: string
  description: string
  pricingType: "PER_GUEST" | "FIXED"
  unitPrice: number
  category: string
  activeByAdmin: boolean
}

export interface FinancialRules {
  basePackagePrice: number
  includedGuests: number
  maxCapacity: number
  extraAdultPrice: number
  extraChildPrice: number
  tier2Threshold: number
  tier2AdultPrice: number
  changeFeeAfterLock: number
  seatsPerTable: number
  extraTableCost: number
  includedTables: number
  requireApprovalOverCap: boolean
  availableMenus: MenuTier[]
  availableExtras: ExtraItem[]
}

export interface Guest {
  id: string
  eventId: string
  name: string
  phone: string
  email: string
  category: "ADULT" | "CHILD" | "BABY"
  group: string
  rsvpStatus: "CONFIRMED" | "PENDING" | "DECLINED"
  dietaryRestriction: string
  tableNumber: number
  checkedIn: boolean
  inviteCode: string
  notes: string
  companions: number
  createdAt: string
  updatedAt: string
}

export interface PriceLogEntry {
  id: string
  eventId: string
  timestamp: string
  actorName: string
  actorRole: "ADMIN" | "COUPLE"
  action: string
  description: string
  previousTotal: number
  newTotal: number
  delta: number
  totalGuests: number
}

export interface ExtraLineItem {
  id: string
  name: string
  pricingType: "PER_GUEST" | "FIXED"
  unitPrice: number
  quantity: number
  totalCost: number
}

export interface FinancialBreakdown {
  basePackagePrice: number
  includedGuests: number
  totalActiveGuests: number
  confirmedGuests: number
  pendingGuests: number
  declinedGuests: number
  adultCount: number
  childCount: number
  babyCount: number
  extraAdultsStandard: number
  extraAdultsTier2: number
  extraChildren: number
  extraAdultsCost: number
  extraChildrenCost: number
  selectedMenuId: string
  selectedMenuName: string
  menuUpgradeCost: number
  tablesRequired: number
  includedTables: number
  extraTables: number
  extraTablesCost: number
  selectedExtrasCost: number
  selectedExtrasDetails: ExtraLineItem[]
  totalContractValue: number
  totalExtraAdded: number
  amountPaid: number
  remainingBalance: number
  capacityPercentage: number
  isOverIncluded: boolean
  nextAdultMarginalCost: number
  nextChildMarginalCost: number
}

export interface WeddingEvent {
  id: string
  slug: string
  title: string
  brideName: string
  groomName: string
  coupleEmail: string
  eventDate: string
  eventTime: string
  venueName: string
  venueAddress: string
  status: "ACTIVE" | "LOCKED" | "COMPLETED"
  selectedMenuId: string
  selectedExtraIds: string[]
  amountPaid: number
  rules: FinancialRules
  guests: Guest[]
  auditLogs: PriceLogEntry[]
  financials: FinancialBreakdown
  welcomeMessage: string
  createdAt?: string
  updatedAt?: string
}
