#!/usr/bin/env python3
"""
Quick test for get_suitable_exercises() and table row counts.
Run from the same folder as seed_import.py.
No data is written — read-only queries only.
"""

import os, sys
try:
    from supabase import create_client
except ImportError:
    print("Run: pip install supabase"); sys.exit(1)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Set SUPABASE_URL and SUPABASE_KEY env vars first."); sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── 1. Row counts ──────────────────────────────────────────────
print("\n══  Table row counts  ══")
for t in ["exercises","exercise_equipment","exercise_muscles",
          "exercise_locations","exercise_contraindications"]:
    r = sb.table(t).select("id", count="exact").execute()
    print(f"  {t:<40} {r.count} rows")

# ── 2. Sample exercise check ───────────────────────────────────
print("\n══  Sample from v_exercise_filter (first 3)  ══")
rows = sb.table("v_exercise_filter").select(
    "name,category,equipment_slugs,locations,primary_muscles,absolute_contraindications"
).limit(3).execute()
for r in rows.data:
    print(f"\n  {r['name']}")
    print(f"    category      : {r['category']}")
    print(f"    equipment     : {r['equipment_slugs']}")
    print(f"    locations     : {r['locations']}")
    print(f"    muscles       : {r['primary_muscles']}")
    print(f"    contraindicated for: {r['absolute_contraindications']}")

# ── 3. AI filter scenarios ─────────────────────────────────────
scenarios = [
    {
        "label": "Home · bodyweight+bands · weight loss · female 35 · exclude knee+back pain",
        "params": {
            "p_user_id": None, "p_location": "home",
            "p_equipment_slugs": ["bodyweight","resistance_bands","yoga_mat"],
            "p_fitness_level": "beginner", "p_goals": ["weight_loss","general_fitness"],
            "p_age": 35, "p_gender": "female",
            "p_exclude_conditions": ["knee_pain","lower_back_pain"],
            "p_category": None, "p_is_compound": None,
            "p_duration_max_sec": None, "p_limit": 10,
        }
    },
    {
        "label": "Office · no equipment · desk worker · posture correction · any age",
        "params": {
            "p_user_id": None, "p_location": "office",
            "p_equipment_slugs": ["bodyweight","office_chair","wall"],
            "p_fitness_level": "sedentary", "p_goals": ["posture_correction","stress_relief"],
            "p_age": None, "p_gender": None,
            "p_exclude_conditions": [],
            "p_category": None, "p_is_compound": None,
            "p_duration_max_sec": None, "p_limit": 10,
        }
    },
    {
        "label": "Gym · dumbbells+barbell · muscle gain · male 25 · intermediate · no conditions",
        "params": {
            "p_user_id": None, "p_location": "gym",
            "p_equipment_slugs": ["dumbbells","barbell","bench","pullup_bar"],
            "p_fitness_level": "intermediate", "p_goals": ["muscle_gain"],
            "p_age": 25, "p_gender": "male",
            "p_exclude_conditions": [],
            "p_category": "strength", "p_is_compound": True,
            "p_duration_max_sec": None, "p_limit": 10,
        }
    },
    {
        "label": "Home · elderly (68F) · resistance bands · knee+shoulder impingement",
        "params": {
            "p_user_id": None, "p_location": "home",
            "p_equipment_slugs": ["bodyweight","resistance_bands","yoga_mat","foam_roller"],
            "p_fitness_level": "sedentary", "p_goals": ["rehabilitation","general_fitness"],
            "p_age": 68, "p_gender": "female",
            "p_exclude_conditions": ["knee_pain","shoulder_impingement","lower_back_pain"],
            "p_category": None, "p_is_compound": None,
            "p_duration_max_sec": None, "p_limit": 10,
        }
    },
    {
        "label": "Hotel room · no equipment · HIIT · male 30 · advanced · no conditions",
        "params": {
            "p_user_id": None, "p_location": "hotel",
            "p_equipment_slugs": ["bodyweight","yoga_mat","jump_rope"],
            "p_fitness_level": "advanced", "p_goals": ["weight_loss","cardiovascular_health"],
            "p_age": 30, "p_gender": "male",
            "p_exclude_conditions": [],
            "p_category": None, "p_is_compound": None,
            "p_duration_max_sec": None, "p_limit": 10,
        }
    },
]

print("\n══  AI filter scenarios  ══")
for s in scenarios:
    print(f"\n  ▸ {s['label']}")
    try:
        res = sb.rpc("get_suitable_exercises", s["params"]).execute()
        print(f"    → {len(res.data)} exercises returned")
        for ex in res.data:
            contras = ex.get('contraindication_count', 0)
            flag = "⚠" if contras > 0 else "✓"
            print(f"      {flag} {ex['exercise_name']:<35} MET:{ex['met_value'] or '—':<5}  cautions:{contras}")
    except Exception as e:
        print(f"    ✗ ERROR: {e}")

print("\n══  All tests complete  ══\n")
