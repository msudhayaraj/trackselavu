export type BudgetPeriod = 'MONTHLY' | 'WEEKLY';
export type BudgetScope = 'OVERALL' | 'CATEGORY';

export interface Budget {
  id: string;
  scope: BudgetScope;
  /** Required when scope === 'CATEGORY'. */
  categoryId?: string;
  period: BudgetPeriod;
  limitPaise: number;
  /** Percentage (0-100) at which a "approaching limit" warning is raised. */
  warningThresholdPercent: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewBudget = Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>;

export interface BudgetUsage {
  budget: Budget;
  categoryName?: string;
  limitPaise: number;
  spentPaise: number;
  remainingPaise: number;
  percentUsed: number;
  isWarning: boolean;
  isExceeded: boolean;
  periodLabel: string;
}
