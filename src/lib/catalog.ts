import official from "@/data/official.json";
import featuredImagesData from "@/data/featured-images.json";
import caseImagesData from "@/data/case-images.json";

export type Rarity = "gray" | "blue" | "purple" | "pink" | "red" | "gold";
export type Skin = { id: string; weapon: string; name: string; rarity: Rarity; color: string; value: number; image: string };
export type CaseCategory = "free" | "original" | "premium" | "cs2";
export type Case = { id: string; name: string; subtitle: string; cost: number; image: string; color: string; category: CaseCategory; tag?: string; hue?: number; itemIds: string[] };

export const rarityColors: Record<Rarity, string> = { gray: "#9ba7b7", blue: "#5778ff", purple: "#a070ff", pink: "#e252e8", red: "#fa606b", gold: "#efbf62" };
export const rarityNames: Record<Rarity, string> = { gray: "Ширпотреб", blue: "Армейское", purple: "Запрещённое", pink: "Засекреченное", red: "Тайное", gold: "Особый предмет" };

const featuredImages: Record<string, string> = featuredImagesData;
const caseImages: Record<string, string> = caseImagesData;

const localDefinitions: [string, string, string, Rarity, number][] = [
  ["ak-asiimov", "AK-47", "Asiimov", "red", 1850],
  ["awp-asiimov", "AWP", "Asiimov", "red", 3200],
  ["awp-neonoir", "AWP", "Neo-Noir", "red", 1400],
  ["ak-neon", "AK-47", "Neon Rider", "red", 2600],
  ["m4-printstream", "M4A1-S", "Printstream", "red", 5400],
  ["deagle-printstream", "Desert Eagle", "Printstream", "red", 2100],
  ["usp-kill", "USP-S", "Kill Confirmed", "red", 2800],
  ["glock-fade", "Glock-18", "Fade", "purple", 7200],
  ["awp-dragon", "AWP", "Dragon Lore", "gold", 45000],
  ["ak-serpent", "AK-47", "Fire Serpent", "red", 14500],
  ["p250-sand", "P250", "Sand Dune", "gray", 15],
  ["mac-candy", "MAC-10", "Candy Apple", "blue", 65],
  ["mp9-food", "MP9", "Food Chain", "pink", 340],
  ["m4-temukau", "M4A4", "Temukau", "red", 1900],
  ["usp-cortex", "USP-S", "Cortex", "pink", 260],
  ["glock-vogue", "Glock-18", "Vogue", "pink", 180],
  ["awp-atheris", "AWP", "Atheris", "purple", 420],
  ["ak-slate", "AK-47", "Slate", "purple", 210],
  ["deagle-blaze", "Desert Eagle", "Blaze", "purple", 8900],
  ["karambit-doppler", "★ Karambit", "Doppler", "gold", 32000],
  ["butterfly-fade", "★ Butterfly Knife", "Fade", "gold", 48000],
  ["gloves-vice", "★ Sport Gloves", "Vice", "gold", 24000],
  ["m4-howl", "M4A4", "Howl", "gold", 38000],
  ["ak-ice", "AK-47", "Ice Coaled", "pink", 570],
];

export const featuredSkins: Skin[] = localDefinitions.map(([id, weapon, name, rarity, value]) => ({
  id,
  weapon,
  name,
  rarity,
  value,
  color: rarityColors[rarity],
  image: featuredImages[id] || "",
}));
export const skins: Skin[] = [...featuredSkins, ...(official.skins as Skin[])];
export const skinMap: Record<string, Skin> = Object.fromEntries(skins.map((s) => [s.id, s]));
const allLocal = featuredSkins.map((s) => s.id);
const under = (value: number) => featuredSkins.filter((s) => s.value <= value).map((s) => s.id);

