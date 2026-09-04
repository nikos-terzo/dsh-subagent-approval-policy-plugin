/**
 * Host-plane Cordis policy: require a human approval decision before a
 * model-facing subagent tool can dispatch its body.
 *
 * This intentionally gates `tools/pre-execute`, not `subagent/start`.
 * `subagent/start` is emitted after a provider has already established the
 * child, which is too late for a launch policy.
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-user-approval'

export const name = 'subagent-approval-policy'
export const inject = ['tools']

const DEFAULT_TOOL_NAMES = [
  'subagent',
  'subagent_fork',
  'subagent_codex',
  'subagent_claude_code',
  // The workflow tool exposes agent() and can fan out many children.
  'workflow',
] as const

export interface Config {
  /** Tool names whose execution can establish a child agent. */
  toolNames?: string[]
}

export const Config: z<Config> = z.object({
  toolNames: z.array(z.string()).default([...DEFAULT_TOOL_NAMES]),
})

function denial(toolName: string, message: string): Extract<PreToolDecision, { kind: 'deny' }> {
  return { kind: 'deny', reason: `subagent launch blocked for "${toolName}": ${message}` }
}

export function decisionForApproval(toolName: string, outcome: ApprovalOutcome): PreToolDecision {
  switch (outcome) {
    case 'allowed-once':
      return { kind: 'allow' }
    case 'rejected':
      return denial(toolName, 'the user rejected the launch approval')
    case 'cancelled':
      return denial(toolName, 'the approval request was cancelled')
    case 'unavailable':
      return denial(toolName, 'no human approval channel is available')
    default: {
      const exhaustive: never = outcome
      return denial(toolName, `unknown approval outcome ${String(exhaustive)}`)
    }
  }
}

export function apply(ctx: Context, config: Config): void {
  const toolNames = new Set(config.toolNames ?? DEFAULT_TOOL_NAMES)

  // Prepend so this policy is evaluated before other extensible pre-execution
  // listeners. A denial is also enforced by the ToolRuntime's monotonic guard.
  ctx.on('tools/pre-execute', async (
    exec: ToolExecution,
    next: () => Promise<PreToolDecision>,
  ): Promise<PreToolDecision> => {
    if (!toolNames.has(exec.name)) return next()

    const agent = exec.agent
    if (agent === undefined) {
      return denial(exec.name, 'the call has no agent to route to a human')
    }

    const approval = ctx.get('approval')
    if (approval === undefined) {
      return denial(exec.name, 'the approval service is not composed')
    }

    const outcome = await approval.request({
      agent,
      toolName: exec.name,
      callId: exec.callId,
      reason: 'Launching a subagent creates a child agent and may perform work in another session.',
      signal: exec.signal,
    })
    return decisionForApproval(exec.name, outcome)
  }, { prepend: true })
}

export default apply
