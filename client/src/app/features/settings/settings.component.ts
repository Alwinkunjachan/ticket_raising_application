import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SettingsService, AnalyticsDashboard } from './services/settings.service';
import { NotificationService } from '../../core/services/notification.service';
import { Member } from '../../core/models/member.model';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    RelativeTimePipe,
  ],
  template: `
    <div class="settings-page">
      <div class="settings-header">
        <h1>Settings</h1>
        <p>Application analytics and user management</p>
      </div>

      <mat-tab-group animationDuration="200ms">
        <!-- Analytics Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>analytics</mat-icon>
            <span>Analytics</span>
          </ng-template>

          @if (!analytics()) {
            <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
          } @else {
            <div class="analytics-content">
              <!-- Overview Cards -->
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-icon" style="background: #3b82f6"><mat-icon>folder</mat-icon></div>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics()!.overview.totalProjects }}</span>
                    <span class="stat-label">Projects</span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon" style="background: #8b5cf6"><mat-icon>task_alt</mat-icon></div>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics()!.overview.totalIssues }}</span>
                    <span class="stat-label">Total Issues</span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon" style="background: #f59e0b"><mat-icon>pending</mat-icon></div>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics()!.overview.openIssues }}</span>
                    <span class="stat-label">Open Issues</span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon" style="background: #10b981"><mat-icon>people</mat-icon></div>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics()!.overview.totalMembers }}</span>
                    <span class="stat-label">Members</span>
                  </div>
                </div>
              </div>

              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-icon" style="background: #06b6d4"><mat-icon>loop</mat-icon></div>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics()!.overview.activeCycles }}</span>
                    <span class="stat-label">Active Cycles</span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon" style="background: #22c55e"><mat-icon>check_circle</mat-icon></div>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics()!.overview.completionRate }}%</span>
                    <span class="stat-label">Completion Rate</span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon" style="background: #ec4899"><mat-icon>label</mat-icon></div>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics()!.overview.totalLabels }}</span>
                    <span class="stat-label">Labels</span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon" style="background: #ef4444"><mat-icon>block</mat-icon></div>
                  <div class="stat-info">
                    <span class="stat-value">{{ analytics()!.overview.blockedMembers }}</span>
                    <span class="stat-label">Blocked Users</span>
                  </div>
                </div>
              </div>

              <!-- Breakdown Row -->
              <div class="breakdown-row">
                <div class="section-card">
                  <h3>Issues by Status</h3>
                  @if (analytics()!.issuesByStatus.length === 0) {
                    <p class="no-data">No issues yet</p>
                  } @else {
                    <div class="bar-list">
                      @for (item of analytics()!.issuesByStatus; track item.status) {
                        <div class="bar-item">
                          <div class="bar-label">
                            <span class="bar-name">{{ formatStatus(item.status) }}</span>
                            <span class="bar-count">{{ item.count }}</span>
                          </div>
                          <div class="bar-track">
                            <div class="bar-fill"
                                 [style.width.%]="getPercent(item.count, analytics()!.overview.totalIssues)"
                                 [style.background]="getStatusColor(item.status)"></div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>

                <div class="section-card">
                  <h3>Issues by Priority</h3>
                  @if (analytics()!.issuesByPriority.length === 0) {
                    <p class="no-data">No issues yet</p>
                  } @else {
                    <div class="bar-list">
                      @for (item of analytics()!.issuesByPriority; track item.priority) {
                        <div class="bar-item">
                          <div class="bar-label">
                            <span class="bar-name">{{ formatPriority(item.priority) }}</span>
                            <span class="bar-count">{{ item.count }}</span>
                          </div>
                          <div class="bar-track">
                            <div class="bar-fill"
                                 [style.width.%]="getPercent(item.count, analytics()!.overview.totalIssues)"
                                 [style.background]="getPriorityColor(item.priority)"></div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Issues Per Project + Top Assignees -->
              <div class="breakdown-row">
                <div class="section-card">
                  <h3>Issues per Project</h3>
                  @if (analytics()!.issuesPerProject.length === 0) {
                    <p class="no-data">No projects yet</p>
                  } @else {
                    <div class="bar-list">
                      @for (item of analytics()!.issuesPerProject; track item.identifier) {
                        <div class="bar-item">
                          <div class="bar-label">
                            <span class="bar-name">{{ item.identifier }} — {{ item.name }}</span>
                            <span class="bar-count">{{ item.count }}</span>
                          </div>
                          <div class="bar-track">
                            <div class="bar-fill"
                                 [style.width.%]="getPercent(item.count, analytics()!.overview.totalIssues)"
                                 style="background: #8b5cf6"></div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>

                <div class="section-card">
                  <h3>Top Assignees</h3>
                  @if (analytics()!.topAssignees.length === 0) {
                    <p class="no-data">No assignments yet</p>
                  } @else {
                    <div class="assignee-list">
                      @for (a of analytics()!.topAssignees; track a.email) {
                        <div class="assignee-row">
                          <div class="assignee-avatar">{{ a.name.charAt(0).toUpperCase() }}</div>
                          <div class="assignee-info">
                            <span class="assignee-name">{{ a.name }}</span>
                            <span class="assignee-stats">{{ a.completed }}/{{ a.total }} completed</span>
                          </div>
                          <div class="assignee-bar-track">
                            <div class="assignee-bar-fill" [style.width.%]="a.total > 0 ? (a.completed / a.total * 100) : 0"></div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Overdue Cycles -->
              @if (analytics()!.overdueCycles.length > 0) {
                <div class="section-card overdue-section">
                  <h3>
                    <mat-icon>warning</mat-icon>
                    Overdue Cycles
                  </h3>
                  <div class="overdue-list">
                    @for (cycle of analytics()!.overdueCycles; track cycle.name) {
                      <div class="overdue-row">
                        <mat-icon class="overdue-icon">schedule</mat-icon>
                        <span class="overdue-name">{{ cycle.name }}</span>
                        <span class="overdue-project">{{ cycle.project_name }}</span>
                        <span class="overdue-date">Due: {{ cycle.end_date }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Recent Issues -->
              <div class="section-card">
                <h3>Recent Issues</h3>
                @if (analytics()!.recentIssues.length === 0) {
                  <p class="no-data">No issues yet</p>
                } @else {
                  <div class="recent-list">
                    @for (issue of analytics()!.recentIssues; track issue.identifier) {
                      <div class="recent-row">
                        <span class="recent-id">{{ issue.identifier }}</span>
                        <span class="recent-title">{{ issue.title }}</span>
                        <span class="recent-project">{{ issue.project_name }}</span>
                        <span class="badge" [style.background]="getStatusColor(issue.status) + '22'"
                              [style.color]="getStatusColor(issue.status)">
                          {{ formatStatus(issue.status) }}
                        </span>
                        <span class="recent-time">{{ issue.created_at | relativeTime }}</span>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Issues Over Time (last 30 days) -->
              @if (analytics()!.issuesOverTime.length > 0) {
                <div class="section-card">
                  <h3>Issues Created (Last 30 Days)</h3>
                  <div class="timeline-chart">
                    @for (point of analytics()!.issuesOverTime; track point.date) {
                      <div class="timeline-bar-wrapper" [matTooltip]="point.date + ': ' + point.count + ' issue(s)'">
                        <div class="timeline-bar"
                             [style.height.%]="getPercent(point.count, getMaxTimelineCount())">
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </mat-tab>

        <!-- User Management Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>people</mat-icon>
            <span>Users</span>
          </ng-template>

          @if (loadingUsers()) {
            <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
          } @else if (users().length === 0) {
            <div class="empty-state">
              <mat-icon>person_off</mat-icon>
              <p>No users found</p>
            </div>
          } @else {
            <div class="user-list">
              @for (user of users(); track user.id) {
                <div class="user-row" [class.blocked]="user.blocked">
                  <div class="user-info">
                    <div class="user-avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
                    <div class="user-details">
                      <span class="user-name">{{ user.name }}</span>
                      <span class="user-email">{{ user.email }}</span>
                    </div>
                  </div>
                  <div class="user-actions">
                    @if (user.blocked) {
                      <span class="badge blocked-badge">Blocked</span>
                    } @else {
                      <span class="badge active-badge">Active</span>
                    }
                    <mat-slide-toggle
                      [checked]="!user.blocked"
                      (change)="onToggleBlock(user)"
                      [disabled]="togglingId() === user.id"
                      color="primary">
                    </mat-slide-toggle>
                  </div>
                </div>
              }
            </div>
          }
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .settings-page { padding: 32px 40px; max-width: 900px; }

    .settings-header {
      margin-bottom: 24px;
      h1 { font-size: 22px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }
      p { font-size: 13px; color: var(--text-secondary); margin: 0; }
    }

    ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
      display: flex; align-items: center; gap: 6px;
    }
    ::ng-deep .mat-mdc-tab .mdc-tab__text-label mat-icon {
      font-size: 18px; width: 18px; height: 18px;
    }

    .loading { display: flex; justify-content: center; padding: 40px 0; }

    /* ── Analytics ── */
    .analytics-content { padding-top: 20px; display: flex; flex-direction: column; gap: 16px; }

    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

    .stat-card {
      display: flex; align-items: center; gap: 12px; padding: 14px;
      border: 1px solid var(--surface-border); border-radius: 10px; background: var(--sidebar-bg);
    }

    .stat-icon {
      width: 38px; height: 38px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: white; }
    }

    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 20px; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .stat-label { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

    .section-card {
      border: 1px solid var(--surface-border); border-radius: 10px;
      padding: 16px; background: var(--sidebar-bg);
      h3 {
        font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 0 0 12px;
        display: flex; align-items: center; gap: 6px;
        mat-icon { font-size: 16px; width: 16px; height: 16px; }
      }
    }

    .no-data { font-size: 13px; color: var(--text-secondary); margin: 0; }

    .breakdown-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .bar-list { display: flex; flex-direction: column; gap: 8px; }
    .bar-item { display: flex; flex-direction: column; gap: 3px; }
    .bar-label { display: flex; justify-content: space-between; font-size: 12px; }
    .bar-name { color: var(--text-primary); font-weight: 500; }
    .bar-count { color: var(--text-secondary); font-weight: 600; }
    .bar-track { height: 5px; border-radius: 3px; background: var(--surface-border); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3px; transition: width 600ms ease; min-width: 2px; }

    /* Assignees */
    .assignee-list { display: flex; flex-direction: column; gap: 10px; }
    .assignee-row { display: flex; align-items: center; gap: 10px; }
    .assignee-avatar {
      width: 28px; height: 28px; border-radius: 50%; background: var(--accent-primary);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600; flex-shrink: 0;
    }
    .assignee-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .assignee-name { font-size: 12px; font-weight: 500; color: var(--text-primary); }
    .assignee-stats { font-size: 11px; color: var(--text-secondary); }
    .assignee-bar-track {
      width: 60px; height: 4px; border-radius: 2px; background: var(--surface-border);
      overflow: hidden; flex-shrink: 0;
    }
    .assignee-bar-fill { height: 100%; border-radius: 2px; background: #22c55e; }

    /* Overdue */
    .overdue-section h3 mat-icon { color: #f59e0b; }
    .overdue-list { display: flex; flex-direction: column; gap: 6px; }
    .overdue-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; }
    .overdue-icon { font-size: 16px; width: 16px; height: 16px; color: #ef4444; }
    .overdue-name { font-weight: 500; color: var(--text-primary); flex: 1; }
    .overdue-project { font-size: 12px; color: var(--text-secondary); }
    .overdue-date { font-size: 12px; color: #ef4444; font-weight: 500; }

    /* Recent */
    .recent-list { display: flex; flex-direction: column; }
    .recent-row {
      display: flex; align-items: center; gap: 10px; padding: 7px 0;
      &:not(:last-child) { border-bottom: 1px solid var(--surface-border); }
    }
    .recent-id { font-size: 12px; font-weight: 600; color: var(--text-secondary); min-width: 55px; }
    .recent-title { flex: 1; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .recent-project { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
    .recent-time { font-size: 11px; color: var(--text-secondary); white-space: nowrap; }

    .badge {
      font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap;
    }
    .active-badge { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .blocked-badge { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

    /* Timeline chart */
    .timeline-chart {
      display: flex; align-items: flex-end; gap: 3px; height: 80px; padding-top: 4px;
    }
    .timeline-bar-wrapper {
      flex: 1; height: 100%; display: flex; align-items: flex-end; cursor: default;
    }
    .timeline-bar {
      width: 100%; min-height: 3px; border-radius: 2px 2px 0 0;
      background: var(--accent-primary); transition: height 400ms ease;
    }

    /* ── User Management ── */
    .empty-state {
      text-align: center; padding: 40px 0; color: var(--text-secondary);
      mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }
      p { font-size: 13px; margin: 0; }
    }

    .user-list {
      display: flex; flex-direction: column;
      border: 1px solid var(--surface-border); border-radius: 10px; overflow: hidden; margin-top: 20px;
    }
    .user-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; transition: background 150ms;
      &:not(:last-child) { border-bottom: 1px solid var(--surface-border); }
      &:hover { background: var(--row-hover); }
      &.blocked { opacity: 0.6; }
    }
    .user-info { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .user-avatar {
      width: 34px; height: 34px; border-radius: 50%; background: var(--accent-primary);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600; flex-shrink: 0;
    }
    .user-details { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .user-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .user-email { font-size: 12px; color: var(--text-secondary); }
    .user-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  `]
})
export class SettingsComponent implements OnInit {
  analytics = signal<AnalyticsDashboard | null>(null);
  users = signal<Member[]>([]);
  loadingUsers = signal(true);
  togglingId = signal<string | null>(null);

