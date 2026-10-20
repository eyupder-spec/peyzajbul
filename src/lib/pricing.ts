/**
 * Tek fiyat kaynağı: fiyatlandırma sayfası, jeton/Pro/sponsor ekranları ve testler buradan okur.
 *
 * Bu dosya bilerek `@/` içe aktarması içermez (testler alias yapılandırması olmadan çalışır).
 * Buradaki id'ler Stripe checkout fonksiyonlarının (create-coin-checkout, create-premium-checkout)
 * okuduğu `pricing_plans` satır id'leriyle aynı olmalıdır; sunucuda kullanılan gerçek fiyat
 * `pricing_plans` tablosundadır (supabase/migrations/20261021103000_pricing_plans_try.sql).
 * Bir fiyatı değiştirirken ikisini birlikte güncelleyin.
 *
 * Tüm TL rakamları (paketler, Pro, Kurucu Üye, sponsor kademeleri) doğrulanmamış hipotezlerdir;
 * lansmandan önce yaklaşık 10 firma görüşmesiyle sınanmalıdır.
 */

/** Fiyatların vergiyle ilişkisi. Mali müşavir kararına göre lansmandan önce değiştirilebilir;
 *  Stripe fiyatındaki tax_behavior ve pricing_plans.tax_inclusive aynı değeri taşımalıdır. */
export const PRICE_TAX_MODE: 'inclusive' | 'exclusive' = 'inclusive';
export const TAX_LABEL: string = PRICE_TAX_MODE === 'inclusive' ? 'KDV dahil' : 'KDV hariç';

const TRY_FORMAT = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 2900 -> '₺2.900' */
export function formatTRY(amount: number): string {
  return TRY_FORMAT.format(amount);
}

const NUMBER_FORMAT = new Intl.NumberFormat('tr-TR');

/** 1725 -> '1.725' */
export function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/** 1 jeton kaç TL'lik krediye eşittir. */
export const JETON_TL_RATE = 1;

export function jetonToTRY(jeton: number): number {
  return Math.round(jeton * JETON_TL_RATE);
}

/** '149 jeton (≈ ₺149)'; fiyat henüz yoksa LEAD_PRICE_UNKNOWN_LABEL. */
export const LEAD_PRICE_UNKNOWN_LABEL = 'Fiyat belirleniyor';

export function formatLeadPrice(tokenPrice: number | null | undefined): string {
  if (typeof tokenPrice !== 'number' || !Number.isFinite(tokenPrice) || tokenPrice <= 0) {
    return LEAD_PRICE_UNKNOWN_LABEL;
  }
  return `${formatNumber(tokenPrice)} jeton (≈ ${formatTRY(jetonToTRY(tokenPrice))})`;
}

/** Fiyat bilgisi gerçek ve satın alınabilir mi? (null/0 ise düğme devre dışı kalır, sessiz varsayılan yok.) */
export function hasLeadPrice(tokenPrice: number | null | undefined): tokenPrice is number {
  return typeof tokenPrice === 'number' && Number.isFinite(tokenPrice) && tokenPrice > 0;
}

// ---------------------------------------------------------------------------
// Jeton (lead kredisi) paketleri
// ---------------------------------------------------------------------------

export interface CoinPack {
  /** pricing_plans.id */
  id: string;
  name: string;
  /** Ödenen tutar (TL). */
  priceTRY: number;
  /** Bonus jeton yüzdesi (ödenen jetona göre). */
  bonusPct: number;
  /** Ödenen tutarın karşılığı jeton. */
  baseJeton: number;
  bonusJeton: number;
  /** Hesaba yüklenen toplam jeton (pricing_plans.coins). */
  totalJeton: number;
}

function buildCoinPack(id: string, name: string, priceTRY: number, bonusPct: number): CoinPack {
  const baseJeton = Math.round(priceTRY / JETON_TL_RATE);
  const bonusJeton = Math.round((baseJeton * bonusPct) / 100);
  return { id, name, priceTRY, bonusPct, baseJeton, bonusJeton, totalJeton: baseJeton + bonusJeton };
}

export const COIN_PACKS: readonly CoinPack[] = [
  buildCoinPack('starter', 'Başlangıç', 600, 10),
  buildCoinPack('standard', 'Standart', 1500, 15),
  buildCoinPack('plus', 'Plus', 3000, 20),
];

export interface LeadTier {
  id: 'small' | 'medium' | 'large';
  label: string;
  /** Lead başına jeton. */
  jeton: number;
}

