#!/usr/bin/env python3
"""Build the static download site (landing page, iOS guide, Android guide) into site/dist."""

import shutil
from html import escape
from pathlib import Path

SITE = Path(__file__).resolve().parent
OUTPUT = SITE / "dist"

# Leave empty until the app is live on the App Store. While empty, the iPhone page
# hides the button and tells visitors to search the App Store instead.
APP_STORE_URL = ""
APP_STORE_SEARCH_NAME = "UnicLife"
ANDROID_APK_URL = "https://github.com/ytwl1013/uniclife-keycabinet-app/releases/latest/download/uniclife-android.apk"
LEGAL_BASE = "https://ytwl1013.github.io/uniclife-legal"

LOCALES = ("en", "zh-cn")
LOCALE_LABELS = {"en": "English", "zh-cn": "简体中文"}
HTML_LANG = {"en": "en", "zh-cn": "zh-CN"}

TEXT = {
    "en": {
        "brand": "UnicLife Key Cabinet",
        "nav_download": "Download",
        "nav_support": "Support",
        "nav_privacy": "Privacy Policy",
        "language": "Language / 语言",
        "eyebrow": "Download",
        "home_title": "Get UnicLife Key Cabinet",
        "home_lede": "Choose your phone's system. The app works the same way on both.",
        "recommended": "Recommended for your phone",
        "ios_card_title": "iPhone",
        "ios_card_text": "Install from the App Store. Updates arrive through the App Store.",
        "ios_card_button": "iPhone download guide",
        "android_card_title": "Android",
        "android_card_text": "Download the installer file from this site and install it directly.",
        "android_card_button": "Android download guide",
        "start_title": "After installing",
        "start_text": "Open UnicLife, then sign in or register. Allow camera access when asked so the app can scan cabinet and key QR codes.",
        "help_text": "Need help?",
        "help_link": "Contact support",
        "ios_title": "Download for iPhone",
        "ios_lede": "UnicLife is installed from the App Store, like any other iPhone app.",
        "ios_search_lede": "Search for UnicLife in the App Store on your iPhone and install it.",
        "ios_button": "Open in App Store",
        "ios_steps_title": "Install steps",
        "ios_steps": [
            "Tap Open in App Store. The App Store app opens on your iPhone.",
            "Tap Get and confirm with Face ID, Touch ID or your Apple ID password.",
            "Open UnicLife and sign in or register.",
            "Allow camera access when asked, so you can scan cabinet and key QR codes.",
        ],
        "ios_search_steps": [
            "Open the App Store app on your iPhone.",
            "Tap Search at the bottom right and type {name}.",
            "Find UnicLife in the results, tap Get and confirm with Face ID, Touch ID or your Apple ID password.",
            "Open UnicLife and sign in or register.",
            "Allow camera access when asked, so you can scan cabinet and key QR codes.",
        ],
        "ios_notes_title": "Good to know",
        "ios_notes": [
            "Open this page on your iPhone. On a computer, scan the QR code with your iPhone instead.",
            "Turn on automatic updates in Settings → App Store to always get the latest version.",
            "If the App Store says the app is not available, it may not be released in your region yet. Contact support and we will help.",
        ],
        "android_title": "Download for Android",
        "android_lede": "UnicLife for Android is installed from an installer file (APK) downloaded from this page.",
        "android_button": "Download Android app (APK)",
        "android_steps_title": "Install steps",
        "android_steps": [
            "Tap Download Android app. If your browser warns that this type of file can be harmful, choose Keep or Download anyway.",
            "Open the downloaded file named uniclife-android.apk from your notification bar or Downloads folder.",
            "If Android asks, allow your browser to install apps from this source, go back and tap Install.",
            "If Google Play Protect shows a warning, choose More details, then Install anyway. Do this only for a file you downloaded from this page.",
            "Open UnicLife, sign in or register, and allow camera access so you can scan QR codes.",
        ],
        "android_notes_title": "Updates",
        "android_notes": [
            "Most updates install automatically. Open the app and wait a moment; the new version applies the next time you start it.",
            "When a bigger update needs a new installer, return to this page and download it again. Install it over the existing app; you do not need to uninstall first.",
            "Always download from this page. Do not install the app from files sent by other people.",
        ],
    },
    "zh-cn": {
        "brand": "UnicLife 钥匙柜",
        "nav_download": "下载",
        "nav_support": "支持",
        "nav_privacy": "隐私政策",
        "language": "Language / 语言",
        "eyebrow": "下载",
        "home_title": "下载 UnicLife 钥匙柜",
        "home_lede": "请选择您手机的系统，两个版本的使用方式一致。",
        "recommended": "适合您的手机",
        "ios_card_title": "iPhone",
        "ios_card_text": "通过 App Store 安装，后续更新也由 App Store 提供。",
        "ios_card_button": "查看 iPhone 下载说明",
        "android_card_title": "Android",
        "android_card_text": "从本站下载安装文件，直接安装即可。",
        "android_card_button": "查看 Android 下载说明",
        "start_title": "安装之后",
        "start_text": "打开 UnicLife 后登录或注册。系统询问时请允许使用相机，这样才能扫描钥匙柜和钥匙二维码。",
        "help_text": "需要帮助？",
        "help_link": "联系支持",
        "ios_title": "iPhone 下载",
        "ios_lede": "UnicLife 通过 App Store 安装，和其他 iPhone 应用一样。",
        "ios_search_lede": "请在 iPhone 的 App Store 中搜索 UnicLife 并安装。",
        "ios_button": "前往 App Store 下载",
        "ios_steps_title": "安装步骤",
        "ios_steps": [
            "点击“前往 App Store 下载”，iPhone 会打开 App Store。",
            "点击“获取”，并使用 Face ID、Touch ID 或 Apple ID 密码确认。",
            "打开 UnicLife，登录或注册。",
            "系统询问时允许使用相机，以便扫描钥匙柜和钥匙二维码。",
        ],
        "ios_search_steps": [
            "打开 iPhone 上的 App Store。",
            "点击右下角“搜索”，输入 {name}。",
            "在结果中找到 UnicLife，点击“获取”，并使用 Face ID、Touch ID 或 Apple ID 密码确认。",
            "打开 UnicLife，登录或注册。",
            "系统询问时允许使用相机，以便扫描钥匙柜和钥匙二维码。",
        ],
        "ios_notes_title": "温馨提示",
        "ios_notes": [
            "请在 iPhone 上打开本页面。如果在电脑上查看，请改用 iPhone 扫描二维码。",
            "在“设置 → App Store”中开启自动更新，可以始终使用最新版本。",
            "如果 App Store 提示应用不可用，可能是当前地区尚未上架，请联系支持，我们会协助处理。",
        ],
        "android_title": "Android 下载",
        "android_lede": "Android 版通过本页面提供的安装文件（APK）安装。",
        "android_button": "下载 Android 版（APK）",
        "android_steps_title": "安装步骤",
        "android_steps": [
            "点击“下载 Android 版”。如果浏览器提示此类文件可能有风险，请选择“保留”或“仍然下载”。",
            "从通知栏或“下载”文件夹中打开名为 uniclife-android.apk 的文件。",
            "如果系统提示，请允许当前浏览器安装此来源的应用，然后返回并点击“安装”。",
            "如果 Google Play Protect 弹出警告，请选择“更多详情”，再点击“仍然安装”。仅对从本页面下载的文件这样操作。",
            "打开 UnicLife，登录或注册，并允许使用相机以便扫描二维码。",
        ],
        "android_notes_title": "关于更新",
        "android_notes": [
            "大多数更新会自动安装：打开应用稍等片刻，新版本会在下次启动时生效。",
            "如果某次较大的更新需要新的安装文件，请回到本页面重新下载，直接覆盖安装即可，无需先卸载。",
            "请始终从本页面下载，不要安装他人转发的安装文件。",
        ],
    },
}


