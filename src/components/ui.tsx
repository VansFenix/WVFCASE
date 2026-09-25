"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, Check, Heart, X } from "lucide-react";
import { formatCoins, type Case, type Skin } from "@/lib/catalog";

export function Logo({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? "brand-small" : ""}`}><svg viewBox="0 0 44 42" fill="none" aria-hidden="true"><path d="M2 8h9l6 18 5-15 5 15 6-18h9L31 36h-9l-5-12-4 12H9L2 8Z" fill="currentColor"/><path d="m23 6 6 2-7 14-4-11 5-5Z" fill="#fff"/></svg><span>WVF<span className="brand-orange">CASE</span><small>ТВОЙ ДРОП. ТВОИ ПРАВИЛА.</small></span></span>;
}

export function Coin({ value, className = "" }: { value?: number; className?: string }) {
  return <span className={`coin-value ${className}`}>{value !== undefined && formatCoins(value)}<span className="coin-symbol" aria-label="виртуальных монет">G</span></span>;
}

export function SkinImage({ skin, className = "", eager = false }: { skin: Skin; className?: string; eager?: boolean }) {
  return <img src={skin.image} alt={`${skin.weapon} | ${skin.name}`} className={`skin-image ${className}`} loading={eager ? "eager" : "lazy"} draggable={false} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />;
}

export function SkinCard({ skin, selected = false, onClick, detail, children }: { skin: Skin; selected?: boolean; onClick?: () => void; detail?: string; children?: ReactNode }) {
  const content = <><div className="skin-card-top"><span>{detail || "FACTORY NEW"}</span>{selected && <Check size={14}/>}</div><SkinImage skin={skin}/><span className="skin-weapon">{skin.weapon}</span><strong className="skin-name">{skin.name}</strong><Coin value={skin.value}/>{children}</>;
  const style = { "--rarity": skin.color } as CSSProperties;
  return onClick ? <button className={`skin-card ${selected ? "selected" : ""}`} style={style} onClick={onClick} aria-pressed={selected}>{content}</button> : <div className="skin-card" style={style}>{content}</div>;
}

export function CaseCard({ item, favorite, onFavorite, onOpen }: { item: Case; favorite: boolean; onFavorite: () => void; onOpen: () => void }) {
  return <article className={`case-card ${item.category === "cs2" ? "official-case" : ""}`} style={{ "--case-color": item.color } as CSSProperties}>
    {item.tag && <span className={`case-tag ${item.tag === "FREE" ? "tag-free" : ""}`}>{item.tag === "ХИТ" && <span>↗</span>}{item.tag}</span>}
    <button className={`favorite-button ${favorite ? "is-favorite" : ""}`} aria-label={favorite ? `Убрать ${item.name} из избранного` : `Добавить ${item.name} в избранное`} onClick={onFavorite}><Heart size={15} fill={favorite ? "currentColor" : "none"}/></button>
    <button className="case-card-main" onClick={onOpen} aria-label={`Открыть кейс ${item.name}`}>
      <div className="case-art"><span className="case-halo"/><img src={item.image} alt="" loading="lazy" draggable={false} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} style={item.hue ? { filter: `hue-rotate(${item.hue}deg)` } : undefined}/></div>
      <h3>{item.name}</h3><p>{item.subtitle}</p>
      <span className={`case-price ${item.cost === 0 ? "free-price" : ""}`}>{item.cost === 0 ? <><span>БЕСПЛАТНО</span><ArrowUpRight size={15}/></> : <><Coin value={item.cost}/><ArrowUpRight size={15}/></>}</span>
    </button>
  </article>;
}

export function Modal({ title, children, onClose, className = "" }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href], select, [tabindex="0"]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", handler); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} tabIndex={-1} className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><button className="modal-close icon-button" onClick={onClose} aria-label="Закрыть окно"><X size={20}/></button><h2 id={titleId}>{title}</h2>{children}</div></div>;
}

export function Spinner({ size = 18 }: { size?: number }) { return <span className="spinner" style={{ width: size, height: size }} aria-label="Загрузка"/>; }