/**
 * Lead fiyat kademeleri (hipotez, doğrulanmadı). Yalnızca OFFER_FLAGS.leadTiersLive açıkken
 * gösterilir; ilk kademe ayrıca panelin örnek talebinde fiyat örneği olarak kullanılır.
 */
export const LEAD_TIERS: readonly LeadTier[] = [
  { id: 'small', label: 'Küçük proje', jeton: 149 },
  { id: 'medium', label: 'Orta proje', jeton: 290 },
  { id: 'large', label: 'Büyük proje', jeton: 590 },
];

/** Bakiyenin en düşük kademede kaç lead açacağı (yalnızca leadTiersLive iken gösterilir). */
export function approxLeadsForBalance(balanceJeton: number): number {
  return Math.floor(Math.max(0, balanceJeton) / LEAD_TIERS[0].jeton);
}

export function getCoinPack(id: string | null | undefined): CoinPack | undefined {
  return COIN_PACKS.find((pack) => pack.id === id);
}

/** Bonus jeton yüzdesi: bonus / ödenen. Gösterim: '+%10 bonus jeton'. */
export function bonusPercent(pack: CoinPack): number {
  return Math.round((pack.bonusJeton / pack.baseJeton) * 100);
}

export function bonusLabel(pack: CoinPack): string {
  return `+%${bonusPercent(pack)} bonus jeton`;
}

/** Bonus sonrası jeton başına gerçek indirim: 1 - ödenen / toplam. */
export function effectiveDiscountPercent(pack: CoinPack): number {
  return Math.round((1 - pack.baseJeton / pack.totalJeton) * 100);
}

/** full yerine discounted ödenirse yüzde kaç tasarruf edilir. */
export function savingsPercent(full: number, discounted: number): number {
  if (full <= 0) return 0;
  return Math.round((1 - discounted / full) * 100);
}

// ---------------------------------------------------------------------------
// Pro üyelik planları
// ---------------------------------------------------------------------------

export type ProPlanId = 'monthly' | 'yearly' | 'founder';

export interface ProPlan {
  /** create-premium-checkout'a gönderilen `plan` ve pricing_plans.id */
  id: ProPlanId;
  name: string;
  interval: 'month' | 'year';
  priceTRY: number;
  /** Yalnızca Kurucu Üye: toplam kontenjan. */
  cap?: number;
  /** Yalnızca Kurucu Üye: yenilemedeki fiyat. Sahip onaylamadan 'yenilemede de sabit' yazılmaz. */
  renewalPriceTRY?: number;
}

export const PRO_PLANS: readonly ProPlan[] = [
  { id: 'monthly', name: 'Aylık Pro', interval: 'month', priceTRY: 590 },
  { id: 'yearly', name: 'Yıllık Pro', interval: 'year', priceTRY: 4900 },
  { id: 'founder', name: 'Kurucu Üye', interval: 'year', priceTRY: 2900, cap: 25, renewalPriceTRY: 2900 },
];

export function getProPlan(id: string | null | undefined): ProPlan | undefined {
  return PRO_PLANS.find((plan) => plan.id === id);
}

const MONTHS_PER_YEAR = 12;

/** Yıllık planın 12 aylık ödemeye göre tasarruf yüzdesi (hesaplanır, sabit yazılmaz). */
export function yearlySavingsPercent(): number {
  const monthly = getProPlan('monthly');
  const yearly = getProPlan('yearly');
  if (!monthly || !yearly) return 0;
  return savingsPercent(monthly.priceTRY * MONTHS_PER_YEAR, yearly.priceTRY);
}

/** firms.subscription_plan değerinden aktif plan etiketi. */
export function proPlanLabel(subscriptionPlan: string | null | undefined): string {
  return getProPlan(subscriptionPlan)?.name ?? 'Pro';
}

/** Kurucu Üye fiyatının yenilemede de aynı kalıp kalmadığı. */
export function founderRenewalLine(plan: ProPlan): string | null {
  if (plan.renewalPriceTRY === undefined) return null;
  const unit = plan.interval === 'year' ? 'yıl' : 'ay';
  return plan.renewalPriceTRY === plan.priceTRY
    ? `${formatTRY(plan.priceTRY)}/${unit}, yenilemede de sabit`
    : `Yenileme fiyatı ${formatTRY(plan.renewalPriceTRY)}/${unit}`;
}

// ---------------------------------------------------------------------------
// Pro özellikleri: yalnızca kodda kanıtı olan 'live' maddeler gösterilir
// ---------------------------------------------------------------------------

export interface ProFeature {
  id: string;
  label: string;
  desc: string;
  status: 'live' | 'planned';
  /** Özelliğin çalıştığını gösteren dosya/alan. */
  evidence: string;
}

