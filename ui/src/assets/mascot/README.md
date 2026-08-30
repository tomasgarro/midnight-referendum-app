# Capybara mascot assets

Production-ready ImageGen artwork for the referendum onboarding. Every file is
at least 1024 px on both axes and has a validated RGBA transparency channel.

| File | Variant | Intended use |
| --- | --- | --- |
| `capybara-waving.png` | Waving hello | Welcome stage |
| `capybara-reading.png` | Reading | Explore / FAQ |
| `capybara-thinking.png` | Thinking | Optional privacy explainer outside a decision step |
| `capybara-achievement.png` | Achievement | Demo credential success |
| `capybara-climbing.png` | Climbing | Optional non-decision progress states |
| `capybara-waiting.png` | Waiting | Enrollment pending |

Do not place the mascot on consent, eligibility, or ballot screens. Those are
serious privacy and voting decisions, and the mascot would dilute the moment.

Use `CapybaraMascot` from `@/components/mascot`. Prefer localized `alt` text
when the illustration communicates state. Set `decorative` only when adjacent
copy already communicates the same information.

```tsx
<CapybaraMascot
  variant="waving"
  alt={locale === 'es' ? 'Carpincho saludando' : 'Capybara waving hello'}
  size="lg"
  priority
/>
```

## Generation system

Built-in ImageGen used the supplied sticker photo as the sole original style
reference, then used the generated waving pose as the identity anchor for the
remaining set.

Base prompt:

> Production UI mascot sticker on a genuinely transparent square background.
> Preserve the same rounded, seated capybara identity: warm golden-yellow fur;
> muted grey-brown muzzle, inner ears, paws, and feet; one black dot eye without
> a highlight; small white front teeth; thin, slightly imperfect dark linework;
> softly textured flat colour; and a thick clean white sticker border. Keep the
> full subject centered with even padding and readable at 96–180 px. Calm,
> gentle, unhurried, and reassuring. Exactly one capybara. No text, logo,
> watermark, exaggerated grin, eyebrows, anime eyes, photorealism, 3D rendering,
> busy scenery, or shadow outside the sticker border.

Action prompts:

- Waving: seated, facing slightly left, one small paw raised in a gentle wave.
- Reading: seated and absorbed in an open coral-pink book held in both paws.
- Thinking: seated with one paw at the chin and one empty thought bubble.
- Achievement: content on a small green hill with a tiny coral-pink flag.
- Climbing: halfway up a gentle green slope, determined but relaxed.
- Waiting: seated beside a coral-pink hourglass, patient and unbothered.

