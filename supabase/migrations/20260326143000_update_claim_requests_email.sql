-- claim_requests tablosundaki tax_number kolonunu email ile değiştirme
alter table public.claim_requests add column email text;
alter table public.claim_requests drop column tax_number;

-- RLS politikalarını veya trigger'ları etkilemediğinden emin olun (varsa)
comment on column public.claim_requests.email is 'Firma sahiplenme talebinde belirtilen gerçek iletişim e-postası';
