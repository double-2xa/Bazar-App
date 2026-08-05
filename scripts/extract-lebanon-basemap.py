"""Extract Lebanon basemap (FileGDB) → GeoJSON for admin + settlement catalog for dropdowns."""
from __future__ import annotations

import json
import re
from pathlib import Path

import pyogrio

GDB = Path(r"c:\Users\abed-\Downloads\Telegram Desktop\Lebanon_Basemap.gdb")
ROOT = Path(__file__).resolve().parents[1]
GEO_OUT = ROOT / "apps" / "admin" / "public" / "geo"
CATALOG_OUT = ROOT / "packages" / "shared" / "src" / "data"
API_DATA = ROOT / "apps" / "api" / "data"


def slugify(value: str) -> str:
    s = value.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "unknown"


def clean_str(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "nat"}:
        return None
    return text


def ensure_wgs84(gdf):
    if gdf.crs is None:
        return gdf.set_crs("EPSG:4326", allow_override=True)
    if str(gdf.crs).upper() not in {"EPSG:4326", "WGS84"}:
        return gdf.to_crs("EPSG:4326")
    return gdf


def write_geojson(gdf, path: Path, keep_props: list[str]) -> None:
    slim = gdf.copy()
    drop = [c for c in slim.columns if c != "geometry" and c not in keep_props]
    if drop:
        slim = slim.drop(columns=drop)
    path.parent.mkdir(parents=True, exist_ok=True)
    # GeoJSON via pyogrio avoids encoding issues
    pyogrio.write_dataframe(slim, path, driver="GeoJSON")
    print(f"  wrote {path} ({path.stat().st_size:,} bytes, {len(slim)} features)")


def build_catalog(settlements) -> list[dict]:
    catalog: list[dict] = []
    for _, row in settlements.iterrows():
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue
        name = clean_str(row.get("name_en"))
        if not name:
            continue
        name_ar = clean_str(row.get("name_ar"))
        governorate = clean_str(row.get("governorate"))
        district = clean_str(row.get("district"))
        unique_id = clean_str(row.get("unique_id")) or slugify(f"{governorate}-{district}-{name}")
        place_type = clean_str(row.get("place_type")) or "settlement"

        point = geom if geom.geom_type == "Point" else geom.representative_point()
        catalog.append(
            {
                "id": unique_id,
                "name": name,
                "nameAr": name_ar,
                "governorate": governorate,
                "district": district,
                "placeType": place_type,
                "latitude": round(float(point.y), 6),
                "longitude": round(float(point.x), 6),
            }
        )

    seen: set[str] = set()
    unique: list[dict] = []
    for item in catalog:
        key = item["id"]
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)

    unique.sort(
        key=lambda x: (
            x.get("governorate") or "",
            x.get("district") or "",
            x["name"].lower(),
        )
    )
    return unique


def main() -> None:
    GEO_OUT.mkdir(parents=True, exist_ok=True)
    CATALOG_OUT.mkdir(parents=True, exist_ok=True)
    API_DATA.mkdir(parents=True, exist_ok=True)

    print("Exporting Governorates...")
    gov = ensure_wgs84(pyogrio.read_dataframe(str(GDB), layer="Governorates"))
    write_geojson(
        gov,
        GEO_OUT / "lebanon-governorates.geojson",
        ["adm1_name", "adm1_name1", "adm1_pcode", "center_lat", "center_lon"],
    )

    print("Exporting Districts...")
    dist = ensure_wgs84(pyogrio.read_dataframe(str(GDB), layer="Districts"))
    write_geojson(
        dist,
        GEO_OUT / "lebanon-districts.geojson",
        [
            "adm2_name",
            "adm2_name1",
            "adm2_pcode",
            "adm1_name",
            "adm1_name1",
            "adm1_pcode",
            "center_lat",
            "center_lon",
        ],
    )

    print("Exporting Settlements...")
    settlements = ensure_wgs84(pyogrio.read_dataframe(str(GDB), layer="Settlements"))
    write_geojson(
        settlements,
        GEO_OUT / "lebanon-settlements.geojson",
        [
            "unique_id",
            "name_en",
            "name_ar",
            "district",
            "governorate",
            "place_type",
        ],
    )

    catalog = build_catalog(settlements)
    catalog_path = CATALOG_OUT / "lebanon-settlements.json"
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    # API reads the same catalog at runtime
    (API_DATA / "lebanon-settlements.json").write_text(
        catalog_path.read_text(encoding="utf-8"), encoding="utf-8"
    )

    govs = sorted({c["governorate"] for c in catalog if c.get("governorate")})
    dists: dict[str, list[str]] = {}
    for c in catalog:
        g = c.get("governorate")
        d = c.get("district")
        if not g or not d:
            continue
        dists.setdefault(g, [])
        if d not in dists[g]:
            dists[g].append(d)
    for g in dists:
        dists[g].sort()

    hierarchy = {
        "country": "Lebanon",
        "countryCode": "LB",
        "governorates": govs,
        "districtsByGovernorate": dists,
        "settlementCount": len(catalog),
    }
    hier_path = CATALOG_OUT / "lebanon-hierarchy.json"
    hier_path.write_text(json.dumps(hierarchy, ensure_ascii=False, indent=2), encoding="utf-8")
    (API_DATA / "lebanon-hierarchy.json").write_text(
        hier_path.read_text(encoding="utf-8"), encoding="utf-8"
    )

    print(f"\nCatalog: {len(catalog)} settlements")
    print(f"Governorates ({len(govs)}): {', '.join(govs)}")
    print(f"Wrote catalog → {catalog_path}")
    print(f"Wrote hierarchy → {hier_path}")


if __name__ == "__main__":
    main()
