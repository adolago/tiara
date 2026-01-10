import { agenticHookManager } from './hook-manager.js';
export const todoContinuationHook = {
    id: 'agentic-todo-continuation',
    type: 'todo-continuation',
    priority: 95,
    handler: async (payload, context)=>{
        const { todoState, proceedWithoutAsking, completionThreshold } = payload;
        const sideEffects = [];
        if (!todoState || todoState.total === 0 || todoState.remaining === 0) {
            return {
                continue: true
            };
        }
        if (todoState.percentage >= completionThreshold) {
            return {
                continue: true
            };
        }
        const reminderMessage = generateReminderMessage(todoState, proceedWithoutAsking);
        sideEffects.push({
            type: 'memory',
            action: 'store',
            data: {
                key: `todo:continuation:${context.sessionId}:${Date.now()}`,
                value: {
                    todoState,
                    reminderMessage,
                    proceedWithoutAsking,
                    timestamp: Date.now()
                },
                ttl: 86400
            }
        });
        sideEffects.push({
            type: 'log',
            action: 'info',
            data: {
                message: `Todo continuation triggered: ${todoState.completed}/${todoState.total} completed`,
                remaining: todoState.remaining
            }
        });
        sideEffects.push({
            type: 'notification',
            action: 'emit',
            data: {
                event: 'todo:continuation',
                data: {
                    message: reminderMessage,
                    todoState,
                    proceedWithoutAsking
                }
            }
        });
        return {
            continue: true,
            modified: true,
            payload: {
                ...payload,
                reminderMessage,
                shouldContinue: true
            },
            metadata: {
                todoStatus: `${todoState.completed}/${todoState.total} completed, ${todoState.remaining} remaining`,
                incomplete: todoState.items.filter((i)=>i.status !== 'completed')
            },
            sideEffects
        };
    }
};
export const todoStatusCheckHook = {
    id: 'agentic-todo-status-check',
    type: 'todo-status-check',
    priority: 100,
    handler: async (payload, context)=>{
        const todoState = context.todoState || payload.todoState;
        if (!todoState) {
            return {
                continue: true
            };
        }
        const sideEffects = [];
        sideEffects.push({
            type: 'metric',
            action: 'update',
            data: {
                name: 'todo.status.check',
                value: 1,
                tags: {
                    completed: todoState.completed,
                    remaining: todoState.remaining,
                    percentage: todoState.percentage
                }
            }
        });
        return {
            continue: true,
            modified: true,
            metadata: {
                todoState,
                lastCheck: Date.now()
            },
            sideEffects
        };
    }
};
export const todoReminderInjectHook = {
    id: 'agentic-todo-reminder-inject',
    type: 'todo-reminder-inject',
    priority: 90,
    handler: async (payload, context)=>{
        const { todoState, proceedWithoutAsking } = payload;
        if (!todoState || todoState.remaining === 0) {
            return {
                continue: true
            };
        }
        const sideEffects = [];
        const systemReminder = formatSystemReminder(todoState, proceedWithoutAsking);
        sideEffects.push({
            type: 'memory',
            action: 'store',
            data: {
                key: `todo:reminder:${context.sessionId}`,
                value: {
                    reminder: systemReminder,
                    todoState,
                    generatedAt: Date.now()
                },
                ttl: 3600
            }
        });
        sideEffects.push({
            type: 'log',
            action: 'info',
            data: {
                message: 'System reminder injected for todo continuation',
                completed: todoState.completed,
                total: todoState.total
            }
        });
        return {
            continue: true,
            modified: true,
            payload: {
                ...payload,
                reminderMessage: systemReminder
            },
            metadata: {
                systemReminder,
                injectedAt: Date.now()
            },
            sideEffects
        };
    }
};
function generateReminderMessage(todoState, proceedWithoutAsking) {
    const { completed, total, remaining, percentage } = todoState;
    let message = `[SYSTEM REMINDER - TODO CONTINUATION]\n\n`;
    message += `Incomplete tasks remain in your todo list. Continue working on the next pending task.\n\n`;
    if (proceedWithoutAsking) {
        message += `- Proceed without asking for permission\n`;
    }
    message += `- Mark each task complete when finished\n`;
    message += `- Do not stop until all tasks are done\n\n`;
    message += `[Status: ${completed}/${total} completed, ${remaining} remaining]`;
    return message;
}
function formatSystemReminder(todoState, proceedWithoutAsking) {
    const { completed, total, remaining } = todoState;
    const lines = [
        '[SYSTEM REMINDER - TODO CONTINUATION]',
        '',
        'Incomplete tasks remain in your todo list. Continue working on the next pending task.',
        ''
    ];
    if (proceedWithoutAsking) {
        lines.push('- Proceed without asking for permission');
    }
    lines.push('- Mark each task complete when finished');
    lines.push('- Do not stop until all tasks are done');
    lines.push('');
    lines.push(`[Status: ${completed}/${total} completed, ${remaining} remaining]`);
    return lines.join('\n');
}
export function calculateTodoState(todos) {
    const total = todos.length;
    const completed = todos.filter((t)=>t.status === 'completed').length;
    const inProgress = todos.filter((t)=>t.status === 'in_progress').length;
    const remaining = total - completed;
    const percentage = total > 0 ? Math.round(completed / total * 100) : 100;
    return {
        total,
        completed,
        remaining,
        inProgress,
        percentage,
        items: todos
    };
}
export function shouldTriggerContinuation(todoState, options = {}) {
    const { completionThreshold = 100, minRemaining = 1 } = options;
    if (todoState.total === 0) {
        return false;
    }
    if (todoState.remaining === 0) {
        return false;
    }
    if (todoState.percentage < completionThreshold && todoState.remaining >= minRemaining) {
        return true;
    }
    return false;
}
export function createTodoContinuationPayload(todos, options = {}) {
    const todoState = calculateTodoState(todos);
    const { proceedWithoutAsking = true, completionThreshold = 100 } = options;
    return {
        operation: 'continue',
        todoState,
        proceedWithoutAsking,
        completionThreshold,
        shouldContinue: shouldTriggerContinuation(todoState, {
            completionThreshold
        })
    };
}
export function registerTodoContinuationHooks() {
    agenticHookManager.register(todoContinuationHook);
    agenticHookManager.register(todoStatusCheckHook);
    agenticHookManager.register(todoReminderInjectHook);
}

//# sourceMappingURL=todo-continuation-hooks.js.map