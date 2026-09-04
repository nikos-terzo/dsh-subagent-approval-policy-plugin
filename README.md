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

### Normal DSH profile installation (recommended)

For a normal Harness profile, install the bundle with `dsh plugin`. This
installs the package and automatically adds its `dsh.bundle` patch:

```sh
dsh plugin --profile <profile-name> add github:nikos-terzo/dsh-subagent-approval-policy-plugin
```

The bundle's `dsh.bundle` manifest automatically applies
[`cordis.patch.yml`](./cordis.patch.yml) to the profile:

```yaml
- id: subagent-approval-policy
  name: dsh-subagent-approval-policy
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

### Standalone applications

For an application that directly loads a complete `cordis.yml`, install the
package as an application dependency and add the row from `cordis.patch.yml`
to that composition manually. Installing a package and activating its plugin
are separate steps: Cordis loads the plugin only when the row is present.

For example, install this repository directly from GitHub with pnpm:

```sh
pnpm add \
  --allow-build=dsh-subagent-approval-policy \
  github:nikos-terzo/dsh-subagent-approval-policy-plugin
```

The row belongs in the host composition. Its position relative to the approval
row is only organizational; Cordis resolves the `tools` and `approval`
services through dependency injection. Bundle metadata is applied
automatically only by the `dsh plugin` profile manager.

The `workflow` name is included by default because its script can call
`agent()` and fan out children. This produces one approval for starting the
workflow; per-child approval requires the workflow provider itself to expose a
pre-launch hook.

The model route does not change the policy. ACP and other clients receive the
normal tool error when a launch is rejected. In unattended mode where the
approval service policy is `never`, launches are rejected deterministically.
