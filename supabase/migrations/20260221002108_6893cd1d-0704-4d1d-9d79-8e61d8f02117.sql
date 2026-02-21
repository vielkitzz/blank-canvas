
-- Insert 31 more teams for testing (Team A1 already exists)
DO $$
DECLARE
  uid TEXT := 'c45afd9b-0bb9-497c-b270-221ebcaf18f9';
  team_names TEXT[] := ARRAY[
    'Time A2','Time A3','Time A4','Time B1','Time B2','Time B3','Time B4',
    'Time C1','Time C2','Time C3','Time C4','Time D1','Time D2','Time D3','Time D4',
    'Time E1','Time E2','Time E3','Time E4','Time F1','Time F2','Time F3','Time F4',
    'Time G1','Time G2','Time G3','Time G4','Time H1','Time H2','Time H3','Time H4'
  ];
  i INT;
BEGIN
  FOR i IN 1..31 LOOP
    INSERT INTO teams (id, user_id, name, short_name, abbreviation, colors, rate)
    VALUES (
      gen_random_uuid()::text,
      uid,
      team_names[i],
      team_names[i],
      UPPER(LEFT(REPLACE(team_names[i], 'Time ', ''), 3)),
      '["#333333","#cccccc"]',
      (3 + random() * 4)::numeric(4,2)
    );
  END LOOP;
END $$;
