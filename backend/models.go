package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"
)

// --- Domain Models ---

type Role string

const (
	RoleAdmin  Role = "ADMIN"
	RoleCouple Role = "COUPLE"
)

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"password,omitempty"`
	Role      Role      `json:"role"`
	EventID   string    `json:"eventId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type ExtraItem struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	PricingType   string  `json:"pricingType"` // "PER_GUEST" | "FIXED"
	UnitPrice     float64 `json:"unitPrice"`
	Category      string  `json:"category"` // "Buffet", "Bebidas", "Decoração", "Entretenimento", "Estrutura"
	ActiveByAdmin bool    `json:"activeByAdmin"`
}

type FinancialRules struct {
	BasePackagePrice        float64     `json:"basePackagePrice"`
	IncludedGuests          int         `json:"includedGuests"`
	MaxCapacity             int         `json:"maxCapacity"`
	ExtraAdultPrice         float64     `json:"extraAdultPrice"`
	ExtraChildPrice         float64     `json:"extraChildPrice"`
	Tier2Threshold          int         `json:"tier2Threshold"` // Above this guest count, extra adult price changes (e.g. requires extra staff/tables)
	Tier2AdultPrice         float64     `json:"tier2AdultPrice"`
	ChangeFeeAfterLock      float64     `json:"changeFeeAfterLock"` // Flat or per-change fee if changed near event date
	SeatsPerTable           int         `json:"seatsPerTable"`
	ExtraTableCost          float64     `json:"extraTableCost"`
	IncludedTables          int         `json:"includedTables"`
	RequireApprovalOverCap  bool        `json:"requireApprovalOverCap"`
	AvailableMenus          []MenuTier  `json:"availableMenus"`
	AvailableExtras         []ExtraItem `json:"availableExtras"`
}

type MenuTier struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Description      string  `json:"description"`
	PricePerAdult    float64 `json:"pricePerAdult"` // Differential over base or total per guest
	PricePerChild    float64 `json:"pricePerChild"`
	IncludesOpenBar  bool    `json:"includesOpenBar"`
	Highlight        string  `json:"highlight"`
}

