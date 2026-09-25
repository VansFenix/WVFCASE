"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, AudioLines, Box, Boxes, Check, ChevronDown, ChevronRight, CircleHelp, Crown, FileSignature, Flame, Gift, Globe2, Headphones, Heart, LayoutGrid, LogIn, Menu, Package, Play, Search, ShieldCheck, SlidersHorizontal, Sparkles, Ticket, TrendingUp, Trophy, Volume2, VolumeX, Wallet, X, Zap } from "lucide-react";
import { cases, caseMap, customCases, featuredSkins, formatCoins, skinMap, type Case, type Skin } from "@/lib/catalog";
import type { GameResponse, GameState } from "@/lib/types";
import { CaseCard, Coin, Logo, Modal, SkinImage } from "@/components/ui";
import { AuthDialog, BonusDialog, InfoDialog, ProfileDialog } from "@/components/dialogs";
import { CaseOpening, ContractsView, InventoryView, UpgradeView, type View } from "@/components/game-views";

type Dialog = "auth" | "bonus" | "profile" | "how" | "fair" | "rules" | null;
type FeedDrop = { id: string; itemId: string; name: string };
const demoOrder = [19, 4, 3, 13, 20, 16, 6, 0, 2, 21, 7, 22];
const tabs = [{ id: "all", name: "Все кейсы", icon: LayoutGrid }, { id: "free", name: "Бесплатные", icon: Gift }, { id: "original", name: "Авторские", icon: Sparkles }, { id: "premium", name: "Премиум", icon: Crown }, { id: "cs2", name: "Кейсы CS2", icon: Box }, { id: "favorites", name: "Избранное", icon: Heart }];

