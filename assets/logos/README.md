# Logo assets — you supply these

I can't source or generate official trademarked logos myself (F1, NBA,
Premier League, and team badges are all protected brand assets). This
folder is wired up in the code to *use* logo files once you add them —
you just need to drop the actual image files in, named exactly as below.

Source these from each organization's official media/press kit, and
check what usage terms apply given this is a commercial product.

## Homepage league logos
Used by: index.html
Place these directly in assets/logos/:
  - f1.png   (or .svg)
  - nba.png
  - epl.png

## F1 team logos
Used by: js/v1/adapters/f1.js (see the LOGO_MAP object)
Place these in assets/logos/f1-teams/, named to match the keys in
LOGO_MAP — e.g.:
  - mercedes.png
  - ferrari.png
  - red-bull.png
  - mclaren.png
  - (etc. — see f1.js for the full list of expected filenames)

## NBA and EPL team logos
No files needed here — these come directly from each API's own data
(API-Sports for NBA, ESPN for EPL), since that's the properly-sourced
data feed rather than a separate asset you'd host yourself.