type Guest struct {
	ID                 string    `json:"id"`
	EventID            string    `json:"eventId"`
	Name               string    `json:"name"`
	Phone              string    `json:"phone"`
	Email              string    `json:"email"`
	Category           string    `json:"category"` // "ADULT" | "CHILD" | "BABY" (Baby is free)
	Group              string    `json:"group"`    // "Família Noiva", "Família Noivo", "Amigos", "Padrinhos", "VIP"
	RSVPStatus         string    `json:"rsvpStatus"` // "CONFIRMED" | "PENDING" | "DECLINED"
	DietaryRestriction string    `json:"dietaryRestriction"`
	TableNumber        int       `json:"tableNumber"`
	CheckedIn          bool      `json:"checkedIn"`
	InviteCode         string    `json:"inviteCode"`
	Notes              string    `json:"notes"`
	Companions         int       `json:"companions"` // Extra seats tied to this guest invite if any
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type PriceLogEntry struct {
	ID             string    `json:"id"`
	EventID        string    `json:"eventId"`
	Timestamp      time.Time `json:"timestamp"`
	ActorName      string    `json:"actorName"`
	ActorRole      Role      `json:"actorRole"`
	Action         string    `json:"action"`
	Description    string    `json:"description"`
	PreviousTotal  float64   `json:"previousTotal"`
	NewTotal       float64   `json:"newTotal"`
	Delta          float64   `json:"delta"`
	TotalGuests    int       `json:"totalGuests"`
}

type FinancialBreakdown struct {
	BasePackagePrice       float64   `json:"basePackagePrice"`
	IncludedGuests         int       `json:"includedGuests"`
	TotalActiveGuests      int       `json:"totalActiveGuests"` // CONFIRMED + PENDING (billable reserved spots)
	ConfirmedGuests        int       `json:"confirmedGuests"`
	PendingGuests          int       `json:"pendingGuests"`
	DeclinedGuests         int       `json:"declinedGuests"`
	AdultCount             int       `json:"adultCount"`
	ChildCount             int       `json:"childCount"`
	BabyCount              int       `json:"babyCount"`
	ExtraAdultsStandard    int       `json:"extraAdultsStandard"`
	ExtraAdultsTier2       int       `json:"extraAdultsTier2"`
	ExtraChildren          int       `json:"extraChildren"`
	ExtraAdultsCost        float64   `json:"extraAdultsCost"`
	ExtraChildrenCost      float64   `json:"extraChildrenCost"`
	SelectedMenuID         string    `json:"selectedMenuId"`
	SelectedMenuName       string    `json:"selectedMenuName"`
	MenuUpgradeCost        float64   `json:"menuUpgradeCost"`
	TablesRequired         int       `json:"tablesRequired"`
	IncludedTables         int       `json:"includedTables"`
	ExtraTables            int       `json:"extraTables"`
	ExtraTablesCost        float64   `json:"extraTablesCost"`
	SelectedExtrasCost     float64   `json:"selectedExtrasCost"`
	SelectedExtrasDetails  []ExtraLineItem `json:"selectedExtrasDetails"`
	TotalContractValue     float64   `json:"totalContractValue"`
	TotalExtraAdded        float64   `json:"totalExtraAdded"`
	AmountPaid             float64   `json:"amountPaid"`
	RemainingBalance       float64   `json:"remainingBalance"`
	CapacityPercentage     float64   `json:"capacityPercentage"`
	IsOverIncluded         bool      `json:"isOverIncluded"`
	NextAdultMarginalCost  float64   `json:"nextAdultMarginalCost"`
	NextChildMarginalCost  float64   `json:"nextChildMarginalCost"`
}

type ExtraLineItem struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	PricingType string  `json:"pricingType"`
	UnitPrice   float64 `json:"unitPrice"`
	Quantity    int     `json:"quantity"`
	TotalCost   float64 `json:"totalCost"`
}

type WeddingEvent struct {
	ID               string             `json:"id"`
	Slug             string             `json:"slug"`
	Title            string             `json:"title"`
	BrideName        string             `json:"brideName"`
	GroomName        string             `json:"groomName"`
	CoupleEmail      string             `json:"coupleEmail"`
	EventDate        string             `json:"eventDate"`
	EventTime        string             `json:"eventTime"`
	VenueName        string             `json:"venueName"`
	VenueAddress     string             `json:"venueAddress"`
	Status           string             `json:"status"` // "ACTIVE" | "LOCKED" | "COMPLETED"
	SelectedMenuID   string             `json:"selectedMenuId"`
	SelectedExtraIDs []string           `json:"selectedExtraIds"`
	AmountPaid       float64            `json:"amountPaid"`
	Rules            FinancialRules     `json:"rules"`
	Guests           []Guest            `json:"guests"`
	AuditLogs        []PriceLogEntry    `json:"auditLogs"`
	Financials       FinancialBreakdown `json:"financials"`
	WelcomeMessage   string             `json:"welcomeMessage"`
	CreatedAt        time.Time          `json:"createdAt"`
	UpdatedAt        time.Time          `json:"updatedAt"`
}

type DatabaseState struct {
	Users  []User         `json:"users"`
	Events []WeddingEvent `json:"events"`
}

type Store struct {
	mu       sync.RWMutex
	filePath string
	data     DatabaseState
	sessions map[string]User // token -> User
}

func genID(prefix string) string {
	b := make([]byte, 5)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(b))
}

func genInviteCode(name string) string {
	b := make([]byte, 2)
	_, _ = rand.Read(b)
	clean := strings.ToUpper(strings.ReplaceAll(name, " ", ""))
	if len(clean) > 4 {
		clean = clean[:4]
	}
	return fmt.Sprintf("%s-%s", clean, strings.ToUpper(hex.EncodeToString(b)))
}

