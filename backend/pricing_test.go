package main

import "testing"

func TestDynamicPricingLinkedToGuests(t *testing.T) {
	ev := WeddingEvent{
		ID:             "test_evt",
		SelectedMenuID: "menu_gold",
		SelectedExtraIDs: []string{"ext_openbar", "ext_flores"},
		Rules: FinancialRules{
			BasePackagePrice: 30000,
			IncludedGuests:   2,
			MaxCapacity:      100,
			ExtraAdultPrice:  300,
			ExtraChildPrice:  150,
			Tier2Threshold:   10,
			Tier2AdultPrice:  350,
			SeatsPerTable:    2,
			IncludedTables:   1,
			ExtraTableCost:   400,
			AvailableMenus: []MenuTier{
				{ID: "menu_gold", Name: "Gold", PricePerAdult: 50, PricePerChild: 25},
			},
			AvailableExtras: []ExtraItem{
				{ID: "ext_openbar", Name: "Open Bar", PricingType: "PER_GUEST", UnitPrice: 60},
				{ID: "ext_flores", Name: "Flores", PricingType: "FIXED", UnitPrice: 2000},
			},
		},
		Guests: []Guest{
			{ID: "g1", Category: "ADULT", RSVPStatus: "CONFIRMED", Companions: 1}, // 2 adults (fills included quota of 2)
		},
	}

	fin1 := CalculateFinancials(&ev)
	if fin1.ExtraAdultsStandard != 0 {
		t.Fatalf("expected 0 extra adults within included quota, got %d", fin1.ExtraAdultsStandard)
	}

	// Now couple invites 1 more adult with 1 companion (+2 extra adults above quota!)
	ev.Guests = append(ev.Guests, Guest{
		ID:         "g2",
		Category:   "ADULT",
		RSVPStatus: "CONFIRMED",
		Companions: 1,
	})
	fin2 := CalculateFinancials(&ev)

	if fin2.ExtraAdultsStandard != 2 {
		t.Fatalf("expected 2 extra adults, got %d", fin2.ExtraAdultsStandard)
	}
	if fin2.ExtraTables != 1 {
		t.Fatalf("expected 1 extra table, got %d", fin2.ExtraTables)
	}
	// Expected delta:
	// +2 extra adults * 300 = 600
	// +2 adults menu upgrade * 50 = 100
	// +2 adults openbar * 60 = 120
	// +1 extra table * 400 = 400
	// Total increase = 1220
	diff := fin2.TotalContractValue - fin1.TotalContractValue
	if diff != 1220 {
		t.Fatalf("expected adding 2 over-quota guests to increase contract by R$ 1220.00, got %.2f", diff)
	}
}
