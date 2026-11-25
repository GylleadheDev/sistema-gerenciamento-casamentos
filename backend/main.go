package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func NewStore(filePath string) *Store {
	s := &Store{
		filePath: filePath,
		sessions: make(map[string]User),
	}
	s.loadOrSeed()
	return s
}

func (s *Store) loadOrSeed() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if raw, err := os.ReadFile(s.filePath); err == nil {
		if err := json.Unmarshal(raw, &s.data); err == nil && len(s.data.Events) > 0 {
			for i := range s.data.Events {
				s.data.Events[i].Financials = CalculateFinancials(&s.data.Events[i])
			}
			return
		}
	}

	// Seed rich demo data
	now := time.Now()

	defaultMenus := []MenuTier{
		{
			ID:              "menu_classic",
			Name:            "Gastronomia Clássica Imperial (Incluso no Pacote Base)",
			Description:     "Coquetel volante quente e frio, jantar empratado com filé mignon e salmão, mesa de café e doces finos.",
			PricePerAdult:   0,
			PricePerChild:   0,
			IncludesOpenBar: false,
			Highlight:       "Incluso no Contrato Base",
		},
		{
			ID:              "menu_gold",
			Name:            "Banquete Gold & Ilhas Gastronômicas",
			Description:     "Inclui menu clássico + Ilha Mediterrânea de Antepastos, Risoteria ao vivo e Sobremesas Flambadas.",
			PricePerAdult:   75.00,
			PricePerChild:   35.00,
			IncludesOpenBar: false,
			Highlight:       "+ R$ 75/adulto • + R$ 35/criança",
		},
		{
			ID:              "menu_royal",
			Name:            "Experiência Royal Michelin + Open Bar Premium",
			Description:     "Menu degustação 6 tempos com frutos do mar, carré de cordeiro, whisky 12 anos, gin importado e espumante francês.",
			PricePerAdult:   165.00,
			PricePerChild:   65.00,
			IncludesOpenBar: true,
			Highlight:       "+ R$ 165/adulto • + R$ 65/criança",
		},
	}

	defaultExtras := []ExtraItem{
		{
			ID:            "ext_openbar",
			Name:          "Bar de Drinks Autorais & Mixologia",
			Description:   "Bartenders profissionais com drinks clássicos, Moscow Mule, Aperol Spritz e Gin Tônica botânico.",
			PricingType:   "PER_GUEST",
			UnitPrice:     68.00,
			Category:      "Bebidas",
			ActiveByAdmin: true,
		},
		{
			ID:            "ext_madrugada",
			Name:          "Lanchinho da Madrugada Gourmet",
			Description:   "Mini hambúrgueres artesanais, batata frita trufada, mini churros com doce de leite servidos às 02h.",
			PricingType:   "PER_GUEST",
			UnitPrice:     42.00,
			Category:      "Buffet",
			ActiveByAdmin: true,
		},
		{
			ID:            "ext_flores",
			Name:          "Arco Floral Suspenso & Paisagismo Cenográfico",
			Description:   "Arranjos aéreos com rosas inglesas, orquídeas brancas e iluminação cênica âmbar sobre a pista.",
			PricingType:   "FIXED",
			UnitPrice:     4800.00,
			Category:      "Decoração",
			ActiveByAdmin: true,
		},
		{
			ID:            "ext_banda",
			Name:          "Palco LED 360° + DJ & Saxofonista Live",
			Description:   "Estrutura completa de som line-array, painel de LED P2, DJ residente e performance de saxofone na pista.",
			PricingType:   "FIXED",
			UnitPrice:     6500.00,
			Category:      "Entretenimento",
			ActiveByAdmin: true,
		},
		{
			ID:            "ext_valet",
			Name:          "Serviço de Valet VIP & Segurança Extra",
			Description:   "Equipe adicional de manobristas segurados, recepcionistas bilíngues e gerador dedicado.",
			PricingType:   "PER_GUEST",
			UnitPrice:     25.00,
			Category:      "Estrutura",
			ActiveByAdmin: true,
		},
	}

	rules1 := FinancialRules{
		BasePackagePrice:       38000.00,
		IncludedGuests:         10, // Demo starts with 10 included guests so the user can immediately see how adding/exceeding guests changes the price in real time, or adjust to 100/150
		MaxCapacity:            250,
		ExtraAdultPrice:        290.00,
		ExtraChildPrice:        145.00,
		Tier2Threshold:         15,
		Tier2AdultPrice:        340.00,
		ChangeFeeAfterLock:     150.00,
		SeatsPerTable:          4,
		IncludedTables:         3,
		ExtraTableCost:         450.00,
		RequireApprovalOverCap: true,
		AvailableMenus:         defaultMenus,
		AvailableExtras:        defaultExtras,
	}

	guests1 := []Guest{
		{ID: "gst_1", EventID: "evt_imperial01", Name: "Helena Albuquerque (Mãe da Noiva)", Phone: "(11) 99812-3401", Email: "helena@familia.com", Category: "ADULT", Group: "Família Noiva", RSVPStatus: "CONFIRMED", DietaryRestriction: "Nenhuma", TableNumber: 1, CheckedIn: false, InviteCode: "HELE-A101", Companions: 1, Notes: "Mesa principal junto ao altar", CreatedAt: now.Add(-72 * time.Hour), UpdatedAt: now.Add(-24 * time.Hour)},
		{ID: "gst_2", EventID: "evt_imperial01", Name: "Roberto Albuquerque (Pai da Noiva)", Phone: "(11) 99812-3402", Email: "roberto@familia.com", Category: "ADULT", Group: "Família Noiva", RSVPStatus: "CONFIRMED", DietaryRestriction: "Sem Glúten", TableNumber: 1, CheckedIn: false, InviteCode: "ROBE-B202", Companions: 0, Notes: "", CreatedAt: now.Add(-72 * time.Hour), UpdatedAt: now.Add(-24 * time.Hour)},
		{ID: "gst_3", EventID: "evt_imperial01", Name: "Carlos Eduardo Montenegro (Pai do Noivo)", Phone: "(11) 99744-1100", Email: "carlos@montenegro.com", Category: "ADULT", Group: "Família Noivo", RSVPStatus: "CONFIRMED", DietaryRestriction: "Nenhuma", TableNumber: 1, CheckedIn: false, InviteCode: "CARL-C303", Companions: 1, Notes: "", CreatedAt: now.Add(-70 * time.Hour), UpdatedAt: now.Add(-20 * time.Hour)},
		{ID: "gst_4", EventID: "evt_imperial01", Name: "Beatriz Vasconcelos (Madrinha)", Phone: "(11) 99123-4500", Email: "bia.vasconcelos@email.com", Category: "ADULT", Group: "Padrinhos", RSVPStatus: "CONFIRMED", DietaryRestriction: "Vegetariana", TableNumber: 2, CheckedIn: false, InviteCode: "BEAT-D404", Companions: 1, Notes: "Madrinha da noiva", CreatedAt: now.Add(-60 * time.Hour), UpdatedAt: now.Add(-15 * time.Hour)},
		{ID: "gst_5", EventID: "evt_imperial01", Name: "Dr. Henrique Ferraz (Padrinho)", Phone: "(11) 98877-6655", Email: "henrique@ferraz.med.br", Category: "ADULT", Group: "Padrinhos", RSVPStatus: "CONFIRMED", DietaryRestriction: "Nenhuma", TableNumber: 2, CheckedIn: false, InviteCode: "HENR-E505", Companions: 1, Notes: "Padrinho do noivo", CreatedAt: now.Add(-50 * time.Hour), UpdatedAt: now.Add(-12 * time.Hour)},
		{ID: "gst_6", EventID: "evt_imperial01", Name: "Sofia Montenegro (Daminha - 8 anos)", Phone: "(11) 99744-1100", Email: "sofia@montenegro.com", Category: "CHILD", Group: "Família Noivo", RSVPStatus: "CONFIRMED", DietaryRestriction: "Sem Lactose", TableNumber: 2, CheckedIn: false, InviteCode: "SOFI-F606", Companions: 0, Notes: "Menu infantil", CreatedAt: now.Add(-45 * time.Hour), UpdatedAt: now.Add(-10 * time.Hour)},
		{ID: "gst_7", EventID: "evt_imperial01", Name: "Lucas & Mariana Prado", Phone: "(11) 98234-9988", Email: "lucas.prado@email.com", Category: "ADULT", Group: "Amigos", RSVPStatus: "PENDING", DietaryRestriction: "Nenhuma", TableNumber: 3, CheckedIn: false, InviteCode: "LUCA-G707", Companions: 1, Notes: "Aguardando confirmação de voo", CreatedAt: now.Add(-30 * time.Hour), UpdatedAt: now.Add(-5 * time.Hour)},
		{ID: "gst_8", EventID: "evt_imperial01", Name: "Camila Santoro", Phone: "(11) 97654-3210", Email: "camila.santoro@email.com", Category: "ADULT", Group: "VIP", RSVPStatus: "CONFIRMED", DietaryRestriction: "Vegana", TableNumber: 3, CheckedIn: false, InviteCode: "CAMI-H808", Companions: 0, Notes: "", CreatedAt: now.Add(-20 * time.Hour), UpdatedAt: now.Add(-2 * time.Hour)},
		{ID: "gst_9", EventID: "evt_imperial01", Name: "Fernando & Juliana Azevedo", Phone: "(21) 99988-7766", Email: "fernando.az@email.com", Category: "ADULT", Group: "Amigos", RSVPStatus: "DECLINED", DietaryRestriction: "Nenhuma", TableNumber: 0, CheckedIn: false, InviteCode: "FERN-I909", Companions: 1, Notes: "Em viagem internacional na data", CreatedAt: now.Add(-18 * time.Hour), UpdatedAt: now.Add(-1 * time.Hour)},
	}

	evt1 := WeddingEvent{
		ID:               "evt_imperial01",
		Slug:             "clara-e-gabriel-2027",
		Title:            "Casamento Clara & Gabriel",
		BrideName:        "Clara Albuquerque",
		GroomName:        "Gabriel Montenegro",
		CoupleEmail:      "noivos@casamento.com",
		EventDate:        "2027-05-15",
		EventTime:        "19:30",
		VenueName:        "Villa Giardino Imperial • Salão Cristal",
		VenueAddress:     "Av. Europa, 1450 - Jardins, São Paulo - SP",
		Status:           "ACTIVE",
		SelectedMenuID:   "menu_gold",
		SelectedExtraIDs: []string{"ext_openbar", "ext_flores"},
		AmountPaid:       20000.00,
		Rules:            rules1,
		Guests:           guests1,
		WelcomeMessage:   "Sejam muito bem-vindos ao nosso grande dia! Confirme sua presença utilizando seu código ou nome abaixo.",
		CreatedAt:        now.Add(-96 * time.Hour),
		UpdatedAt:        now,
	}
	evt1.Financials = CalculateFinancials(&evt1)
	evt1.AuditLogs = []PriceLogEntry{
		{
			ID:            "log_1",
			EventID:       evt1.ID,
			Timestamp:     now.Add(-72 * time.Hour),
			ActorName:     "Admin (Villa Giardino)",
			ActorRole:     RoleAdmin,
			Action:        "CONTRATO_BASE",
			Description:   "Contrato configurado com cota de 10 lugares inclusos (R$ 38.000,00) + R$ 290,00 por adulto excedente.",
			PreviousTotal: 38000.00,
			NewTotal:      38000.00,
			Delta:         0,
			TotalGuests:   10,
		},
		{
			ID:            "log_2",
			EventID:       evt1.ID,
			Timestamp:     now.Add(-24 * time.Hour),
			ActorName:     "Clara & Gabriel (Noivos)",
			ActorRole:     RoleCouple,
			Action:        "UPGRADE_MENU_E_EXTRAS",
			Description:   "Noivos selecionaram Banquete Gold (+R$ 75/adulto), Bar de Drinks (+R$ 68/convidado) e Arco Floral (+R$ 4.800 fixo).",
			PreviousTotal: 38000.00,
			NewTotal:      evt1.Financials.TotalContractValue - 580.00,
			Delta:         evt1.Financials.TotalContractValue - 38580.00,
			TotalGuests:   10,
		},
		{
			ID:            "log_3",
			EventID:       evt1.ID,
			Timestamp:     now.Add(-2 * time.Hour),
			ActorName:     "Clara & Gabriel (Noivos)",
			ActorRole:     RoleCouple,
			Action:        "ADICAO_CONVIDADO_EXCEDENTE",
			Description:   "Adição de convidados ultrapassou a cota contratada de 10 lugares (total: 12 ativos). Cobrança automática de excedentes + impacto proporcional de buffet/bar.",
			PreviousTotal: evt1.Financials.TotalContractValue - 866.00,
			NewTotal:      evt1.Financials.TotalContractValue,
			Delta:         866.00,
			TotalGuests:   evt1.Financials.TotalActiveGuests,
		},
	}

	// Second Wedding Event for multi-tenant SaaS admin showcase
	rules2 := rules1
	rules2.BasePackagePrice = 52000.00
	rules2.IncludedGuests = 150
	rules2.MaxCapacity = 300
	rules2.ExtraAdultPrice = 320.00
	rules2.ExtraChildPrice = 160.00
	rules2.Tier2Threshold = 220
	rules2.Tier2AdultPrice = 380.00
	rules2.IncludedTables = 20
	rules2.SeatsPerTable = 8

	evt2 := WeddingEvent{
		ID:               "evt_imperial02",
		Slug:             "isabela-e-matheus-2027",
		Title:            "Casamento Isabela & Matheus",
		BrideName:        "Isabela Fontes",
		GroomName:        "Matheus Gouveia",
		CoupleEmail:      "isabela.matheus@casamento.com",
		EventDate:        "2027-09-22",
		EventTime:        "17:00",
		VenueName:        "Villa Giardino Imperial • Terraço Botânico",
		VenueAddress:     "Av. Europa, 1450 - Jardins, São Paulo - SP",
		Status:           "ACTIVE",
		SelectedMenuID:   "menu_royal",
		SelectedExtraIDs: []string{"ext_madrugada", "ext_banda", "ext_valet"},
		AmountPaid:       35000.00,
		Rules:            rules2,
		Guests: []Guest{
			{ID: "gst_201", EventID: "evt_imperial02", Name: "Família Fontes (Pais da Noiva)", Phone: "(11) 99111-2233", Email: "fontes@email.com", Category: "ADULT", Group: "Família Noiva", RSVPStatus: "CONFIRMED", DietaryRestriction: "Nenhuma", TableNumber: 1, CheckedIn: false, InviteCode: "FONT-1010", Companions: 3, CreatedAt: now, UpdatedAt: now},
			{ID: "gst_202", EventID: "evt_imperial02", Name: "Família Gouveia (Pais do Noivo)", Phone: "(11) 99222-3344", Email: "gouveia@email.com", Category: "ADULT", Group: "Família Noivo", RSVPStatus: "CONFIRMED", DietaryRestriction: "Nenhuma", TableNumber: 1, CheckedIn: false, InviteCode: "GOUV-2020", Companions: 3, CreatedAt: now, UpdatedAt: now},
		},
		WelcomeMessage: "Celebre conosco sob o pôr do sol no Terraço Botânico!",
		CreatedAt:      now.Add(-120 * time.Hour),
		UpdatedAt:      now,
		AuditLogs:      []PriceLogEntry{},
	}
	evt2.Financials = CalculateFinancials(&evt2)

	users := []User{
		{
			ID:        "usr_admin01",
			Name:      "Ricardo Cavalcanti (Diretor Villa Giardino)",
			Email:     "admin@espacoimperial.com",
			Password:  "admin123",
			Role:      RoleAdmin,
			CreatedAt: now,
		},
		{
			ID:        "usr_couple01",
			Name:      "Clara & Gabriel",
			Email:     "noivos@casamento.com",
			Password:  "noivos123",
			Role:      RoleCouple,
			EventID:   "evt_imperial01",
			CreatedAt: now,
		},
		{
			ID:        "usr_couple02",
			Name:      "Isabela & Matheus",
			Email:     "isabela.matheus@casamento.com",
			Password:  "noivos123",
			Role:      RoleCouple,
			EventID:   "evt_imperial02",
			CreatedAt: now,
		},
	}

	s.data = DatabaseState{
		Users:  users,
		Events: []WeddingEvent{evt1, evt2},
	}
	s.saveLocked()
}

