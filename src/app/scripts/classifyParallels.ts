// src/app/scripts/classifyParallels.ts
// Run (example from scripts folder):
//   npx tsx classifyParallels.ts ../2024-25-Panini-Prizm-Basketball-Checklist-1.xlsx --sql
//
// Optional flags:
//   --sql            prints SQL insert block to stdout
//   --json           prints JSON classification to stdout
//   --out=FILE.sql   writes SQL output to a file
//
// Notes:
// - SQL uses placeholder __PRODUCT_ID__ (replace before running in Supabase SQL editor)

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

type TabGroup = "base-non-serial" | "base-serial" | "autos";

type BadgeSet = {
  is_hobby_exclusive: boolean;
  is_retail_exclusive: boolean;
  is_fotl_hit: boolean;
  is_numbered: boolean;
  is_auto: boolean;
  is_sp: boolean;
  is_ssp: boolean;
  serial_max: number | null;
};

type ClassifiedParallel = {
  rawName: string;
  sheet: "Base" | "Autographs";
  tabGroup: TabGroup;
  badges: BadgeSet;
};

type InsertRow = {
  product_id: string; // placeholder
  name: string;
  slug: string;
  is_auto: boolean;
  is_numbered: boolean;
  serial_max: number | null;
  is_fotl_hit: boolean;
  is_hobby_exclusive: boolean;
  is_retail_exclusive: boolean;
  is_sp: boolean;
  is_ssp: boolean;
};

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  let outFile: string | null = null;

  for (const arg of argv.slice(2)) {
    if (arg === "--sql") flags.add("sql");
    else if (arg === "--json") flags.add("json");
    else if (arg.startsWith("--out=")) outFile = arg.replace("--out=", "");
  }

  // default behavior if no flags: print SQL
  if (!flags.has("sql") && !flags.has("json")) flags.add("sql");

  return { flags, outFile };
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function parseSerialInfo(name: string): { isNumbered: boolean; serialMax: number | null } {
  const serialMatch = name.match(/\/(\d+)/);
  if (serialMatch) return { isNumbered: true, serialMax: parseInt(serialMatch[1], 10) };
  if (/1\/1/.test(name)) return { isNumbered: true, serialMax: 1 };
  return { isNumbered: false, serialMax: null };
}

function inferBadgesFromName(name: string, baseFlags: { isAuto: boolean }): BadgeSet {
  const { isNumbered, serialMax } = parseSerialInfo(name);
  const lower = name.toLowerCase();

  // simple, reliable inference
  const isFOTL = lower.includes("fotl");

  // defaults (we can add mapping rules later if you want)
  return {
    is_hobby_exclusive: false,
    is_retail_exclusive: false,
    is_fotl_hit: isFOTL,
    is_numbered: isNumbered,
    is_auto: baseFlags.isAuto,
    is_sp: false,
    is_ssp: false,
    serial_max: serialMax,
  };
}

function classifyTabGroup(sheet: "Base" | "Autographs", badges: BadgeSet): TabGroup {
  if (sheet === "Autographs") return "autos";
  return badges.is_numbered ? "base-serial" : "base-non-serial";
}

function extractBaseParallels(workbook: XLSX.WorkBook): ClassifiedParallel[] {
  const baseSheet = workbook.Sheets["Base"];
  if (!baseSheet) return [];

  const json = XLSX.utils.sheet_to_json<Record<string, any>>(baseSheet, { defval: null });
  if (json.length === 0) return [];

  // Panini base sheet: first column contains "Parallels:" then list
  const colName = Object.keys(json[0])[0];
  const rows = json;

  const results: ClassifiedParallel[] = [];
  let inParallels = false;

  for (let i = 0; i < rows.length; i++) {
    const cell = rows[i][colName];

    if (typeof cell === "string" && cell.trim() === "Parallels:") {
      inParallels = true;
      continue;
    }

    if (!inParallels) continue;

    // stop when we hit card numbers / null after the parallels section
    if (typeof cell === "number" || cell === null) break;

    if (typeof cell === "string") {
      const name = cell.trim();
      if (!name) continue;

      const badges = inferBadgesFromName(name, { isAuto: false });
      results.push({
        rawName: name,
        sheet: "Base",
        tabGroup: classifyTabGroup("Base", badges),
        badges,
      });
    }
  }

  return results;
}

