/**
 * Execution Evaluator — Tracks execution outcomes in agent memory.
 */
import type { Evaluator, IAgentRuntime, Memory } from '@elizaos/core';
import { logger } from '@elizaos/core';

const EXECUTION_ACTIONS = new Set([
  'EXECUTE_WORKFLOW', 'WAIT_EXECUTION', 'TRANSFER_TOKEN',
  'CONTRACT_CALL', 'CHECK_AND_EXECUTE', 'CALL_LISTED_WORKFLOW',
]);

export const executionEvaluator: Evaluator = {
  name: 'keeperkit-execution-tracker',
  description: 'Tracks KeeperKit execution outcomes in agent memory for future reference',
  similes: ['EXECUTION_TRACKER', 'KEEPERKIT_TRACKER'],

  alwaysRun: false,

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Run after execution-related actions
    const actionName = (message.content as Record<string, unknown>)?.action as string | undefined;
    return !!actionName && EXECUTION_ACTIONS.has(actionName);
  },

  handler: async (runtime: IAgentRuntime, message: Memory): Promise<void> => {
    try {
      const content = message.content as Record<string, unknown>;
      const actionName = content.action as string;
      const data = content.data as Record<string, unknown> | undefined;

      if (!data) return;

      const executionRecord = {
        action: actionName,
        timestamp: new Date().toISOString(),
        executionId: data.executionId || (data.execution as Record<string, unknown>)?.id,
        workflowId: data.workflowId || (data.execution as Record<string, unknown>)?.workflowId,
        status: (data.execution as Record<string, unknown>)?.status,
        success: content.success,
      };

      logger.info(
        `[KeeperKit] Execution tracked: ${actionName} — ${String(executionRecord.status || 'submitted')}`,
      );

      // Store in agent memory for future reference
      try {
        await (runtime as any).createMemory({
          entityId: message.entityId,
          roomId: message.roomId,
          content: {
            text: `KeeperKit execution: ${actionName} — ${String(executionRecord.status || 'submitted')}`,
            ...executionRecord,
          },
        }, 'keeperkit_executions');
      } catch {
        // createMemory API may vary across ElizaOS versions — log only
      }
    } catch (err) {
      logger.error('[KeeperKit] executionEvaluator error:', String(err));
    }
  },

  examples: [
    {
      prompt: 'Execute workflow wf_abc123',
      messages: [
        { name: '{{name1}}', content: { text: 'Execute workflow wf_abc123', action: 'EXECUTE_WORKFLOW' } },
      ],
      outcome: 'Execution tracked in agent memory',
    },
    {
      prompt: 'Transfer 100 USDC to 0xRecipient',
      messages: [
        { name: '{{name1}}', content: { text: 'Transfer 100 USDC', action: 'TRANSFER_TOKEN' } },
      ],
      outcome: 'Transfer execution tracked in agent memory',
    },
  ],
};
