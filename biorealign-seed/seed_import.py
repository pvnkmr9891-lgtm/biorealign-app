#!/usr/bin/env python3
"""
BioRealign Exercise Library Seed Script
========================================
Reads the 5 CSV files and imports them into Supabase,
resolving all slug → UUID relationships at import time.

Usage:
  pip install supabase
  python seed_import.py

Required env vars (or update SUPABASE_URL / SUPABASE_KEY below):
  SUPABASE_URL   — your project URL
  SUPABASE_KEY   — service role key (not anon key — needs admin access)
"""

import csv
import os
import sys
import time
import uuid
from pathlib import Path

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

# ──────────────────────────────────────────────────────────────
#  CONFIG — update these or set as env vars
# ──────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR_PROJECT_REF.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "YOUR_SERVICE_ROLE_KEY")

SCRIPT_DIR  = Path(__file__).parent
CSV_DIR     = SCRIPT_DIR  # CSVs are in the same folder as this script

FILES = {
    "exercises":          CSV_DIR / "exercises.csv",
    "equipment_map":      CSV_DIR / "exercise_equipment_map.csv",
    "muscles_map":        CSV_DIR / "exercise_muscles_map.csv",
    "locations_map":      CSV_DIR / "exercise_locations_map.csv",
    "contraindications":  CSV_DIR / "exercise_contraindications_map.csv",
}

BATCH_SIZE = 50  # rows per Supabase upsert call

# ──────────────────────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────────────────────

def load_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def batch(lst: list, n: int):
    for i in range(0, len(lst), n):
        yield lst[i:i+n]

def safe_int(val, default=None):
    try:
        return int(val) if val not in (None, "", "NULL") else default
    except ValueError:
        return default

def safe_float(val, default=None):
    try:
        return float(val) if val not in (None, "", "NULL") else default
    except ValueError:
        return default

def safe_bool(val, default=False):
    if isinstance(val, bool):
        return val
    if str(val).lower() in ("true", "1", "yes"):
        return True
    if str(val).lower() in ("false", "0", "no"):
        return False
    return default

def pipe_list(val: str) -> list[str]:
    """Split a pipe-separated string into a list, stripping blanks."""
    if not val or val.strip() == "":
        return []
    return [v.strip() for v in val.split("|") if v.strip()]

def log(msg: str, level: str = "INFO"):
    symbol = {"INFO": "•", "OK": "✓", "WARN": "⚠", "ERROR": "✗", "HEAD": "═"}.get(level, "•")
    print(f"  {symbol}  {msg}")

# ──────────────────────────────────────────────────────────────
#  SLUG → UUID LOOKUP MAPS
# ──────────────────────────────────────────────────────────────

def build_lookup(supabase: Client, table: str, slug_col: str = "slug") -> dict[str, str]:
    """Fetch all rows from a table and return {slug: id} map."""
    rows = supabase.table(table).select(f"id,{slug_col}").execute()
    return {row[slug_col]: row["id"] for row in rows.data}

# ──────────────────────────────────────────────────────────────
#  STEP 1 — INSERT EXERCISES
# ──────────────────────────────────────────────────────────────

VALID_CATEGORIES = {
    "strength","cardio","hiit","flexibility","mobility",
    "balance","rehabilitation","sport_specific","mind_body","functional"
}
VALID_FITNESS_LEVELS = {"sedentary","beginner","intermediate","advanced","elite"}
VALID_GENDER        = {"male","female","all"}
VALID_GOALS = {
    "weight_loss","muscle_gain","muscle_toning","endurance","flexibility",
    "stress_relief","cardiovascular_health","rehabilitation",
    "sport_performance","general_fitness","posture_correction","longevity"
}

def build_exercise_rows(rows: list[dict]) -> list[dict]:
    records = []
    for r in rows:
        p_goals = [g for g in pipe_list(r.get("primary_goals",""))   if g in VALID_GOALS]
        s_goals = [g for g in pipe_list(r.get("secondary_goals","")) if g in VALID_GOALS]
        cat = r.get("category","").strip()
        if cat not in VALID_CATEGORIES:
            log(f"SKIP {r['slug']}: unknown category '{cat}'", "WARN")
            continue
        records.append({
            "name":               r["name"].strip(),
            "slug":               r["slug"].strip(),
            "category":           cat,
            "sub_category":       r.get("sub_category","").strip() or None,
            "movement_pattern":   r.get("movement_pattern","").strip() or None,
            "is_compound":        safe_bool(r.get("is_compound"), True),
            "is_unilateral":      safe_bool(r.get("is_unilateral"), False),
            "gender_suitability": r.get("gender_suitability","all").strip(),
            "min_age":            safe_int(r.get("min_age"), 14),
            "max_age":            safe_int(r.get("max_age"), 85),
            "min_fitness_level":  r.get("min_fitness_level","beginner").strip(),
            "max_fitness_level":  r.get("max_fitness_level","elite").strip(),
            "primary_goals":      p_goals,
            "secondary_goals":    s_goals,
            "default_sets":       safe_int(r.get("default_sets")),
            "default_reps_min":   safe_int(r.get("default_reps_min")),
            "default_reps_max":   safe_int(r.get("default_reps_max")),
            "default_duration_sec": safe_int(r.get("default_duration_sec")),
            "default_rest_sec":   safe_int(r.get("default_rest_sec"), 60),
            "met_value":          safe_float(r.get("met_value")),
            "ai_tags":            pipe_list(r.get("ai_tags","")),
            "is_active":          True,
            "is_verified":        False,
        })
    return records

