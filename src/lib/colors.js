// Diccionario de colores: nombre (español) -> código hex, para dibujar los
// swatches del selector de color aunque el OptionValue no tenga meta.hex.
// Si un color no está mapeado, se cae a una palabra clave y, en último caso,
// a un gris neutro — NUNCA a un botón de texto.

const HEX = {
  'NEGRO': '#141414',
  'BLANCO': '#ffffff',
  'GRIS': '#9ca3af', 'GRIS JASPE': '#a6a6a6', 'GRIS OXFORD': '#4b5563',
  'GRIS PERLA': '#d6d6da', 'GRIS ACERO': '#6b7280', 'GRIS PLATA': '#c0c4cc',
  'AZUL': '#2563eb', 'AZUL MARINO': '#1d283f', 'AZUL REY': '#1d4ed8', 'REY': '#1d4ed8',
  'AZUL CIELO': '#7dd3fc', 'AZUL CLARO': '#93c5fd', 'FRANCIA': '#2f6fdb', 'AZUL FRANCIA': '#2f6fdb',
  'AMARILLO': '#facc15', 'AMARILLO NEON': '#e4ff1a',
  'NARANJA': '#f97316', 'ANARANJADO': '#f97316', 'NARANJA NEON': '#ff7a00',
  'ROJO': '#dc2626',
  'VERDE': '#22c55e', 'VERDE BANDERA': '#15803d', 'VERDE BOTELLA': '#0b3d2e',
  'VERDE LIMON': '#84cc16', 'VERDE MANZANA': '#4ade80', 'VERDE BOSQUE': '#166534',
  'VERDE NEON': '#39ff14', 'MILITAR': '#5b5f2a', 'OLIVO': '#5b5f2a', 'PISTACHE': '#b5d66a',
  'MORADO': '#7c3aed', 'LILA': '#c4b5fd', 'VIOLETA': '#8b5cf6',
  'ROSA': '#f472b6', 'ROSA MEXICANO': '#e6007e', 'FIUSHA': '#e11d8f', 'FUCSIA': '#e11d8f',
  'BUGANBILIA': '#c026a3', 'BUGANBILIA NEON': '#e5308f',
  'MENTA': '#7de3b3', 'TURQUESA': '#06b6d4', 'AQUA': '#22d3ee', 'PETROLEO': '#0e5a6b',
  'VINO': '#6b1220', 'GUINDA': '#7a1f2b', 'CAFE': '#5a3620', 'MARRON': '#5a3620', 'CHOCOLATE': '#4a2c1a',
  'BEIGE': '#e7d3a1', 'ARENA': '#dcc7a0', 'PAJA': '#e6d8a8', 'STONE': '#a8a29e', 'HUESO': '#efe9dd',
  'ORO': '#c9a227', 'DORADO': '#c9a227', 'PLATA': '#c0c4cc', 'PLATEADO': '#c0c4cc',
};

const KEYWORDS = [
  [/NEGR/, '#141414'], [/BLANC/, '#ffffff'], [/MARINO/, '#1d283f'],
  [/\bGRIS\b|OXFORD|JASPE/, '#9ca3af'], [/AMARILL/, '#f5d90a'], [/NARANJ|ANARANJ/, '#f97316'],
  [/\bROJO\b|CARMES/, '#dc2626'], [/VERDE|MILITAR|OLIV|PISTACHE/, '#22c55e'],
  [/\bAZUL\b|CIELO|FRANCIA|\bREY\b/, '#2563eb'], [/MORAD|LILA|VIOLET/, '#7c3aed'],
  [/ROSA|FIUSHA|FUCSIA|BUGAN/, '#ec4899'], [/VINO|GUINDA/, '#6b1220'],
  [/BEIGE|ARENA|PAJA|HUESO|STONE/, '#e0cfa0'], [/CAFE|MARRON|CHOCOLAT/, '#5a3620'],
  [/TURQUESA|AQUA|PETROLEO/, '#06b6d4'], [/MENTA/, '#7de3b3'],
  [/ORO|DORAD/, '#c9a227'], [/PLATA|PLATEAD/, '#c0c4cc'],
];

const DEFAULT = '#cbd5e1'; // gris neutro por defecto

export function colorHex(name) {
  const n = String(name || '').toUpperCase().replace(/\s+/g, ' ').trim();
  if (HEX[n]) return HEX[n];
  for (const [re, hex] of KEYWORDS) if (re.test(n)) return hex;
  return DEFAULT;
}

// Fondo CSS para el swatch. Soporta colores compuestos "X / Y" (círculo bicolor).
// Prefiere el meta.hex de la DB para colores simples; deriva del nombre si falta.
export function swatchBg(name, metaHex) {
  const parts = String(name || '').split('/').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return `linear-gradient(135deg, ${colorHex(parts[0])} 0 50%, ${colorHex(parts[1])} 50% 100%)`;
  }
  return metaHex || colorHex(name);
}
