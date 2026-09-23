#!/usr/bin/env python3
"""Split the reviewed App Store copy into per-locale paste sheets."""

import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "copy-paste-required-fields.md"
DEST = HERE / "localized"
BASE = "https://ytwl1013.github.io/uniclife-legal"
LOCALES = {
    "English (United States)": ("en-US", ""),
    "English (United Kingdom)": ("en-GB", "en-gb"),
    "Deutsch": ("de-DE", "de"),
    "Français": ("fr-FR", "fr"),
    "简体中文": ("zh-Hans", "zh-cn"),
    "Português (Portugal)": ("pt-PT", "pt-pt"),
    "Español (España)": ("es-ES", "es-es"),
    "Italiano": ("it-IT", "it"),
    "Nederlands": ("nl-NL", "nl"),
    "Polski": ("pl-PL", "pl"),
}


def url(section, slug):
    return f"{BASE}/{section}/" if not slug else f"{BASE}/{section}/{slug}/"


def main():
    sections = re.split(r"(?m)^## (.+)$", SOURCE.read_text(encoding="utf-8"))
    found = {}
    for index in range(1, len(sections), 2):
        heading, body = sections[index:index + 2]
        if heading not in LOCALES:
            continue
        values = re.findall(r"```text\n(.*?)\n```", body, flags=re.DOTALL)
        if len(values) != 3:
            raise ValueError(f"Expected 3 copy fields for {heading}, found {len(values)}")
        found[heading] = values
    if set(found) != set(LOCALES):
        raise ValueError(f"Missing locale copy: {set(LOCALES) - set(found)}")
    DEST.mkdir(exist_ok=True)
    rows = []
    for heading, (code, slug) in LOCALES.items():
        promo, description, keywords = found[heading]
        short = re.split(r"(?<=[.!?。])\s*", promo, maxsplit=1)[0]
        if len(promo) > 170 or len(description) > 4000 or len(keywords.encode("utf-8")) > 100 or len(short) > 80:
            raise ValueError(f"Store limit exceeded: {code}")
        if ", " in keywords:
            raise ValueError(f"Use comma-separated keywords without spaces: {code}")
        lines = [
            f"# {heading} ({code})", "",
            "## App Store Connect", "",
            "推广文本 / Promotional Text (≤170 characters)", "", "```text", promo, "```", "",
            "描述 / Description (≤4,000 characters)", "", "```text", description, "```", "",
            "关键词 / Keywords (≤100 UTF-8 bytes)", "", "```text", keywords, "```", "",
            "技术支持网址 / Support URL", "", "```text", url("support", slug), "```", "",
            "隐私政策网址 / Privacy Policy URL", "", "```text", url("privacy", slug), "```", "",
            "用户隐私选择网址 / User Privacy Choices URL (optional)", "", "```text", url("privacy-choices", slug), "```", "",
            "营销网址 / Marketing URL：选填，可留空。", "",
            "版本 / Version", "", "```text", "1.0", "```", "",
            "版权 / Copyright", "", "```text", "2026 zhenxiang Lin", "```", "",
            "## Google Play Console", "",
            "简短说明 / Short description (≤80 characters)", "", "```text", short, "```", "",
            "完整说明 / Full description (≤4,000 characters)", "", "```text", description, "```", "",
            "本地语言隐私政策 / Localized privacy policy", "", "```text", url("privacy", slug), "```", "",
            "本地语言站外删号入口 / Localized account deletion", "", "```text", url("delete-account", slug), "```", "",
        ]
        (DEST / f"{code}.md").write_text("\n".join(lines), encoding="utf-8")
        rows.append(f"| {heading} | [{code}]({code}.md) | `{url('privacy', slug)}` |")
    readme = "# 多语言上架字段\n\n每种语言各有一份可复制清单，含 App Store 推广文本、描述、关键词与本地化网址，以及 Google Play 简短和完整说明。\n\n| 语言 | 复制清单 | 隐私政策网址 |\n| --- | --- | --- |\n" + "\n".join(rows) + "\n\nGoogle Play 的商店隐私政策和删号网址通常是应用级字段；建议分别填带语言选择器的总页 `" + url("privacy", "") + "` 和 `" + url("delete-account", "") + "`。本地化页面可供用户从总页切换，也可用于需要单独语言 URL 的商店字段。\n\n提交前须确认运营主体、联系人、数据类别、跨境传输与应用内政策一致，并用未登录浏览器检查所有网址。\n"
    (DEST / "README.md").write_text(readme, encoding="utf-8")
    print(f"Generated {len(LOCALES)} locale sheets")


if __name__ == "__main__":
    main()