def insert_exercises(supabase: Client, rows: list[dict]) -> dict[str, str]:
    records = build_exercise_rows(rows)
    log(f"Inserting {len(records)} exercises …")
    inserted = 0
    skipped  = 0
    for chunk in batch(records, BATCH_SIZE):
        try:
            res = supabase.table("exercises").upsert(
                chunk, on_conflict="slug"
            ).execute()
            inserted += len(res.data)
        except Exception as e:
            log(f"Batch error: {e}", "ERROR")
            skipped += len(chunk)
    log(f"Exercises — inserted/updated: {inserted}  skipped: {skipped}", "OK")
    # Rebuild lookup after insert
    return build_lookup(supabase, "exercises")

# ──────────────────────────────────────────────────────────────
#  STEP 2 — EXERCISE ↔ EQUIPMENT
# ──────────────────────────────────────────────────────────────

def insert_exercise_equipment(
    supabase: Client,
    rows: list[dict],
    ex_map: dict[str, str],
    eq_map: dict[str, str],
):
    records = []
    missing = set()
    for r in rows:
        ex_id = ex_map.get(r["exercise_slug"])
        eq_id = eq_map.get(r["equipment_slug"])
        if not ex_id:
            missing.add(r["exercise_slug"])
            continue
        if not eq_id:
            log(f"Equipment slug not found: {r['equipment_slug']}", "WARN")
            continue
        records.append({
            "exercise_id":          ex_id,
            "equipment_id":         eq_id,
            "is_required":          safe_bool(r.get("is_required"), True),
            "is_alternative":       safe_bool(r.get("is_alternative"), False),
            "difficulty_modifier":  safe_int(r.get("difficulty_modifier"), 0),
            "notes":                r.get("notes","").strip() or None,
        })
    if missing:
        log(f"Exercise slugs not in DB (skipped): {', '.join(sorted(missing))}", "WARN")
    log(f"Inserting {len(records)} exercise_equipment rows …")
    count = 0
    for chunk in batch(records, BATCH_SIZE):
        try:
            res = supabase.table("exercise_equipment").upsert(
                chunk, on_conflict="exercise_id,equipment_id"
            ).execute()
            count += len(res.data)
        except Exception as e:
            log(f"Batch error: {e}", "ERROR")
    log(f"exercise_equipment — inserted/updated: {count}", "OK")

# ──────────────────────────────────────────────────────────────
#  STEP 3 — EXERCISE ↔ MUSCLES
# ──────────────────────────────────────────────────────────────

VALID_ROLES = {"primary","secondary","stabiliser"}

def insert_exercise_muscles(
    supabase: Client,
    rows: list[dict],
    ex_map: dict[str, str],
    mg_map: dict[str, str],
):
    records = []
    missing_ex = set()
    missing_mg = set()
    for r in rows:
        ex_id = ex_map.get(r["exercise_slug"])
        mg_id = mg_map.get(r["muscle_slug"])
        role  = r.get("role","primary").strip()
        if not ex_id:
            missing_ex.add(r["exercise_slug"])
            continue
        if not mg_id:
            missing_mg.add(r["muscle_slug"])
            continue
        if role not in VALID_ROLES:
            log(f"Unknown role '{role}' — defaulting to 'secondary'", "WARN")
            role = "secondary"
        records.append({
            "exercise_id":    ex_id,
            "muscle_group_id": mg_id,
            "role":           role,
        })
    if missing_ex:
        log(f"Missing exercise slugs for muscles: {', '.join(sorted(missing_ex))}", "WARN")
    if missing_mg:
        log(f"Missing muscle slugs: {', '.join(sorted(missing_mg))}", "WARN")
    log(f"Inserting {len(records)} exercise_muscles rows …")
    count = 0
    for chunk in batch(records, BATCH_SIZE):
        try:
            res = supabase.table("exercise_muscles").upsert(
                chunk, on_conflict="exercise_id,muscle_group_id,role"
            ).execute()
            count += len(res.data)
        except Exception as e:
            log(f"Batch error: {e}", "ERROR")
    log(f"exercise_muscles — inserted/updated: {count}", "OK")

