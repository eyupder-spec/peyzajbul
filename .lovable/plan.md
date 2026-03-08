

## Tiptap vs Custom contentEditable Karşılaştırması

Haklısınız — ilk planda bundle boyutunu küçük tutmak için custom `contentEditable` önermiştim, ancak Tiptap aslında daha iyi bir seçim:

### Neden Tiptap Daha İyi?

| Kriter | Custom contentEditable | Tiptap |
|--------|----------------------|--------|
| Geliştirme süresi | Uzun, her özellik elle yazılır | Hızlı, hazır extensionlar |
| `document.execCommand` | Tarayıcılarda deprecated, tutarsız | ProseMirror tabanlı, stabil |
| Görsel yükleme | Manuel implement | Extension ile kolay |
| HTML çıktı kalitesi | Tutarsız | Temiz, öngörülebilir |
| Bundle boyutu | ~0 KB | ~150-200 KB (gzipped ~50 KB) |
| Bakım | Her edge case elle çözülür | Topluluk desteği |

`document.execCommand` modern tarayıcılarda deprecated — custom editör kırılgan ve bakımı zor olur. Tiptap'in boyutu kabul edilebilir ve çok daha güvenilir.

### Güncellenmiş Plan

Önceki planla aynı, tek fark editör yaklaşımı:

- **Paketler:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`
- **`BlogEditor.tsx`:** Tiptap editör + toolbar (bold, italic, h2/h3, liste, link, görsel yükleme)
- Geri kalan her şey (DB, sayfalar, WhatsApp, ilgili firmalar) aynı kalır

Onaylarsanız tiptap ile birlikte tüm blog sistemi + WhatsApp entegrasyonunu uygulayacağım.

