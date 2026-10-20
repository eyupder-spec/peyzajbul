import { CITIES } from "./cities";

export const seoCities = CITIES.map(city => ({
  slug: city.slug,
  name: city.name
}));

export const featuredCities = [
  { slug: "istanbul", name: "İstanbul" },
  { slug: "ankara", name: "Ankara" },
  { slug: "izmir", name: "İzmir" },
  { slug: "antalya", name: "Antalya" },
  { slug: "bursa", name: "Bursa" }
];

////////////////////////////////////////////////////
// İLÇELER
////////////////////////////////////////////////////

export const seoDistricts: Record<string, { slug: string; name: string }[]> = {
  istanbul: [
    { slug: "kadikoy", name: "Kadıköy" },
    { slug: "besiktas", name: "Beşiktaş" },
    { slug: "sariyer", name: "Sarıyer" },
    { slug: "bakirkoy", name: "Bakırköy" },
    { slug: "sisli", name: "Şişli" }
  ],
  ankara: [
    { slug: "cankaya", name: "Çankaya" },
    { slug: "yenimahalle", name: "Yenimahalle" },
    { slug: "kecioren", name: "Keçiören" }
  ],
  izmir: [
    { slug: "bornova", name: "Bornova" },
    { slug: "karsiyaka", name: "Karşıyaka" },
    { slug: "cesme", name: "Çeşme" }
  ],
  antalya: [
    { slug: "muratpasa", name: "Muratpaşa" },
    { slug: "konyaalti", name: "Konyaaltı" },
    { slug: "alanya", name: "Alanya" }
  ],
  bursa: [
    { slug: "nilufer", name: "Nilüfer" },
    { slug: "osmangazi", name: "Osmangazi" }
  ]
};

////////////////////////////////////////////////////
// MAP
////////////////////////////////////////////////////

export const cityMap = Object.fromEntries(
  seoCities.map(c => [c.slug, c.name])
);

////////////////////////////////////////////////////
// NAME HELPERS
////////////////////////////////////////////////////

export function getCityName(slug: string): string {
  return cityMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function getDistrictName(citySlug: string, districtSlug: string): string {
  const districts = seoDistricts[citySlug] || [];
  const district = districts.find(d => d.slug === districtSlug);
  if (district) return district.name;
  return districtSlug.charAt(0).toUpperCase() + districtSlug.slice(1);
}

////////////////////////////////////////////////////
// SEO TITLE
////////////////////////////////////////////////////

export function getSeoTitle(
  serviceName: string,
  city: string,
  district?: string
) {
  const cityName = getCityName(city);

  if (district) {
    const districtName = getDistrictName(city, district);
    return `${districtName} ${serviceName} Hizmeti | ${cityName} Peyzaj Firmaları`;
  }

  return `${cityName} ${serviceName} Hizmeti | Peyzaj Firmaları`;
}

////////////////////////////////////////////////////
// SEO DESCRIPTION
////////////////////////////////////////////////////

export function getSeoDescription(
  serviceName: string,
  city: string,
  district?: string
) {
  const cityName = getCityName(city);

  if (district) {
    const districtName = getDistrictName(city, district);
    return `${districtName} bölgesinde profesyonel ${serviceName} hizmeti veren peyzaj firmalarını keşfedin. Projeler, fiyat bilgileri ve firma listesi.`;
  }

  return `${cityName} bölgesinde profesyonel ${serviceName} hizmeti veren peyzaj firmalarını keşfedin. Projeler, fiyat bilgileri ve firma listesi.`;
}

////////////////////////////////////////////////////
// PARAM GENERATOR
////////////////////////////////////////////////////

export function generateServiceCityParams(services: { slug: string }[]) {
  const params: { hizmet: string; il: string }[] = [];

  services.forEach(service => {
    seoCities.forEach(city => {
      params.push({
        hizmet: service.slug,
        il: city.slug
      });
    });
  });

  return params;
}

////////////////////////////////////////////////////
// DYNAMIC GEO FAQ GENERATOR
////////////////////////////////////////////////////

export function generateServiceCityFaq(
  serviceLabel: string,
  cityName: string,
  districtName?: string
): { question: string; answer: string }[] {
  const location = districtName || cityName;
  const locationFull = districtName ? `${districtName}, ${cityName}` : cityName;

  return [
    {
      question: `${location} bölgesinde ${serviceLabel.toLowerCase()} hizmeti veren firma var mı?`,
      answer: `Evet, ${locationFull} bölgesinde ${serviceLabel.toLowerCase()} hizmeti sunan onaylı peyzaj firmaları bulunmaktadır. Peyzajbul üzerinden bölgenizdeki firmaları listeleyebilir, portföylerini inceleyebilir ve ücretsiz teklif alabilirsiniz.`
    },
    {
      question: `${locationFull} bölgesinde ${serviceLabel.toLowerCase()} için nasıl teklif alabilirim?`,
      answer: `${locationFull} bölgesinde ${serviceLabel.toLowerCase()} hizmeti için Peyzajbul üzerinden birden fazla firmaya aynı anda teklif talebi gönderebilirsiniz. Firmalar projenizi değerlendirerek size özel fiyat tekliflerini iletecek, siz de bütçenize en uygun seçeneği belirleyebileceksiniz.`
    },
    {
      question: `${serviceLabel} firması seçerken nelere dikkat etmeliyim?`,
      answer: `${locationFull} bölgesinde ${serviceLabel.toLowerCase()} firması seçerken daha önce tamamladıkları projeleri incelemek, müşteri yorumlarını okumak ve birden fazla firmadan teklif alarak karşılaştırma yapmak önemlidir. Peyzajbul üzerinde firma profillerinde yer alan referanslar ve puanlar karar vermenize yardımcı olur.`
    }
  ];
}

export function generateServiceCityDistrictParams(
  services: { slug: string }[]
) {
  const params: { hizmet: string; il: string; ilce: string }[] = [];

  services.forEach(service => {
    seoCities.forEach(city => {
      const districts = seoDistricts[city.slug] || [];
      districts.forEach(district => {
        params.push({
          hizmet: service.slug,
          il: city.slug,
          ilce: district.slug
        });
      });
    });
  });

  return params;
}