# ──────────────────────────────────────────────────────────────
#  STEP 4 — EXERCISE ↔ LOCATIONS
# ──────────────────────────────────────────────────────────────

VALID_LOCATIONS = {"gym","home","office","outdoor","hotel","pool","any"}

def insert_exercise_locations(
    supabase: Client,
    rows: list[dict],
    ex_map: dict[str, str],
):
    records = []
    missing = set()
    for r in rows:
        ex_id    = ex_map.get(r["exercise_slug"])
        location = r["location"].strip()
        if not ex_id:
            missing.add(r["exercise_slug"])
            continue
        if location not in VALID_LOCATIONS:
            log(f"Unknown location '{location}' — skipping", "WARN")
            continue
        records.append({
            "exercise_id": ex_id,
            "location":    location,
            "notes":       r.get("notes","").strip() or None,
        })
    if missing:
        log(f"Missing exercise slugs for locations: {', '.join(sorted(missing))}", "WARN")
    log(f"Inserting {len(records)} exercise_locations rows …")
    count = 0
    for chunk in batch(records, BATCH_SIZE):
        try:
            res = supabase.table("exercise_locations").upsert(
                chunk, on_conflict="exercise_id,location"
            ).execute()
            count += len(res.data)
        except Exception as e:
            log(f"Batch error: {e}", "ERROR")
    log(f"exercise_locations — inserted/updated: {count}", "OK")

# ──────────────────────────────────────────────────────────────
#  STEP 5 — EXERCISE CONTRAINDICATIONS
# ──────────────────────────────────────────────────────────────

VALID_SEVERITIES = {"absolute","relative","caution"}

def insert_contraindications(
    supabase: Client,
    rows: list[dict],
    ex_map: dict[str, str],
    hc_map: dict[str, str],
):
    records = []
    missing_ex = set()
    missing_hc = set()
    for r in rows:
        ex_id    = ex_map.get(r["exercise_slug"])
        cond_id  = hc_map.get(r["condition_slug"])
        severity = r.get("severity","caution").strip()
        if not ex_id:
            missing_ex.add(r["exercise_slug"])
            continue
        if not cond_id:
            missing_hc.add(r["condition_slug"])
            continue
        if severity not in VALID_SEVERITIES:
            log(f"Unknown severity '{severity}' — defaulting to 'caution'", "WARN")
            severity = "caution"
        records.append({
            "exercise_id":       ex_id,
            "condition_id":      cond_id,
            "severity":          severity,
            "reason":            r.get("reason","").strip() or None,
            "modification_tips": r.get("modification_tips","").strip() or None,
        })
    if missing_ex:
        log(f"Missing exercise slugs for contraindications: {', '.join(sorted(missing_ex))}", "WARN")
    if missing_hc:
        log(f"Missing health condition slugs: {', '.join(sorted(missing_hc))}", "WARN")
    log(f"Inserting {len(records)} exercise_contraindications rows …")
    count = 0
    for chunk in batch(records, BATCH_SIZE):
        try:
            res = supabase.table("exercise_contraindications").upsert(
                chunk, on_conflict="exercise_id,condition_id"
            ).execute()
            count += len(res.data)
        except Exception as e:
            log(f"Batch error: {e}", "ERROR")
    log(f"exercise_contraindications — inserted/updated: {count}", "OK")

# ──────────────────────────────────────────────────────────────
#  STEP 6 — VERIFY (quick sanity check)
# ──────────────────────────────────────────────────────────────

def verify(supabase: Client):
    print()
    log("═══════  Post-import verification  ═══════", "HEAD")
    tables = [
        "exercises",
        "exercise_equipment",
        "exercise_muscles",
        "exercise_locations",
        "exercise_contraindications",
    ]
    for t in tables:
        try:
            # Use count(*) via head=True for efficiency
            res = supabase.table(t).select("id", count="exact").execute()
            log(f"{t:<35} → {res.count} rows", "OK")
        except Exception as e:
            log(f"{t:<35} → ERROR: {e}", "ERROR")

    # Test the AI filter function with sample params
    print()
    log("Testing get_suitable_exercises() …")
    try:
        res = supabase.rpc("get_suitable_exercises", {
            "p_user_id":             None,
            "p_location":            "home",
            "p_equipment_slugs":     ["bodyweight", "resistance_bands", "yoga_mat"],
            "p_fitness_level":       None,
            "p_goals":               ["weight_loss", "general_fitness"],
            "p_age":                 None,
            "p_gender":              None,
            "p_exclude_conditions":  ["knee_pain", "lower_back_pain"],
            "p_category":            None,
            "p_is_compound":         None,
            "p_duration_max_sec":    None,
            "p_limit":               10,
        }).execute()
        log(f"AI filter returned {len(res.data)} exercises for: home | bodyweight+bands | weight_loss | exclude knee+back", "OK")
        for ex in res.data[:5]:
            log(f"  → {ex.get('exercise_name','?')}  (MET: {ex.get('met_value','?')}, contras: {ex.get('contraindication_count','?')})")
    except Exception as e:
        log(f"AI filter test failed: {e}", "ERROR")
        log("  Make sure get_suitable_exercises() function was created by the schema SQL", "WARN")

