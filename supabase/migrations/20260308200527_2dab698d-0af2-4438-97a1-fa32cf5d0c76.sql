
ALTER TABLE public.firms ADD COLUMN slug text UNIQUE;

-- Generate slugs for existing firms
UPDATE public.firms SET slug = 
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                lower(company_name),
                'ğ', 'g', 'g'),
              'ü', 'u', 'g'),
            'ş', 's', 'g'),
          'ı', 'i', 'g'),
        'ö', 'o', 'g'),
      'ç', 'c', 'g'),
    '[^a-z0-9]+', '-', 'g')
  || '-' || left(id::text, 8);
