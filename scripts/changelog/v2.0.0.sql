-- Peyzajbul sürüm notu v.2.0.0 (changelog_entries tablosuna).
-- Bu bir migration DEĞİLDİR: Supabase SQL Editor'da elle çalıştırın ya da Admin > Değişiklik Günlüğü sekmesine yapıştırın.
-- is_published = false ile eklenir; yeni sürüm canlıya çıkıp migration'lar uygulandıktan sonra yayına alın:
--   update public.changelog_entries set is_published = true, published_at = now() where version = 'v.2.0.0';

insert into public.changelog_entries (version, title, content, is_published)
select 'v.2.0.0', 'Peyzajbul baştan yenilendi: yeni tasarım, güvenli teklif, firma sahiplenme ve maliyet hesaplayıcı',
$html$
<h3>Ziyaretçiler için</h3>
<ul>
  <li><strong>Yeni tasarım.</strong> Daha sade ve okunaklı görünüm, mobilde her zaman ulaşabileceğiniz "Ücretsiz teklif al" ve WhatsApp çubuğu.</li>
  <li><strong>Maliyet hesaplayıcı.</strong> Bahçenizin alanını, ilinizi ve istediğiniz işleri seçin, tahmini maliyet aralığını görün. Rakamlar editoryal tahmindir, bağlayıcı teklif değildir.</li>
  <li><strong>3 adımlı teklif formu.</strong> Daha kısa, mobilde rahat. Gönderdikten sonra talebinizin durumunu bağlantıyla takip edebilirsiniz.</li>
  <li><strong>Gerçek sayılar.</strong> Ana sayfadaki sayılar artık sabit yazılmış rakamlar değil, rehberdeki kayıtlardan canlı hesaplanıyor.</li>
  <li><strong>Çerez tercihleri.</strong> Analitik çerezler yalnızca onay verirseniz yüklenir.</li>
</ul>

<h3>Firmalar için</h3>
<ul>
  <li><strong>Profilinizi sahiplenin.</strong> Rehberde listelenen firmalar, size özel bağlantı ve e-posta koduyla profillerini birkaç dakikada sahiplenebilir. E-postası kayıtlı olmayan firmalar için WhatsApp ile doğrulama yolu da var.</li>
  <li><strong>Fiyatlandırma sayfası.</strong> Paketler ve fiyatlar TL olarak tek sayfada.</li>
  <li><strong>Panelde sayaçlar.</strong> Profilinizin görüntülenme, arama ve WhatsApp tıklama sayıları.</li>
  <li><strong>Daha güvenli jeton ve lead sistemi.</strong> Lead satın alma işlemi artık tek adımda ve çift harcamaya karşı korumalı. Yanlış gelen talepler için iade talebi akışı eklendi.</li>
  <li><strong>Listeden çıkma hakkı.</strong> Listelenmek istemeyen firmalar profillerinin kaldırılmasını isteyebilir.</li>
</ul>

<h3>Arka planda</h3>
<ul>
  <li>Güvenlik: erişim kuralları (RLS) sıkılaştırıldı, yönetici girişi ve görsel indirme uç noktası korundu, sahte sosyal kanıt ve doğrulanamayan iddialar kaldırıldı.</li>
  <li>AI Bahçe Tasarımı aracı kaldırıldı; yerine maliyet hesaplayıcı geldi.</li>
  <li>Yönetici panelinde firma listesinin sayfalaması düzeltildi.</li>
</ul>
$html$,
false
where not exists (select 1 from public.changelog_entries where version = 'v.2.0.0');