// Yalnızca Pro'ya özel olan özellikler listelenir. Profil istatistikleri (src/app/firma/panel/FirmValuePanel.tsx)
// ve sahiplenilmiş profildeki 'Bu Firmadan Teklif Al' düğmesi (src/components/FirmDetailContent.tsx, `claimed`)
// ücretsiz firmalara da açıktır; bu yüzden Pro özelliği olarak listelenmez.
export const PRO_FEATURES: readonly ProFeature[] = [
  {
    id: 'listing-priority',
    label: 'Listelerde öncelikli sıralama',
    desc: 'Aktif Pro firmalar firma listelerinde standart profillerin üstünde yer alır.',
    status: 'live',
    evidence: 'src/hooks/useFirms.ts (is_premium sıralaması)',
  },
  {
    id: 'gallery',
    label: 'Sınırsız galeri',
    desc: 'Ücretsiz profilde 5 fotoğraf sınırı vardır; Pro profilde sınır yoktur.',
    status: 'live',
    evidence: 'src/views/FirmaGaleri.tsx (ücretsiz plan 5 fotoğraf sınırı)',
  },
  {
    id: 'projects',
    label: 'Proje vitrini',
    desc: 'Tamamladığınız projeleri açıklama ve fotoğraflarla profilinizde sergileyin.',
    status: 'live',
    evidence: 'src/views/FirmaProjeler.tsx (is_premium kapısı)',
  },
  {
    id: 'products',
    label: 'Ürün vitrini',
    desc: 'Sattığınız bitki ve malzemeleri profilinizde listeleyin.',
    status: 'live',
    evidence: 'src/views/FirmaUrunler.tsx (is_premium kapısı)',
  },
  {
    id: 'landing',
    label: 'Özel tanıtım sayfası',
    desc: 'Firmanıza ait, kendi içeriğinizle düzenlenebilir tanıtım sayfası.',
    status: 'live',
    evidence: 'src/views/FirmaLandingEditor.tsx',
  },
  {
    id: 'links',
    label: 'Web sitesi ve sosyal medya bağlantıları',
    desc: 'Profilinizden web sitenize ve sosyal medya hesaplarınıza izlenebilir bağlantılar.',
    status: 'live',
    evidence: 'src/components/FirmDetailContent.tsx (is_premium && firm.website, UTM etiketli)',
  },
  {
    id: 'lead-priority',
    label: 'Talep eşleştirmede öncelik',
    desc: 'Talepler firmalara dağıtılırken aktif Pro üyeliğiniz eşleşme puanınıza eklenir.',
    status: 'live',
    evidence: 'supabase/migrations/20261020150200_lead_pipeline_routing.sql (premium_active), src/lib/leadRouting.ts (premiumPoints)',
  },
  {
    id: 'verified-badge',
    label: 'Doğrulanmış firma rozeti',
    desc: 'Belge kontrolünden sonra profilde gösterilen rozet.',
    status: 'planned',
    evidence: 'Henüz yok',
  },
  {
    id: 'lead-discount',
    label: 'Lead fiyatında Pro indirimi',
    desc: 'Pro üyeler için lead satın alırken indirim.',
    status: 'planned',
    evidence: 'Henüz yok (OFFER_FLAGS.proLeadDiscountPct)',
  },
  {
    id: 'monthly-report',
    label: 'Aylık performans raporu',
    desc: 'Her ay e-postayla gelen özet rapor.',
    status: 'planned',
    evidence: 'Henüz yok',
  },
];

/** Arayüzde yalnızca çalışan özellikler gösterilir. */
export function getLiveProFeatures(features: readonly ProFeature[] = PRO_FEATURES): ProFeature[] {
  return features.filter((feature) => feature.status === 'live');
}

/** Plan kartlarında kısa liste olarak gösterilen özellikler (tümü Pro sayfasındadır). */
const PRO_HIGHLIGHT_IDS: readonly string[] = ['listing-priority', 'lead-priority', 'gallery', 'projects', 'landing'];

export function getProHighlights(): ProFeature[] {
  return getLiveProFeatures().filter((feature) => PRO_HIGHLIGHT_IDS.includes(feature.id));
}

// ---------------------------------------------------------------------------
// Teklif bayrakları: her söz, arkasındaki mekanizma varken açılır
// ---------------------------------------------------------------------------

