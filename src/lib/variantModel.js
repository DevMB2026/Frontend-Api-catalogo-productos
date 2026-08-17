// Puente entre el modelo VISUAL "tallas base + colores" y el modelo del backend
// (options + variants). No requiere cambios de backend: tallas y colores son
// OptionValues (datos), y los "presets" son Options de tipo size (datos).

export const slugify = (s) => String(s).toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const comboKey = (ids) => ids.slice().sort().join('|');

// Reconstruye el estado visual (sc) desde un producto existente (edición).
// sc = { sizeOptionId, baseSizes:[{label,valueId}], colors:[{label,hex,valueId,override,sizes:[{label,valueId}]}] }
export function scFromProduct(product, colorOptionId) {
  const opts = product.options || [];
  const oid = (x) => (x && x._id) ? x._id : x;
  const colorOpt = opts.find((o) => oid(o.option) === colorOptionId);
  const sizeOpt = opts.find((o) => oid(o.option) !== colorOptionId);
  const sizeOptionId = sizeOpt ? oid(sizeOpt.option) : '';
  const baseSizes = (sizeOpt?.values || []).map((v) => ({ label: v.valor || '', valueId: oid(v) }));

  const variants = product.variants || [];
  const colors = (colorOpt?.values || []).map((cv) => {
    const cid = oid(cv);
    const seen = new Set();
    const sizes = [];
    for (const v of variants) {
      const ovIds = (v.optionValues || []).map(oid);
      if (!ovIds.includes(cid)) continue;
      const sv = (v.optionValues || []).find((x) => oid(x) !== cid);
      if (sv && !seen.has(oid(sv))) { seen.add(oid(sv)); sizes.push({ label: sv.valor || '', valueId: oid(sv) }); }
    }
    const sameAsBase = sizes.length === baseSizes.length && sizes.every((s) => baseSizes.some((b) => b.valueId === s.valueId));
    return { label: cv.valor || '', hex: cv.meta?.hex, valueId: cid, override: !sameAsBase, sizes };
  });

  return { sizeOptionId, baseSizes, colors };
}

// Resuelve sc → { options, variants }. Crea los OptionValues que falten (chips
// tecleados sin valueId) con createValue(optionId, label, meta?) => id.
// Preserva stock/composicion/media de las variantes que ya existían
// (match por combinación), pasadas en `existingVariants`.
export async function scToPayload(sc, baseSku, colorOptionId, createValue, existingVariants = []) {
  const sizeOptionId = sc.sizeOptionId;
  const oid = (x) => (x && x._id) ? x._id : x;

  const resolveChips = async (chips, optionId, metaFor) => {
    const out = [];
    for (const c of chips) {
      let id = c.valueId;
      if (!id) id = await createValue(optionId, c.label, metaFor ? metaFor(c) : undefined); // eslint-disable-line no-await-in-loop
      out.push({ label: c.label, valueId: id });
    }
    return out;
  };

  const baseSizes = await resolveChips(sc.baseSizes, sizeOptionId);
  const colors = [];
  for (const c of sc.colors) {
    let id = c.valueId;
    if (!id) id = await createValue(colorOptionId, c.label, c.hex ? { hex: c.hex } : undefined); // eslint-disable-line no-await-in-loop
    const sizes = c.override ? await resolveChips(c.sizes, sizeOptionId) : baseSizes; // eslint-disable-line no-await-in-loop
    colors.push({ ...c, valueId: id, sizes });
  }

  const allSizeIds = [...new Set([...baseSizes.map((s) => s.valueId), ...colors.flatMap((c) => c.sizes.map((s) => s.valueId))])];
  const options = [];
  if (colors.length) options.push({ option: colorOptionId, values: colors.map((c) => c.valueId) });
  if (allSizeIds.length && sizeOptionId) options.push({ option: sizeOptionId, values: allSizeIds });

  // Mapa de variantes existentes por combinación, para preservar datos.
  const byKey = new Map((existingVariants || []).map((v) => [comboKey((v.optionValues || []).map(oid)), v]));

  const variants = [];
  for (const c of colors) {
    const sizeList = c.sizes.length ? c.sizes : [null];
    for (const s of sizeList) {
      const ov = [c.valueId];
      if (s) ov.push(s.valueId);
      const prev = byKey.get(comboKey(ov));
      variants.push({
        optionValues: ov,
        sku: prev?.sku || `${baseSku}-${slugify(c.label)}${s ? '-' + slugify(s.label) : ''}`.toUpperCase(),
        stock: prev?.stock || 0,
        composicion: prev?.composicion || undefined,
        media: (prev?.media || []).map((m) => ({ url: m.url, public_id: m.public_id, alt: m.alt, orden: m.orden, principal: m.principal }))
      });
    }
  }

  return { options, variants };
}

// Nº de combinaciones (para el contador "≈ N").
export function countCombos(sc) {
  if (!sc.colors.length) return 0;
  return sc.colors.reduce((n, c) => n + ((c.override ? c.sizes.length : sc.baseSizes.length) || 1), 0);
}
