"""Build a mirrored, high-quality WebP release copy of the approved game images.

The source art is read-only. This script only writes the explicitly listed
compressed tree and AS-COMPRESS delivery records; it never removes files.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
COMPRESSED = SRC / "assets" / "compressed"
DOCS = ROOT / "docs" / "as-compress-20261003"
QA = DOCS / "quality-review"

EXPECTED_GROUP_COUNTS = {
    "Photo_src": 16,
    "UI_src": 4,
    "Wechat_src": 2,
    "第二幕": 20,
    "第三幕": 58,
    "第四幕": 40,
    "assets": 1,
}

# q92 protects readable clues and small atlas details. Everything else starts
# at q88; alpha is checked pixel-for-pixel and falls back to source bytes if it
# does not survive WebP encoding exactly.
Q92_FILES = {
    "Photo_src/A.W刻字黑暗.png",
    "Photo_src/补字碑.png",
    "Photo_src/鸡公岭地图.png",
    "Photo_src/黑补母特写1.png",
    "第二幕/IMG_A2_T03_001.jpg",
    "第二幕/IMG_A2_T05_004.jpg",
    "第二幕/IMG_A2_T05_006.jpg",
    "第二幕/IMG_A2_T05_007.jpg",
    "第三幕/IMG_A3_T01_002.jpg",
    "第三幕/IMG_A3_T07_007.jpg",
    "第四幕/T07/IMG_A4_T07_002.png",
    "第四幕/T09/IMG_A4_T09_003.png",
    "第四幕/T10/IMG_A4_T10_002.png",
}

QA_SAMPLES = [
    ("assets/desktop-wallpaper.jpg", "wallpaper-center"),
    ("Photo_src/A.W刻字黑暗.png", "a-w-dark-inscription"),
    ("Photo_src/补字碑.png", "stone-inscription"),
    ("Photo_src/黑补母特写1.png", "dark-deity-detail"),
    ("Photo_src/鸡公岭地图.png", "trail-map-symbols"),
    ("第二幕/IMG_A2_T03_001.jpg", "library-shelf"),
    ("第二幕/IMG_A2_T05_006.jpg", "school-handwritten-notes"),
    ("第二幕/IMG_A2_T07_004.jpg", "ordinary-trail-photo"),
    ("第三幕/IMG_A3_T01_002.jpg", "act3-gate-inscription"),
    ("第三幕/IMG_A3_T07_007.jpg", "act3-paper-evidence"),
    ("第三幕/IMG_A3_T04_001.png", "act3-dark-archive-room"),
    ("第四幕/T09/IMG_A4_T09_003.png", "act4-paper-evidence"),
    ("第四幕/T10/IMG_A4_T10_002.png", "act4-handwritten-fragments"),
    ("UI_src/UI1.png", "ui-icon-atlas-alpha"),
    ("UI_src/UI4.png", "ui-file-atlas-alpha"),
    ("Wechat_src/Wechat1.png", "avatar-atlas-alpha"),
]

SPECIAL_CROPS = {
    "Photo_src/A.W刻字黑暗.png": (390, 330, 1160, 760),
    "Photo_src/黑补母特写1.png": (420, 105, 1110, 975),
    "第三幕/IMG_A3_T01_002.jpg": (585, 20, 1155, 435),
    "UI_src/UI1.png": (600, 165, 980, 535),
    "UI_src/UI4.png": (0, 575, 575, 1185),
    "Wechat_src/Wechat1.png": (175, 0, 545, 370),
}


def official_sources() -> list[Path]:
    groups = {
        "Photo_src": sorted((SRC / "Photo_src").glob("*.png")),
        "UI_src": [SRC / "UI_src" / f"UI{i}.png" for i in range(1, 5)],
        "Wechat_src": [SRC / "Wechat_src" / f"Wechat{i}.png" for i in range(1, 3)],
        "第二幕": sorted((SRC / "第二幕").glob("*.jpg")),
        "第三幕": sorted((SRC / "第三幕").glob("IMG_A3_*.jpg")) + sorted((SRC / "第三幕").glob("IMG_A3_*.png")),
        "第四幕": sorted((SRC / "第四幕").glob("T*")) and sorted((SRC / "第四幕").glob("T*/*.png")),
        "assets": [SRC / "assets" / "desktop-wallpaper.jpg"],
    }
    actual = {name: len(files) for name, files in groups.items()}
    if actual != EXPECTED_GROUP_COUNTS:
        raise SystemExit(f"正式资源数量与冻结清单不一致：{actual}")
    missing = [path for files in groups.values() for path in files if not path.is_file()]
    if missing:
        raise SystemExit("正式资源缺失：" + ", ".join(str(path.relative_to(ROOT)) for path in missing))
    return [path for files in groups.values() for path in files]


def rel_source(path: Path) -> str:
    return path.relative_to(SRC).as_posix()


def quality_for(path: Path) -> int:
    rel = rel_source(path)
    if rel.startswith("UI_src/") or rel.startswith("Wechat_src/") or rel in Q92_FILES:
        return 92
    # A3's PNG scene set contains the archive/inscription material; retain the
    # slightly higher quality setting for those evidence-heavy illustrations.
    if rel.startswith("第三幕/") and rel.endswith(".png"):
        return 92
    return 88


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def encode_webp(source: Path, quality: int) -> tuple[bytes, str | None]:
    with Image.open(source) as image:
        source_size = image.size
        has_alpha = "A" in image.getbands() or "transparency" in image.info
        options: dict[str, object] = {"format": "WEBP", "quality": quality, "method": 6, "exact": True}
        if has_alpha:
            options["alpha_quality"] = 100
        for key in ("icc_profile", "exif", "xmp"):
            value = image.info.get(key)
            if value:
                options[key] = value
        buffer = io.BytesIO()
        image.save(buffer, **options)
        encoded = buffer.getvalue()
        with Image.open(io.BytesIO(encoded)) as decoded:
            if decoded.size != source_size:
                return encoded, "输出像素尺寸改变"
            if has_alpha:
                original_alpha = image.convert("RGBA").getchannel("A")
                encoded_alpha = decoded.convert("RGBA").getchannel("A")
                if original_alpha.tobytes() != encoded_alpha.tobytes():
                    return encoded, "WebP无法逐像素保留alpha"
    return encoded, None


def output_relative(source: Path, use_webp: bool) -> str:
    rel = Path(rel_source(source))
    if use_webp:
        rel = rel.with_suffix(".webp")
    return rel.as_posix()


def legacy_asset_source(image: dict[str, object]) -> str | None:
    """Resolve one registry item in the same order as the pre-change loader."""
    filename = image.get("file")
    if not isinstance(filename, str) or not filename:
        return None
    for directory, suffixes in (
        ("Photo_src", {".png"}),
        ("第二幕", {".jpg"}),
        ("第三幕", {".jpg", ".png"}),
    ):
        candidate = SRC / directory / filename
        if candidate.suffix.lower() in suffixes and candidate.is_file():
            return f"{directory}/{filename}"
    match = re.match(r"^IMG_A4_(T(?:01|05|06|07|08|09|10))_\d{3}$", str(image.get("id", "")))
    if match and filename == f"{image.get('id')}.png":
        candidate = SRC / "第四幕" / match.group(1) / filename
        if candidate.is_file():
            return candidate.relative_to(SRC).as_posix()
    return None


def make_id_audit(entries: dict[str, str]) -> tuple[list[dict[str, object]], dict[str, object]]:
    items = json.loads((ROOT / "data" / "images.json").read_text(encoding="utf-8"))["items"]
    rows = []
    source_ids: dict[str, list[str]] = {}
    for item in items:
        source = legacy_asset_source(item)
        output = entries.get(f"../{source}") if source else None
        if source:
            source_ids.setdefault(source, []).append(str(item["id"]))
            if not output or not (COMPRESSED / output).is_file():
                raise SystemExit(f"ID资源映射缺失：{item['id']} -> {source}")
        rows.append({"id": item["id"], "file": item.get("file"), "legacySource": source, "compressedOutput": output})
    duplicate_groups = [
        {"source": source, "ids": ids}
        for source, ids in sorted(source_ids.items()) if len(ids) > 1
    ]
    summary = {
        "registryRecords": len(items),
        "resolvedRecords": sum(row["legacySource"] is not None for row in rows),
        "uniqueResolvedSources": len(source_ids),
        "unresolvedRecords": sum(row["legacySource"] is None for row in rows),
        "duplicateSourceGroups": duplicate_groups,
        "resolutionOrder": ["Photo_src/*.png", "第二幕/*.jpg", "第三幕/IMG_A3_*.jpg", "第三幕/IMG_A3_*.png", "第四幕/{act4AssetPath}.png"],
        "legacyAct4PathSemanticsPreserved": True,
    }
    return rows, summary


def save_quality_sample(source: Path, label: str) -> dict[str, object]:
    rel = rel_source(source)
    quality = quality_for(source)
    encoded, problem = encode_webp(source, quality)
    with Image.open(source) as original, Image.open(io.BytesIO(encoded)) as compressed:
        use_webp = problem is None and len(encoded) < source.stat().st_size
        if use_webp:
            candidate = compressed.copy()
            codec_note = f"WebP q{quality}"
        else:
            candidate = original.copy()
            codec_note = "保留原编码（不节省体积或透明度校验不通过）"

        def visible(image: Image.Image) -> Image.Image:
            if "A" in image.getbands() or "transparency" in image.info:
                rgba = image.convert("RGBA")
                background = Image.new("RGBA", rgba.size, (224, 224, 224, 255))
                background.alpha_composite(rgba)
                return background.convert("RGB")
            return image.convert("RGB")

        left, right = visible(original), visible(candidate)
        panel_w, panel_h = 680, 510
        header_h, panel_header_h, detail_header_h = 90, 36, 38
        overview_h = 510
        crop_box = SPECIAL_CROPS.get(rel)
        if crop_box is None:
            width, height = original.size
            crop_w, crop_h = min(640, width), min(430, height)
            x = max(0, (width - crop_w) // 2)
            y = max(0, (height - crop_h) // 2)
            crop_box = (x, y, x + crop_w, y + crop_h)
        crop_box = (
            max(0, crop_box[0]), max(0, crop_box[1]),
            min(original.width, crop_box[2]), min(original.height, crop_box[3]),
        )
        left_detail = visible(original.crop(crop_box))
        right_detail = visible(candidate.crop(crop_box))
        if rel == "Photo_src/A.W刻字黑暗.png":
            # Apply the same QA-only brightness lift to both 100% crops. The
            # source and the published image themselves are never altered.
            left_detail = ImageEnhance.Brightness(left_detail).enhance(1.6)
            right_detail = ImageEnhance.Brightness(right_detail).enhance(1.6)

        sheet = Image.new("RGB", (panel_w * 2, header_h + panel_header_h + overview_h + detail_header_h + left_detail.height), (246, 246, 243))
        draw = ImageDraw.Draw(sheet)
        font_path = Path("C:/Windows/Fonts/msyh.ttc")
        title_font = ImageFont.truetype(str(font_path), 22) if font_path.exists() else ImageFont.load_default()
        body_font = ImageFont.truetype(str(font_path), 18) if font_path.exists() else ImageFont.load_default()
        draw.text((12, 10), f"{label}  |  {rel}  |  {codec_note}", font=title_font, fill=(18, 27, 31))
        if rel == "Photo_src/A.W刻字黑暗.png":
            draw.text((12, 48), "100%暗部细节：两侧同用1.6×亮度，仅为审阅，未修改源图或发布图", font=body_font, fill=(54, 60, 62))

        def paste_panel(img: Image.Image, x: int, y: int, max_w: int, max_h: int) -> None:
            shown = img.copy()
            shown.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
            sheet.paste(shown, (x + (max_w - shown.width) // 2, y + (max_h - shown.height) // 2))

        draw.text((12, header_h), "原图", font=body_font, fill=(18, 27, 31))
        draw.text((panel_w + 12, header_h), "压缩候选", font=body_font, fill=(18, 27, 31))
        paste_panel(left, 0, header_h + panel_header_h, panel_w, overview_h)
        paste_panel(right, panel_w, header_h + panel_header_h, panel_w, overview_h)
        detail_y = header_h + panel_header_h + overview_h
        draw.text((12, detail_y), f"100%裁切（{crop_box[0]},{crop_box[1]}–{crop_box[2]},{crop_box[3]}）", font=body_font, fill=(18, 27, 31))
        detail_y += detail_header_h
        sheet.paste(left_detail, (0, detail_y))
        sheet.paste(right_detail, (panel_w, detail_y))
        target = QA / f"{label}-comparison.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(target, optimize=True)

    return {
        "source": rel,
        "quality": quality,
        "candidateBytes": len(encoded),
        "sourceBytes": source.stat().st_size,
        "publishedCandidate": output_relative(source, use_webp) if use_webp else rel,
        "alphaProblem": problem,
        "comparison": target.relative_to(ROOT).as_posix(),
    }


def run_samples(sources: list[Path]) -> None:
    by_rel = {rel_source(source): source for source in sources}
    results = [save_quality_sample(by_rel[rel], label) for rel, label in QA_SAMPLES]
    path = QA / "sample-review.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))


def run_compression(sources: list[Path]) -> None:
    expected = set()
    planned: list[dict[str, object]] = []
    for source in sources:
        quality = quality_for(source)
        encoded, problem = encode_webp(source, quality)
        keep_webp = problem is None and len(encoded) < source.stat().st_size
        out_rel = output_relative(source, keep_webp)
        out_path = COMPRESSED / out_rel
        expected.add(out_path.resolve())
        planned.append({"source": source, "quality": quality, "encoded": encoded, "problem": problem, "keepWebp": keep_webp, "output": out_rel, "target": out_path})

    if COMPRESSED.exists():
        existing = {path.resolve() for path in COMPRESSED.rglob("*") if path.is_file()}
        unknown = existing - expected - {(COMPRESSED / "asset-map.json").resolve()}
        if unknown:
            raise SystemExit("压缩目录含本脚本不拥有的文件，停止且不删除：" + ", ".join(str(p) for p in sorted(unknown)))

    entries: dict[str, str] = {}
    records: list[dict[str, object]] = []
    for item in planned:
        source: Path = item["source"]  # type: ignore[assignment]
        target: Path = item["target"]  # type: ignore[assignment]
        quality = int(item["quality"])
        encoded: bytes = item["encoded"]  # type: ignore[assignment]
        keep_webp = bool(item["keepWebp"])
        target.parent.mkdir(parents=True, exist_ok=True)
        if keep_webp:
            target.write_bytes(encoded)
            encoding = f"WebP lossy q{quality}, method 6"
        else:
            shutil.copyfile(source, target)
            reason = item["problem"] or "WebP输出不小于原文件"
            encoding = f"原格式字节副本；{reason}"
        with Image.open(source) as image:
            width, height = image.size
            source_format, source_mode = image.format, image.mode
            has_alpha = "A" in image.getbands() or "transparency" in image.info
            alpha_exact = True
            if has_alpha:
                with Image.open(target) as output:
                    alpha_exact = image.convert("RGBA").getchannel("A").tobytes() == output.convert("RGBA").getchannel("A").tobytes()
        source_bytes, output_bytes = source.stat().st_size, target.stat().st_size
        source_rel = rel_source(source)
        entries[f"../{source_rel}"] = Path(item["output"]).as_posix()
        records.append({
            "source": f"src/{source_rel}",
            "sourceSha256": sha256(source),
            "sourceDimensions": [width, height],
            "sourceFormat": source_format,
            "sourceMode": source_mode,
            "sourceBytes": source_bytes,
            "output": f"src/assets/compressed/{item['output']}",
            "outputDimensions": [width, height],
            "outputBytes": output_bytes,
            "encoding": encoding,
            "quality": quality if keep_webp else None,
            "alphaPresent": has_alpha,
            "alphaExact": alpha_exact,
            "savingsBytes": source_bytes - output_bytes,
            "savingsPercent": round((source_bytes - output_bytes) * 100 / source_bytes, 2) if source_bytes else 0,
        })

    COMPRESSED.mkdir(parents=True, exist_ok=True)
    (COMPRESSED / "asset-map.json").write_text(json.dumps({"version": 1, "entries": entries}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DOCS.mkdir(parents=True, exist_ok=True)
    (DOCS / "asset-ledger.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    id_rows, id_summary = make_id_audit(entries)
    (DOCS / "asset-id-audit.json").write_text(json.dumps({"summary": id_summary, "records": id_rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    source_total = sum(int(record["sourceBytes"]) for record in records)
    output_total = sum(int(record["outputBytes"]) for record in records)
    summary = {
        "count": len(records), "sourceBytes": source_total, "outputBytes": output_total,
        "savingsBytes": source_total - output_total,
        "savingsPercent": round((source_total - output_total) * 100 / source_total, 2),
        "webpCount": sum(str(record["encoding"]).startswith("WebP") for record in records),
        "originalFormatFallbackCount": sum(str(record["encoding"]).startswith("原格式") for record in records),
        "alphaAssets": sum(bool(record["alphaPresent"]) for record in records),
        "alphaExact": all(bool(record["alphaExact"]) for record in records),
        "registry": id_summary,
    }
    (DOCS / "compression-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples-only", action="store_true", help="只生成代表图质量对照，不写发布压缩目录")
    args = parser.parse_args()
    sources = official_sources()
    if args.samples_only:
        run_samples(sources)
    else:
        run_compression(sources)


if __name__ == "__main__":
    main()
