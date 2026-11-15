# Fonts

The website self-hosts four typeface families. All four are licensed under the
SIL Open Font License, Version 1.1 (OFL), which allows them to be used, embedded and
redistributed, including in this public repository, provided that every copy keeps its
copyright notice and license. Each family's license is in the `*-OFL.txt` file next to
its font files.

| Font files | Family and version | Used for | Designer | Copyright holder | Reserved Font Name | License |
| --- | --- | --- | --- | --- | --- | --- |
| `newsreader-latin-opsz-normal.woff2`, `newsreader-latin-opsz-italic.woff2` | Newsreader 1.003, variable (weight 200–800, optical size 6–72), Latin subset | Body text and headings | Production Type | The Newsreader Project Authors | None | `newsreader-OFL.txt` |
| `archivo-latin-standard-normal.woff2` | Archivo 2.001, variable (weight 100–900, width 62–125), Latin subset | Navigation, captions, tables and chart labels | Omnibus-Type | The Archivo Project Authors | None | `archivo-OFL.txt` |
| `IBMPlexMono-Regular.woff2`, `IBMPlexMono-Medium.woff2` | IBM Plex Mono 2.004, Regular and Medium, complete fonts | Code | Mike Abbink, Paul van der Laan, Pieter van Rosmalen (Bold Monday) | IBM Corp. | "Plex" | `ibm-plex-mono-OFL.txt` |
| `SourceSerif4Variable-Roman.ttf.woff2`, `SourceSerif4Variable-Italic.ttf.woff2` | Source Serif 4 4.005, variable (weight 200–900, optical size 8–60), complete fonts | Greek letters in formulas (σ, μ, Σ, Δ) | Frank Grießhammer | Adobe | "Source" | `source-serif-4-OFL.txt` |

## Where the files come from

- **IBM Plex Mono**: unmodified copies, with their original file names, of
  `fonts/complete/woff2/IBMPlexMono-Regular.woff2` and `IBMPlexMono-Medium.woff2`
  from IBM's package `@ibm/plex-mono` 1.1.0 on the npm registry. The same files are at
  the tag `@ibm/plex-mono@1.1.0` of IBM's repository, commit
  [`1da12f0`](https://github.com/IBM/plex/tree/1da12f02587b630c07e92692d21492d722f53614/packages/plex-mono/fonts/complete/woff2).
  The later release 2.5.0 (font version 2.005) was not used
  because it redraws "r" and "*", which would change how the code looks.
- **Source Serif 4**: unmodified copies, with their original file names, of
  `WOFF2/VAR/SourceSerif4Variable-Roman.ttf.woff2` and
  `SourceSerif4Variable-Italic.ttf.woff2` from Adobe's repository
  [adobe-fonts/source-serif](https://github.com/adobe-fonts/source-serif/tree/release/WOFF2/VAR),
  release 4.005R (tag commit `2823e99`). The files have not changed on the `release`
  branch since that release, and the same files are in the npm package `source-serif` 4.5.1.
- **Newsreader and Archivo**: unmodified copies of the files in the Fontsource packages
  `@fontsource-variable/newsreader` 5.3.0 and `@fontsource-variable/archivo` 5.3.0,
  which repackage the Google Fonts builds. Neither family has a Reserved Font Name.

The IBM and Adobe files were checked byte for byte against both sources on
15 November 2026, and the Fontsource files against the npm registry on 14 November 2026.
Each font file also carries its copyright notice and the OFL address in its internal
metadata. SHA-256 checksums of the files as published here:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `IBMPlexMono-Regular.woff2` | 45,640 | `49ce58b41a0e1cb921c0f58d9a5b8b96a2cc21437c7066f3ba4f24873076d131` |
| `IBMPlexMono-Medium.woff2` | 46,724 | `8c2c290cbd998fa1f647e4572aca6ebbd72589551b0f3f9f8bb8628fbb8219d5` |
| `SourceSerif4Variable-Roman.ttf.woff2` | 429,100 | `940a76eda1388de39d38c8e7a79bf6ea058a387faee0a9f33c8d25c6ba05e1be` |
| `SourceSerif4Variable-Italic.ttf.woff2` | 346,688 | `9d28b5749a1ad096a295cb607c521bd1af4cd9979b6f37332daf70143149fb44` |
| `newsreader-latin-opsz-normal.woff2` | 132,000 | `6e4f2958c3a7c4a80acde4e5a679abe7e01bc1e30b92be3c7a8b696ef401d101` |
| `newsreader-latin-opsz-italic.woff2` | 146,872 | `5dfcd10d24af8c82927ba57f7983dd997f7b200594c09c35a1b1ed9fc4597506` |
| `archivo-latin-standard-normal.woff2` | 90,104 | `e3a28eade21a900c7155a247757f4b2834c07bb7ef07ad7efa55cebaac1e8f5e` |

The license files are copied unchanged from the copyright holders' repositories:

- `newsreader-OFL.txt`: [productiontype/Newsreader](https://github.com/productiontype/Newsreader/blob/master/OFL.txt)
- `archivo-OFL.txt`: [Omnibus-Type/Archivo](https://github.com/Omnibus-Type/Archivo/blob/master/OFL.txt)
- `ibm-plex-mono-OFL.txt`: [IBM/plex](https://github.com/IBM/plex/blob/master/packages/plex-mono/LICENSE.txt), identical to `LICENSE.txt` in `@ibm/plex-mono` 1.1.0
- `source-serif-4-OFL.txt`: [adobe-fonts/source-serif](https://github.com/adobe-fonts/source-serif/blob/release/LICENSE.md), identical to `LICENSE.md` in `source-serif` 4.5.1

## Conditions to keep

- Keep each license file in this folder with its fonts. The fonts may not be sold on their own.
- The IBM Plex Mono and Source Serif 4 files are the copyright holders' own files and
  carry the Reserved Font Names "Plex" and "Source" as IBM and Adobe distribute them.
  Do not edit them (for example by subsetting, converting or changing their internal
  names): under the OFL a modified version may not use a Reserved Font Name without the
  copyright holder's written permission. Replacing a file with another official build of
  the same font from IBM or Adobe is fine, but newer builds may draw some characters
  differently.
- `style.css` declares Source Serif 4 under the CSS family name "Newsreader", restricted
  to `unicode-range: U+0370-03FF`, so that Greek letters in Newsreader text use it and
  browsers download it only for pages with Greek letters in that text. This only names
  the font inside the stylesheet; the font file itself is not modified or renamed.
- Images made with these fonts, such as `../img/og-image.png`, are not covered by the
  font license.
- The other names in the CSS font stacks (Georgia, Helvetica Neue, Arial, Menlo,
  Consolas and the system fonts) refer to fonts already installed on the reader's
  device; none of them is distributed here.
