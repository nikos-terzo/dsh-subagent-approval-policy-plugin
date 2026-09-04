/**
 * Host-plane Cordis policy: require a human approval decision before a
 * model-facing subagent tool can dispatch its body.
 *
 * This intentionally gates `tools/pre-execute`, not `subagent/start`.
 * `subagent/start` is emitted after a provider has already established the
 * child, which is too late for a launch policy.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval';
import type { PreToolDecision } from '@deepseek-ai/dsh-tools';
export declare const name = "subagent-approval-policy";
export declare const inject: string[];
export interface Config {
    /** Tool names whose execution can establish a child agent. */
    toolNames?: string[];
}
export declare const Config: z<Config>;
export declare function decisionForApproval(toolName: string, outcome: ApprovalOutcome): PreToolDecision;
export declare function apply(ctx: Context, config: Config): void;
export default apply;
