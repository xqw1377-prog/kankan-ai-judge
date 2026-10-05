-- One analysis row can be saved once. A second call does not create another meal.
-- The client role cannot call the function.

INSERT INTO public.meal_analyses (id, user_id, food_name, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '一次性午饭', 480, 24, 12, 60, '[{"name":"米饭","grams":200}]'::jsonb, '油脂还好。', '先吃菜。'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '替换用晚饭', 520, 30, 14, 55, '[{"name":"青菜","grams":150}]'::jsonb, '可以。', '正常吃。');

DO $$
DECLARE
  first_status text;
  second_status text;
  foreign_status text;
  meal_count int;
  saved_id uuid;
  replaced_name text;
  replace_status text;
  replay_status text;
BEGIN
  SELECT public.consume_analysis_into_meal(
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'lunch',
    NULL
  ) ->> 'status' INTO first_status;
  IF first_status IS DISTINCT FROM 'created' THEN
    RAISE EXCEPTION 'first consume should create a meal, got %', first_status;
  END IF;

  SELECT public.consume_analysis_into_meal(
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'lunch',
    NULL
  ) ->> 'status' INTO second_status;
  IF second_status IS DISTINCT FROM 'already_consumed' THEN
    RAISE EXCEPTION 'second consume should be already_consumed, got %', second_status;
  END IF;

  SELECT public.consume_analysis_into_meal(
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dinner',
    NULL
  ) ->> 'status' INTO foreign_status;
  IF foreign_status IS DISTINCT FROM 'missing' THEN
    RAISE EXCEPTION 'another user should not consume this analysis, got %', foreign_status;
  END IF;

  SELECT count(*) INTO meal_count FROM public.meal_records WHERE food_name = '一次性午饭';
  IF meal_count <> 1 THEN
    RAISE EXCEPTION 'analysis should produce exactly one meal, saw %', meal_count;
  END IF;

  SELECT id INTO saved_id FROM public.meal_records WHERE food_name = '一次性午饭';
  SELECT public.consume_analysis_into_meal(
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'dinner',
    saved_id
  ) ->> 'status' INTO replace_status;
  IF replace_status IS DISTINCT FROM 'created' THEN
    RAISE EXCEPTION 'replace should consume a fresh analysis, got %', replace_status;
  END IF;

  SELECT food_name INTO replaced_name FROM public.meal_records WHERE id = saved_id;
  IF replaced_name IS DISTINCT FROM '替换用晚饭' THEN
    RAISE EXCEPTION 'replace should copy the new analysis, saw %', replaced_name;
  END IF;

  SELECT count(*) INTO meal_count FROM public.meal_records WHERE food_name IN ('一次性午饭', '替换用晚饭');
  IF meal_count <> 1 THEN
    RAISE EXCEPTION 'replace should not insert a second meal, saw %', meal_count;
  END IF;

  SELECT public.consume_analysis_into_meal(
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'dinner',
    NULL
  ) ->> 'status' INTO replay_status;
  IF replay_status IS DISTINCT FROM 'already_consumed' THEN
    RAISE EXCEPTION 'a consumed analysis cannot be saved again, got %', replay_status;
  END IF;
END $$;

SET ROLE kankan_app;
DO $$
BEGIN
  PERFORM public.consume_analysis_into_meal(
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'lunch',
    NULL
  );
  RAISE EXCEPTION 'client role executed consume_analysis_into_meal';
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END $$;
RESET ROLE;