# ──────────────────────────────────────────────────────────────
#  MAIN
# ──────────────────────────────────────────────────────────────

def main():
    print()
    print("═" * 60)
    print("  BioRealign — Exercise Library Seed Import")
    print("═" * 60)

    # Validate config
    if "YOUR_PROJECT_REF" in SUPABASE_URL or "YOUR_SERVICE_ROLE_KEY" in SUPABASE_KEY:
        log("SUPABASE_URL or SUPABASE_KEY not set!", "ERROR")
        log("Set them as environment variables:", "ERROR")
        log("  export SUPABASE_URL=https://xxxx.supabase.co", "ERROR")
        log("  export SUPABASE_KEY=your_service_role_key", "ERROR")
        sys.exit(1)

    # Validate CSV files exist
    print()
    log("═══  Checking CSV files  ═══", "HEAD")
    for name, path in FILES.items():
        if path.exists():
            rows = load_csv(path)
            log(f"{path.name:<45} {len(rows)} rows", "OK")
        else:
            log(f"{path.name} NOT FOUND", "ERROR")
            sys.exit(1)

    # Connect
    print()
    log("═══  Connecting to Supabase  ═══", "HEAD")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        log(f"Connected: {SUPABASE_URL}", "OK")
    except Exception as e:
        log(f"Connection failed: {e}", "ERROR")
        sys.exit(1)

    # Build lookup maps from existing reference data
    print()
    log("═══  Building slug lookup maps  ═══", "HEAD")
    eq_map = build_lookup(supabase, "equipment")
    mg_map = build_lookup(supabase, "muscle_groups")
    hc_map = build_lookup(supabase, "health_conditions")
    log(f"equipment:         {len(eq_map)} slugs", "OK")
    log(f"muscle_groups:     {len(mg_map)} slugs", "OK")
    log(f"health_conditions: {len(hc_map)} slugs", "OK")

    if not eq_map or not mg_map or not hc_map:
        log("Reference tables appear empty. Did you run the schema SQL first?", "ERROR")
        sys.exit(1)

    # ── Step 1: Exercises ─────────────────────────────────────
    print()
    log("═══  Step 1/5 — Exercises  ═══", "HEAD")
    ex_csv = load_csv(FILES["exercises"])
    ex_map = insert_exercises(supabase, ex_csv)
    log(f"Exercise lookup map: {len(ex_map)} entries", "OK")
    time.sleep(0.5)  # brief pause between steps

    # ── Step 2: Equipment mapping ─────────────────────────────
    print()
    log("═══  Step 2/5 — Equipment mappings  ═══", "HEAD")
    eq_rows = load_csv(FILES["equipment_map"])
    insert_exercise_equipment(supabase, eq_rows, ex_map, eq_map)
    time.sleep(0.5)

    # ── Step 3: Muscles mapping ───────────────────────────────
    print()
    log("═══  Step 3/5 — Muscle mappings  ═══", "HEAD")
    mg_rows = load_csv(FILES["muscles_map"])
    insert_exercise_muscles(supabase, mg_rows, ex_map, mg_map)
    time.sleep(0.5)

    # ── Step 4: Location mapping ──────────────────────────────
    print()
    log("═══  Step 4/5 — Location mappings  ═══", "HEAD")
    loc_rows = load_csv(FILES["locations_map"])
    insert_exercise_locations(supabase, loc_rows, ex_map)
    time.sleep(0.5)

    # ── Step 5: Contraindications ─────────────────────────────
    print()
    log("═══  Step 5/5 — Contraindications  ═══", "HEAD")
    ci_rows = load_csv(FILES["contraindications"])
    insert_contraindications(supabase, ci_rows, ex_map, hc_map)

    # ── Verify ────────────────────────────────────────────────
    verify(supabase)

    print()
    print("═" * 60)
    print("  Import complete.")
    print("═" * 60)
    print()

if __name__ == "__main__":
    main()
