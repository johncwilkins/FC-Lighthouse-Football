# FC Lighthouse Football

A portrait-first, two-player handheld LED football game with FC Lighthouse Away colors, a molded oval stadium, and the supplied team artwork.

## Play

- Home runs right; Visitor runs left. Pass the phone when possession changes.
- Use the arrow buttons to start and move during a play.
- Hold **ST** for down, field position, and yards to go; hold **SC** for scores, time, and quarter. Release to restore the prepared field.
- **K** kicks on fourth down. Punts use a truncated bell curve centered on 40 yards, bounded at 20–60 yards.
- Touchdowns score 7; field goals score 3. The clock stops at zero while the current play continues to its conclusion.
- Four quarters provide approximately 5½ minutes of live action, plus time between plays.
- Sound is optional. The screen fits the mobile browser's visible viewport without scrolling.

## GitHub Pages

Upload these files to the repository root. In Settings → Pages, choose **Deploy from a branch**, select **main**, and choose **/(root)**.

This is a static site: no installation, build step, server, API key, or paid hosting service is required.

## Files

- `index.html`: handheld layout and artwork styling
- `game.js`: gameplay, clocks, scoring, and kick animation
- `viewport.js`: browser viewport fitting
- `assets/`: FC Lighthouse artwork and nautical-chart decoration
- `.nojekyll`: serves the static files directly

Unofficial tribute to classic 1970s handheld football. Not affiliated with Mattel.
