"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, Box, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, FileSignature, Flame, Gift, History, Layers3, Package, Plus, Search, ShieldCheck, Shuffle, Sparkles, TrendingUp, Trash2, X, Zap } from "lucide-react";
import { caseMap, featuredSkins, formatCoins, getCasePool, skinMap, type Case, type Skin } from "@/lib/catalog";
import type { GameResponse, GameState, InventoryEntry } from "@/lib/types";
import { Coin, Modal, SkinCard, SkinImage, Spinner } from "@/components/ui";

export type GameAction = (input: Record<string, unknown>) => Promise<GameResponse | null>;
export type View = "cases" | "inventory" | "upgrade" | "contracts";

type SharedProps = { state: GameState | null; act: GameAction; navigate: (view: View) => void };

function useSafeTimers() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  return (callback: () => void, delay: number) => { const timer = setTimeout(callback, delay); timers.current.push(timer); return timer; };
}

function DropResult({ drops, act, onClose, onInventory, onAgain }: { drops: InventoryEntry[]; act: GameAction; onClose: () => void; onInventory: () => void; onAgain?: () => void }) {
  const [selling, setSelling] = useState(false);
  const total = drops.reduce((sum, drop) => sum + (skinMap[drop.itemId]?.value || 0), 0);
  const sell = async () => { setSelling(true); const result = await act({ action: "sell", itemIds: drops.map((d) => d.id) }); setSelling(false); if (result) onClose(); };
  return <Modal title={drops.length > 1 ? "Вот это коллекция!" : "Это твой дроп!"} onClose={onClose} className={`result-modal ${drops.length > 2 ? "result-wide" : ""}`}>
    <p className="modal-subtitle">Ещё одна история в твоём инвентаре.</p>
    <div className={`result-items ${drops.length === 1 ? "single-result" : ""}`}>{drops.map((drop) => { const skin = skinMap[drop.itemId]; return skin ? <div className="result-item" key={drop.id} style={{ "--rarity": skin.color } as CSSProperties}><div className="result-glow"/><SkinImage skin={skin} eager/><small>{skin.weapon}</small><h3>{skin.name}</h3><Coin value={skin.value}/></div> : null; })}</div>
    <div className="saved-label"><ShieldCheck size={14}/> Предметы автоматически сохранены</div>
    <div className="result-actions"><button className="primary-button" onClick={() => { onClose(); onInventory(); }}><Package size={17}/> В инвентарь</button><button className="secondary-button" disabled={selling} onClick={sell}>{selling ? <Spinner/> : <>Продать за <Coin value={total}/></>}</button></div>
    {onAgain && <button className="text-button result-again" onClick={() => { onClose(); onAgain(); }}><Shuffle size={14}/> Открыть ещё раз</button>}
  </Modal>;
}

