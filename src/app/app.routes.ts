import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'TrackSelavu — Dashboard',
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./features/transactions/transaction-list/transaction-list.component').then(
        (m) => m.TransactionListComponent,
      ),
    title: 'TrackSelavu — Transactions',
  },
  {
    path: 'transactions/new',
    loadComponent: () =>
      import('./features/transactions/transaction-form/transaction-form.component').then(
        (m) => m.TransactionFormComponent,
      ),
    title: 'TrackSelavu — Add Transaction',
  },
  {
    path: 'transactions/:id/edit',
    loadComponent: () =>
      import('./features/transactions/transaction-form/transaction-form.component').then(
        (m) => m.TransactionFormComponent,
      ),
    title: 'TrackSelavu — Edit Transaction',
  },
  {
    path: 'budgets',
    loadComponent: () => import('./features/budgets/budgets.component').then((m) => m.BudgetsComponent),
    title: 'TrackSelavu — Budgets',
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
    title: 'TrackSelavu — Reports',
  },
  {
    path: 'charts',
    loadComponent: () => import('./features/charts/charts.component').then((m) => m.ChartsComponent),
    title: 'TrackSelavu — Charts',
  },
  {
    path: 'sms-import',
    loadComponent: () =>
      import('./features/sms-import/sms-import.component').then((m) => m.SmsImportComponent),
    title: 'TrackSelavu — SMS Import',
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
    title: 'TrackSelavu — Categories',
  },
  {
    path: 'backup-restore',
    loadComponent: () =>
      import('./features/backup-restore/backup-restore.component').then(
        (m) => m.BackupRestoreComponent,
      ),
    title: 'TrackSelavu — Backup & Restore',
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
    title: 'TrackSelavu — Settings',
  },
  { path: '**', redirectTo: 'dashboard' },
];
