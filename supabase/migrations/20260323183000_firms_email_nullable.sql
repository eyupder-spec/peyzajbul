-- firms tablosunda email artık zorunlu değil (toplu firmalar için)
ALTER TABLE firms ALTER COLUMN email DROP NOT NULL;
