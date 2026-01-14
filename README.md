# Tiara

> **Fork** — This is a fork of [ruvnet/claude-flow](https://github.com/ruvnet/claude-flow), vendored as the orchestration layer for [agent-core](https://github.com/adolago/agent-core). Use agent-core for installation and runtime.

## Release

- **Version:** v0.1.0-20260114
- **Distribution:** bundled with agent-core (no standalone npm release)

## Scope

- SPARC orchestration and swarm coordination
- Persona task routing for Zee/Stanley/Johny
- Qdrant-backed state via `agent-core.jsonc` (`memory` + `tiara` config)

## Notes

- This fork is optimized for agent-core usage; standalone gateway/daemon workflows are not supported here.
- Upstream documentation is preserved for reference, but not every doc applies to the agent-core integration.

## License

MIT License — see [LICENSE](./LICENSE).
