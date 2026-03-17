CREATE OR REPLACE FUNCTION public.get_client_portal_data(p_client_id uuid, p_pin text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client json;
  v_joins json;
  v_payments json;
  v_purchases json;
  v_progress json;
  v_valid boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.clients WHERE id = p_client_id AND pin = p_pin AND status != 'Deleted'
  ) INTO v_valid;
  
  IF NOT v_valid THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT json_build_object(
    'id', c.id, 'name', c.name, 'phone', c.phone, 'status', c.status,
    'goal', c.goal, 'is_inactive', c.is_inactive, 'advance_balance', c.advance_balance,
    'created_at', c.created_at, 'onboarding_completed', c.onboarding_completed
  ) INTO v_client FROM public.clients c WHERE c.id = p_client_id;

  SELECT COALESCE(json_agg(row_to_json(j_data) ORDER BY j_data.join_date DESC), '[]'::json) INTO v_joins
  FROM (
    SELECT j.id, j.join_date, j.expiry_date, j.custom_price, j.created_at,
      json_build_object('id', p.id, 'name', p.name, 'duration_months', p.duration_months, 'price', p.price) as plan
    FROM public.joins j LEFT JOIN public.plans p ON j.plan_id = p.id
    WHERE j.client_id = p_client_id
  ) j_data;

  SELECT COALESCE(json_agg(row_to_json(p_data) ORDER BY p_data.payment_date DESC), '[]'::json) INTO v_payments
  FROM (
    SELECT id, amount, payment_date, payment_method, payment_type, notes, due_before, due_after, created_at
    FROM public.payments WHERE client_id = p_client_id
  ) p_data;

  SELECT COALESCE(json_agg(row_to_json(pp_data) ORDER BY pp_data.purchase_date DESC), '[]'::json) INTO v_purchases
  FROM (
    SELECT pp.id, pp.quantity, pp.unit_price, pp.total_price, pp.purchase_date, pp.notes,
      json_build_object('name', pr.name, 'category', pr.category) as product
    FROM public.product_purchases pp LEFT JOIN public.products pr ON pp.product_id = pr.id
    WHERE pp.client_id = p_client_id
  ) pp_data;

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
$function$;