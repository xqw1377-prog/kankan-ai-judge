-- One stored analysis can become one meal. The row lock makes the
-- check and the insert a single transaction, including concurrent calls.

ALTER TABLE public.meal_analyses
  ADD COLUMN IF NOT EXISTS meal_id uuid REFERENCES public.meal_records(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.consume_analysis_into_meal(
  p_user_id uuid,
  p_analysis_id uuid,
  p_meal_type text,
  p_replace_meal_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  analysis public.meal_analyses%ROWTYPE;
  meal public.meal_records%ROWTYPE;
  chosen text;
BEGIN
  SELECT * INTO analysis
  FROM public.meal_analyses
  WHERE id = p_analysis_id
  FOR UPDATE;

  IF NOT FOUND OR analysis.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('status', 'missing');
  END IF;

  IF analysis.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_consumed', 'meal_id', analysis.meal_id);
  END IF;

  chosen := CASE
    WHEN p_meal_type IN ('breakfast', 'lunch', 'dinner', 'snack') THEN p_meal_type
    ELSE 'snack'
  END;

  IF p_replace_meal_id IS NOT NULL THEN
    UPDATE public.meal_records
    SET food_name = analysis.food_name,
        calories = analysis.calories,
        protein_g = analysis.protein_g,
        fat_g = analysis.fat_g,
        carbs_g = analysis.carbs_g,
        ingredients = analysis.ingredients,
        verdict = analysis.verdict,
        suggestion = analysis.suggestion
    WHERE id = p_replace_meal_id
      AND user_id = p_user_id
    RETURNING * INTO meal;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'missing_meal');
    END IF;
  ELSE
    INSERT INTO public.meal_records (
      user_id, food_name, meal_type, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion
    ) VALUES (
      p_user_id,
      analysis.food_name,
      chosen,
      analysis.calories,
      analysis.protein_g,
      analysis.fat_g,
      analysis.carbs_g,
      analysis.ingredients,
      analysis.verdict,
      analysis.suggestion
    )
    RETURNING * INTO meal;
  END IF;

  UPDATE public.meal_analyses
  SET consumed_at = now(),
      meal_id = meal.id
  WHERE id = analysis.id;

  RETURN jsonb_build_object('status', 'created', 'meal', to_jsonb(meal));
END;
$$;

REVOKE ALL ON FUNCTION public.consume_analysis_into_meal(uuid, uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_analysis_into_meal(uuid, uuid, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.consume_analysis_into_meal(uuid, uuid, text, uuid) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.consume_analysis_into_meal(uuid, uuid, text, uuid) TO service_role;
  END IF;
END $$;
