import { describe, expect, it } from 'vitest';
import {
  COIN_PACKS,
  LEAD_PRICE_UNKNOWN_LABEL,
  LEAD_TIERS,
  OFFER_FLAGS,
  PRICE_TAX_MODE,
  PRO_FEATURES,
  PRO_PLANS,
  SALES_WHATSAPP_URL,
  SPONSOR_TIERS,
  TAX_LABEL,
  approxLeadsForBalance,
  bonusLabel,
  bonusPercent,
  effectiveDiscountPercent,
  formatLeadPrice,
  formatTRY,
  founderRenewalLine,
  getLiveProFeatures,
  getProHighlights,
  hasLeadPrice,
  savingsPercent,
  sponsorMonthlyPrice,
  sponsorPlacement,
  yearlySavingsPercent,
} from './pricing';

describe('COIN_PACKS', () => {
  it('derives bonus percentage from the bonus jeton', () => {
    expect(COIN_PACKS.map(bonusPercent)).toEqual([10, 15, 20]);
  });

  it('adds the bonus on top of the paid amount', () => {
    expect(COIN_PACKS.map((pack) => pack.totalJeton)).toEqual([660, 1725, 3600]);
    expect(COIN_PACKS.map((pack) => pack.bonusJeton)).toEqual([60, 225, 600]);
    expect(COIN_PACKS.map((pack) => pack.baseJeton)).toEqual([600, 1500, 3000]);
  });

  it('reports the effective discount after the bonus', () => {
    expect(COIN_PACKS.map(effectiveDiscountPercent)).toEqual([9, 13, 17]);
  });

  it('labels the bonus without hardcoded percentages', () => {
    expect(bonusLabel(COIN_PACKS[0])).toBe('+%10 bonus jeton');
  });
});

describe('savings and formatting', () => {
  it('computes the yearly saving against twelve monthly payments', () => {
    expect(savingsPercent(590 * 12, 4900)).toBe(31);
    expect(yearlySavingsPercent()).toBe(31);
  });

  it('formats TRY without decimals', () => {
    expect(formatTRY(2900)).toBe('₺2.900');
    expect(formatTRY(600)).toBe('₺600');
  });

  it('shows the tax mode label next to prices', () => {
    expect(PRICE_TAX_MODE).toBe('inclusive');
    expect(TAX_LABEL).toBe('KDV dahil');
  });

  it('formats a lead price in jeton and TL, and never invents a missing one', () => {
    expect(formatLeadPrice(149)).toBe('149 jeton (≈ ₺149)');
    expect(formatLeadPrice(null)).toBe(LEAD_PRICE_UNKNOWN_LABEL);
    expect(formatLeadPrice(0)).toBe(LEAD_PRICE_UNKNOWN_LABEL);
    expect(hasLeadPrice(undefined)).toBe(false);
    expect(hasLeadPrice(20)).toBe(true);
  });
});

describe('ids', () => {
  it('keeps pack and plan ids unique across both lists', () => {
    const ids = [...COIN_PACKS.map((pack) => pack.id), ...PRO_PLANS.map((plan) => plan.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the founder plan capped at 25 with a fixed renewal price', () => {
    const founder = PRO_PLANS.find((plan) => plan.id === 'founder');
    expect(founder?.cap).toBe(25);
    expect(founder?.renewalPriceTRY).toBe(2900);
    expect(founder && founderRenewalLine(founder)).toBe('₺2.900/yıl, yenilemede de sabit');
  });
});

describe('lead tiers', () => {
  it('estimates how many leads a balance opens at the lowest tier', () => {
    expect(LEAD_TIERS[0].jeton).toBe(149);
    expect(approxLeadsForBalance(660)).toBe(4);
    expect(approxLeadsForBalance(-5)).toBe(0);
  });
});

describe('sponsor tiers', () => {
  it('prices known cities by tier', () => {
    expect(sponsorMonthlyPrice('istanbul')).toBe(6000);
    expect(sponsorMonthlyPrice('bursa')).toBe(3000);
  });

  it('falls back to the last tier for any other slug', () => {
    expect(sponsorMonthlyPrice('sivas')).toBe(1500);
    expect(sponsorMonthlyPrice('not-a-city')).toBe(1500);
    expect(SPONSOR_TIERS[SPONSOR_TIERS.length - 1].citySlugs).toBeNull();
  });

  it('builds the banner placement key', () => {
    expect(sponsorPlacement('bahce-tasarimi', 'ankara')).toBe('sponsor:bahce-tasarimi:ankara');
  });
});

describe('PRO_FEATURES', () => {
  it('filters planned items out of the render list', () => {
    expect(PRO_FEATURES.some((feature) => feature.status === 'planned')).toBe(true);
    const live = getLiveProFeatures();
    expect(live.length).toBeGreaterThan(0);
    expect(live.every((feature) => feature.status === 'live')).toBe(true);
  });

  it('cites evidence for every item', () => {
    expect(PRO_FEATURES.every((feature) => feature.evidence.length > 0)).toBe(true);
  });

  it('keeps highlights within the live features', () => {
    const live = new Set(getLiveProFeatures().map((feature) => feature.id));
    const highlights = getProHighlights();
    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights.every((feature) => live.has(feature.id))).toBe(true);
  });
});

describe('OFFER_FLAGS', () => {
  it('keeps every promise off until its backing mechanism exists', () => {
    const enabled = Object.entries(OFFER_FLAGS)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
    expect(enabled).toEqual([]);
    expect(OFFER_FLAGS.proLeadDiscountPct).toBe(0);
  });
});

describe('SALES_WHATSAPP_URL', () => {
  it('falls back to the public support number and encodes the message', () => {
    const previous = process.env.NEXT_PUBLIC_SALES_WHATSAPP;
    delete process.env.NEXT_PUBLIC_SALES_WHATSAPP;
    try {
      expect(SALES_WHATSAPP_URL()).toBe('https://wa.me/905345957147');
      expect(SALES_WHATSAPP_URL('Merhaba İstanbul')).toBe(
        `https://wa.me/905345957147?text=${encodeURIComponent('Merhaba İstanbul')}`,
      );
    } finally {
      if (previous !== undefined) process.env.NEXT_PUBLIC_SALES_WHATSAPP = previous;
    }
  });
});
