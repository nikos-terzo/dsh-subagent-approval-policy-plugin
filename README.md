# Subagent approval policy

This is a host-plane Cordis plugin bundle for DeepSeek Harness. It asks the existing
`ctx.approval` service before the body of a configured subagent tool runs. A
launch proceeds only for `allowed-once`; rejection, cancellation, an absent
approval service, and unknown outcomes all fail closed.

The gate uses `tools/pre-execute`. The `subagent/start` event is deliberately
not used because it is emitted after a provider has already established the
child.

## Develop and install it

This repository is intentionally separate from the Harness checkout. TypeScript
LSP and type-checking use the pinned dev dependencies in this package:

```sh
pnpm install
pnpm run typecheck
pnpm run build
```

Install the bundle into a profile:

```sh
dsh plugin --profile demo add github:nikos-terzo/dsh-subagent-approval-policy-plugin
```

The bundle's `dsh.bundle` manifest automatically applies
[`cordis.patch.yml`](./cordis.patch.yml) to the profile:

```yaml
- id: subagent-approval-policy
  name: '@deepseek-ai/dsh-subagent-approval-policy'
  config:
    toolNames:
      - subagent
      - subagent_fork
      - subagent_codex
      - subagent_claude_code
      - workflow
```

The profile's base bundle supplies `@deepseek-ai/dsh-user-approval`. The
approval answerer/UI remains responsible for presenting the question; this
plugin only enforces the pre-launch decision. Do not put this row in an agent
preset: it protects the shared subagent registry and must cover every session.

The `workflow` name is included by default because its script can call
`agent()` and fan out children. This produces one approval for starting the
workflow; per-child approval requires the workflow provider itself to expose a
pre-launch hook.

## Local Qwen / ACP note

The model route does not change the policy. `nori`/ACP still receives the
normal tool error when a launch is rejected, and the same session's configured
approval answerer must answer the request. In unattended mode where the
approval service policy is `never`, launches are rejected deterministically.
