# Wave 1 onboarding research sources

Research date: 2026-08-27

## Appllama availability

The Appllama MCP endpoint (`https://mcp.appllama.io/mcp`) was not exposed as a callable MCP tool in this implementation session, so `get_credits` and catalog retrieval could not be executed. The supplied Purpose and Rosebud references and the local reference media are therefore the fallback research set. No Appllama assets were downloaded, embedded, or copied into the product.

## Primary references

- [Purpose AI Mentor Coach](https://appllama.io/apps/6749098156/purpose-ai-mentor-coach)
  - Local media: `C:\Users\tomas\Downloads\Purpose-AI-Mentor-Coach-Welcome-Screen-spl_66u17.mp4`
  - Local media: `C:\Users\tomas\Downloads\Purpose-AI-Mentor-Coach-Onboarding-Welcome-spl_6iakg.webp`
  - Durable observation: a calm cream first-open surface, very sparse hierarchy, a prominent title/subtitle pair, one large bottom action, and an illustration area that carries warmth without competing with the action.
- [Rosebud AI Journal](https://appllama.io/apps/6451135127/rosebud-ai-journal)
  - Durable direction from the supplied reference: use a gentle, text-led onboarding cadence where each screen answers one question before asking for the next action.

## Additional pattern set

The supplied Appllama catalog screenshots were used as the fallback pattern index for Welcome, Onboarding, Home & dashboard, Detail & content, Permissions & alerts, and Empty & error states. These are pattern categories rather than copied screens; exact catalog screen IDs were unavailable without the MCP session.

The implementation translates those patterns into the existing responsive React/Vite stack: mobile-first layout, one primary CTA per stage, progressive explanation, explicit recovery, and a reserved illustration slot for an original future capybara asset.