func (s *Store) saveLocked() {
	_ = os.MkdirAll(filepath.Dir(s.filePath), 0755)
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		log.Printf("error marshaling store: %v", err)
		return
	}
	_ = os.WriteFile(s.filePath, raw, 0644)
}

func (s *Store) findEventIndex(id string) int {
	for i, e := range s.data.Events {
		if e.ID == id || e.Slug == id {
			return i
		}
	}
	return -1
}

func (s *Store) recordLogLocked(ev *WeddingEvent, actorName string, actorRole Role, action, desc string, prevTotal float64) {
	ev.Financials = CalculateFinancials(ev)
	newTotal := ev.Financials.TotalContractValue
	delta := math.Round((newTotal-prevTotal)*100) / 100

	entry := PriceLogEntry{
		ID:            genID("log"),
		EventID:       ev.ID,
		Timestamp:     time.Now(),
		ActorName:     actorName,
		ActorRole:     actorRole,
		Action:        action,
		Description:   desc,
		PreviousTotal: prevTotal,
		NewTotal:      newTotal,
		Delta:         delta,
		TotalGuests:   ev.Financials.TotalActiveGuests,
	}
	ev.AuditLogs = append([]PriceLogEntry{entry}, ev.AuditLogs...)
	ev.UpdatedAt = time.Now()
}