// CalculateFinancials computes the exact real-time financial impact of every guest, menu, table, and extra service.
func CalculateFinancials(ev *WeddingEvent) FinancialBreakdown {
	rules := ev.Rules
	var activeGuests, confirmed, pending, declined int
	var adults, children, babies int

	for _, g := range ev.Guests {
		totalSeatsForGuest := 1 + g.Companions
		switch g.RSVPStatus {
		case "CONFIRMED":
			confirmed += totalSeatsForGuest
			activeGuests += totalSeatsForGuest
		case "PENDING":
			pending += totalSeatsForGuest
			activeGuests += totalSeatsForGuest
		case "DECLINED":
			declined += totalSeatsForGuest
			continue // Declined guests do not count toward billable active guests
		default:
			activeGuests += totalSeatsForGuest
		}

		switch g.Category {
		case "ADULT":
			adults += totalSeatsForGuest
		case "CHILD":
			children += totalSeatsForGuest
		case "BABY":
			babies += totalSeatsForGuest
		default:
			adults += totalSeatsForGuest
		}
	}

	// Calculate how many guests exceed the base package included count.
	// Adults fill the included quota first, then children. Babies are free.
	remainingIncluded := rules.IncludedGuests
	includedAdults := adults
	if includedAdults > remainingIncluded {
		includedAdults = remainingIncluded
	}
	remainingIncluded -= includedAdults
	extraAdultsTotal := adults - includedAdults

	includedChildren := children
	if includedChildren > remainingIncluded {
		includedChildren = remainingIncluded
	}
	remainingIncluded -= includedChildren
	extraChildren := children - includedChildren

	// Split extra adults between standard extra price and Tier 2 threshold (e.g. above 180 guests)
	var extraAdultsStandard, extraAdultsTier2 int
	if extraAdultsTotal > 0 {
		if rules.Tier2Threshold > rules.IncludedGuests && (adults+children) > rules.Tier2Threshold {
			tier2Overflow := (adults + children) - rules.Tier2Threshold
			if tier2Overflow > extraAdultsTotal {
				tier2Overflow = extraAdultsTotal
			}
			extraAdultsTier2 = tier2Overflow
			extraAdultsStandard = extraAdultsTotal - extraAdultsTier2
		} else {
			extraAdultsStandard = extraAdultsTotal
		}
	}

	extraAdultsCost := float64(extraAdultsStandard)*rules.ExtraAdultPrice + float64(extraAdultsTier2)*rules.Tier2AdultPrice
	extraChildrenCost := float64(extraChildren) * rules.ExtraChildPrice

	// Menu Upgrade differential cost across billable guests (adults & children)
	var selectedMenu MenuTier
	for _, m := range rules.AvailableMenus {
		if m.ID == ev.SelectedMenuID {
			selectedMenu = m
			break
		}
	}
	if selectedMenu.ID == "" && len(rules.AvailableMenus) > 0 {
		selectedMenu = rules.AvailableMenus[0]
		ev.SelectedMenuID = selectedMenu.ID
	}

	menuUpgradeCost := float64(adults)*selectedMenu.PricePerAdult + float64(children)*selectedMenu.PricePerChild

	// Table calculations
	seatsPerTable := rules.SeatsPerTable
	if seatsPerTable <= 0 {
		seatsPerTable = 8
	}
	tablesRequired := int(math.Ceil(float64(activeGuests) / float64(seatsPerTable)))
	extraTables := 0
	if tablesRequired > rules.IncludedTables {
		extraTables = tablesRequired - rules.IncludedTables
	}
	extraTablesCost := float64(extraTables) * rules.ExtraTableCost

	// Selected Extra Services
	selectedSet := make(map[string]bool)
	for _, id := range ev.SelectedExtraIDs {
		selectedSet[id] = true
	}

	var extrasCost float64
	var extraDetails []ExtraLineItem
	billablePeople := adults + children

	for _, item := range rules.AvailableExtras {
		if !selectedSet[item.ID] {
			continue
		}
		var itemCost float64
		var qty int
		if item.PricingType == "PER_GUEST" {
			qty = billablePeople
			itemCost = float64(billablePeople) * item.UnitPrice
		} else {
			qty = 1
			itemCost = item.UnitPrice
		}
		extrasCost += itemCost
		extraDetails = append(extraDetails, ExtraLineItem{
			ID:          item.ID,
			Name:        item.Name,
			PricingType: item.PricingType,
			UnitPrice:   item.UnitPrice,
			Quantity:    qty,
			TotalCost:   itemCost,
		})
	}
	if extraDetails == nil {
		extraDetails = []ExtraLineItem{}
	}

	totalExtraAdded := extraAdultsCost + extraChildrenCost + menuUpgradeCost + extraTablesCost + extrasCost
	totalContract := rules.BasePackagePrice + totalExtraAdded
	remainingBalance := totalContract - ev.AmountPaid
	if remainingBalance < 0 {
		remainingBalance = 0
	}

	capPct := 0.0
	if rules.MaxCapacity > 0 {
		capPct = math.Round((float64(activeGuests)/float64(rules.MaxCapacity))*1000) / 10
	}

	// Calculate marginal cost of adding 1 more adult or 1 more child right now
	var perGuestExtraServices float64
	for _, item := range rules.AvailableExtras {
		if selectedSet[item.ID] && item.PricingType == "PER_GUEST" {
			perGuestExtraServices += item.UnitPrice
		}
	}

	nextAdultBase := 0.0
	if (adults + children) >= rules.IncludedGuests {
		if rules.Tier2Threshold > rules.IncludedGuests && (adults+children) >= rules.Tier2Threshold {
			nextAdultBase = rules.Tier2AdultPrice
		} else {
			nextAdultBase = rules.ExtraAdultPrice
		}
	}
	nextChildBase := 0.0
	if (adults + children) >= rules.IncludedGuests {
		nextChildBase = rules.ExtraChildPrice
	}

	// Also check if adding 1 more guest triggers a new extra table
	nextTableCost := 0.0
	newTablesIfPlusOne := int(math.Ceil(float64(activeGuests+1) / float64(seatsPerTable)))
	if newTablesIfPlusOne > tablesRequired && newTablesIfPlusOne > rules.IncludedTables {
		nextTableCost = rules.ExtraTableCost
	}

	nextAdultMarginal := nextAdultBase + selectedMenu.PricePerAdult + perGuestExtraServices + nextTableCost
	nextChildMarginal := nextChildBase + selectedMenu.PricePerChild + perGuestExtraServices + nextTableCost

	return FinancialBreakdown{
		BasePackagePrice:      rules.BasePackagePrice,
		IncludedGuests:        rules.IncludedGuests,
		TotalActiveGuests:     activeGuests,
		ConfirmedGuests:       confirmed,
		PendingGuests:         pending,
		DeclinedGuests:        declined,
		AdultCount:            adults,
		ChildCount:            children,
		BabyCount:             babies,
		ExtraAdultsStandard:   extraAdultsStandard,
		ExtraAdultsTier2:      extraAdultsTier2,
		ExtraChildren:         extraChildren,
		ExtraAdultsCost:       extraAdultsCost,
		ExtraChildrenCost:     extraChildrenCost,
		SelectedMenuID:        selectedMenu.ID,
		SelectedMenuName:      selectedMenu.Name,
		MenuUpgradeCost:       menuUpgradeCost,
		TablesRequired:        tablesRequired,
		IncludedTables:        rules.IncludedTables,
		ExtraTables:           extraTables,
		ExtraTablesCost:       extraTablesCost,
		SelectedExtrasCost:    extrasCost,
		SelectedExtrasDetails: extraDetails,
		TotalContractValue:    totalContract,
		TotalExtraAdded:       totalExtraAdded,
		AmountPaid:            ev.AmountPaid,
		RemainingBalance:      remainingBalance,
		CapacityPercentage:    capPct,
		IsOverIncluded:        (adults + children) > rules.IncludedGuests,
		NextAdultMarginalCost: nextAdultMarginal,
		NextChildMarginalCost: nextChildMarginal,
	}
}
