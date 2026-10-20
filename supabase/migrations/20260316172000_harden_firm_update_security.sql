-- Fix for "Function has a role mutable search_path"
-- This sets a secure search_path for sensitive functions to prevent Search Path Hijacking.

ALTER FUNCTION public.check_firm_update_security() 
SET search_path = public;

ALTER FUNCTION public.notify_firms_on_new_lead() 
SET search_path = public;
