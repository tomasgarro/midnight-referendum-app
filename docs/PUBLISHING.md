# Documentation publishing

GitHub is the canonical source. The public [Docs page](https://midnight.vote/docs) introduces the project and links to these documents. The landing page links to Docs from desktop navigation, mobile navigation and the footer.

## GitBook-ready structure

The repository includes [`.gitbook.yaml`](../.gitbook.yaml) and [SUMMARY.md](SUMMARY.md). To publish a GitBook edition, connect an authorized GitBook space to `tomasgarro/midnight-vote`, select `main`, and use the repository configuration. Preview internal links and Mermaid diagrams before publishing. No GitBook space or public GitBook URL has been created by this release.

Keep product claims in the vision, Passport and AI chapters aligned with the source and dated evidence. Update the public Docs overview when the implementation status changes.

## Repository identity

The repository was renamed from `tomasgarro/midnight-referendum-app` to `tomasgarro/midnight-vote` on 16 September 2026. Historical records retain their original URLs and revision identifiers. Internal npm workspace names remain stable so that the documentation release does not break package imports or build commands.

For an existing checkout:

```bash
git remote set-url origin https://github.com/tomasgarro/midnight-vote.git
```

## Community links

The footer uses the Discord invite linked by the [official Midnight website](https://midnight.network): `https://discord.com/invite/midnightnetwork?utm_source=midnight.vote&utm_medium=referral&utm_campaign=community&utm_content=footer`.

The Switzerland community channel is [Midnight Switzerland on Telegram](https://t.me/midnightswitzerland). These are external destinations. UTM parameters label the referral; they do not imply Discord reports invite conversions. No analytics script is added for these links.