def page_parts(locale, page):
    parts = [] if page == "home" else [page]
    if locale != "en":
        parts.append(locale)
    return parts


def prefix_for(locale, page):
    return "../" * len(page_parts(locale, page))


def link_to(from_locale, from_page, to_page, to_locale=None):
    """Relative link from one generated page to another."""
    prefix = prefix_for(from_locale, from_page)
    parts = page_parts(to_locale or from_locale, to_page)
    if not parts:
        return prefix or "./"
    return prefix + "/".join(parts) + "/"


def language_nav(locale, page):
    links = []
    for other in LOCALES:
        current = ' aria-current="page"' if other == locale else ""
        links.append(
            f'<a{current} lang="{HTML_LANG[other]}" href="{link_to(locale, page, page, other)}">{LOCALE_LABELS[other]}</a>'
        )
    return f'<nav class="languages" aria-label="Languages"><span>{escape(TEXT[locale]["language"])}</span>{"".join(links)}</nav>'


def legal_link(locale, section):
    suffix = "" if locale == "en" else "zh-cn/"
    return f"{LEGAL_BASE}/{section}/{suffix}"


def shell(locale, page, title, description, body):
    t = TEXT[locale]
    prefix = prefix_for(locale, page)
    nav = (
        f'<a href="{link_to(locale, page, "home")}">{escape(t["nav_download"])}</a>'
        f'<a href="{legal_link(locale, "privacy")}">{escape(t["nav_privacy"])}</a>'
        f'<a href="{legal_link(locale, "support")}">{escape(t["nav_support"])}</a>'
    )
    return f'''<!doctype html>
<html lang="{HTML_LANG[locale]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>{escape(title)} | {escape(t["brand"])}</title><meta name="description" content="{escape(description)}"><link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="{prefix}assets/site.css"></head><body>
<header class="top"><div class="wrap"><a class="brand" href="{link_to(locale, page, "home")}">{escape(t["brand"])}</a><nav class="nav" aria-label="Main navigation">{nav}</nav></div></header>
<main class="wrap"><div class="hero"><span class="eyebrow">{escape(t["eyebrow"])}</span><h1>{escape(title)}</h1><p class="lede">{escape(description)}</p></div>{language_nav(locale, page)}{body}</main>
<footer class="footer"><div class="wrap"><span>© 2026 {escape(t["brand"])}</span><nav aria-label="Footer navigation">{nav}</nav></div></footer></body></html>
'''