function playReelSound(duration: number) {
  try {
    const ctx = new AudioContext();
    void ctx.resume();
    for (let i = 0; i < 25; i++) {
      const time = ctx.currentTime + 0.08 + Math.pow(i / 25, 1.7) * (duration / 1000 - 0.25);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(680 + i * 9, time);
      gain.gain.setValueAtTime(0.022, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(time); oscillator.stop(time + 0.03);
    }
    setTimeout(() => { void ctx.close(); }, duration + 500);
  } catch { /* Sound is optional; the visual opening always works. */ }
}

export function CaseOpening({ item, state, act, navigate, onBack, onBonus, sound }: SharedProps & { item: Case; onBack: () => void; onBonus: () => void; sound: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const [fast, setFast] = useState(false);
  const [phase, setPhase] = useState<"idle" | "request" | "rolling" | "done">("idle");
  const [reel, setReel] = useState<Skin[]>([]);
  const [rolling, setRolling] = useState(false);
  const [drops, setDrops] = useState<InventoryEntry[]>([]);
  const [showAll, setShowAll] = useState(false);
  const later = useSafeTimers();
  const pool = useMemo(() => getCasePool(item), [item]);
  const contents = useMemo(() => [...pool].sort((a, b) => b.skin.value - a.skin.value), [pool]);
  const busy = phase === "rolling" || phase === "request";
  const cost = item.cost * quantity;

  useEffect(() => { setFast(localStorage.getItem("wvf-fast") === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  const open = async () => {
    if (busy || !state) return;
    if (state.user.coins < cost) { onBonus(); return; }
    setDrops([]); setPhase("request"); setRolling(false);
    const result = await act({ action: "open", caseId: item.id, quantity });
    if (!result?.drops?.length) { setPhase("idle"); return; }
    const winners = result.drops;
    const frames = Array.from({ length: 40 }, () => pool[Math.floor(Math.random() * pool.length)].skin);
    frames[32] = skinMap[winners[0].itemId];
    setReel(frames); setPhase("rolling");
    const duration = fast ? 650 : 4600;
    if (sound) playReelSound(duration);
    later(() => setRolling(true), 70);
    later(() => { setPhase("done"); setDrops(winners); }, duration + 200);
  };

  return <section className="case-opening page-enter">
    <div className="view-topline"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/> Все кейсы</button><span><ShieldCheck size={14}/> 100% бесплатно · Только виртуальные предметы</span></div>
    <div className="opening-heading"><span className="eyebrow">WVFCASE COLLECTION</span><h1>{item.name}</h1><p>{item.subtitle}</p></div>
    <div className={`opening-stage ${busy ? "is-opening" : ""}`} style={{ "--case-color": item.color } as CSSProperties}>
      <div className="stage-grid"/>
      {phase === "idle" || phase === "request" ? <div className="stage-idle"><span className="stage-watermark">WVFCASE</span><img src={item.image} alt={item.name} className="opening-case-image" style={item.hue ? { filter: `hue-rotate(${item.hue}deg)` } : undefined}/>{phase === "request" && <div className="opening-loader"><Spinner/> Готовим твой дроп...</div>}</div> : <div className="roulette-window"><div className="roulette-pointer top-pointer"/><div className="roulette-track" style={{ transform: `translateX(-${rolling ? 32 * 170 + 80 : 80}px)`, transition: rolling ? `transform ${fast ? 650 : 4600}ms cubic-bezier(.12,.73,.12,1)` : "none" }}>{reel.map((skin, index) => <div className={`reel-item ${phase === "done" && index === 32 ? "winner" : ""}`} key={`${skin.id}-${index}`} style={{ "--rarity": skin.color } as CSSProperties}><SkinImage skin={skin} eager/><small>{skin.weapon}</small><strong>{skin.name}</strong></div>)}</div><div className="roulette-pointer bottom-pointer"/><span className="roulette-fade left"/><span className="roulette-fade right"/></div>}
      <div className="stage-caption"><span><Shuffle size={12}/> СЛУЧАЙНЫЙ ДРОП</span><span><ShieldCheck size={12}/> ТВОЙ ПРОГРЕСС СОХРАНЯЕТСЯ</span></div>
    </div>
    <div className="opening-controls"><div className="quantity-control"><span>КОЛИЧЕСТВО</span><div>{[1, 2, 3, 5].map((n) => <button key={n} onClick={() => setQuantity(n)} disabled={busy} className={quantity === n ? "active" : ""}>x{n}</button>)}</div></div><button className="primary-button open-button" disabled={busy || !state} onClick={open}>{busy ? <><Spinner/> {phase === "request" ? "Подготовка..." : "Открываем..."}</> : <><Box size={18}/>{cost === 0 ? "Открыть бесплатно" : <>Открыть за <Coin value={cost}/></>}<ArrowRight size={17}/></>}</button><label className="quick-toggle"><input type="checkbox" checked={fast} disabled={busy} onChange={(e) => { setFast(e.target.checked); localStorage.setItem("wvf-fast", String(e.target.checked)); }}/><span className="switch"/><Zap size={15}/> Быстро</label></div>
    <p className="opening-note">Без депозитов, платежей и вывода. Только удовольствие от открытия.</p>
    <div className="section-heading contents-heading"><h2>Содержимое кейса <span className="count-badge">{contents.length}</span></h2><span className="muted-label"><ShieldCheck size={14}/> Вероятности каждого предмета</span></div>
    <div className="skin-grid contents-grid">{contents.slice(0, showAll ? undefined : 24).map(({ skin, probability }) => <SkinCard key={skin.id} skin={skin} detail={`ШАНС ${probability.toFixed(probability < 0.01 ? 4 : 2)}%`}/>)}</div>
    {contents.length > 24 && !showAll && <button className="load-more secondary-button" onClick={() => setShowAll(true)}>Все предметы ({contents.length}) <ChevronDown size={16}/></button>}
    <p className="valuation-note">Цены указаны в игровых монетах G и не соответствуют стоимости предметов в Steam. Вероятности симулятора не связаны с вероятностями CS2.</p>
    {drops.length > 0 && <DropResult drops={drops} act={act} onClose={() => setDrops([])} onInventory={() => navigate("inventory")} onAgain={() => { void open(); }}/>} 
  </section>;
}

export function InventoryView({ state, act, navigate, onLogin }: SharedProps & { onLogin: () => void }) {
  const [tab, setTab] = useState("inventory");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");
  const [selling, setSelling] = useState(false);
  const items = state?.inventory || [];
  const total = items.reduce((sum, entry) => sum + (skinMap[entry.itemId]?.value || 0), 0);
  const selectedValue = items.filter((i) => selected.includes(i.id)).reduce((sum, i) => sum + (skinMap[i.itemId]?.value || 0), 0);
  const visible = items.filter((i) => `${skinMap[i.itemId]?.weapon} ${skinMap[i.itemId]?.name}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "price" ? skinMap[b.itemId].value - skinMap[a.itemId].value : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const sell = async () => { setSelling(true); const result = await act({ action: "sell", itemIds: selected }); if (result) setSelected([]); setSelling(false); };

  return <section className="inventory-view page-enter">
    <div className="page-title"><span className="eyebrow">ТВОЯ ЛИЧНАЯ КОЛЛЕКЦИЯ</span><h1>Мой инвентарь<span className="orange-dot">.</span></h1><p>Каждый дроп на своём месте. Каждая история сохранена.</p></div>
    <div className="profile-banner"><div className="profile-avatar">{state?.user.name.slice(0, 1) || "W"}</div><div className="profile-name"><h2>{state?.user.name || "Подключаемся..."}</h2><span>{state?.user.email || "Гостевой аккаунт"}</span>{state?.user.guest && <button className="text-button" onClick={onLogin}>Создать аккаунт и сохранить доступ <ArrowUpRight size={13}/></button>}</div><div className="profile-stats"><div><small>БАЛАНС</small><Coin value={state?.user.coins || 0}/></div><div><small>ОТКРЫТО КЕЙСОВ</small><strong>{state?.user.opened || 0}</strong></div><div><small>СТОИМОСТЬ ИНВЕНТАРЯ</small><Coin value={total}/></div></div></div>
    {state?.user.guest && <div className="save-banner"><ShieldCheck size={19}/><p><strong>Твои предметы уже сохраняются в этом браузере.</strong> Зарегистрируйся, чтобы иметь доступ к коллекции с любого устройства.</p><button onClick={onLogin}>Сохранить аккаунт <ArrowRight size={15}/></button></div>}
    <div className="inventory-tabs"><button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}><Package size={17}/> Инвентарь <span>{items.length}</span></button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><History size={17}/> История действий</button></div>
    {tab === "inventory" ? <>
      <div className="inventory-toolbar"><label className="search-field"><Search size={17}/><input placeholder="Найти предмет..." value={query} onChange={(e) => setQuery(e.target.value)}/></label><select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировка инвентаря"><option value="new">Сначала новые</option><option value="price">Сначала дорогие</option></select><div className="toolbar-spacer"/>{items.length > 0 && <button className="text-button" onClick={() => setSelected(selected.length === items.length ? [] : items.slice(0, 1000).map((i) => i.id))}><CheckCheck size={15}/>{selected.length === items.length ? "Снять выбор" : "Выбрать всё"}</button>}<button className="primary-button compact" disabled={!selected.length || selling} onClick={sell}>{selling ? <Spinner/> : <><Trash2 size={15}/> Продать {selected.length ? `(${selected.length})` : ""}{selected.length > 0 && <Coin value={selectedValue}/>}</>}</button></div>
      {visible.length ? <div className="skin-grid inventory-grid">{visible.map((entry) => <SkinCard key={entry.id} skin={skinMap[entry.itemId]} selected={selected.includes(entry.id)} onClick={() => toggle(entry.id)} detail={caseMap[entry.caseId]?.name || (entry.caseId === "upgrade" ? "Апгрейд" : "Контракт")}/>)}</div> : <div className="empty-state"><div className="empty-icon"><Package size={42}/></div><h2>{query ? "Предметы не найдены" : "Здесь начинается твоя коллекция"}</h2><p>{query ? "Попробуй другое название или очисти поиск." : "Открой первый бесплатный кейс — и твой дроп появится здесь."}</p><button className="primary-button" onClick={() => query ? setQuery("") : navigate("cases")}>{query ? "Сбросить поиск" : "Выбрать кейс"}<ArrowRight size={17}/></button></div>}
    </> : <div className="history-list">{state?.history.length ? state.history.map((event) => <div className="history-row" key={event.id}><div className={`history-type type-${event.type}`}>{event.type === "open" ? <Box size={19}/> : event.type === "bonus" ? <Gift size={19}/> : event.type === "sell" ? <ArrowUpRight size={19}/> : event.type === "upgrade" ? <TrendingUp size={19}/> : <FileSignature size={19}/>}</div><div className="history-description"><strong>{event.title}</strong><small>{event.itemId && skinMap[event.itemId] ? `${skinMap[event.itemId].weapon} | ${skinMap[event.itemId].name}` : "Виртуальные монеты WVFCASE"}</small></div><time>{new Date(event.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time><span className={event.amount > 0 ? "positive" : ""}>{event.amount > 0 ? "+" : ""}{event.amount !== 0 ? <Coin value={event.amount}/> : <Check size={16}/>}</span></div>) : <div className="empty-state"><History size={40}/><h2>Всё ещё впереди</h2><p>Здесь появятся твои открытия, бонусы и другие действия.</p></div>}<p className="valuation-note">Показаны последние 50 действий. Все предметы сохраняются в инвентаре.</p></div>}
  </section>;
}

export function UpgradeView({ state, act, navigate }: SharedProps) {
  const [source, setSource] = useState<{ id: string; skin: Skin } | null>(null);
  const [target, setTarget] = useState<Skin | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<GameResponse | null>(null);
  const [allItems, setAllItems] = useState(false);
  const later = useSafeTimers();
  const chance = source && target && target.value > source.skin.value ? Math.min(75, source.skin.value / target.value * 85) : 0;
  const choices = featuredSkins.filter((s) => !source || s.value > source.skin.value * multiplier).sort((a, b) => a.value - b.value);
  const upgrade = async () => {
    if (!source || !target || spinning || !chance) return;
    setSpinning(true);
    const response = await act({ action: "upgrade", inventoryId: source.id, targetId: target.id });
    if (!response) { setSpinning(false); return; }
    later(() => { setResult(response); setSource(null); setSpinning(false); }, 2300);
  };
  const inventoryItems = state?.inventory || [];
  return <section className="upgrade-view page-enter"><div className="page-title centered"><span className="eyebrow">ПОДНИМИ СТАВКУ. БЕЗ РЕАЛЬНЫХ СТАВОК.</span><h1>Время для <span className="orange-text">апгрейда</span></h1><p>Преврати любимый скин в предмет мечты. Всё по-честному, всё бесплатно.</p></div>
    <div className={`upgrade-arena ${spinning ? "upgrading" : ""}`}><div className={`upgrade-slot ${source ? "has-item" : ""}`} style={{ "--rarity": source?.skin.color || "#ff8a3d" } as CSSProperties}><span className="slot-label">ТВОЙ ПРЕДМЕТ</span>{source ? <><SkinImage skin={source.skin}/><small>{source.skin.weapon}</small><h3>{source.skin.name}</h3><Coin value={source.skin.value}/>{!spinning && <button className="slot-remove icon-button" onClick={() => setSource(null)} aria-label="Убрать исходный предмет"><X size={16}/></button>}</> : <><div className="slot-placeholder"><Plus size={32}/></div><h3>Выбери свой скин</h3><p>Из инвентаря ниже</p></>}</div><div className="upgrade-center"><div className="chance-ring" style={{ "--progress": `${chance * 3.6}deg` } as CSSProperties}><div className="chance-ring-inner"><TrendingUp size={27}/><strong>{chance.toFixed(1)}<span>%</span></strong><small>ШАНС УСПЕХА</small></div><span className="chance-needle"/></div><button className="primary-button" disabled={!chance || spinning} onClick={upgrade}>{spinning ? <><Spinner/> Улучшаем...</> : <><Zap size={17}/> Сделать апгрейд</>}</button><p><ShieldCheck size={12}/> Результат определяется сервером</p></div><div className={`upgrade-slot ${target ? "has-item" : ""}`} style={{ "--rarity": target?.color || "#ff8a3d" } as CSSProperties}><span className="slot-label">ТВОЯ ЦЕЛЬ</span>{target ? <><SkinImage skin={target}/><small>{target.weapon}</small><h3>{target.name}</h3><Coin value={target.value}/>{!spinning && <button className="slot-remove icon-button" onClick={() => setTarget(null)} aria-label="Убрать цель"><X size={16}/></button>}</> : <><div className="slot-placeholder"><Sparkles size={31}/></div><h3>Выбери цель</h3><p>Предмет дороже твоего</p></>}</div></div>
    <div className="game-warning"><CircleHelp size={16}/><span>При неудачном апгрейде исходный предмет исчезнет. Шанс = 85% × отношение цен, максимум 75%. Это бесплатная симуляция.</span></div>
    <div className="upgrade-selectors"><div><div className="section-heading"><h2><Package size={19}/> Твой инвентарь <span className="count-badge">{inventoryItems.length}</span></h2></div>{inventoryItems.length ? <><div className="selector-grid">{inventoryItems.slice(0, allItems ? undefined : 24).map((i) => <SkinCard key={i.id} skin={skinMap[i.itemId]} selected={source?.id === i.id} onClick={() => { if (!spinning) { setSource({ id: i.id, skin: skinMap[i.itemId] }); if (target && target.value <= skinMap[i.itemId].value) setTarget(null); } }}/>)}</div>{inventoryItems.length > 24 && !allItems && <button className="text-button load-more" onClick={() => setAllItems(true)}>Показать все предметы</button>}</> : <div className="empty-state small-empty"><Box size={33}/><h3>Нужен первый предмет</h3><p>Загляни в бесплатный кейс</p><button className="secondary-button" onClick={() => navigate("cases")}>К кейсам <ArrowRight size={15}/></button></div>}</div><div><div className="section-heading"><h2><Sparkles size={19}/> Желаемый предмет</h2><div className="multiplier-tabs">{[1, 2, 5, 10].map((n) => <button className={multiplier === n ? "active" : ""} key={n} onClick={() => setMultiplier(n)}>{n === 1 ? "Все" : `x${n}`}</button>)}</div></div><div className="selector-grid">{choices.map((skin) => <SkinCard key={skin.id} skin={skin} selected={target?.id === skin.id} onClick={() => { if (!spinning) setTarget(skin); }}/>)}</div>{!choices.length && <div className="empty-state small-empty"><p>Нет целей с таким множителем.</p><button className="text-button" onClick={() => setMultiplier(1)}>Показать все</button></div>}</div></div>
    {result?.won && result.drops?.length ? <DropResult drops={result.drops} act={act} onClose={() => setResult(null)} onInventory={() => navigate("inventory")}/> : result && <Modal title="В этот раз не повезло" onClose={() => setResult(null)}><div className="failed-upgrade"><TrendingUp size={56}/><p>Исходный предмет использован, но новая попытка всегда рядом. Открой бесплатный кейс и попробуй снова.</p><button className="primary-button" onClick={() => setResult(null)}>Попробовать ещё <ArrowRight size={16}/></button></div></Modal>}
  </section>;
}

export function ContractsView({ state, act, navigate }: SharedProps) {
  const [selected, setSelected] = useState<InventoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [drops, setDrops] = useState<InventoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const later = useSafeTimers();
  const total = selected.reduce((sum, i) => sum + (skinMap[i.itemId]?.value || 0), 0);
  const toggle = (entry: InventoryEntry) => { if (busy) return; setSelected((list) => list.some((i) => i.id === entry.id) ? list.filter((i) => i.id !== entry.id) : list.length < 10 ? [...list, entry] : list); };
  const sign = async () => {
    if (busy || selected.length < 3) return;
    setBusy(true);
    const result = await act({ action: "contract", itemIds: selected.map((i) => i.id) });
    if (!result) { setBusy(false); return; }
    later(() => { setSelected([]); setBusy(false); setDrops(result.drops || []); }, 1700);
  };
  const visible = (state?.inventory || []).filter((i) => `${skinMap[i.itemId]?.weapon} ${skinMap[i.itemId]?.name}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="contracts-view page-enter"><div className="page-title centered"><span className="eyebrow">СОЗДАЙ ЧТО-ТО ОСОБЕННОЕ</span><h1>Новая жизнь <span className="orange-text">твоих скинов</span></h1><p>Объедини от 3 до 10 предметов и получи один новый. Просто. Бесплатно. Неожиданно.</p></div><div className={`contract-arena ${busy ? "contract-signing" : ""}`}><div className="contract-emblem"><FileSignature size={42}/><span>WVF CONTRACT</span></div><div className="contract-slots">{Array.from({ length: 10 }, (_, index) => { const item = selected[index]; return <button className={`contract-slot ${item ? "filled" : ""}`} key={index} disabled={busy || !item} onClick={() => item && toggle(item)} aria-label={item ? `Убрать ${skinMap[item.itemId].name}` : `Слот ${index + 1}`} style={{ "--rarity": item ? skinMap[item.itemId].color : "#303139" } as CSSProperties}>{item ? <><SkinImage skin={skinMap[item.itemId]}/><span>{skinMap[item.itemId].name}</span><X size={12} className="contract-remove"/></> : <><Plus size={21}/><small>{String(index + 1).padStart(2, "0")}</small></>}</button>; })}</div><div className="contract-summary"><span>Предметов <strong>{selected.length}<small> / 10</small></strong></span><span>Общая стоимость <Coin value={total}/></span><button className="primary-button" disabled={selected.length < 3 || busy} onClick={sign}>{busy ? <><Spinner/> Создаём предмет...</> : <><FileSignature size={17}/> Создать контракт <ArrowRight size={16}/></>}</button></div></div><div className="game-warning"><CircleHelp size={16}/><span>Выбранные предметы будут заменены одним случайным предметом из коллекции WVFCASE. Результат может быть дешевле исходных предметов.</span></div><div className="section-heading"><h2><Package size={20}/> Выбери предметы <span className="count-badge">{state?.inventory.length || 0}</span></h2><label className="search-field"><Search size={16}/><input placeholder="Найти предмет..." value={query} onChange={(e) => setQuery(e.target.value)}/></label></div>{visible.length ? <div className="skin-grid">{visible.map((item) => <SkinCard key={item.id} skin={skinMap[item.itemId]} selected={selected.some((i) => i.id === item.id)} onClick={() => toggle(item)}/>)}</div> : <div className="empty-state"><Layers3 size={40}/><h2>{query ? "Ничего не найдено" : "Для начала нужны скины"}</h2><p>{query ? "Попробуй другое название." : "Открой несколько кейсов и собери свой первый контракт."}</p><button className="primary-button" onClick={() => query ? setQuery("") : navigate("cases")}>{query ? "Сбросить поиск" : "Открыть кейсы"}<ArrowRight size={16}/></button></div>}{drops.length > 0 && <DropResult drops={drops} act={act} onClose={() => setDrops([])} onInventory={() => navigate("inventory")}/>}</section>;
}