export default function WVFApp() {
  const [state, setState] = useState<GameState | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [view, setView] = useState<View>("cases");
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [spotlight, setSpotlight] = useState<Skin | null>(null);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("popular");
  const [affordable, setAffordable] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [limit, setLimit] = useState(10);
  const [sound, setSound] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [feed, setFeed] = useState<FeedDrop[]>([]);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const acting = useRef(false);

  const notify = useCallback((message: string, error = false) => { setToast({ message, error }); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 4500); }, []);
  const refresh = useCallback(async () => {
    try { const response = await fetch("/api/game", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setState(data); setConnectionError(false); }
    catch { setConnectionError(true); }
  }, []);
  const refreshFeed = useCallback(async () => { try { const response = await fetch("/api/feed"); const data = await response.json(); if (Array.isArray(data.drops)) setFeed(data.drops); } catch { /* Decorative feed remains available offline. */ } }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void refresh(); void refreshFeed();
      try { const saved = JSON.parse(localStorage.getItem("wvf-favorites") || "[]"); if (Array.isArray(saved)) setFavorites(saved.filter((id): id is string => typeof id === "string" && !!caseMap[id])); setSound(localStorage.getItem("wvf-sound") === "true"); } catch { /* Ignore invalid browser preferences. */ }
    }
    const readLocation = () => { const params = new URLSearchParams(window.location.search); const caseId = params.get("case"); const nextView = params.get("view"); setActiveCase(caseId && caseMap[caseId] ? caseMap[caseId] : null); setView(nextView && ["inventory", "upgrade", "contracts"].includes(nextView) ? nextView as View : "cases"); };
    readLocation(); window.addEventListener("popstate", readLocation);
    const interval = setInterval(() => { void refreshFeed(); }, 25000);
    return () => { window.removeEventListener("popstate", readLocation); clearInterval(interval); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [refresh, refreshFeed]);

  const navigate = (next: View) => { setView(next); setActiveCase(null); setMobileMenu(false); window.history.pushState({}, "", next === "cases" ? "/" : `/?view=${next}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openCase = (item: Case) => { setActiveCase(item); setView("cases"); setSpotlight(null); setDialog(null); window.history.pushState({}, "", `/?case=${item.id}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openAuth = (mode: "login" | "register" = "login") => { setAuthMode(mode); setDialog("auth"); };
  const toggleFavorite = (id: string) => { setFavorites((current) => { const next = current.includes(id) ? current.filter((f) => f !== id) : [...current, id]; localStorage.setItem("wvf-favorites", JSON.stringify(next)); return next; }); };
  const toggleSound = () => { setSound((current) => { localStorage.setItem("wvf-sound", String(!current)); return !current; }); };

  const act = async (input: Record<string, unknown>): Promise<GameResponse | null> => {
    if (acting.current) return null;
    if (!state) { notify("Подключаемся к серверу. Попробуй через секунду.", true); return null; }
    acting.current = true;
    try {
      const response = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось выполнить действие.");
      setState(data);
      if (data.message && !["upgrade", "contract"].includes(String(input.action))) notify(data.message);
      if (input.action === "open") void refreshFeed();
      return data;
    } catch (error) { notify(error instanceof Error ? error.message : "Проверь интернет-соединение.", true); return null; }
    finally { acting.current = false; }
  };

  const logout = async () => {
    try { const response = await fetch("/api/auth", { method: "DELETE" }); if (!response.ok) throw new Error(); setDialog(null); setState(null); await refresh(); notify("Ты вышел из аккаунта. Твой прогресс сохранён."); }
    catch { notify("Не удалось выйти. Попробуй ещё раз.", true); }
  };

  const filteredCases = useMemo(() => cases.filter((c) => (category === "all" || category === "favorites" && favorites.includes(c.id) || c.category === category) && `${c.name} ${c.subtitle}`.toLowerCase().includes(query.toLowerCase()) && (!affordable || c.cost <= (state?.user.coins || 0))).sort((a, b) => sort === "cheap" ? a.cost - b.cost : sort === "expensive" ? b.cost - a.cost : sort === "new" ? Number(b.tag === "НОВИНКА") - Number(a.tag === "НОВИНКА") : 0), [category, favorites, query, affordable, state?.user.coins, sort]);
  const shownFeed = [...feed.filter((drop) => !!skinMap[drop.itemId]), ...demoOrder.map((index) => ({ id: `demo-${index}`, itemId: featuredSkins[index].id, name: "Демо-дроп" }))].slice(0, 12);
  const isHome = view === "cases" && !activeCase;
  const navLinks: { view: View; name: string; icon: typeof Box }[] = [{ view: "cases", name: "Кейсы", icon: Boxes }, { view: "upgrade", name: "Апгрейд", icon: TrendingUp }, { view: "contracts", name: "Контракты", icon: FileSignature }];

  return <div className="app-shell">
    <header className="site-header"><button className="brand-button" onClick={() => navigate("cases")} aria-label="WVFCASE — главная"><Logo/></button><span className="header-divider"/><nav className={`main-nav ${mobileMenu ? "menu-open" : ""}`} aria-label="Основная навигация">{navLinks.map((link) => <button key={link.view} className={view === link.view ? "active" : ""} onClick={() => navigate(link.view)}><link.icon size={18}/>{link.name}{view === link.view && <span className="nav-active-dot"/>}</button>)}<button className="nav-bonus" onClick={() => { setDialog("bonus"); setMobileMenu(false); }}><Gift size={18}/> Бонусы <span className="new-badge">NEW</span></button></nav><div className="header-actions"><span className="language"><Globe2 size={14}/> RU</span><button className="sound-button icon-button" onClick={toggleSound} aria-label={sound ? "Выключить звук" : "Включить звук"} title={sound ? "Звук включён" : "Звук выключен"}>{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button><span className="header-divider"/><button className="wallet-button" onClick={() => setDialog("bonus")} aria-label="Баланс и бесплатные монеты"><div><small>ТВОЙ БАЛАНС</small><Coin value={state?.user.coins ?? 5000}/></div><span className="wallet-plus">+</span></button>{state && !state.user.guest ? <button className="account-button" onClick={() => setDialog("profile")} title={state.user.name}><span>{state.user.name[0]}</span><ChevronDown size={13}/></button> : <button className="login-button" onClick={() => openAuth()}><LogIn size={16}/><span>Войти</span></button>}<button className="mobile-menu-toggle icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Открыть меню">{mobileMenu ? <X size={22}/> : <Menu size={22}/>}</button></div></header>

    <aside className="side-rail" aria-label="Быстрый доступ"><div className="rail-top"><span className="rail-label">PLAY</span><button className={view === "cases" ? "active" : ""} onClick={() => navigate("cases")} title="Все кейсы" aria-label="Все кейсы"><Boxes size={23}/></button><button className={view === "upgrade" ? "active" : ""} onClick={() => navigate("upgrade")} title="Апгрейд" aria-label="Апгрейд"><TrendingUp size={23}/></button><button className={view === "contracts" ? "active" : ""} onClick={() => navigate("contracts")} title="Контракты" aria-label="Контракты"><FileSignature size={22}/></button><span className="rail-separator"/><button className="rail-gift" onClick={() => setDialog("bonus")} title="Бесплатные бонусы" aria-label="Бесплатные бонусы"><Gift size={24}/><span className="notification-dot"/></button><button className={view === "inventory" ? "active" : ""} onClick={() => navigate("inventory")} title="Мой инвентарь" aria-label="Мой инвентарь"><Package size={23}/>{!!state?.inventory.length && <span className="rail-counter">{state.inventory.length > 99 ? "99+" : state.inventory.length}</span>}</button><button onClick={() => { navigate("cases"); setCategory("favorites"); setLimit(10); setTimeout(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }), 50); }} title="Избранные кейсы" aria-label="Избранные кейсы"><Heart size={22}/></button></div><div className="rail-bottom"><span className="rail-free">100% FREE TO PLAY</span><button onClick={() => setDialog("how")} title="Помощь" aria-label="Помощь"><Headphones size={22}/></button><span className="rail-status"><i/> ONLINE</span></div></aside>

    <div className="site-body"><section className="live-feed" aria-label="Лента открытий"><div className="live-label"><span><i/> LIVE ДРОПЫ</span><small>{feed.length ? "ПОСЛЕДНИЕ ОТКРЫТИЯ" : "ДЕМО-ЛЕНТА СКИНОВ"}</small><div className="live-bars"><span/><span/><span/><span/><span/><span/><span/><span/></div></div><div className="live-track">{shownFeed.map((drop) => { const skin = skinMap[drop.itemId]; return <button className="live-drop" style={{ "--rarity": skin.color } as CSSProperties} key={drop.id} onClick={() => setSpotlight(skin)} title={`${skin.weapon} | ${skin.name} · ${drop.name}`}><span className="live-rarity"/><SkinImage skin={skin} eager/><div><small>{skin.weapon}</small><strong>{skin.name}</strong></div>{skin.rarity === "gold" && <Sparkles className="live-rare-icon" size={12}/>}</button>; })}</div></section>

    <main className={`main-content ${!isHome ? "inner-page" : ""}`}>
      {connectionError && <div className="connection-banner" role="alert"><CircleHelp size={17}/> Не удалось загрузить твой прогресс. <button onClick={() => { void refresh(); }}>Повторить подключение <ArrowRight size={14}/></button></div>}
      {isHome && <>
        <section className="hero"><div className="hero-art"><img src={customCases[0]?.image || "https://community.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frncVtqv7MPE8JaHHCj_Dl-wk4-NtFirikURy4jiGwo2udHqVaAEjDZp3EflK7EeSMnMs4w/360fx270f"} alt="Открытый кейс WVFCASE с редкими скинами" fetchPriority="high"/></div><div className="hero-content"><span className="hero-eyebrow"><span/> ТВОЯ УДАЧА. БЕЗ ЛИШНИХ УСЛОВИЙ.</span><h1>ТВОЙ КЕЙС.<br/><span>ТВОИ ПРАВИЛА.</span></h1><p>Открывай кейсы. Собирай скины. Лови эмоции.<br/>Абсолютно бесплатно — без депозитов и риска.</p><div className="hero-buttons"><button className="primary-button" onClick={() => openCase(customCases[0])}><Gift size={17}/> Открыть бесплатно <ArrowUpRight size={18}/></button><button className="hero-how" onClick={() => setDialog("how")}><span><Play size={12} fill="currentColor"/></span> Как это работает</button></div></div><div className="hero-free-badge"><span className="free-badge-star"><Sparkles size={16}/></span><div><strong>100% FREE</strong><span>ТОЛЬКО ЭМОЦИИ</span></div></div><div className="hero-pagination"><span className="active"/><span/><span/></div><div className="hero-bottom-label"><ShieldCheck size={13}/> Никаких платежей. Никогда.</div></section>
        <section className="perks-row" aria-label="Бесплатные возможности"><button className="perk-card daily-perk" onClick={() => setDialog("bonus")}><span className="perk-icon"><Gift size={24}/></span><div><strong>Ежедневный бонус <span className="tiny-dot"/></strong><p>Твои <b>2 500 G</b> уже ждут тебя</p></div><ChevronRight size={18}/></button><button className="perk-card promo-perk" onClick={() => setDialog("bonus")}><span className="perk-icon"><Ticket size={23}/></span><div><strong>Буст для яркого старта</strong><p>+1 500 G по промокоду</p></div><span className="promo-code">WVFSTART <ArrowUpRight size={12}/></span></button><button className="perk-card trust-perk" onClick={() => setDialog("fair")}><span className="perk-icon"><ShieldCheck size={25}/></span><div><strong>Настоящие эмоции. Не деньги.</strong><p>Честная игра без вложений</p></div><span className="trust-free">FREE<br/><span>FOREVER</span></span></button></section>

        <section className="catalog-section" id="catalog"><div className="section-heading catalog-heading"><div className="catalog-title"><span className="section-symbol"><Boxes size={24}/></span><h2>Наши кейсы</h2><span className="count-badge">{cases.length}</span></div><div className="catalog-tools"><label className="search-field"><Search size={16}/><input placeholder="Найти свой кейс..." value={query} onChange={(e) => { setQuery(e.target.value); setLimit(10); }} aria-label="Найти свой кейс"/>{query && <button className="icon-button" onClick={() => setQuery("")} aria-label="Очистить поиск"><X size={13}/></button>}</label><div className="sort-wrap"><SlidersHorizontal size={14}/><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировка кейсов"><option value="popular">По популярности</option><option value="cheap">Сначала дешёвые</option><option value="expensive">Сначала дорогие</option><option value="new">Сначала новинки</option></select><ChevronDown size={12}/></div></div></div>
          <div className="catalog-filters"><div className="category-tabs">{tabs.map((tab) => <button key={tab.id} className={`${category === tab.id ? "active" : ""} ${tab.id === "free" ? "free-category" : ""}`} onClick={() => { setCategory(tab.id); setLimit(10); }}><tab.icon size={14}/>{tab.name}{tab.id === "favorites" && favorites.length > 0 && <span>{favorites.length}</span>}</button>)}</div><label className="affordable-filter"><input type="checkbox" checked={affordable} onChange={(e) => setAffordable(e.target.checked)}/><span className="checkbox-box"><Check size={10}/></span>Доступны мне</label></div>
          {filteredCases.length > 0 ? <div className="case-grid">{filteredCases.slice(0, limit).map((item) => <CaseCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onOpen={() => openCase(item)}/>)}</div> : <div className="empty-state"><Search size={37}/><h2>{category === "favorites" && !query ? "Любимые кейсы всегда рядом" : "Такого кейса пока нет"}</h2><p>{category === "favorites" && !query ? "Нажми на сердечко у кейса, чтобы добавить его сюда." : "Попробуй другое название или измени фильтры."}</p><button className="secondary-button" onClick={() => { setCategory("all"); setQuery(""); setAffordable(false); }}>Показать все кейсы <ArrowRight size={15}/></button></div>}
          {filteredCases.length > limit && <button className="load-more secondary-button" onClick={() => setLimit((current) => current + 15)}>Показать ещё кейсы <span>{filteredCases.length - limit}</span><ChevronDown size={16}/></button>}
          <div className="catalog-footnote"><ShieldCheck size={13}/><span>Никаких реальных ставок. Все предметы и монеты существуют только внутри WVFCASE.</span><button onClick={() => setDialog("rules")}>Подробнее <ArrowUpRight size={12}/></button></div>
        </section>
        <section className="community-banner"><div className="community-mark"><Zap size={38}/></div><div><span className="eyebrow">МЫ ЗДЕСЬ РАДИ ОДНОГО</span><h2>Того самого <span>дропа.</span></h2><p>Собирай свою коллекцию, пробуй новое и получай удовольствие от игры.</p></div><button className="secondary-button" onClick={() => state?.user.guest ? openAuth("register") : navigate("inventory")}>{state?.user.guest ? "Сохранить свою историю" : "Моя коллекция"}<ArrowUpRight size={17}/></button></section>
      </>}
      {view === "cases" && activeCase && <CaseOpening key={activeCase.id} item={activeCase} state={state} act={act} navigate={navigate} onBack={() => navigate("cases")} onBonus={() => setDialog("bonus")} sound={sound}/>}
      {view === "inventory" && <InventoryView state={state} act={act} navigate={navigate} onLogin={() => openAuth("register")}/>}
      {view === "upgrade" && <UpgradeView state={state} act={act} navigate={navigate}/>}
      {view === "contracts" && <ContractsView state={state} act={act} navigate={navigate}/>}
    </main>

    <footer className="site-footer"><div className="footer-top"><button className="brand-button" onClick={() => navigate("cases")}><Logo small/></button><div className="footer-links"><button onClick={() => setDialog("how")}>Как это работает</button><button onClick={() => setDialog("fair")}>Честная игра</button><button onClick={() => setDialog("rules")}>Правила проекта</button></div><span className="footer-free"><ShieldCheck size={17}/> FREE TO PLAY. FOREVER.</span></div><div className="footer-bottom"><p>© 2026 WVFCASE. Бесплатный симулятор открытия кейсов.<br/>Не связан с Valve Corporation. Предметы не имеют денежной ценности и недоступны для вывода.</p><span>MADE FOR THE DROP <span className="orange-text">✳</span></span></div></footer>
    </div>

    {dialog === "auth" && <AuthDialog initialMode={authMode} onClose={() => setDialog(null)} onSuccess={(data) => { setState(data); notify(`Рады видеть тебя, ${data.user.name}!`); }}/>} 
    {dialog === "bonus" && <BonusDialog state={state} act={act} onClose={() => setDialog(null)}/>}
    {dialog === "profile" && state && <ProfileDialog state={state} onClose={() => setDialog(null)} onLogout={logout} onInventory={() => navigate("inventory")}/>}
    {(dialog === "how" || dialog === "fair" || dialog === "rules") && <InfoDialog kind={dialog} onClose={() => setDialog(null)} onStart={() => openCase(customCases[0])}/>}
    {spotlight && <Modal title={`${spotlight.weapon} | ${spotlight.name}`} onClose={() => setSpotlight(null)} className="spotlight-modal"><div className="spotlight-art" style={{ "--rarity": spotlight.color } as CSSProperties}><SkinImage skin={spotlight} eager/></div><Coin value={spotlight.value}/><p className="modal-subtitle">Виртуальный предмет для твоей коллекции WVFCASE.</p><button className="primary-button" onClick={() => { const related = cases.find((c) => c.itemIds.includes(spotlight.id)); if (related) openCase(related); }}>{"Найти в кейсе"}<ArrowRight size={16}/></button><p className="auth-legal">Оценка в игровых монетах, не рыночная стоимость.</p></Modal>}
    {toast && <div className={`toast ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.error ? <CircleHelp size={20}/> : <Check size={20}/>}<span>{toast.message}</span><button className="icon-button" onClick={() => setToast(null)} aria-label="Скрыть уведомление"><X size={16}/></button></div>}
  </div>;
}