def steps_panel(title, steps):
    items = "".join(f"<li>{escape(step)}</li>" for step in steps)
    return f'<section class="panel"><h2>{escape(title)}</h2><ol class="steps">{items}</ol></section>'


def notes_panel(title, notes):
    items = "".join(f"<li>{escape(note)}</li>" for note in notes)
    return f'<section class="panel"><h2>{escape(title)}</h2><ul>{items}</ul></section>'


def render_home(locale):
    t = TEXT[locale]
    ios_href = link_to(locale, "home", "ios")
    android_href = link_to(locale, "home", "android")
    cards = (
        f'<section class="card platform" data-platform="ios"><span class="badge" hidden>{escape(t["recommended"])}</span><h2>{escape(t["ios_card_title"])}</h2><p>{escape(t["ios_card_text"])}</p><a class="button" href="{ios_href}">{escape(t["ios_card_button"])}</a></section>'
        f'<section class="card platform" data-platform="android"><span class="badge" hidden>{escape(t["recommended"])}</span><h2>{escape(t["android_card_title"])}</h2><p>{escape(t["android_card_text"])}</p><a class="button" href="{android_href}">{escape(t["android_card_button"])}</a></section>'
    )
    start = (
        f'<section class="panel"><h2>{escape(t["start_title"])}</h2><p>{escape(t["start_text"])}</p>'
        f'<p>{escape(t["help_text"])} <a href="{legal_link(locale, "support")}">{escape(t["help_link"])}</a></p></section>'
    )
    script = (
        "<script>(function(){var ua=navigator.userAgent||'';"
        "var p=/android/i.test(ua)?'android':(/iPhone|iPad|iPod/i.test(ua)?'ios':'');"
        "if(!p)return;var card=document.querySelector('.platform[data-platform=\"'+p+'\"]');"
        "if(!card)return;card.classList.add('recommended');"
        "var badge=card.querySelector('.badge');if(badge)badge.hidden=false;"
        "card.parentNode.insertBefore(card,card.parentNode.firstChild);})();</script>"
    )
    body = f'<div class="cards">{cards}</div><div class="stack">{start}</div>{script}'
    return shell(locale, "home", t["home_title"], t["home_lede"], body)


def render_ios(locale):
    t = TEXT[locale]
    if APP_STORE_URL:
        action = f'<p class="actions"><a class="button big" rel="noopener" href="{APP_STORE_URL}">{escape(t["ios_button"])}</a></p>'
        lede, steps = t["ios_lede"], t["ios_steps"]
    else:
        action = ""
        lede = t["ios_search_lede"]
        steps = [step.format(name=APP_STORE_SEARCH_NAME) for step in t["ios_search_steps"]]
    back = f'<p><a href="{link_to(locale, "ios", "home")}">← {escape(t["nav_download"])}</a></p>'
    body = f'{action}<div class="stack">{steps_panel(t["ios_steps_title"], steps)}{notes_panel(t["ios_notes_title"], t["ios_notes"])}</div>{back}'
    return shell(locale, "ios", t["ios_title"], lede, body)


def render_android(locale):
    t = TEXT[locale]
    action = f'<p class="actions"><a class="button big" rel="noopener" href="{ANDROID_APK_URL}">{escape(t["android_button"])}</a></p>'
    back = f'<p><a href="{link_to(locale, "android", "home")}">← {escape(t["nav_download"])}</a></p>'
    body = f'{action}<div class="stack">{steps_panel(t["android_steps_title"], t["android_steps"])}{notes_panel(t["android_notes_title"], t["android_notes"])}</div>{back}'
    return shell(locale, "android", t["android_title"], t["android_lede"], body)


def main():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    shutil.copytree(SITE / "assets", OUTPUT / "assets")
    shutil.copy(SITE / "favicon.svg", OUTPUT / "favicon.svg")
    (OUTPUT / ".nojekyll").write_text("", encoding="utf-8")

    renderers = {"home": render_home, "ios": render_ios, "android": render_android}
    count = 0
    for locale in LOCALES:
        for page, render in renderers.items():
            destination = OUTPUT.joinpath(*page_parts(locale, page)) / "index.html"
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(render(locale), encoding="utf-8")
            count += 1
    print(f"Generated {count} pages in {OUTPUT}")


if __name__ == "__main__":
    main()