// --- HTTP Handlers ---

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Actor-Role, X-Actor-Name")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Store) getActorFromRequest(r *http.Request) (string, Role) {
	auth := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if auth != "" {
		if u, ok := s.sessions[auth]; ok {
			return u.Name, u.Role
		}
	}
	roleHeader := r.Header.Get("X-Actor-Role")
	nameHeader := r.Header.Get("X-Actor-Name")
	if roleHeader == string(RoleAdmin) {
		if nameHeader == "" {
			nameHeader = "Administrador do Espaço"
		}
		return nameHeader, RoleAdmin
	}
	if nameHeader == "" {
		nameHeader = "Noivos"
	}
	return nameHeader, RoleCouple
}

func main() {
	dataPath := filepath.Join("data", "database.json")
	store := NewStore(dataPath)

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":  "ok",
			"service": "Wedding SaaS Go Engine",
			"time":    time.Now(),
		})
	})

	// Auth login (supports credentials or instant demo profile switch)
	mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeErr(w, http.StatusMethodNotAllowed, "Método não permitido")
			return
		}
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeErr(w, http.StatusBadRequest, "Payload inválido")
			return
		}

		store.mu.Lock()
		defer store.mu.Unlock()

		for _, u := range store.data.Users {
			if strings.EqualFold(u.Email, req.Email) && (req.Password == "" || u.Password == req.Password) {
				token := genID("tok")
				userCopy := u
				userCopy.Password = ""
				store.sessions[token] = userCopy
				writeJSON(w, http.StatusOK, map[string]any{
					"token": token,
					"user":  userCopy,
				})
				return
			}
		}
		writeErr(w, http.StatusUnauthorized, "Credenciais inválidas")
	})

	// List all demo accounts & events
	mux.HandleFunc("/api/bootstrap", func(w http.ResponseWriter, r *http.Request) {
		store.mu.RLock()
		defer store.mu.RUnlock()

		var safeUsers []User
		for _, u := range store.data.Users {
			uCopy := u
			uCopy.Password = ""
			safeUsers = append(safeUsers, uCopy)
		}

		for i := range store.data.Events {
			store.data.Events[i].Financials = CalculateFinancials(&store.data.Events[i])
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"users":  safeUsers,
			"events": store.data.Events,
		})
	})

	// Create new Wedding Event (Admin only)
	mux.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			store.mu.RLock()
			defer store.mu.RUnlock()
			for i := range store.data.Events {
				store.data.Events[i].Financials = CalculateFinancials(&store.data.Events[i])
			}
			writeJSON(w, http.StatusOK, store.data.Events)

		case http.MethodPost:
			var req struct {
				Title            string  `json:"title"`
				BrideName        string  `json:"brideName"`
				GroomName        string  `json:"groomName"`
				CoupleEmail      string  `json:"coupleEmail"`
				EventDate        string  `json:"eventDate"`
				EventTime        string  `json:"eventTime"`
				VenueName        string  `json:"venueName"`
				BasePackagePrice float64 `json:"basePackagePrice"`
				IncludedGuests   int     `json:"includedGuests"`
				MaxCapacity      int     `json:"maxCapacity"`
				ExtraAdultPrice  float64 `json:"extraAdultPrice"`
				ExtraChildPrice  float64 `json:"extraChildPrice"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeErr(w, http.StatusBadRequest, "Dados inválidos")
				return
			}

			store.mu.Lock()
			defer store.mu.Unlock()

			templateRules := store.data.Events[0].Rules
			if req.BasePackagePrice > 0 {
				templateRules.BasePackagePrice = req.BasePackagePrice
			}
			if req.IncludedGuests > 0 {
				templateRules.IncludedGuests = req.IncludedGuests
			}
			if req.MaxCapacity > 0 {
				templateRules.MaxCapacity = req.MaxCapacity
			}
			if req.ExtraAdultPrice > 0 {
				templateRules.ExtraAdultPrice = req.ExtraAdultPrice
				templateRules.Tier2AdultPrice = req.ExtraAdultPrice * 1.2
			}
			if req.ExtraChildPrice > 0 {
				templateRules.ExtraChildPrice = req.ExtraChildPrice
			}
			templateRules.Tier2Threshold = templateRules.IncludedGuests + 30

			id := genID("evt")
			slug := strings.ToLower(strings.ReplaceAll(req.BrideName+"-e-"+req.GroomName, " ", "-"))
			now := time.Now()

			newEvt := WeddingEvent{
				ID:               id,
				Slug:             slug,
				Title:            req.Title,
				BrideName:        req.BrideName,
				GroomName:        req.GroomName,
				CoupleEmail:      req.CoupleEmail,
				EventDate:        req.EventDate,
				EventTime:        req.EventTime,
				VenueName:        req.VenueName,
				VenueAddress:     "Av. Europa, 1450 - Jardins, São Paulo - SP",
				Status:           "ACTIVE",
				SelectedMenuID:   templateRules.AvailableMenus[0].ID,
				SelectedExtraIDs: []string{},
				AmountPaid:       0,
				Rules:            templateRules,
				Guests:           []Guest{},
				AuditLogs:        []PriceLogEntry{},
				WelcomeMessage:   "Confirme sua presença para o nosso casamento!",
				CreatedAt:        now,
				UpdatedAt:        now,
			}
			newEvt.Financials = CalculateFinancials(&newEvt)
			store.recordLogLocked(&newEvt, "Administrador", RoleAdmin, "CRIACAO_EVENTO",
				fmt.Sprintf("Novo contrato criado: Pacote Base R$ %.2f para %d convidados.", newEvt.Rules.BasePackagePrice, newEvt.Rules.IncludedGuests),
				0)

			store.data.Events = append(store.data.Events, newEvt)

			// Create user login for couple automatically
			if req.CoupleEmail != "" {
				store.data.Users = append(store.data.Users, User{
					ID:        genID("usr"),
					Name:      req.BrideName + " & " + req.GroomName,
					Email:     req.CoupleEmail,
					Password:  "noivos123",
					Role:      RoleCouple,
					EventID:   newEvt.ID,
					CreatedAt: now,
				})
			}

			store.saveLocked()
			writeJSON(w, http.StatusCreated, newEvt)

		default:
			writeErr(w, http.StatusMethodNotAllowed, "Método não suportado")
		}
	})

	// Public Guest RSVP Lookup & Confirmation (No login required!)
	mux.HandleFunc("/api/public/rsvp/", func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/public/rsvp/"), "/")
		eventKey := parts[0]
		if eventKey == "" {
			writeErr(w, http.StatusBadRequest, "Evento não informado")
			return
		}

		store.mu.Lock()
		defer store.mu.Unlock()

		idx := store.findEventIndex(eventKey)
		if idx < 0 {
			writeErr(w, http.StatusNotFound, "Casamento não encontrado")
			return
		}
		ev := &store.data.Events[idx]

		if r.Method == http.MethodGet {
			query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
			var matched []Guest
			if query != "" {
				for _, g := range ev.Guests {
					if strings.Contains(strings.ToLower(g.Name), query) ||
						strings.EqualFold(g.InviteCode, query) ||
						(g.Phone != "" && strings.Contains(g.Phone, query)) {
						matched = append(matched, g)
					}
				}
			}
			writeJSON(w, http.StatusOK, map[string]any{
				"id":             ev.ID,
				"slug":           ev.Slug,
				"title":          ev.Title,
				"brideName":      ev.BrideName,
				"groomName":      ev.GroomName,
				"eventDate":      ev.EventDate,
				"eventTime":      ev.EventTime,
				"venueName":      ev.VenueName,
				"venueAddress":   ev.VenueAddress,
				"welcomeMessage": ev.WelcomeMessage,
				"matches":        matched,
			})
			return
		}

		if r.Method == http.MethodPost {
			var req struct {
				GuestID            string `json:"guestId"`
				RSVPStatus         string `json:"rsvpStatus"` // "CONFIRMED" | "DECLINED"
				DietaryRestriction string `json:"dietaryRestriction"`
				Phone              string `json:"phone"`
				Notes              string `json:"notes"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeErr(w, http.StatusBadRequest, "Dados inválidos")
				return
			}

			prevTotal := CalculateFinancials(ev).TotalContractValue
			found := false
			var guestName string
			for i := range ev.Guests {
				if ev.Guests[i].ID == req.GuestID {
					ev.Guests[i].RSVPStatus = req.RSVPStatus
					if req.DietaryRestriction != "" {
						ev.Guests[i].DietaryRestriction = req.DietaryRestriction
					}
					if req.Phone != "" {
						ev.Guests[i].Phone = req.Phone
					}
					if req.Notes != "" {
						ev.Guests[i].Notes = req.Notes
					}
					ev.Guests[i].UpdatedAt = time.Now()
					guestName = ev.Guests[i].Name
					found = true
					break
				}
			}
			if !found {
				writeErr(w, http.StatusNotFound, "Convidado não encontrado na lista oficial dos noivos")
				return
			}

			statusLabel := "CONFIRMOU presença"
			if req.RSVPStatus == "DECLINED" {
				statusLabel = "informou que NÃO poderá comparecer (liberando vaga/custo)"
			}
			store.recordLogLocked(ev, "Convidado: "+guestName, RoleCouple, "RSVP_CONVIDADO",
				fmt.Sprintf("Convidado %s %s via portal público (sem login).", guestName, statusLabel),
				prevTotal)
			store.saveLocked()
			writeJSON(w, http.StatusOK, map[string]any{
				"message":    "Confirmação registrada com sucesso!",
				"financials": ev.Financials,
			})
			return
		}
	})

	// Event specific routes: /api/events/{id}...
	mux.HandleFunc("/api/events/", func(w http.ResponseWriter, r *http.Request) {
		trimmed := strings.TrimPrefix(r.URL.Path, "/api/events/")
		parts := strings.Split(trimmed, "/")
		eventID := parts[0]

		store.mu.Lock()
		defer store.mu.Unlock()

		idx := store.findEventIndex(eventID)
		if idx < 0 {
			writeErr(w, http.StatusNotFound, "Evento não encontrado")
			return
		}
		ev := &store.data.Events[idx]
		actorName, actorRole := store.getActorFromRequest(r)

		// GET /api/events/{id}
		if len(parts) == 1 || parts[1] == "" {
			if r.Method == http.MethodGet {
				ev.Financials = CalculateFinancials(ev)
				writeJSON(w, http.StatusOK, ev)
				return
			}
			writeErr(w, http.StatusMethodNotAllowed, "Método não permitido")
			return
		}

		subResource := parts[1]

		switch subResource {
		// POST /api/events/{id}/simulate -> Preview financial impact BEFORE committing any change
		case "simulate":
			if r.Method != http.MethodPost {
				writeErr(w, http.StatusMethodNotAllowed, "Use POST")
				return
			}
			var req struct {
				AddAdults        int      `json:"addAdults"`
				AddChildren      int      `json:"addChildren"`
				SelectedMenuID   string   `json:"selectedMenuId"`
				SelectedExtraIDs []string `json:"selectedExtraIds"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeErr(w, http.StatusBadRequest, "Payload inválido")
				return
			}

			// Clone event for dry-run calculation
			simEv := *ev
			simGuests := make([]Guest, len(ev.Guests))
			copy(simGuests, ev.Guests)

			if req.AddAdults > 0 {
				simGuests = append(simGuests, Guest{
					ID:         "sim_adult",
					Category:   "ADULT",
					RSVPStatus: "CONFIRMED",
					Companions: req.AddAdults - 1,
				})
			}
			if req.AddChildren > 0 {
				simGuests = append(simGuests, Guest{
					ID:         "sim_child",
					Category:   "CHILD",
					RSVPStatus: "CONFIRMED",
					Companions: req.AddChildren - 1,
				})
			}
			simEv.Guests = simGuests
			if req.SelectedMenuID != "" {
				simEv.SelectedMenuID = req.SelectedMenuID
			}
			if req.SelectedExtraIDs != nil {
				simEv.SelectedExtraIDs = req.SelectedExtraIDs
			}

			currentFin := CalculateFinancials(ev)
			simulatedFin := CalculateFinancials(&simEv)

			writeJSON(w, http.StatusOK, map[string]any{
				"current":   currentFin,
				"simulated": simulatedFin,
				"delta":     math.Round((simulatedFin.TotalContractValue-currentFin.TotalContractValue)*100) / 100,
			})

		// PUT /api/events/{id}/rules -> Admin updates pricing rules, base package, included guests, menu prices, etc.
		case "rules":
			if r.Method != http.MethodPut {
				writeErr(w, http.StatusMethodNotAllowed, "Use PUT")
				return
			}
			var newRules FinancialRules
			if err := json.NewDecoder(r.Body).Decode(&newRules); err != nil {
				writeErr(w, http.StatusBadRequest, "Regras inválidas")
				return
			}
			prevTotal := CalculateFinancials(ev).TotalContractValue
			if len(newRules.AvailableMenus) == 0 {
				newRules.AvailableMenus = ev.Rules.AvailableMenus
			}
			if len(newRules.AvailableExtras) == 0 {
				newRules.AvailableExtras = ev.Rules.AvailableExtras
			}
			ev.Rules = newRules
			store.recordLogLocked(ev, actorName, RoleAdmin, "ATUALIZACAO_TABELA_PRECOS_ADMIN",
				fmt.Sprintf("Admin atualizou regras financeiras: Pacote Base R$ %.2f (%d convidados inclusos), Adulto Extra R$ %.2f, Criança Extra R$ %.2f, Mesa Extra R$ %.2f.",
					newRules.BasePackagePrice, newRules.IncludedGuests, newRules.ExtraAdultPrice, newRules.ExtraChildPrice, newRules.ExtraTableCost),
				prevTotal)
			store.saveLocked()
			writeJSON(w, http.StatusOK, ev)

		// PUT /api/events/{id}/selections -> Couple or Admin changes Menu Tier or Extra Services (immediately recalculates contract)
		case "selections":
			if r.Method != http.MethodPut {
				writeErr(w, http.StatusMethodNotAllowed, "Use PUT")
				return
			}
			if ev.Status == "LOCKED" && actorRole != RoleAdmin {
				writeErr(w, http.StatusForbidden, "O contrato está bloqueado pelo administrador para alterações próximas à data.")
				return
			}
			var req struct {
				SelectedMenuID   string   `json:"selectedMenuId"`
				SelectedExtraIDs []string `json:"selectedExtraIds"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeErr(w, http.StatusBadRequest, "Dados inválidos")
				return
			}
			prevTotal := CalculateFinancials(ev).TotalContractValue
			if req.SelectedMenuID != "" {
				ev.SelectedMenuID = req.SelectedMenuID
			}
			if req.SelectedExtraIDs != nil {
				ev.SelectedExtraIDs = req.SelectedExtraIDs
			}
			newFin := CalculateFinancials(ev)
			store.recordLogLocked(ev, actorName, actorRole, "ALTERACAO_ESCOPO_NOIVOS",
				fmt.Sprintf("Alteração de gastronomia/serviços extras (%s). O valor do contrato foi ajustado automaticamente para %d convidados ativos.",
					newFin.SelectedMenuName, newFin.TotalActiveGuests),
				prevTotal)
			store.saveLocked()
			writeJSON(w, http.StatusOK, ev)

		// PUT /api/events/{id}/status -> Admin locks/unlocks event or records payment
		case "status":
			if r.Method != http.MethodPut {
				writeErr(w, http.StatusMethodNotAllowed, "Use PUT")
				return
			}
			var req struct {
				Status     string   `json:"status"`
				AmountPaid *float64 `json:"amountPaid"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeErr(w, http.StatusBadRequest, "Dados inválidos")
				return
			}
			prevTotal := CalculateFinancials(ev).TotalContractValue
			if req.Status != "" {
				ev.Status = req.Status
			}
			if req.AmountPaid != nil {
				ev.AmountPaid = *req.AmountPaid
			}
			store.recordLogLocked(ev, actorName, RoleAdmin, "GESTAO_CONTRATO_ADMIN",
				fmt.Sprintf("Status do evento: %s | Valor pago atualizado: R$ %.2f", ev.Status, ev.AmountPaid),
				prevTotal)
			store.saveLocked()
			writeJSON(w, http.StatusOK, ev)

		// /api/events/{id}/guests and /api/events/{id}/guests/{guestId}
		case "guests":
			// POST new guest
			if len(parts) == 2 && r.Method == http.MethodPost {
				if ev.Status == "LOCKED" && actorRole != RoleAdmin {
					writeErr(w, http.StatusForbidden, "A lista de convidados está bloqueada pelo administrador.")
					return
				}
				var req struct {
					Name               string `json:"name"`
					Phone              string `json:"phone"`
					Email              string `json:"email"`
					Category           string `json:"category"` // "ADULT" | "CHILD" | "BABY"
					Group              string `json:"group"`
					RSVPStatus         string `json:"rsvpStatus"`
					DietaryRestriction string `json:"dietaryRestriction"`
					TableNumber        int    `json:"tableNumber"`
					Companions         int    `json:"companions"`
					Notes              string `json:"notes"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
					writeErr(w, http.StatusBadRequest, "Nome do convidado é obrigatório")
					return
				}
				if req.Category == "" {
					req.Category = "ADULT"
				}
				if req.Group == "" {
					req.Group = "Amigos"
				}
				if req.RSVPStatus == "" {
					req.RSVPStatus = "CONFIRMED"
				}
				if req.DietaryRestriction == "" {
					req.DietaryRestriction = "Nenhuma"
				}
				if req.Companions < 0 {
					req.Companions = 0
				}

				currentFin := CalculateFinancials(ev)
				seatsToAdd := 1 + req.Companions
				if req.RSVPStatus != "DECLINED" && (currentFin.TotalActiveGuests+seatsToAdd) > ev.Rules.MaxCapacity {
					writeErr(w, http.StatusBadRequest, fmt.Sprintf("Capacidade máxima do salão (%d pessoas) atingida!", ev.Rules.MaxCapacity))
					return
				}

				prevTotal := currentFin.TotalContractValue
				now := time.Now()
				newGuest := Guest{
					ID:                 genID("gst"),
					EventID:            ev.ID,
					Name:               strings.TrimSpace(req.Name),
					Phone:              req.Phone,
					Email:              req.Email,
					Category:           req.Category,
					Group:              req.Group,
					RSVPStatus:         req.RSVPStatus,
					DietaryRestriction: req.DietaryRestriction,
					TableNumber:        req.TableNumber,
					CheckedIn:          false,
					InviteCode:         genInviteCode(req.Name),
					Companions:         req.Companions,
					Notes:              req.Notes,
					CreatedAt:          now,
					UpdatedAt:          now,
				}
				ev.Guests = append([]Guest{newGuest}, ev.Guests...)
				newFin := CalculateFinancials(ev)
				diff := newFin.TotalContractValue - prevTotal

				catLabel := "Adulto"
				if req.Category == "CHILD" {
					catLabel = "Criança"
				} else if req.Category == "BABY" {
					catLabel = "Bebê (isento)"
				}

				desc := fmt.Sprintf("Adicionado convidado %s (%s, %d lugar[es]). ", newGuest.Name, catLabel, seatsToAdd)
				if diff > 0 {
					desc += fmt.Sprintf("Cota de %d lugares excedida -> Acréscimo imediato de +R$ %.2f no contrato.", ev.Rules.IncludedGuests, diff)
				} else {
					desc += fmt.Sprintf("Dentro da cota inclusa (%d/%d lugares ocupados).", newFin.TotalActiveGuests, ev.Rules.IncludedGuests)
				}

				store.recordLogLocked(ev, actorName, actorRole, "ADICAO_CONVIDADO", desc, prevTotal)
				store.saveLocked()
				writeJSON(w, http.StatusCreated, ev)
				return
			}

			// PUT or DELETE /api/events/{id}/guests/{guestId}
			if len(parts) == 3 {
				guestID := parts[2]
				if ev.Status == "LOCKED" && actorRole != RoleAdmin {
					writeErr(w, http.StatusForbidden, "A lista está bloqueada pelo administrador.")
					return
				}

				prevTotal := CalculateFinancials(ev).TotalContractValue

				if r.Method == http.MethodDelete {
					var removedName string
					var updated []Guest
					for _, g := range ev.Guests {
						if g.ID == guestID {
							removedName = g.Name
							continue
						}
						updated = append(updated, g)
					}
					if removedName == "" {
						writeErr(w, http.StatusNotFound, "Convidado não encontrado")
						return
					}
					ev.Guests = updated
					newFin := CalculateFinancials(ev)
					diff := newFin.TotalContractValue - prevTotal
					store.recordLogLocked(ev, actorName, actorRole, "REMOCAO_CONVIDADO",
						fmt.Sprintf("Convidado %s removido da lista. Impacto financeiro no contrato: R$ %.2f.", removedName, diff),
						prevTotal)
					store.saveLocked()
					writeJSON(w, http.StatusOK, ev)
					return
				}

				if r.Method == http.MethodPut {
					var req Guest
					if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
						writeErr(w, http.StatusBadRequest, "Dados inválidos")
						return
					}
					found := false
					for i := range ev.Guests {
						if ev.Guests[i].ID == guestID {
							if req.Name != "" {
								ev.Guests[i].Name = req.Name
							}
							if req.Category != "" {
								ev.Guests[i].Category = req.Category
							}
							if req.Group != "" {
								ev.Guests[i].Group = req.Group
							}
							if req.RSVPStatus != "" {
								ev.Guests[i].RSVPStatus = req.RSVPStatus
							}
							if req.DietaryRestriction != "" {
								ev.Guests[i].DietaryRestriction = req.DietaryRestriction
							}
							ev.Guests[i].Phone = req.Phone
							ev.Guests[i].Email = req.Email
							ev.Guests[i].TableNumber = req.TableNumber
							ev.Guests[i].Companions = req.Companions
							ev.Guests[i].CheckedIn = req.CheckedIn
							ev.Guests[i].Notes = req.Notes
							ev.Guests[i].UpdatedAt = time.Now()
							found = true
							store.recordLogLocked(ev, actorName, actorRole, "EDICAO_CONVIDADO",
								fmt.Sprintf("Dados/status de %s atualizados (%s, +%d acomp., status: %s).",
									ev.Guests[i].Name, ev.Guests[i].Category, ev.Guests[i].Companions, ev.Guests[i].RSVPStatus),
								prevTotal)
							break
						}
					}
					if !found {
						writeErr(w, http.StatusNotFound, "Convidado não encontrado")
						return
					}
					store.saveLocked()
					writeJSON(w, http.StatusOK, ev)
					return
				}
			}
		}

		writeErr(w, http.StatusNotFound, "Rota não encontrada")
	})

	// Serve built Frontend SPA (static files + React Router/SPA fallback)
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "./public"
	}
	if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
		fs := http.FileServer(http.Dir(staticDir))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				writeErr(w, http.StatusNotFound, "Endpoint da API não encontrado")
				return
			}
			cleanPath := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
			fullPath := filepath.Join(staticDir, cleanPath)
			if st, err := os.Stat(fullPath); err == nil && !st.IsDir() {
				fs.ServeHTTP(w, r)
				return
			}
			http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("🚀 Wedding SaaS Go Backend running on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, corsMiddleware(mux)); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