function extractAutoParallels(workbook: XLSX.WorkBook): ClassifiedParallel[] {
  const autoSheet = workbook.Sheets["Autographs"];
  if (!autoSheet) return [];

  const json = XLSX.utils.sheet_to_json<Record<string, any>>(autoSheet, { defval: null });
  if (json.length === 0) return [];

  const colName = Object.keys(json[0])[0];
  const rows = json;

  const results: ClassifiedParallel[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cell = rows[i][colName];

    if (typeof cell === "string" && cell.trim() === "Parallels:") {
      let j = i + 1;

      while (j < rows.length) {
        const nextCell = rows[j][colName];

        if (typeof nextCell === "string") {
          const name = nextCell.trim();
          if (name) {
            const badges = inferBadgesFromName(name, { isAuto: true });
            results.push({
              rawName: name,
              sheet: "Autographs",
              tabGroup: classifyTabGroup("Autographs", badges),
              badges,
            });
          }
          j++;
          continue;
        }

        // stop at numbers or blank break
        if (typeof nextCell === "number" || nextCell === null) break;

        j++;
      }

      i = j;
    }
  }

  return results;
}

function dedupeRows(rows: InsertRow[]): InsertRow[] {
  // Dedupe by (product_id placeholder + slug + is_auto) to prevent duplicates
  const seen = new Set<string>();
  const out: InsertRow[] = [];

  for (const r of rows) {
    const key = `${r.product_id}::${r.slug}::${r.is_auto ? "auto" : "base"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }

  return out;
}

function sqlEscape(value: string): string {
  // Escape single quotes for SQL
  return value.replace(/'/g, "''");
}

function toSqlInsert(rows: InsertRow[]): string {
  if (rows.length === 0) {
    return "-- No rows generated.\n";
  }

  const header = `-- Paste into Supabase SQL editor
-- 1) Replace __PRODUCT_ID__ with the real products.id for this set
-- 2) Run

insert into parallels (
  product_id,
  name,
  slug,
  is_auto,
  is_numbered,
  serial_max,
  is_fotl_hit,
  is_hobby_exclusive,
  is_retail_exclusive,
  is_sp,
  is_ssp
) values
`;

  const values = rows
    .map((r) => {
      const serialMax = r.serial_max === null ? "null" : String(r.serial_max);
      return `(
  '${sqlEscape(r.product_id)}',
  '${sqlEscape(r.name)}',
  '${sqlEscape(r.slug)}',
  ${r.is_auto ? "true" : "false"},
  ${r.is_numbered ? "true" : "false"},
  ${serialMax},
  ${r.is_fotl_hit ? "true" : "false"},
  ${r.is_hobby_exclusive ? "true" : "false"},
  ${r.is_retail_exclusive ? "true" : "false"},
  ${r.is_sp ? "true" : "false"},
  ${r.is_ssp ? "true" : "false"}
)`;
    })
    .join(",\n");

  const footer = ";\n";

  return header + values + footer;
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath || inputPath.startsWith("--")) {
    console.error("Usage: npx tsx classifyParallels.ts path/to/checklist.xlsx [--sql] [--json] [--out=FILE.sql]");
    process.exit(1);
  }

  const { flags, outFile } = parseArgs(process.argv);

  const fullPath = path.resolve(inputPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(fullPath);

  const classified: ClassifiedParallel[] = [
    ...extractBaseParallels(workbook),
    ...extractAutoParallels(workbook),
  ];

  // Convert to insert rows
  const productIdPlaceholder = "__PRODUCT_ID__";

  const insertRows: InsertRow[] = classified.map((c) => {
    // Create distinct slugs for base vs autos if names collide
    const baseSlug = slugify(c.rawName);
    const slug = c.badges.is_auto ? `auto-${baseSlug}` : baseSlug;

    return {
      product_id: productIdPlaceholder,
      name: c.rawName,
      slug,
      is_auto: c.badges.is_auto,
      is_numbered: c.badges.is_numbered,
      serial_max: c.badges.serial_max,
      is_fotl_hit: c.badges.is_fotl_hit,
      is_hobby_exclusive: c.badges.is_hobby_exclusive,
      is_retail_exclusive: c.badges.is_retail_exclusive,
      is_sp: c.badges.is_sp,
      is_ssp: c.badges.is_ssp,
    };
  });

  const deduped = dedupeRows(insertRows);

  if (flags.has("json")) {
    console.log(JSON.stringify(classified, null, 2));
  }

  if (flags.has("sql")) {
    const sql = toSqlInsert(deduped);
    if (outFile) {
      fs.writeFileSync(path.resolve(outFile), sql, "utf8");
      console.log(`Wrote SQL to ${outFile}`);
    } else {
      console.log(sql);
    }
  }
}

main();
