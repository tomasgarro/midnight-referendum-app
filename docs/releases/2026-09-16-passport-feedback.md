# Passport connection, outcomes and feedback

The public Passport bridge accepts `displayName` and `passportContract`, not `midnightAddresses`. Its current account is on Stagenet. The demo now requests version 1 with those supported fields and defaults the account bridge to Stagenet; explicit network configuration still wins. Origin, source-window, nonce, request ID and network validation remain intact. The browser fixture enforces the public provider's field allowlist so the previous mismatch cannot silently return.

## Outcome design

AppLlama research reviewed 33 success/verification screens and 10 error screens. Useful references: v0 Authentication Success (`onb_qznc5`), Insight Timer Goal Set (`onb_m43ik`), Fitia Plan Calculation Complete (`onb_yskkc`), Birdbuddy Bluetooth Connection Error (`onb_kih35`) and Agenda Error Sheet (`oth_7bg36`). We adopted a restrained status symbol, one clear outcome heading and an actionable recovery message. These are original React/CSS elements informed by the references, not copied assets.

The capybara now renders as one complete image instead of polygon-cut animated limbs. Errors settle in over 240ms; the success check draws over 280ms beside a clearly labelled DEMO pass. The illustration arrives over 280ms with a 6px movement. Reduced-motion mode removes these animations. Simulated success never suggests a real credential or transaction was issued.

## Feedback route

`/feedback` and the Settings form submit to `/api/feedback.php`, delivered only to `contact@midnight.vote`. The optional visitor email becomes Reply-To. No Passport profile, credential, vote choices or browser-storage contents are attached. The request carries only entered text, optional email, locale, a random retry identifier and an anti-bot field.

Hostinger PHP mail queues the message without browser credentials. Queue acceptance is not proof of inbox delivery. The form keeps text after errors and offers a direct-email fallback. A locked temporary file outside the public directory stores daily-rotated opaque counters and deduplication keys, not message bodies or raw IPs. Limits: 3 requests per 15 minutes per socket client, 6 per minute globally, 60 per day globally. Behind a proxy, the conservative socket-client limit may be shared. Failed mail attempts also count.

CI validates the PHP endpoint with a local fake sendmail transport: origin and payload rejection, fixed recipient, duplicate suppression and rate limiting. No actual email is sent by the test. Frontend tests mock submission and verify failure recovery and data minimization. Real inbox delivery and the owner's authenticated Passport consent remain separate acceptance checks.