export const customCases: Case[] = [
  { id: "first-drop", name: "Первый дроп", subtitle: "Большая история начинается здесь", cost: 0, image: caseImages["crate-4904"] || "", color: "#b6ed58", category: "free", tag: "FREE", itemIds: under(1900) },
  { id: "neon", name: "Неоновый", subtitle: "Добавь красок в свою коллекцию", cost: 99, image: caseImages["crate-4880"] || "", color: "#52c6ff", category: "original", tag: "ХИТ", itemIds: [...under(2800), "karambit-doppler"] },
  { id: "fire", name: "Огненный", subtitle: "Осторожно, горячий дроп", cost: 249, image: caseImages["crate-4698"] || "", color: "#ff913e", category: "original", tag: "ХИТ", itemIds: [...under(5400), "ak-serpent", "butterfly-fade"] },
  { id: "midnight", name: "В сердце ночи", subtitle: "Для тех, кто не спит", cost: 499, image: caseImages["crate-4818"] || "", color: "#ad83ff", category: "original", tag: "НОВИНКА", itemIds: allLocal },
  { id: "dragon", name: "Дракон", subtitle: "Пробуди свою легенду", cost: 999, image: caseImages["crate-4717"] || "", color: "#ff526c", category: "premium", itemIds: allLocal.filter((id) => !["p250-sand", "mac-candy"].includes(id)) },
  { id: "golden-hour", name: "Золотой час", subtitle: "Время для особенных находок", cost: 1999, image: caseImages["crate-7007"] || "", color: "#efc568", category: "premium", tag: "TOP", itemIds: featuredSkins.filter((s) => s.value >= 1400).map((s) => s.id) },
  { id: "cyberpunk", name: "Киберпанк", subtitle: "Твой пропуск в будущее", cost: 349, image: caseImages["crate-4846"] || "", color: "#68ffe2", hue: -28, category: "original", itemIds: allLocal },
  { id: "secret", name: "Тайное послание", subtitle: "Редкости ждут внутри", cost: 749, image: caseImages["crate-4790"] || "", color: "#e585ee", hue: 35, category: "original", itemIds: allLocal },
  { id: "sniper", name: "Снайпер", subtitle: "Один выстрел — один дроп", cost: 599, image: caseImages["crate-4747"] || "", color: "#7ae4ca", hue: 55, category: "original", itemIds: ["awp-atheris", "awp-neonoir", "awp-asiimov", "awp-dragon"] },
  { id: "knife-hunt", name: "Охота на ножи", subtitle: "Только самые острые эмоции", cost: 2499, image: caseImages["crate-4620"] || "", color: "#ffc288", hue: -15, category: "premium", tag: "★ RARE", itemIds: ["ak-slate", "usp-cortex", "ak-ice", "ak-neon", "karambit-doppler", "butterfly-fade", "gloves-vice"] },
  { id: "red-line", name: "Красная линия", subtitle: "Переходи на новый уровень", cost: 799, image: caseImages["crate-4471"] || "", color: "#ff7070", category: "original", itemIds: allLocal },
  { id: "collector", name: "Коллекционер", subtitle: "Создан для твоего инвентаря", cost: 1499, image: caseImages["crate-4403"] || "", color: "#eab662", hue: 15, category: "premium", itemIds: allLocal.filter((id) => !["p250-sand", "mac-candy"].includes(id)) },
];
export const cases: Case[] = [...customCases, ...(official.cases as Case[])];
export const caseMap: Record<string, Case> = Object.fromEntries(cases.map((c) => [c.id, c]));

export function getCasePool(c: Case) {
  const items = c.itemIds.map((id) => skinMap[id]).filter(Boolean);
  const tierWeights: Record<Rarity, number> = { gray: 3200, blue: 4500, purple: 1800, pink: 700, red: 240, gold: 60 };
  const groups = items.reduce((acc, item) => ({ ...acc, [item.rarity]: (acc[item.rarity] || 0) + 1 }), {} as Record<Rarity, number>);
  const weighted = items.map((skin) => ({ skin, weight: tierWeights[skin.rarity] / groups[skin.rarity] }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  return weighted.map((item) => ({ ...item, probability: (item.weight / total) * 100 }));
}

export const formatCoins = (value: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