  private statusColors: Record<string, string> = {
    backlog: '#6b7280', todo: '#3b82f6', in_progress: '#f59e0b',
    ready_to_test: '#8b5cf6', testing_in_progress: '#06b6d4',
    done: '#22c55e', cancelled: '#ef4444',
  };

  private priorityColors: Record<string, string> = {
    urgent: '#ef4444', high: '#f97316', medium: '#f59e0b',
    low: '#3b82f6', none: '#6b7280',
  };

  constructor(
    private settingsService: SettingsService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadUsers();
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatPriority(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  getStatusColor(status: string): string { return this.statusColors[status] || '#6b7280'; }
  getPriorityColor(priority: string): string { return this.priorityColors[priority] || '#6b7280'; }
  getPercent(count: number, total: number): number { return total > 0 ? Math.round((count / total) * 100) : 0; }

  getMaxTimelineCount(): number {
    const data = this.analytics()?.issuesOverTime || [];
    return Math.max(...data.map((d) => d.count), 1);
  }

  onToggleBlock(user: Member): void {
    this.togglingId.set(user.id);
    this.settingsService.toggleBlock(user.id).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.togglingId.set(null);
        this.notification.success(updated.blocked ? `${user.name} has been blocked` : `${user.name} has been unblocked`);
        this.loadAnalytics(); // refresh analytics counts
      },
      error: () => { this.togglingId.set(null); this.notification.error('Failed to update user status'); },
    });
  }

  private loadAnalytics(): void {
    this.settingsService.getAnalytics().subscribe({
      next: (data) => this.analytics.set(data),
      error: () => this.notification.error('Failed to load analytics'),
    });
  }

  private loadUsers(): void {
    this.settingsService.getNonAdminUsers().subscribe({
      next: (users) => { this.users.set(users); this.loadingUsers.set(false); },
      error: () => { this.loadingUsers.set(false); this.notification.error('Failed to load users'); },
    });
  }
}
