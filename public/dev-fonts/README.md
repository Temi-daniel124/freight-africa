# Fonts for the private comparison page (/dev/fonts)

Built by `scripts/fonts/build-bakeoff.py` from the variable fonts in https://github.com/google/fonts
(`ofl/geist`, `ofl/plusjakartasans`, `ofl/manrope`, `ofl/onest`, `ofl/googlesansflex`), all under the SIL
Open Font License 1.1 (`licences/`). Geist, Manrope, Onest and Google Sans Flex have no naira sign, so
the script draws one from each font's own N and equals sign; those files are modified versions and are
renamed "FA <family> Naira" as the licence requires. Nothing here is used by the live site.
