import React, { useEffect, useMemo, useState } from "react"
import {
  ShieldCheck,
  Heart,
  Sparkles,
  Users,
  DollarSign,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Lock,
  Unlock,
  Utensils,
  Calculator,
  History,
  Search,
  MapPin,
  Calendar,
  ArrowUpRight,
  Building2,
  UserCheck,
  Receipt,
  Sliders,
  Table,
  Share2,
  Copy,
  Check,
  LogIn,
  LogOut,
  Eye,
} from "lucide-react"
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Select,
  Progress,
} from "@/components/ui/primitives"
import { cn, formatBRL, formatDateBR } from "@/lib/utils"
import type {
  WeddingEvent,
  User,
  Guest,
  FinancialRules,
  Role,
} from "./types"

const API_BASE = "/api"

export function App() {
  const [events, setEvents] = useState<WeddingEvent[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("evt_imperial01")
  const [activePortal, setActivePortal] = useState<Role>("COUPLE")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [toast, setToast] = useState<{ title: string; subtitle?: string; delta?: number } | null>(null)
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false)
  const [loginEmail, setLoginEmail] = useState<string>("")
  const [loginPassword, setLoginPassword] = useState<string>("")
  const [loginError, setLoginError] = useState<string>("")

  // Sub-tabs inside Couple Portal and Admin Portal
  const [coupleTab, setCoupleTab] = useState<"guests" | "menu_extras" | "tables" | "audit">("guests")
  const [adminTab, setAdminTab] = useState<"pricing" | "overview" | "guests_control" | "new_event">("pricing")

  // Guest creation form state with live financial impact confirmation
  const [newGuestName, setNewGuestName] = useState("")
  const [newGuestPhone, setNewGuestPhone] = useState("")
  const [newGuestEmail, setNewGuestEmail] = useState("")
  const [newGuestCategory, setNewGuestCategory] = useState<"ADULT" | "CHILD" | "BABY">("ADULT")
  const [newGuestGroup, setNewGuestGroup] = useState("Família Noiva")
  const [newGuestCompanions, setNewGuestCompanions] = useState<number>(0)
  const [newGuestDietary, setNewGuestDietary] = useState("Nenhuma")
  const [newGuestTable, setNewGuestTable] = useState<number>(1)
  const [guestSearch, setGuestSearch] = useState("")
  const [guestFilterStatus, setGuestFilterStatus] = useState<string>("ALL")
  const [pendingCostModal, setPendingCostModal] = useState<{
    seatsToAdd: number
    estimatedDelta: number
    newTotal: number
    overIncludedCount: number
  } | null>(null)

  // Public Guest RSVP (No Login!) state
  const [rsvpQuery, setRsvpQuery] = useState("")
  const [rsvpSelectedGuest, setRsvpSelectedGuest] = useState<Guest | null>(null)
  const [rsvpDietary, setRsvpDietary] = useState("")
  const [rsvpNotes, setRsvpNotes] = useState("")
  const [rsvpSuccessMsg, setRsvpSuccessMsg] = useState("")
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)

  // Admin editable rules state
  const [rulesForm, setRulesForm] = useState<FinancialRules | null>(null)
  const [amountPaidInput, setAmountPaidInput] = useState<number>(0)

  // Admin Create New Event state
  const [newEvtBride, setNewEvtBride] = useState("")
  const [newEvtGroom, setNewEvtGroom] = useState("")
  const [newEvtEmail, setNewEvtEmail] = useState("")
  const [newEvtDate, setNewEvtDate] = useState("2027-11-20")
  const [newEvtVenue, setNewEvtVenue] = useState("Villa Giardino Imperial • Salão Cristal")
  const [newEvtBasePrice, setNewEvtBasePrice] = useState(45000)
  const [newEvtIncludedGuests, setNewEvtIncludedGuests] = useState(100)
  const [newEvtExtraAdult, setNewEvtExtraAdult] = useState(310)
  const [newEvtExtraChild, setNewEvtExtraChild] = useState(155)

  const notify = (title: string, subtitle?: string, delta?: number) => {
    setToast({ title, subtitle, delta })
    setTimeout(() => {
      setToast((prev) => (prev?.title === title ? null : prev))
    }, 5500)
  }

  const fetchBootstrap = async () => {
    try {
      const res = await fetch(`${API_BASE}/bootstrap`)
      if (!res.ok) throw new Error("Falha ao carregar dados do servidor Go")
      const data = await res.json()
      setEvents(data.events || [])
      setUsers(data.users || [])
      if (data.events?.length > 0) {
        const current = data.events.find((e: WeddingEvent) => e.id === selectedEventId) || data.events[0]
        setSelectedEventId(current.id)
        setRulesForm(current.rules)
        setAmountPaidInput(current.amountPaid)
      }
      if (!currentUser && data.users?.length > 0) {
        const coupleUser = data.users.find((u: User) => u.role === "COUPLE") || data.users[0]
        setCurrentUser(coupleUser)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBootstrap()
  }, [])

  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0] || null
  }, [events, selectedEventId])

  useEffect(() => {
    if (activeEvent) {
      setRulesForm(JSON.parse(JSON.stringify(activeEvent.rules)))
      setAmountPaidInput(activeEvent.amountPaid)
    }
  }, [activeEvent?.id, activeEvent?.updatedAt])

  const updateEventInState = (updated: WeddingEvent, prevTotal?: number) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    if (prevTotal !== undefined) {
      const diff = updated.financials.totalContractValue - prevTotal
      if (Math.abs(diff) > 0.01) {
        notify(
          diff > 0
            ? `Valor do Contrato Reajustado Automaticamente (+${formatBRL(diff)})`
            : `Redução no Valor do Contrato (${formatBRL(diff)})`,
          `Novo total do casamento: ${formatBRL(updated.financials.totalContractValue)} (${updated.financials.totalActiveGuests} convidados ativos)`,
          diff
        )
      }
    }
  }

  // Switch role/login seamlessly or via credentials
  const handleQuickSwitchPortal = (portal: Role) => {
    setActivePortal(portal)
    if (portal === "ADMIN") {
      const admin = users.find((u) => u.role === "ADMIN")
      if (admin) setCurrentUser(admin)
    } else if (portal === "COUPLE") {
      const couple = users.find((u) => u.role === "COUPLE" && u.eventId === activeEvent?.id) || users.find((u) => u.role === "COUPLE")
      if (couple) setCurrentUser(couple)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || "Credenciais inválidas")
        return
      }
      setCurrentUser(data.user)
      setActivePortal(data.user.role)
      if (data.user.eventId) {
        setSelectedEventId(data.user.eventId)
      }
      setShowLoginModal(false)
      notify(`Bem-vindo(a), ${data.user.name}!`, `Sessão autenticada como ${data.user.role === "ADMIN" ? "Administrador do Espaço" : "Noivos"}`)
    } catch {
      setLoginError("Erro de conexão com o servidor")
    }
  }

  // Live simulation calculation on client side before adding guest
  const liveGuestAdditionImpact = useMemo(() => {
    if (!activeEvent) return { seats: 1, delta: 0, willExceed: false, newGuestCount: 0 }
    const fin = activeEvent.financials
    const rules = activeEvent.rules
    const seats = 1 + (Number(newGuestCompanions) || 0)
    const currentBillable = fin.adultCount + fin.childCount

    if (newGuestCategory === "BABY") {
      return {
        seats,
        delta: 0,
        willExceed: false,
        newGuestCount: fin.totalActiveGuests + seats,
      }
    }

    // Per-seat menu + per-guest extras cost (applies to every billable guest)
    const selectedMenu = rules.availableMenus.find((m) => m.id === activeEvent.selectedMenuId) || rules.availableMenus[0]
    const menuUnit = newGuestCategory === "ADULT" ? (selectedMenu?.pricePerAdult || 0) : (selectedMenu?.pricePerChild || 0)
    const perGuestExtrasUnit = rules.availableExtras
      .filter((x) => activeEvent.selectedExtraIds.includes(x.id) && x.pricingType === "PER_GUEST")
      .reduce((acc, x) => acc + x.unitPrice, 0)

    let extraHeadCost = 0
    for (let i = 1; i <= seats; i++) {
      const idxGuest = currentBillable + i
      if (idxGuest > rules.includedGuests) {
        if (newGuestCategory === "ADULT") {
          if (rules.tier2Threshold > rules.includedGuests && idxGuest > rules.tier2Threshold) {
            extraHeadCost += rules.tier2AdultPrice
          } else {
            extraHeadCost += rules.extraAdultPrice
          }
        } else {
          extraHeadCost += rules.extraChildPrice
        }
      }
    }

    const seatsPerTable = rules.seatsPerTable || 8
    const currentTables = Math.ceil(fin.totalActiveGuests / seatsPerTable)
    const newTables = Math.ceil((fin.totalActiveGuests + seats) / seatsPerTable)
    let extraTableDelta = 0
    if (newTables > currentTables && newTables > rules.includedTables) {
      const billableNewTables = Math.max(0, newTables - Math.max(currentTables, rules.includedTables))
      extraTableDelta = billableNewTables * rules.extraTableCost
    }

    const totalDelta = extraHeadCost + seats * (menuUnit + perGuestExtrasUnit) + extraTableDelta
    return {
      seats,
      delta: totalDelta,
      willExceed: currentBillable + seats > rules.includedGuests,
      newGuestCount: fin.totalActiveGuests + seats,
    }
  }, [activeEvent, newGuestCategory, newGuestCompanions])

  const executeAddGuest = async () => {
    if (!activeEvent || !newGuestName.trim()) return
    const prevTotal = activeEvent.financials.totalContractValue
    try {
      const res = await fetch(`${API_BASE}/events/${activeEvent.id}/guests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Actor-Role": activePortal === "ADMIN" ? "ADMIN" : "COUPLE",
          "X-Actor-Name": currentUser?.name || "Noivos",
        },
        body: JSON.stringify({
          name: newGuestName,
          phone: newGuestPhone,
          email: newGuestEmail,
          category: newGuestCategory,
          group: newGuestGroup,
          rsvpStatus: "CONFIRMED",
          dietaryRestriction: newGuestDietary,
          tableNumber: Number(newGuestTable) || 1,
          companions: Number(newGuestCompanions) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        notify("Ação Bloqueada pelas Regras do Contrato", data.error || "Não foi possível adicionar")
        return
      }
      updateEventInState(data, prevTotal)
      setNewGuestName("")
      setNewGuestPhone("")
      setNewGuestEmail("")
      setNewGuestCompanions(0)
      setPendingCostModal(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleTryAddGuest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeEvent || !newGuestName.trim()) return

    // If adding this guest increases the contract price, show transparent confirmation dialog to the couple
    if (liveGuestAdditionImpact.delta > 0 && activePortal === "COUPLE") {
      setPendingCostModal({
        seatsToAdd: liveGuestAdditionImpact.seats,
        estimatedDelta: liveGuestAdditionImpact.delta,
        newTotal: activeEvent.financials.totalContractValue + liveGuestAdditionImpact.delta,
        overIncludedCount: Math.max(
          0,
          liveGuestAdditionImpact.newGuestCount - activeEvent.rules.includedGuests
        ),
      })
      return
    }
    executeAddGuest()
  }

  const handleDeleteGuest = async (guest: Guest) => {
    if (!activeEvent) return
    const prevTotal = activeEvent.financials.totalContractValue
    const res = await fetch(`${API_BASE}/events/${activeEvent.id}/guests/${guest.id}`, {
      method: "DELETE",
      headers: {
        "X-Actor-Role": activePortal === "ADMIN" ? "ADMIN" : "COUPLE",
        "X-Actor-Name": currentUser?.name || "Noivos",
      },
    })
    if (res.ok) {
      const updated = await res.json()
      updateEventInState(updated, prevTotal)
    } else {
      const err = await res.json()
      notify("Ação Bloqueada", err.error)
    }
  }

  const handleUpdateGuestStatusOrCompanions = async (guest: Guest, patch: Partial<Guest>) => {
    if (!activeEvent) return
    const prevTotal = activeEvent.financials.totalContractValue
    const res = await fetch(`${API_BASE}/events/${activeEvent.id}/guests/${guest.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Role": activePortal === "ADMIN" ? "ADMIN" : "COUPLE",
        "X-Actor-Name": currentUser?.name || "Noivos",
      },
      body: JSON.stringify({ ...guest, ...patch }),
    })
    if (res.ok) {
      const updated = await res.json()
      updateEventInState(updated, prevTotal)
    } else {
      const err = await res.json()
      notify("Não permitido", err.error)
    }
  }

  const handleToggleMenuOrExtra = async (menuId: string, extraIds: string[]) => {
    if (!activeEvent) return
    const prevTotal = activeEvent.financials.totalContractValue
    const res = await fetch(`${API_BASE}/events/${activeEvent.id}/selections`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Role": activePortal === "ADMIN" ? "ADMIN" : "COUPLE",
        "X-Actor-Name": currentUser?.name || "Noivos",
      },
      body: JSON.stringify({
        selectedMenuId: menuId,
        selectedExtraIds: extraIds,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      updateEventInState(updated, prevTotal)
    } else {
      const err = await res.json()
      notify("Contrato Bloqueado", err.error)
    }
  }

  const handleSaveAdminRules = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeEvent || !rulesForm) return
    const prevTotal = activeEvent.financials.totalContractValue
    const res = await fetch(`${API_BASE}/events/${activeEvent.id}/rules`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Role": "ADMIN",
        "X-Actor-Name": "Admin (Dono do Espaço)",
      },
      body: JSON.stringify(rulesForm),
    })
    if (res.ok) {
      const updated = await res.json()
      updateEventInState(updated, prevTotal)
      notify(
        "Regras Financeiras Atualizadas pelo Admin!",
        `O contrato dos noivos foi recalculado em tempo real para ${formatBRL(updated.financials.totalContractValue)}.`
      )
    }
  }

  const handleAdminToggleLockOrPayment = async (newStatus?: string, newPaid?: number) => {
    if (!activeEvent) return
    const res = await fetch(`${API_BASE}/events/${activeEvent.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Role": "ADMIN",
        "X-Actor-Name": "Admin (Dono do Espaço)",
      },
      body: JSON.stringify({
        status: newStatus ?? activeEvent.status,
        amountPaid: newPaid ?? amountPaidInput,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      updateEventInState(updated)
      notify(
        "Status / Financeiro do Contrato Atualizado",
        `Status: ${updated.status === "LOCKED" ? "BLOQUEADO para alterações dos noivos" : "ATIVO"} | Pago: ${formatBRL(updated.amountPaid)}`
      )
    }
  }

  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvtBride || !newEvtGroom) return
    const res = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Role": "ADMIN",
      },
      body: JSON.stringify({
        title: `Casamento ${newEvtBride} & ${newEvtGroom}`,
        brideName: newEvtBride,
        groomName: newEvtGroom,
        coupleEmail: newEvtEmail || `${newEvtBride.toLowerCase().split(" ")[0]}@casamento.com`,
        eventDate: newEvtDate,
        eventTime: "19:00",
        venueName: newEvtVenue,
        basePackagePrice: Number(newEvtBasePrice),
        includedGuests: Number(newEvtIncludedGuests),
        maxCapacity: 300,
        extraAdultPrice: Number(newEvtExtraAdult),
        extraChildPrice: Number(newEvtExtraChild),
      }),
    })
    if (res.ok) {
      const created: WeddingEvent = await res.json()
      await fetchBootstrap()
      setSelectedEventId(created.id)
      setAdminTab("pricing")
      setNewEvtBride("")
      setNewEvtGroom("")
      notify("Novo Contrato de Casamento Criado!", `${created.title} configurado com sucesso.`)
    }
  }

  const handlePublicRsvpSubmit = async (status: "CONFIRMED" | "DECLINED") => {
    if (!activeEvent || !rsvpSelectedGuest) return
    const prevTotal = activeEvent.financials.totalContractValue
    const res = await fetch(`${API_BASE}/public/rsvp/${activeEvent.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId: rsvpSelectedGuest.id,
        rsvpStatus: status,
        dietaryRestriction: rsvpDietary || rsvpSelectedGuest.dietaryRestriction,
        notes: rsvpNotes || rsvpSelectedGuest.notes,
      }),
    })
    if (res.ok) {
      setRsvpSuccessMsg(
        status === "CONFIRMED"
          ? `Presença confirmada com sucesso para ${rsvpSelectedGuest.name}! Nos vemos no grande dia!`
          : `Sua ausência foi registrada para ${rsvpSelectedGuest.name}. Agradecemos por avisar os noivos!`
      )
      await fetchBootstrap()
      setRsvpSelectedGuest(null)
      setRsvpQuery("")
      if (status === "DECLINED") {
        notify("RSVP Público Recebido", "O convidado informou ausência e a vaga/custo excedente foi liberada automaticamente.", -1)
      } else {
        notify("RSVP Público Confirmado!", `${rsvpSelectedGuest.name} confirmou presença sem precisar de login.`)
      }
      setTimeout(() => setRsvpSuccessMsg(""), 6000)
    }
  }

  const filteredGuests = useMemo(() => {
    if (!activeEvent) return []
    return activeEvent.guests.filter((g) => {
      const matchesQuery =
        !guestSearch.trim() ||
        g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
        g.inviteCode.toLowerCase().includes(guestSearch.toLowerCase()) ||
        g.group.toLowerCase().includes(guestSearch.toLowerCase())
      const matchesStatus = guestFilterStatus === "ALL" || g.rsvpStatus === guestFilterStatus
      return matchesQuery && matchesStatus
    })
  }, [activeEvent, guestSearch, guestFilterStatus])

  const rsvpMatchingGuests = useMemo(() => {
    if (!activeEvent || !rsvpQuery.trim()) return []
    const q = rsvpQuery.toLowerCase().trim()
    return activeEvent.guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.inviteCode.toLowerCase().includes(q) ||
        (g.phone && g.phone.includes(q))
    )
  }, [activeEvent, rsvpQuery])

  if (loading || !activeEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-3 border-amber-700 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-stone-600">Carregando VowPay &amp; VenueOS (Go Engine)...</p>
        </div>
      </div>
    )
  }

  const fin = activeEvent.financials
  const rules = activeEvent.rules

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col">
      {/* Real-time Price Impact Notification Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-2xl border border-amber-300/80 bg-stone-950 text-stone-50 p-4 shadow-2xl flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">{toast.title}</p>
              {toast.subtitle && <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">{toast.subtitle}</p>}
            </div>
            <button onClick={() => setToast(null)} className="text-stone-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal: Couple Transparent Cost Impact Confirmation when adding extra guests */}
      {pendingCostModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-amber-300 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-700 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold text-base">Aviso de Reajuste Automático de Contrato</h3>
              </div>
              <Badge className="bg-white/20 text-white border-0">Regra Anti-Excedente</Badge>
            </div>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-stone-600 leading-relaxed">
                Você está adicionando <strong>{newGuestName}</strong> ({pendingCostModal.seatsToAdd} lugar
                {pendingCostModal.seatsToAdd > 1 ? "es" : ""}). Como sua lista ultrapassa a cota contratada de{" "}
                <strong>{rules.includedGuests} convidados inclusos</strong>, essa alteração possui impacto financeiro
                imediato configurado pelo estabelecimento:
              </p>

              <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Valor Atual do Contrato:</span>
                  <span className="font-medium">{formatBRL(fin.totalContractValue)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-amber-900">
                  <span>Acréscimo por Excedente + Buffet/Extras:</span>
                  <span>+ {formatBRL(pendingCostModal.estimatedDelta)}</span>
                </div>
                <div className="border-t border-amber-200/80 pt-2 flex justify-between text-base font-bold text-stone-900">
                  <span>Novo Valor Total do Contrato:</span>
                  <span>{formatBRL(pendingCostModal.newTotal)}</span>
                </div>
              </div>

              <p className="text-xs text-stone-500">
                * Qualquer adição ou remoção na lista fica registrada no histórico financeiro compartilhado com o
                administrador do espaço.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setPendingCostModal(null)}>
                  Cancelar Adição
                </Button>
                <Button variant="gold" onClick={executeAddGuest}>
                  Aceitar Acréscimo (+{formatBRL(pendingCostModal.estimatedDelta)}) e Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Login with Credentials */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Autenticação de Acesso</CardTitle>
                <button onClick={() => setShowLoginModal(false)} className="text-stone-400 hover:text-stone-700">
                  ✕
                </button>
              </div>
              <CardDescription>
                Apenas o <strong>Admin (Dono do Espaço)</strong> e os <strong>Noivos</strong> possuem login. Os
                convidados acessam o Portal RSVP público sem senha.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-600">E-mail</label>
                  <Input
                    type="email"
                    placeholder="admin@espacoimperial.com ou noivos@casamento.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600">Senha</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                {loginError && <p className="text-xs text-rose-600 font-medium">{loginError}</p>}
                <Button type="submit" variant="gold" className="w-full">
                  Entrar na Conta
                </Button>
              </form>

              <div className="border-t border-stone-200 pt-3 space-y-2">
                <p className="text-xs font-semibold text-stone-500">Contas Rápidas para Teste:</p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("admin@espacoimperial.com")
                      setLoginPassword("admin123")
                    }}
                    className="text-left text-xs p-2 rounded-lg border border-stone-200 hover:bg-stone-50 flex items-center justify-between"
                  >
                    <span>
                      <strong>Admin (Dono do Espaço):</strong> admin@espacoimperial.com
                    </span>
                    <Badge variant="amber">admin123</Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("noivos@casamento.com")
                      setLoginPassword("noivos123")
                    }}
                    className="text-left text-xs p-2 rounded-lg border border-stone-200 hover:bg-stone-50 flex items-center justify-between"
                  >
                    <span>
                      <strong>Noivos (Clara &amp; Gabriel):</strong> noivos@casamento.com
                    </span>
                    <Badge variant="emerald">noivos123</Badge>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top SaaS Navigation Bar & Role Switcher */}
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-700 to-stone-900 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-editorial text-xl font-bold tracking-tight text-stone-900">
                  VowPay &amp; VenueOS
                </span>
                <Badge variant="amber" className="hidden sm:inline-flex">
                  Dynamic Pricing Engine
                </Badge>
              </div>
              <p className="text-xs text-stone-500 hidden md:block">
                Gestão de Casamentos com Precificação Dinâmica Atrelada a Convidados
              </p>
            </div>
          </div>

          {/* 3-Mode Interactive Switcher: Admin (Owner) | Noivos (Couple) | Convidado (No Login) */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200/80">
            <button
              onClick={() => handleQuickSwitchPortal("ADMIN")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activePortal === "ADMIN"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>1. Admin (Dono do Espaço)</span>
            </button>
            <button
              onClick={() => handleQuickSwitchPortal("COUPLE")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activePortal === "COUPLE"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              <Heart className="h-3.5 w-3.5" />
              <span>2. Painel dos Noivos</span>
            </button>
            <button
              onClick={() => handleQuickSwitchPortal("GUEST")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activePortal === "GUEST"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>3. RSVP Convidado (Sem Login)</span>
            </button>
          </div>

          {/* Event Selector & Auth info */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Select
              value={activeEvent.id}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="h-9 text-xs font-medium w-56 bg-stone-50"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.financials.totalActiveGuests}/{ev.rules.includedGuests} conv.)
                </option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={() => setShowLoginModal(true)}>
              <LogIn className="h-3.5 w-3.5" />
              <span>Login</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Live Financial Ticker Strip (Always visible for Admin & Couple so every change's price link is 100% clear) */}
      {activePortal !== "GUEST" && (
        <div className="bg-stone-900 text-stone-100 border-b border-stone-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
                    {activeEvent.title}
                  </span>
                  {activeEvent.status === "LOCKED" ? (
                    <Badge variant="rose" className="text-[11px]">
                      <Lock className="h-3 w-3" /> Contrato Bloqueado pelo Admin
                    </Badge>
                  ) : (
                    <Badge variant="emerald" className="text-[11px]">
                      Sincronização Financeira Ativa
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-stone-400">
                  Cota Contratada:{" "}
                  <strong className="text-white">
                    {rules.includedGuests} lugares ({formatBRL(rules.basePackagePrice)})
                  </strong>{" "}
                  • Excedente Adulto: <strong className="text-amber-300">+{formatBRL(rules.extraAdultPrice)}</strong> •
                  Criança: <strong className="text-amber-300">+{formatBRL(rules.extraChildPrice)}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-[11px] text-stone-400 uppercase">Lugares Ativos / Cota</p>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-base font-bold",
                      fin.isOverIncluded ? "text-amber-400" : "text-emerald-400"
                    )}
                  >
                    {fin.totalActiveGuests} / {rules.includedGuests}
                  </span>
                  {fin.extraAdultsStandard + fin.extraAdultsTier2 + fin.extraChildren > 0 && (
                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                      +{fin.extraAdultsStandard + fin.extraAdultsTier2 + fin.extraChildren} excedentes
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-stone-400 uppercase">Custo Próximo Adulto (+1)</p>
                <p className="text-sm font-semibold text-amber-300">
                  +{formatBRL(fin.nextAdultMarginalCost)}{" "}
                  <span className="text-[11px] text-stone-400 font-normal">(tudo incluso)</span>
                </p>
              </div>

              <div className="border-l border-stone-700 pl-5">
                <p className="text-[11px] text-stone-400 uppercase">Valor Total do Contrato (Tempo Real)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white tracking-tight">
                    {formatBRL(fin.totalContractValue)}
                  </span>
                  {fin.totalExtraAdded > 0 && (
                    <span className="text-xs text-amber-400 font-medium">
                      (+{formatBRL(fin.totalExtraAdded)} em extras/excedentes)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ===================================================================== */}
        {/* PORTAL 1: ADMIN (DONO DO ESTABELECIMENTO) - CONTROLE TOTAL E PREÇOS   */}
        {/* ===================================================================== */}
        {activePortal === "ADMIN" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/90 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">ADMIN • DONO DO ESTABELECIMENTO</Badge>
                  <span className="text-xs text-stone-500">{activeEvent.venueName}</span>
                </div>
                <h1 className="font-serif-editorial text-3xl font-bold text-stone-900 mt-1">
                  Central de Controle de Preços &amp; Contratos
                </h1>
                <p className="text-sm text-stone-600">
                  Configure todas as regras financeiras, limites de convidados, valores por cabeça excedente, menus e
                  bloqueios. Qualquer ajuste aqui reflete instantaneamente no painel dos noivos.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant={activeEvent.status === "LOCKED" ? "emerald" : "destructive"}
                  size="sm"
                  onClick={() =>
                    handleAdminToggleLockOrPayment(activeEvent.status === "LOCKED" ? "ACTIVE" : "LOCKED")
                  }
                >
                  {activeEvent.status === "LOCKED" ? (
                    <>
                      <Unlock className="h-4 w-4" /> Desbloquear Lista p/ Noivos
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Bloquear Alterações dos Noivos
                    </>
                  )}
                </Button>
                <Button variant="gold" size="sm" onClick={() => setAdminTab("new_event")}>
                  <Plus className="h-4 w-4" /> Novo Casamento
                </Button>
              </div>
            </div>

            {/* Admin Sub-navigation */}
            <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
              <Button
                variant={adminTab === "pricing" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdminTab("pricing")}
              >
                <Sliders className="h-4 w-4" /> Motor de Preços &amp; Regras de Excedentes
              </Button>
              <Button
                variant={adminTab === "overview" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdminTab("overview")}
              >
                <Building2 className="h-4 w-4" /> Visão Geral de Todos os Casamentos ({events.length})
              </Button>
              <Button
                variant={adminTab === "guests_control" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdminTab("guests_control")}
              >
                <Users className="h-4 w-4" /> Auditoria de Convidados &amp; Check-in ({fin.totalActiveGuests})
              </Button>
              <Button
                variant={adminTab === "new_event" ? "default" : "outline"}
                size="sm"
                onClick={() => setAdminTab("new_event")}
              >
                <Plus className="h-4 w-4" /> Cadastrar Novo Contrato de Noivos
              </Button>
            </div>

            {/* ADMIN TAB 1: PRICING ENGINE CONFIGURATION */}
            {adminTab === "pricing" && rulesForm && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={handleSaveAdminRules} className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Calculator className="h-5 w-5 text-amber-700" />
                        1. Pacote Base &amp; Travas Anti-Excedente de Convidados
                      </CardTitle>
                      <CardDescription>
                        Evite que os noivos fechem um pacote para X pessoas e convidem mais sem pagar. Todo convidado
                        acima da cota inclusa gera cobrança imediata por cabeça.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Valor do Pacote Base Contratado (R$)
                        </label>
                        <Input
                          type="number"
                          step="100"
                          value={rulesForm.basePackagePrice}
                          onChange={(e) =>
                            setRulesForm({ ...rulesForm, basePackagePrice: Number(e.target.value) })
                          }
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                          Valor fixo mínimo acordado na assinatura do contrato.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Cota de Convidados Inclusos no Pacote Base
                        </label>
                        <Input
                          type="number"
                          value={rulesForm.includedGuests}
                          onChange={(e) =>
                            setRulesForm({ ...rulesForm, includedGuests: Number(e.target.value) })
                          }
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                          Acima deste número, cada novo convidado dos noivos soma ao contrato.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-amber-800">
                          Preço por ADULTO Excedente (R$ / cabeça)
                        </label>
                        <Input
                          type="number"
                          step="5"
                          value={rulesForm.extraAdultPrice}
                          onChange={(e) =>
                            setRulesForm({ ...rulesForm, extraAdultPrice: Number(e.target.value) })
                          }
                          className="border-amber-300 bg-amber-50/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-amber-800">
                          Preço por CRIANÇA Excedente (R$ / cabeça)
                        </label>
                        <Input
                          type="number"
                          step="5"
                          value={rulesForm.extraChildPrice}
                          onChange={(e) =>
                            setRulesForm({ ...rulesForm, extraChildPrice: Number(e.target.value) })
                          }
                          className="border-amber-300 bg-amber-50/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Gatilho Faixa 2 (Equipe/Garçons Extras a partir de X pessoas)
                        </label>
                        <Input
                          type="number"
                          value={rulesForm.tier2Threshold}
                          onChange={(e) =>
                            setRulesForm({ ...rulesForm, tier2Threshold: Number(e.target.value) })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Preço Adulto Excedente na Faixa 2 (R$)
                        </label>
                        <Input
                          type="number"
                          step="5"
                          value={rulesForm.tier2AdultPrice}
                          onChange={(e) =>
                            setRulesForm({ ...rulesForm, tier2AdultPrice: Number(e.target.value) })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Capacidade Física Máxima do Salão
                        </label>
                        <Input
                          type="number"
                          value={rulesForm.maxCapacity}
                          onChange={(e) =>
                            setRulesForm({ ...rulesForm, maxCapacity: Number(e.target.value) })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Custo por Mesa Extra Adicional (R$)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            title="Lugares por mesa"
                            placeholder="Lug/Mesa"
                            value={rulesForm.seatsPerTable}
                            onChange={(e) =>
                              setRulesForm({ ...rulesForm, seatsPerTable: Number(e.target.value) })
                            }
                          />
                          <Input
                            type="number"
                            title="Mesas inclusas"
                            placeholder="Mesas Incl."
                            value={rulesForm.includedTables}
                            onChange={(e) =>
                              setRulesForm({ ...rulesForm, includedTables: Number(e.target.value) })
                            }
                          />
                          <Input
                            type="number"
                            title="R$ por mesa extra"
                            placeholder="R$ Mesa"
                            value={rulesForm.extraTableCost}
                            onChange={(e) =>
                              setRulesForm({ ...rulesForm, extraTableCost: Number(e.target.value) })
                            }
                          />
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1">
                          Lugares/mesa • Mesas inclusas • R$ por mesa extra necessária
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Editable Menu Pricing Tiers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Utensils className="h-5 w-5 text-amber-700" />
                        2. Tabela de Preços de Gastronomia (Cobrado por Convidado Ativo)
                      </CardTitle>
                      <CardDescription>
                        Se os noivos fizerem upgrade de menu OU adicionarem convidados em um menu superior, o valor
                        multiplica automaticamente pelo número total de convidados.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rulesForm.availableMenus.map((menu, idx) => (
                        <div
                          key={menu.id}
                          className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                        >
                          <div className="sm:col-span-2">
                            <p className="font-semibold text-sm text-stone-900">{menu.name}</p>
                            <p className="text-xs text-stone-500">{menu.description}</p>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-stone-600">
                              Adicional Adulto (R$/pessoa)
                            </label>
                            <Input
                              type="number"
                              value={menu.pricePerAdult}
                              onChange={(e) => {
                                const copy = [...rulesForm.availableMenus]
                                copy[idx] = { ...menu, pricePerAdult: Number(e.target.value) }
                                setRulesForm({ ...rulesForm, availableMenus: copy })
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-stone-600">
                              Adicional Criança (R$/criança)
                            </label>
                            <Input
                              type="number"
                              value={menu.pricePerChild}
                              onChange={(e) => {
                                const copy = [...rulesForm.availableMenus]
                                copy[idx] = { ...menu, pricePerChild: Number(e.target.value) }
                                setRulesForm({ ...rulesForm, availableMenus: copy })
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Editable Extra Services Pricing */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-amber-700" />
                        3. Serviços Extras &amp; Opcionais Configurados pelo Estabelecimento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rulesForm.availableExtras.map((ext, idx) => (
                        <div
                          key={ext.id}
                          className="p-3.5 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{ext.name}</span>
                              <Badge variant={ext.pricingType === "PER_GUEST" ? "amber" : "stone"}>
                                {ext.pricingType === "PER_GUEST" ? "Cobrado POR CONVIDADO" : "Valor Fixo Único"}
                              </Badge>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">{ext.description}</p>
                          </div>
                          <div className="w-40">
                            <label className="text-[11px] font-semibold text-stone-600">Preço Unitário (R$)</label>
                            <Input
                              type="number"
                              value={ext.unitPrice}
                              onChange={(e) => {
                                const copy = [...rulesForm.availableExtras]
                                copy[idx] = { ...ext, unitPrice: Number(e.target.value) }
                                setRulesForm({ ...rulesForm, availableExtras: copy })
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      <div className="pt-3 flex justify-end">
                        <Button type="submit" variant="gold" size="lg">
                          Salvar Tabela de Preços e Recalcular Contrato dos Noivos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </form>

                {/* Right column: Admin Financial Summary & Payment Control */}
                <div className="space-y-6">
                  <Card className="border-amber-300/90 bg-gradient-to-b from-amber-50/50 to-white">
                    <CardHeader>
                      <Badge variant="amber" className="w-fit">
                        Faturamento Atual deste Evento
                      </Badge>
                      <CardTitle className="text-xl mt-1">{activeEvent.title}</CardTitle>
                      <CardDescription>
                        Data: {formatDateBR(activeEvent.eventDate)} às {activeEvent.eventTime}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-stone-600">Pacote Base ({rules.includedGuests} conv.):</span>
                          <span className="font-medium">{formatBRL(fin.basePackagePrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">
                            Adultos Excedentes ({fin.extraAdultsStandard + fin.extraAdultsTier2}):
                          </span>
                          <span className="font-semibold text-amber-800">+{formatBRL(fin.extraAdultsCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Crianças Excedentes ({fin.extraChildren}):</span>
                          <span className="font-semibold text-amber-800">+{formatBRL(fin.extraChildrenCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Upgrade de Menu ({fin.totalActiveGuests} p.):</span>
                          <span className="font-semibold text-amber-800">+{formatBRL(fin.menuUpgradeCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Mesas Extras ({fin.extraTables} mesas):</span>
                          <span className="font-semibold text-amber-800">+{formatBRL(fin.extraTablesCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Serviços Extras Selecionados:</span>
                          <span className="font-semibold text-amber-800">+{formatBRL(fin.selectedExtrasCost)}</span>
                        </div>
                        <div className="border-t border-stone-200 pt-2.5 flex justify-between text-base font-bold text-stone-900">
                          <span>Total a Receber:</span>
                          <span>{formatBRL(fin.totalContractValue)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                          <span>Total Já Pago pelos Noivos:</span>
                          <span>{formatBRL(fin.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                          <span>Saldo Pendente (Com Excedentes):</span>
                          <span>{formatBRL(fin.remainingBalance)}</span>
                        </div>
                      </div>

                      <div className="border-t border-stone-200 pt-4 space-y-2">
                        <label className="text-xs font-semibold text-stone-700">
                          Registrar Pagamento Recebido (R$)
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="500"
                            value={amountPaidInput}
                            onChange={(e) => setAmountPaidInput(Number(e.target.value))}
                          />
                          <Button
                            type="button"
                            variant="default"
                            onClick={() => handleAdminToggleLockOrPayment(undefined, amountPaidInput)}
                          >
                            Atualizar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Audit Log Preview for Admin */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4 text-amber-700" />
                        Últimas Alterações que Impactaram o Preço
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                      {activeEvent.auditLogs.slice(0, 8).map((log) => (
                        <div key={log.id} className="p-3 rounded-xl border border-stone-200/80 bg-stone-50 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-800">{log.actorName}</span>
                            {log.delta !== 0 && (
                              <Badge variant={log.delta > 0 ? "amber" : "emerald"}>
                                {log.delta > 0 ? `+${formatBRL(log.delta)}` : formatBRL(log.delta)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-stone-600 leading-relaxed">{log.description}</p>
                          <p className="text-[11px] text-stone-400">
                            Novo Total: {formatBRL(log.newTotal)} • {log.totalGuests} convidados ativos
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ADMIN TAB 2: MULTI-EVENT OVERVIEW */}
            {adminTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((ev) => (
                  <Card
                    key={ev.id}
                    className={cn(
                      "cursor-pointer hover:border-amber-400 transition-all",
                      ev.id === activeEvent.id && "ring-2 ring-amber-600"
                    )}
                    onClick={() => {
                      setSelectedEventId(ev.id)
                      setAdminTab("pricing")
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant={ev.status === "LOCKED" ? "rose" : "emerald"}>{ev.status}</Badge>
                        <span className="text-xs font-medium text-stone-500">{formatDateBR(ev.eventDate)}</span>
                      </div>
                      <CardTitle className="text-xl mt-2">{ev.title}</CardTitle>
                      <CardDescription>
                        {ev.venueName} • Login dos Noivos: <strong>{ev.coupleEmail}</strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                        <div>
                          <p className="text-[11px] text-stone-500">Convidados / Cota</p>
                          <p className="text-base font-bold text-stone-900">
                            {ev.financials.totalActiveGuests} / {ev.rules.includedGuests}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-stone-500">Pacote Base</p>
                          <p className="text-sm font-semibold text-stone-700">
                            {formatBRL(ev.rules.basePackagePrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-stone-500">Total Atualizado</p>
                          <p className="text-base font-bold text-amber-800">
                            {formatBRL(ev.financials.totalContractValue)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone-600">
                        <span>Pago: {formatBRL(ev.amountPaid)}</span>
                        <span className="font-semibold text-rose-700">
                          Falta Receber: {formatBRL(ev.financials.remainingBalance)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ADMIN TAB 3: GUEST CONTROL & CHECK-IN */}
            {adminTab === "guests_control" && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle>Auditoria da Lista de Convidados &amp; Portaria ({activeEvent.title})</CardTitle>
                      <CardDescription>
                        O Admin pode auditar cada pessoa adicionada pelos noivos, realizar check-in na recepção ou
                        ajustar status.
                      </CardDescription>
                    </div>
                    <Badge variant="amber" className="text-sm px-3 py-1">
                      Total Ativos: {fin.totalActiveGuests} pessoas ({fin.adultCount} adultos, {fin.childCount} crianças)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-xs text-stone-500 uppercase">
                          <th className="py-3 px-3">Convidado / Código</th>
                          <th className="py-3 px-3">Categoria</th>
                          <th className="py-3 px-3">Lugares</th>
                          <th className="py-3 px-3">Status RSVP</th>
                          <th className="py-3 px-3">Mesa</th>
                          <th className="py-3 px-3">Check-in Portaria</th>
                          <th className="py-3 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200/70">
                        {activeEvent.guests.map((g) => (
                          <tr key={g.id} className="hover:bg-stone-50/80">
                            <td className="py-3 px-3">
                              <p className="font-semibold text-stone-900">{g.name}</p>
                              <p className="text-xs text-stone-500">
                                Código: <span className="font-mono">{g.inviteCode}</span> • {g.group}
                              </p>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant={g.category === "ADULT" ? "stone" : "purple"}>
                                {g.category === "ADULT" ? "Adulto" : g.category === "CHILD" ? "Criança" : "Bebê"}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 font-semibold">{1 + g.companions} lug.</td>
                            <td className="py-3 px-3">
                              <Badge
                                variant={
                                  g.rsvpStatus === "CONFIRMED"
                                    ? "emerald"
                                    : g.rsvpStatus === "DECLINED"
                                    ? "rose"
                                    : "amber"
                                }
                              >
                                {g.rsvpStatus === "CONFIRMED"
                                  ? "Confirmado"
                                  : g.rsvpStatus === "DECLINED"
                                  ? "Recusado (Não Cobra)"
                                  : "Pendente"}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">Mesa {g.tableNumber || "-"}</td>
                            <td className="py-3 px-3">
                              <Button
                                variant={g.checkedIn ? "emerald" : "outline"}
                                size="sm"
                                onClick={() =>
                                  handleUpdateGuestStatusOrCompanions(g, { checkedIn: !g.checkedIn })
                                }
                              >
                                {g.checkedIn ? "Presente no Evento ✓" : "Marcar Entrada"}
                              </Button>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteGuest(g)}>
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ADMIN TAB 4: CREATE NEW WEDDING CONTRACT */}
            {adminTab === "new_event" && (
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>Cadastrar Novo Casamento &amp; Contrato Financeiro</CardTitle>
                  <CardDescription>
                    Cria o painel exclusivo dos noivos com regras de preço atreladas a cada convidado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateNewEvent} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-stone-700">Nome da Noiva</label>
                        <Input
                          placeholder="Ex: Mariana Costa"
                          value={newEvtBride}
                          onChange={(e) => setNewEvtBride(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700">Nome do Noivo</label>
                        <Input
                          placeholder="Ex: Rafael Silveira"
                          value={newEvtGroom}
                          onChange={(e) => setNewEvtGroom(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700">E-mail de Login dos Noivos</label>
                        <Input
                          type="email"
                          placeholder="mariana.rafael@casamento.com"
                          value={newEvtEmail}
                          onChange={(e) => setNewEvtEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700">Data do Casamento</label>
                        <Input
                          type="date"
                          value={newEvtDate}
                          onChange={(e) => setNewEvtDate(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700">Valor do Pacote Base (R$)</label>
                        <Input
                          type="number"
                          value={newEvtBasePrice}
                          onChange={(e) => setNewEvtBasePrice(Number(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Quantidade de Convidados Inclusos
                        </label>
                        <Input
                          type="number"
                          value={newEvtIncludedGuests}
                          onChange={(e) => setNewEvtIncludedGuests(Number(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Valor por Adulto Excedente (R$)
                        </label>
                        <Input
                          type="number"
                          value={newEvtExtraAdult}
                          onChange={(e) => setNewEvtExtraAdult(Number(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Valor por Criança Excedente (R$)
                        </label>
                        <Input
                          type="number"
                          value={newEvtExtraChild}
                          onChange={(e) => setNewEvtExtraChild(Number(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" variant="gold">
                      Criar Contrato &amp; Liberar Acesso dos Noivos
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* PORTAL 2: PAINEL DOS NOIVOS (CONTROLE DE CONVIDADOS ATRELADO AO PREÇO) */}
        {/* ===================================================================== */}
        {activePortal === "COUPLE" && (
          <div className="space-y-6">
            {/* Couple Hero Card */}
            <div className="rounded-3xl bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white p-6 sm:p-8 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      PAINEL EXCLUSIVO DOS NOIVOS
                    </Badge>
                    <span className="text-xs text-stone-300 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {formatDateBR(activeEvent.eventDate)} às{" "}
                      {activeEvent.eventTime}
                    </span>
                    <span className="text-xs text-stone-300 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {activeEvent.venueName}
                    </span>
                  </div>
                  <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold tracking-tight">
                    {activeEvent.brideName} &amp; {activeEvent.groomName}
                  </h1>
                  <p className="text-sm text-stone-300 max-w-2xl">
                    Gerencie sua lista de convidados, acompanhantes, mesas e gastronomia. O valor do seu contrato é
                    atualizado automaticamente conforme a tabela oficial do espaço.
                  </p>
                </div>

                {/* Live Quota Meter inside Couple Hero */}
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 min-w-[300px] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-stone-300 font-semibold">
                      Ocupação da Cota Contratada
                    </span>
                    <span className="text-sm font-bold text-amber-300">
                      {fin.totalActiveGuests} / {rules.includedGuests} lugares
                    </span>
                  </div>
                  <Progress
                    value={(fin.totalActiveGuests / Math.max(1, rules.includedGuests)) * 100}
                    className="bg-white/20"
                    indicatorClassName={fin.isOverIncluded ? "bg-amber-400" : "bg-emerald-400"}
                  />
                  <div className="flex items-center justify-between text-xs">
                    {fin.isOverIncluded ? (
                      <span className="text-amber-300 font-medium">
                        ⚠️ +{fin.extraAdultsStandard + fin.extraAdultsTier2 + fin.extraChildren} convidados acima do
                        pacote base
                      </span>
                    ) : (
                      <span className="text-emerald-300 font-medium">
                        ✓ Você ainda tem {Math.max(0, rules.includedGuests - fin.totalActiveGuests)} lugares inclusos na
                        cota
                      </span>
                    )}
                    <button
                      onClick={() => handleQuickSwitchPortal("GUEST")}
                      className="text-white underline hover:text-amber-200 font-semibold cursor-pointer"
                    >
                      Ver Link dos Convidados →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Financial Breakdown KPI Cards for the Couple */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5">
                <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase">
                  <span>Pacote Base ({rules.includedGuests} lugares)</span>
                  <Receipt className="h-4 w-4 text-stone-400" />
                </div>
                <p className="text-2xl font-bold text-stone-900 mt-2">{formatBRL(fin.basePackagePrice)}</p>
                <p className="text-xs text-stone-500 mt-1">
                  Inclui {rules.includedTables} mesas ({rules.seatsPerTable} lug./mesa)
                </p>
              </Card>

              <Card className={cn("p-5", fin.extraAdultsCost + fin.extraChildrenCost > 0 && "border-amber-300 bg-amber-50/40")}>
                <div className="flex items-center justify-between text-xs text-amber-800 font-semibold uppercase">
                  <span>Convidados Excedentes</span>
                  <Users className="h-4 w-4 text-amber-700" />
                </div>
                <p className="text-2xl font-bold text-amber-900 mt-2">
                  +{formatBRL(fin.extraAdultsCost + fin.extraChildrenCost + fin.extraTablesCost)}
                </p>
                <p className="text-xs text-stone-600 mt-1">
                  {fin.extraAdultsStandard + fin.extraAdultsTier2} adultos extras • {fin.extraChildren} crianças extras
                  {fin.extraTables > 0 ? ` • +${fin.extraTables} mesa(s)` : ""}
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase">
                  <span>Gastronomia &amp; Extras</span>
                  <Utensils className="h-4 w-4 text-amber-700" />
                </div>
                <p className="text-2xl font-bold text-stone-900 mt-2">
                  +{formatBRL(fin.menuUpgradeCost + fin.selectedExtrasCost)}
                </p>
                <p className="text-xs text-stone-500 mt-1 truncate">
                  {fin.selectedMenuName} ({fin.totalActiveGuests} pessoas)
                </p>
              </Card>

              <Card className="p-5 bg-stone-900 text-white border-stone-900">
                <div className="flex items-center justify-between text-xs text-amber-300 font-semibold uppercase">
                  <span>Total Atual do Contrato</span>
                  <DollarSign className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-white mt-2">{formatBRL(fin.totalContractValue)}</p>
                <p className="text-xs text-stone-300 mt-1">
                  Pago: {formatBRL(fin.amountPaid)} • Saldo: <strong className="text-amber-300">{formatBRL(fin.remainingBalance)}</strong>
                </p>
              </Card>
            </div>

            {/* Couple Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={coupleTab === "guests" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCoupleTab("guests")}
                >
                  <Users className="h-4 w-4" /> Lista de Convidados &amp; Simulador de Custo ({fin.totalActiveGuests})
                </Button>
                <Button
                  variant={coupleTab === "menu_extras" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCoupleTab("menu_extras")}
                >
                  <Utensils className="h-4 w-4" /> Gastronomia, Bar &amp; Extras Atrelados ao Preço
                </Button>
                <Button
                  variant={coupleTab === "tables" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCoupleTab("tables")}
                >
                  <Table className="h-4 w-4" /> Mapa de Mesas ({fin.tablesRequired} mesas)
                </Button>
                <Button
                  variant={coupleTab === "audit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCoupleTab("audit")}
                >
                  <History className="h-4 w-4" /> Extrato Detalhado &amp; Histórico de Reajustes
                </Button>
              </div>
              <Button variant="emerald" size="sm" onClick={() => handleQuickSwitchPortal("GUEST")}>
                <Share2 className="h-4 w-4" /> Testar Portal RSVP dos Convidados (Sem Login)
              </Button>
            </div>

            {/* COUPLE TAB 1: GUEST MANAGEMENT WITH REAL-TIME PRICE PREVIEW */}
            {coupleTab === "guests" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add Guest Form with Live Financial Calculator */}
                <Card className="lg:col-span-1 h-fit border-amber-200/90 shadow-sm">
                  <CardHeader className="bg-amber-50/50 border-b border-amber-100 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="h-4 w-4 text-amber-700" />
                        Adicionar Convidado à Lista
                      </CardTitle>
                      <Badge variant="amber">Cálculo Instantâneo</Badge>
                    </div>
                    <CardDescription>
                      Veja o impacto exato no valor do casamento antes mesmo de salvar o convidado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <form onSubmit={handleTryAddGuest} className="space-y-3.5">
                      <div>
                        <label className="text-xs font-semibold text-stone-700">Nome Completo do Convidado *</label>
                        <Input
                          placeholder="Ex: Tio Marcelo Vasconcelos"
                          value={newGuestName}
                          onChange={(e) => setNewGuestName(e.target.value)}
                          required
                          disabled={activeEvent.status === "LOCKED"}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-stone-700">Faixa Etária / Tarifa</label>
                          <Select
                            value={newGuestCategory}
                            onChange={(e) => setNewGuestCategory(e.target.value as "ADULT" | "CHILD" | "BABY")}
                          >
                            <option value="ADULT">Adulto (Integral)</option>
                            <option value="CHILD">Criança (Meia)</option>
                            <option value="BABY">Bebê 0-4 anos (Isento)</option>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-stone-700">Acompanhantes Extras</label>
                          <Select
                            value={newGuestCompanions}
                            onChange={(e) => setNewGuestCompanions(Number(e.target.value))}
                          >
                            <option value={0}>Sem acompanhante (1 lugar)</option>
                            <option value={1}>+1 acompanhante (2 lugares)</option>
                            <option value={2}>+2 acompanhantes (3 lugares)</option>
                            <option value={3}>+3 acompanhantes (4 lugares)</option>
                            <option value={4}>+4 acompanhantes (5 lugares)</option>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-stone-700">Grupo / Família</label>
                          <Select value={newGuestGroup} onChange={(e) => setNewGuestGroup(e.target.value)}>
                            <option value="Família Noiva">Família da Noiva</option>
                            <option value="Família Noivo">Família do Noivo</option>
                            <option value="Padrinhos">Padrinhos &amp; Madrinhas</option>
                            <option value="Amigos">Amigos</option>
                            <option value="VIP">Convidados VIP</option>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-stone-700">Mesa Designada</label>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={newGuestTable}
                            onChange={(e) => setNewGuestTable(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-stone-700">WhatsApp / Telefone</label>
                          <Input
                            placeholder="(11) 99999-0000"
                            value={newGuestPhone}
                            onChange={(e) => setNewGuestPhone(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-stone-700">Restrição Alimentar</label>
                          <Select value={newGuestDietary} onChange={(e) => setNewGuestDietary(e.target.value)}>
                            <option value="Nenhuma">Nenhuma</option>
                            <option value="Vegetariana">Vegetariana</option>
                            <option value="Vegana">Vegana</option>
                            <option value="Sem Glúten">Sem Glúten (Celíaco)</option>
                            <option value="Sem Lactose">Sem Lactose</option>
                          </Select>
                        </div>
                      </div>

                      {/* LIVE FINANCIAL IMPACT PREVIEW BOX */}
                      <div
                        className={cn(
                          "rounded-xl p-3.5 border space-y-1.5 transition-all",
                          liveGuestAdditionImpact.delta > 0
                            ? "bg-amber-50/90 border-amber-300 text-amber-950"
                            : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                        )}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>Impacto Financeiro desta Adição ({liveGuestAdditionImpact.seats} lug.):</span>
                          <span className="text-sm">
                            {liveGuestAdditionImpact.delta > 0
                              ? `+ ${formatBRL(liveGuestAdditionImpact.delta)}`
                              : "R$ 0,00 (Dentro da Cota)"}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-85 leading-relaxed">
                          {liveGuestAdditionImpact.delta > 0
                            ? `Ultrapassa/soma à cota de ${rules.includedGuests} convidados inclusos + custo proporcional de buffet/serviços por pessoa. Novo contrato irá para ${formatBRL(
                                fin.totalContractValue + liveGuestAdditionImpact.delta
                              )}.`
                            : `Este convidado está coberto pela sua cota base ou é isento.`}
                        </p>
                      </div>

                      <Button
                        type="submit"
                        variant="gold"
                        className="w-full"
                        disabled={activeEvent.status === "LOCKED"}
                      >
                        <Plus className="h-4 w-4" />
                        {liveGuestAdditionImpact.delta > 0
                          ? `Adicionar Convidado (+${formatBRL(liveGuestAdditionImpact.delta)})`
                          : "Adicionar Convidado à Lista"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Guest List Table & Interactive Controls */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle>Seus Convidados ({activeEvent.guests.length} convites • {fin.totalActiveGuests} lugares ativos)</CardTitle>
                        <CardDescription>
                          Convidados que recusam o convite ("Não Irá") liberam automaticamente a vaga e o custo
                          excedente!
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="h-4 w-4 text-stone-400 absolute left-3 top-3" />
                          <Input
                            placeholder="Buscar nome ou código..."
                            value={guestSearch}
                            onChange={(e) => setGuestSearch(e.target.value)}
                            className="pl-9 h-9 text-xs w-48"
                          />
                        </div>
                        <Select
                          value={guestFilterStatus}
                          onChange={(e) => setGuestFilterStatus(e.target.value)}
                          className="h-9 text-xs w-36"
                        >
                          <option value="ALL">Todos ({activeEvent.guests.length})</option>
                          <option value="CONFIRMED">Confirmados</option>
                          <option value="PENDING">Pendentes</option>
                          <option value="DECLINED">Não Irão</option>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filteredGuests.map((guest) => {
                      const totalSeats = 1 + guest.companions
                      return (
                        <div
                          key={guest.id}
                          className={cn(
                            "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                            guest.rsvpStatus === "DECLINED"
                              ? "bg-stone-50 border-stone-200 opacity-65"
                              : "bg-white border-stone-200/90 hover:border-amber-300"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm text-stone-900">{guest.name}</span>
                              <Badge variant={guest.category === "ADULT" ? "stone" : "purple"}>
                                {guest.category === "ADULT"
                                  ? "Adulto"
                                  : guest.category === "CHILD"
                                  ? "Criança"
                                  : "Bebê"}
                              </Badge>
                              <Badge variant="amber">{totalSeats} lugar(es)</Badge>
                              <span className="text-xs text-stone-500">Mesa {guest.tableNumber || 1}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                              <span>Grupo: {guest.group}</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(guest.inviteCode)
                                  setCopiedInvite(guest.id)
                                  setTimeout(() => setCopiedInvite(null), 2000)
                                }}
                                className="inline-flex items-center gap-1 font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 cursor-pointer"
                                title="Copiar código para enviar ao convidado"
                              >
                                Código RSVP: <strong>{guest.inviteCode}</strong>
                                {copiedInvite === guest.id ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                              {guest.dietaryRestriction && guest.dietaryRestriction !== "Nenhuma" && (
                                <Badge variant="rose">Restrição: {guest.dietaryRestriction}</Badge>
                              )}
                            </div>
                          </div>

                          {/* Interactive controls for the couple: change companions, RSVP status, or remove (all recalculate price immediately!) */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={guest.companions}
                              onChange={(e) =>
                                handleUpdateGuestStatusOrCompanions(guest, {
                                  companions: Number(e.target.value),
                                })
                              }
                              className="h-8 text-xs w-28"
                              title="Alterar acompanhantes recalcula o contrato automaticamente"
                            >
                              <option value={0}>Individual (1)</option>
                              <option value={1}>+1 Acomp. (2)</option>
                              <option value={2}>+2 Acomp. (3)</option>
                              <option value={3}>+3 Acomp. (4)</option>
                            </Select>

                            <Select
                              value={guest.rsvpStatus}
                              onChange={(e) =>
                                handleUpdateGuestStatusOrCompanions(guest, {
                                  rsvpStatus: e.target.value as Guest["rsvpStatus"],
                                })
                              }
                              className={cn(
                                "h-8 text-xs w-36 font-semibold",
                                guest.rsvpStatus === "CONFIRMED" && "text-emerald-800 bg-emerald-50 border-emerald-200",
                                guest.rsvpStatus === "PENDING" && "text-amber-800 bg-amber-50 border-amber-200",
                                guest.rsvpStatus === "DECLINED" && "text-rose-800 bg-rose-50 border-rose-200"
                              )}
                            >
                              <option value="CONFIRMED">✓ Confirmado</option>
                              <option value="PENDING">⏳ Pendente</option>
                              <option value="DECLINED">✕ Não Irá (Isenta)</option>
                            </Select>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGuest(guest)}
                              title="Remover convidado e abater custo excedente"
                            >
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* COUPLE TAB 2: GASTRONOMY & EXTRA SERVICES (DYNAMICALLY MULTIPLIED BY GUEST COUNT) */}
            {coupleTab === "menu_extras" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-amber-700" />
                      Escolha do Padrão Gastronômico ({fin.totalActiveGuests} convidados ativos)
                    </CardTitle>
                    <CardDescription>
                      O valor de upgrade de cada menu é multiplicado automaticamente pelo número de adultos (
                      {fin.adultCount}) e crianças ({fin.childCount}) na sua lista.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5">
                    {rules.availableMenus.map((menu) => {
                      const isSelected = activeEvent.selectedMenuId === menu.id
                      const totalForCurrentGuests =
                        fin.adultCount * menu.pricePerAdult + fin.childCount * menu.pricePerChild
                      return (
                        <div
                          key={menu.id}
                          onClick={() => handleToggleMenuOrExtra(menu.id, activeEvent.selectedExtraIds)}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                            isSelected
                              ? "border-amber-600 bg-amber-50/50 shadow-xs"
                              : "border-stone-200 hover:border-stone-300 bg-white"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-stone-900">{menu.name}</span>
                                {isSelected && <Badge variant="amber">Selecionado</Badge>}
                              </div>
                              <p className="text-xs text-stone-600 mt-1 leading-relaxed">{menu.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-amber-900">
                                {totalForCurrentGuests === 0
                                  ? "Incluso no Base"
                                  : `+ ${formatBRL(totalForCurrentGuests)}`}
                              </p>
                              <p className="text-[11px] text-stone-500">{menu.highlight}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-700" />
                      Serviços Extras &amp; Experiências do Espaço
                    </CardTitle>
                    <CardDescription>
                      Itens marcados como <strong>Por Convidado</strong> aumentam automaticamente quando você convida
                      mais pessoas!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {rules.availableExtras.map((item) => {
                      const isChecked = activeEvent.selectedExtraIds.includes(item.id)
                      const billablePeople = fin.adultCount + fin.childCount
                      const calculatedCost =
                        item.pricingType === "PER_GUEST" ? item.unitPrice * billablePeople : item.unitPrice

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            const nextIds = isChecked
                              ? activeEvent.selectedExtraIds.filter((id) => id !== item.id)
                              : [...activeEvent.selectedExtraIds, item.id]
                            handleToggleMenuOrExtra(activeEvent.selectedMenuId, nextIds)
                          }}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4",
                            isChecked
                              ? "border-amber-600 bg-amber-50/40"
                              : "border-stone-200 hover:border-stone-300 bg-white"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="h-4 w-4 accent-amber-700 rounded"
                              />
                              <span className="font-semibold text-sm text-stone-900">{item.name}</span>
                              <Badge variant={item.pricingType === "PER_GUEST" ? "amber" : "stone"}>
                                {item.pricingType === "PER_GUEST"
                                  ? `${formatBRL(item.unitPrice)} / convidado`
                                  : "Taxa Fixa"}
                              </Badge>
                            </div>
                            <p className="text-xs text-stone-500 pl-6">{item.description}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-stone-900">+{formatBRL(calculatedCost)}</p>
                            {item.pricingType === "PER_GUEST" && (
                              <p className="text-[11px] text-stone-500">p/ {billablePeople} convidados</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* COUPLE TAB 3: TABLE SEATING & EXTRA TABLE COST */}
            {coupleTab === "tables" && (
              <div className="space-y-4">
                <Card className="p-5 bg-amber-50/60 border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-stone-900">
                      Cálculo Automático de Mesas &amp; Assentos ({rules.seatsPerTable} lugares por mesa)
                    </h3>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Seu contrato inclui <strong>{rules.includedTables} mesas</strong> sem custo extra. Com{" "}
                      <strong>{fin.totalActiveGuests} convidados ativos</strong>, são necessárias{" "}
                      <strong>{fin.tablesRequired} mesas</strong>.
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={fin.extraTables > 0 ? "amber" : "emerald"} className="text-sm px-3 py-1">
                      {fin.extraTables > 0
                        ? `${fin.extraTables} Mesa(s) Extra(s) = +${formatBRL(fin.extraTablesCost)}`
                        : "Nenhuma mesa extra necessária (R$ 0,00)"}
                    </Badge>
                  </div>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: Math.max(fin.tablesRequired, rules.includedTables) }, (_, i) => i + 1).map(
                    (tableNum) => {
                      const guestsAtTable = activeEvent.guests.filter(
                        (g) => g.tableNumber === tableNum && g.rsvpStatus !== "DECLINED"
                      )
                      const seatsUsed = guestsAtTable.reduce((acc, g) => acc + 1 + g.companions, 0)
                      const isExtraTable = tableNum > rules.includedTables

                      return (
                        <Card
                          key={tableNum}
                          className={cn("p-4", isExtraTable && "border-amber-300 bg-amber-50/20")}
                        >
                          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">Mesa #{tableNum}</span>
                              {isExtraTable && (
                                <Badge variant="amber">Mesa Extra (+{formatBRL(rules.extraTableCost)})</Badge>
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                seatsUsed > rules.seatsPerTable ? "text-rose-600" : "text-stone-600"
                              )}
                            >
                              {seatsUsed} / {rules.seatsPerTable} lugares
                            </span>
                          </div>
                          {guestsAtTable.length === 0 ? (
                            <p className="text-xs text-stone-400 italic py-4 text-center">Mesa livre</p>
                          ) : (
                            <ul className="space-y-1.5 text-xs">
                              {guestsAtTable.map((g) => (
                                <li key={g.id} className="flex items-center justify-between text-stone-700">
                                  <span className="truncate">{g.name}</span>
                                  <Badge variant="stone">{1 + g.companions} lug.</Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </Card>
                      )
                    }
                  )}
                </div>
              </div>
            )}

            {/* COUPLE TAB 4: FULL FINANCIAL STATEMENT & AUDIT LOG */}
            {coupleTab === "audit" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Demonstrativo Contratual Transparente</CardTitle>
                    <CardDescription>
                      Cada item abaixo é calculado em tempo real pelo motor financeiro em Go.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-stone-100">
                      <span>Pacote Base ({rules.includedGuests} convidados inclusos)</span>
                      <span className="font-semibold">{formatBRL(fin.basePackagePrice)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-100">
                      <span>
                        Adultos Excedentes Faixa 1 ({fin.extraAdultsStandard} x {formatBRL(rules.extraAdultPrice)})
                      </span>
                      <span className="font-semibold text-amber-800">
                        +{formatBRL(fin.extraAdultsStandard * rules.extraAdultPrice)}
                      </span>
                    </div>
                    {fin.extraAdultsTier2 > 0 && (
                      <div className="flex justify-between py-2 border-b border-stone-100">
                        <span>
                          Adultos Excedentes Faixa 2 ({fin.extraAdultsTier2} x {formatBRL(rules.tier2AdultPrice)})
                        </span>
                        <span className="font-semibold text-amber-800">
                          +{formatBRL(fin.extraAdultsTier2 * rules.tier2AdultPrice)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-stone-100">
                      <span>
                        Crianças Excedentes ({fin.extraChildren} x {formatBRL(rules.extraChildPrice)})
                      </span>
                      <span className="font-semibold text-amber-800">+{formatBRL(fin.extraChildrenCost)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-100">
                      <span>Upgrade Gastronômico ({fin.selectedMenuName})</span>
                      <span className="font-semibold text-amber-800">+{formatBRL(fin.menuUpgradeCost)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-100">
                      <span>
                        Mesas Adicionais ({fin.extraTables} x {formatBRL(rules.extraTableCost)})
                      </span>
                      <span className="font-semibold text-amber-800">+{formatBRL(fin.extraTablesCost)}</span>
                    </div>
                    {fin.selectedExtrasDetails.map((item) => (
                      <div key={item.id} className="flex justify-between py-2 border-b border-stone-100">
                        <span>
                          {item.name}{" "}
                          {item.pricingType === "PER_GUEST" ? `(${item.quantity} conv. x ${formatBRL(item.unitPrice)})` : "(Fixo)"}
                        </span>
                        <span className="font-semibold text-amber-800">+{formatBRL(item.totalCost)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 text-lg font-bold text-stone-900">
                      <span>Total Consolidado do Casamento</span>
                      <span>{formatBRL(fin.totalContractValue)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Linha do Tempo de Alterações &amp; Preços</CardTitle>
                    <CardDescription>
                      Registro imutável de todas as mudanças feitas pelos noivos ou pelo administrador.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[460px] overflow-y-auto">
                    {activeEvent.auditLogs.map((log) => (
                      <div key={log.id} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-800">{log.actorName}</span>
                          <Badge variant={log.delta > 0 ? "amber" : log.delta < 0 ? "emerald" : "stone"}>
                            {log.delta > 0
                              ? `+ ${formatBRL(log.delta)}`
                              : log.delta < 0
                              ? formatBRL(log.delta)
                              : "Sem alteração de valor"}
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-600">{log.description}</p>
                        <div className="flex justify-between text-[11px] text-stone-400 pt-1">
                          <span>Antes: {formatBRL(log.previousTotal)}</span>
                          <span>Depois: {formatBRL(log.newTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* PORTAL 3: CONVIDADOS (SEM LOGIN!) - RSVP PÚBLICO POR NOME OU CÓDIGO   */}
        {/* ===================================================================== */}
        {activePortal === "GUEST" && (
          <div className="max-w-2xl mx-auto space-y-6 py-4">
            <Card className="overflow-hidden border-stone-200 shadow-xl">
              <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 text-white p-8 text-center space-y-3">
                <Badge className="bg-white/15 text-amber-200 border-0">
                  PORTAL DO CONVIDADO • ACESSO LIVRE SEM LOGIN
                </Badge>
                <h1 className="font-serif-editorial text-4xl sm:text-5xl font-bold">
                  {activeEvent.brideName} &amp; {activeEvent.groomName}
                </h1>
                <p className="text-sm text-stone-200 max-w-md mx-auto">{activeEvent.welcomeMessage}</p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-amber-200">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {formatDateBR(activeEvent.eventDate)} às{" "}
                    {activeEvent.eventTime}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {activeEvent.venueName}
                  </span>
                </div>
              </div>

              <CardContent className="p-6 sm:p-8 space-y-6">
                {rsvpSuccessMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{rsvpSuccessMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-800">
                    Localize seu Convite (Digite seu Nome ou Código do Convite)
                  </label>
                  <p className="text-xs text-stone-500">
                    Você não precisa criar conta nem senha. Basta buscar pelo seu nome na lista oficial dos noivos
                    (exemplo: digite <strong>Helena</strong>, <strong>Beatriz</strong>, <strong>Lucas</strong> ou o
                    código <strong>HELE-A101</strong>).
                  </p>
                  <div className="relative">
                    <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-3" />
                    <Input
                      placeholder="Ex: Helena, Beatriz, Lucas ou código HELE-A101..."
                      value={rsvpQuery}
                      onChange={(e) => {
                        setRsvpQuery(e.target.value)
                        setRsvpSelectedGuest(null)
                      }}
                      className="pl-10 h-11 text-sm"
                    />
                  </div>
                </div>

                {/* Quick sample chips so user can test with 1 click */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-stone-400">Testar convite rápido:</span>
                  {activeEvent.guests.slice(0, 4).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setRsvpQuery(g.inviteCode)
                        setRsvpSelectedGuest(g)
                        setRsvpDietary(g.dietaryRestriction)
                      }}
                      className="text-xs px-2.5 py-1 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-700 font-medium transition-colors cursor-pointer"
                    >
                      {g.name.split(" ")[0]} ({g.inviteCode})
                    </button>
                  ))}
                </div>

                {/* Matching guests list */}
                {rsvpQuery.trim() !== "" && !rsvpSelectedGuest && (
                  <div className="space-y-2">
                    {rsvpMatchingGuests.length === 0 ? (
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 text-center">
                        Nenhum convite encontrado com "{rsvpQuery}". Nota: Apenas os noivos podem adicionar novos nomes
                        à lista oficial.
                      </div>
                    ) : (
                      rsvpMatchingGuests.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => {
                            setRsvpSelectedGuest(g)
                            setRsvpDietary(g.dietaryRestriction)
                            setRsvpNotes(g.notes)
                          }}
                          className="p-4 rounded-xl border border-stone-200 hover:border-amber-500 bg-stone-50/60 hover:bg-amber-50/30 cursor-pointer flex items-center justify-between transition-all"
                        >
                          <div>
                            <p className="font-semibold text-sm text-stone-900">{g.name}</p>
                            <p className="text-xs text-stone-500">
                              Convite válido para <strong>{1 + g.companions} pessoa(s)</strong> • Mesa{" "}
                              {g.tableNumber || "A definir"}
                            </p>
                          </div>
                          <Button variant="gold" size="sm">
                            Selecionar Convite
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Guest Confirmation Card */}
                {rsvpSelectedGuest && (
                  <div className="p-5 rounded-2xl border-2 border-amber-500/80 bg-amber-50/30 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="amber">Convite Oficial Localizado</Badge>
                        <h3 className="text-lg font-bold text-stone-900 mt-1">{rsvpSelectedGuest.name}</h3>
                        <p className="text-xs text-stone-600">
                          Código: <strong>{rsvpSelectedGuest.inviteCode}</strong> • Lugares reservados pelos noivos:{" "}
                          <strong>{1 + rsvpSelectedGuest.companions} lugar(es)</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => setRsvpSelectedGuest(null)}
                        className="text-xs text-stone-400 hover:text-stone-700"
                      >
                        Trocar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-stone-700">
                          Possui alguma restrição alimentar?
                        </label>
                        <Select value={rsvpDietary} onChange={(e) => setRsvpDietary(e.target.value)}>
                          <option value="Nenhuma">Nenhuma restrição</option>
                          <option value="Vegetariana">Vegetariana</option>
                          <option value="Vegana">Vegana</option>
                          <option value="Sem Glúten">Sem Glúten (Celíaco)</option>
                          <option value="Sem Lactose">Sem Lactose</option>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-700">Recado para os Noivos (Opcional)</label>
                        <Input
                          placeholder="Parabéns ao casal!"
                          value={rsvpNotes}
                          onChange={(e) => setRsvpNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        variant="emerald"
                        className="flex-1"
                        onClick={() => handlePublicRsvpSubmit("CONFIRMED")}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Confirmar Minha Presença
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => handlePublicRsvpSubmit("DECLINED")}
                      >
                        <XCircle className="h-4 w-4" /> Não Poderei Comparecer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
export default App