export const OFFER_FLAGS = {
  /** Kurucu Üye planı ve 'kalan kontenjan' metni. Açılmadan önce: supabase/functions/create-premium-checkout
   *  'founder' planını get_founder_slots().remaining <= 0 iken reddetmeli (bugün hiçbir founder kontrolü yok,
   *  kontenjan yalnızca arayüzde gösterilir) ve 20261021103000_pricing_plans_try.sql içindeki 'founder'
   *  satırı active = true yapılmalıdır. */
  founderEnabled: false,
  /** 'İlk lead ücretsiz'. Açılmadan önce: sahiplenen firmaya bir kez jeton yükleyen sunucu tarafı
   *  mekanizma (örn. supabase/migrations/*_first_lead_grant.sql); bugün depoda yok. */
  firstLeadFree: false,
  /** 149/290/590 lead kademeleri. Açılmadan önce: lead fiyatını kademeye göre yazan yönlendirme
   *  (supabase/functions/create-lead + src/lib/leadRouting.ts); bugün lead fiyatı 5-55 jetondur. */
  leadTiersLive: false,
  /** Bölge Sponsoru ödemeli yayın. Açılmadan önce: src/app/hizmet/[hizmet]/[il]/page.tsx içinde
   *  <BannerAd placement="sponsor:..." variant="card" /> ve bir ödeme/fatura akışı. */
  sponsorLive: false,
  /** 'Aboneliği Yönet' (iptal, kart, fatura). Açılmadan önce: supabase/functions/create-billing-portal/index.ts. */
  billingPortal: false,
  /** 14 gün para iadesi. Açılmadan önce: iade süreci ve src/app/kullanim-kosullari/page.tsx içinde yazılı koşul. */
  moneyBack14d: false,
  /** Havale/EFT ile ödeme. Açılmadan önce: banka bilgileri, fatura süreci ve yöneticinin 'havale'
   *  ödemesini işleyeceği ekran (src/components/admin/AdminRevenueTab.tsx). */
  bankTransfer: false,
  /** Pro üyelere lead indirimi (yüzde). Açılmadan önce: purchase_lead indirimi uygulayan
   *  supabase/migrations/*_money_*.sql değişikliği. 0 = yok. */
  proLeadDiscountPct: 0,
};

// ---------------------------------------------------------------------------
// Bölge Sponsoru kademeleri
// ---------------------------------------------------------------------------

export interface SponsorTier {
  tier: 'A' | 'B' | 'C';
  label: string;
  monthlyTRY: number;
  /** C kademesi: null = A ve B dışındaki tüm iller (src/lib/cities.ts). */
  citySlugs: readonly string[] | null;
}

// Bu fiyatlar doğrulanmamış hipotezdir (M13); yaklaşık 10 firma görüşmesiyle sınanmalıdır.
export const SPONSOR_TIERS: readonly SponsorTier[] = [
  {
    tier: 'A',
    label: 'Büyük şehirler',
    monthlyTRY: 6000,
    citySlugs: ['istanbul', 'ankara', 'izmir', 'antalya', 'mugla'],
  },
  {
    tier: 'B',
    label: 'Orta ölçekli şehirler',
    monthlyTRY: 3000,
    citySlugs: [
      'bursa',
      'kocaeli',
      'tekirdag',
      'aydin',
      'mersin',
      'adana',
      'konya',
      'eskisehir',
      'gaziantep',
      'balikesir',
    ],
  },
  { tier: 'C', label: 'Diğer iller', monthlyTRY: 1500, citySlugs: null },
];

export function sponsorTierFor(citySlug: string): SponsorTier {
  const explicit = SPONSOR_TIERS.find((tier) => tier.citySlugs?.includes(citySlug));
  return explicit ?? SPONSOR_TIERS[SPONSOR_TIERS.length - 1];
}

export function sponsorMonthlyPrice(citySlug: string): number {
  return sponsorTierFor(citySlug).monthlyTRY;
}

/** Banner yerleşim anahtarı: sponsor:{kategori-slug}:{il-slug}. */
export function sponsorPlacement(categorySlug: string, citySlug: string): string {
  return `sponsor:${categorySlug}:${citySlug}`;
}

// ---------------------------------------------------------------------------
// Satış iletişimi
// ---------------------------------------------------------------------------

// Footer ve SUPPORT_CONTACT (src/lib/publicStats.ts) ile aynı herkese açık numara;
// bu dosya alias içermediği için burada tekrar tanımlıdır.
const FALLBACK_SALES_WHATSAPP = '905345957147';

/** NEXT_PUBLIC_SALES_WHATSAPP (yalnızca rakamlar, 90...) yoksa herkese açık destek numarası. */
export function SALES_WHATSAPP_URL(message?: string): string {
  const configured = (process.env.NEXT_PUBLIC_SALES_WHATSAPP ?? '').replace(/\D/g, '');
  const base = `https://wa.me/${configured || FALLBACK_SALES_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
