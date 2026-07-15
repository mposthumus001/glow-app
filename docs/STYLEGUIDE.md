Buttons

Radius

18px

Cards

28px

Spacing

8
16
24
32

Animation

350ms

Ease

easeOut

Glow Atlas motion exceptions

Documented in docs/GlowAtlas.md — presence family (0.5–1.05s, custom ease) and geographic zoom (700ms easeInOut, utils/zoom.ts) intentionally deviate from the 350ms/easeOut global standard above. Generic Atlas chrome (level fades, back button) still follows it via UI_FADE_TRANSITION. The MapLibre camera's own fitBounds glide (map/camera.ts's CAMERA_DURATION_MS) is a separate 900ms transition, immediate under reduced motion — a real map camera move reads calmer at a slightly longer duration than the old SVG zoom family, and is unrelated to it.

Colours

Primary Lavender

Secondary Navy

Text White

Icons

Rounded

Never sharp.