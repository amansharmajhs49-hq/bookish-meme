
-- Add PIN column to clients table for self-service portal access
ALTER TABLE public.clients ADD COLUMN pin text DEFAULT NULL;

-- Create a function for portal verification (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.verify_client_portal(p_phone text, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_client_name text;
BEGIN
  SELECT id, name INTO v_client_id, v_client_name
  FROM public.clients
  WHERE phone = p_phone AND pin = p_pin AND status != 'Deleted'
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid phone number or PIN');
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'client_id', v_client_id,
    'client_name', v_client_name
  );
END;
$$;

-- Create a function to get client portal data (security definer)
CREATE OR REPLACE FUNCTION public.get_client_portal_data(p_client_id uuid, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client json;
  v_joins json;
  v_payments json;
  v_purchases json;
  v_progress json;
  v_valid boolean;
BEGIN
  -- Verify PIN matches
  SELECT EXISTS(
    SELECT 1 FROM public.clients WHERE id = p_client_id AND pin = p_pin AND status != 'Deleted'
  ) INTO v_valid;
  
  IF NOT v_valid THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Client info (exclude PIN)
  SELECT json_build_object(
    'id', c.id, 'name', c.name, 'phone', c.phone, 'status', c.status,
    'goal', c.goal, 'is_inactive', c.is_inactive, 'advance_balance', c.advance_balance,
    'created_at', c.created_at
  ) INTO v_client FROM public.clients c WHERE c.id = p_client_id;

  -- Joins with plan details
  SELECT COALESCE(json_agg(row_to_json(j_data) ORDER BY j_data.join_date DESC), '[]'::json) INTO v_joins
  FROM (
    SELECT j.id, j.join_date, j.expiry_date, j.custom_price, j.created_at,
      json_build_object('id', p.id, 'name', p.name, 'duration_months', p.duration_months, 'price', p.price) as plan
    FROM public.joins j LEFT JOIN public.plans p ON j.plan_id = p.id
    WHERE j.client_id = p_client_id
  ) j_data;

  -- Payments
  SELECT COALESCE(json_agg(row_to_json(p_data) ORDER BY p_data.payment_date DESC), '[]'::json) INTO v_payments
  FROM (
    SELECT id, amount, payment_date, payment_method, payment_type, notes, due_before, due_after, created_at
    FROM public.payments WHERE client_id = p_client_id
  ) p_data;

  -- Product purchases
  SELECT COALESCE(json_agg(row_to_json(pp_data) ORDER BY pp_data.purchase_date DESC), '[]'::json) INTO v_purchases
  FROM (
    SELECT pp.id, pp.quantity, pp.unit_price, pp.total_price, pp.purchase_date, pp.notes,
      json_build_object('name', pr.name, 'category', pr.category) as product
    FROM public.product_purchases pp LEFT JOIN public.products pr ON pp.product_id = pr.id
    WHERE pp.client_id = p_client_id
  ) pp_data;

  -- Body progress
  SELECT COALESCE(json_agg(row_to_json(bp_data) ORDER BY bp_data.recorded_at DESC), '[]'::json) INTO v_progress
  FROM (
    SELECT id, recorded_at, weight, height, body_fat, chest, waist, hips, biceps, thighs, notes
    FROM public.body_progress WHERE client_id = p_client_id
  ) bp_data;

  RETURN json_build_object(
    'success', true,
    'client', v_client,
    'joins', v_joins,
    'payments', v_payments,
    'purchases', v_purchases,
    'progress', v_progress
  );
END;
$$;
