import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { StatusIconComponent } from '../../../shared/components/status-icon/status-icon.component';
import { PriorityIconComponent } from '../../../shared/components/priority-icon/priority-icon.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { IssuesService } from '../services/issues.service';
import { MembersService } from '../services/members.service';
import { LabelsService } from '../../labels/services/labels.service';
import { CyclesService } from '../../cycles/services/cycles.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Issue, IssueStatus, IssuePriority, ISSUE_STATUSES, ISSUE_PRIORITIES } from '../../../core/models/issue.model';
import { Member } from '../../../core/models/member.model';
import { Label } from '../../../core/models/label.model';
import { Cycle } from '../../../core/models/cycle.model';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    StatusIconComponent, PriorityIconComponent, RelativeTimePipe,
  ],
  template: `
    @if (issue) {
      <div class="issue-detail">
        <div class="detail-header">
          <button mat-icon-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <span class="issue-identifier">{{ issue.identifier }}</span>
          <div class="spacer"></div>
          <button mat-icon-button color="warn" (click)="deleteIssue()">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>

        <div class="detail-body">
          <div class="detail-main">
            <input class="title-input"
                   [value]="editTitle"
                   (input)="editTitle = $any($event.target).value"
                   (blur)="saveTitle()">
            <textarea class="description-input"
                      [value]="editDescription"
                      (input)="editDescription = $any($event.target).value"
                      (blur)="saveDescription()"
                      placeholder="Add a description"
                      rows="6"></textarea>
          </div>

          <div class="detail-sidebar">
            <div class="property">
              <span class="property-label">Status</span>
              <mat-select [value]="issue.status" (selectionChange)="updateField('status', $event.value)" class="property-select">
                @for (s of statuses; track s.value) {
                  <mat-option [value]="s.value">
                    <app-status-icon [status]="s.value" />
                    <span style="margin-left: 8px">{{ s.label }}</span>
                  </mat-option>
                }
              </mat-select>
            </div>

            <div class="property">
              <span class="property-label">Priority</span>
              <mat-select [value]="issue.priority" (selectionChange)="updateField('priority', $event.value)" class="property-select">
                @for (p of priorities; track p.value) {
                  <mat-option [value]="p.value">
                    <app-priority-icon [priority]="p.value" />
                    <span style="margin-left: 8px">{{ p.label }}</span>
                  </mat-option>
                }
              </mat-select>
            </div>

            <div class="property">
              <span class="property-label">Assignee</span>
              <mat-select [value]="issue.assigneeId" (selectionChange)="updateField('assigneeId', $event.value)" class="property-select">
                <mat-option [value]="null">Unassigned</mat-option>
                @for (member of members; track member.id) {
                  <mat-option [value]="member.id">{{ member.name }}</mat-option>
                }
              </mat-select>
            </div>

            <div class="property">
              <span class="property-label">Labels</span>
              <mat-select [value]="currentLabelIds" multiple (selectionChange)="updateLabels($event.value)" class="property-select">
                @for (label of availableLabels; track label.id) {
                  <mat-option [value]="label.id">
                    <span class="label-dot" [style.background]="label.color"></span>
                    {{ label.name }}
                  </mat-option>
                }
              </mat-select>
            </div>

            <div class="property">
              <span class="property-label">Cycle</span>
              <mat-select [value]="issue.cycleId" (selectionChange)="updateField('cycleId', $event.value)" class="property-select">
                <mat-option [value]="null">No cycle</mat-option>
                @for (cycle of availableCycles; track cycle.id) {
                  <mat-option [value]="cycle.id">{{ cycle.name }}</mat-option>
                }
              </mat-select>
            </div>

            <div class="property">
              <span class="property-label">Created</span>
              <span class="property-value">{{ issue.createdAt | relativeTime }}</span>
            </div>

            <div class="property">
              <span class="property-label">Updated</span>
              <span class="property-value">{{ issue.updatedAt | relativeTime }}</span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .issue-detail {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--surface-border);
    }

    .issue-identifier {
      font-size: 13px;
      color: var(--text-tertiary);
      font-weight: 500;
    }

    .spacer { flex: 1; }

    .detail-body {
      display: flex;
      flex: 1;
      overflow: auto;
    }

    .detail-main {
      flex: 1;
      padding: 24px;
      min-width: 0;
    }

    .title-input {
      width: 100%;
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      background: transparent;
      border: none;
      outline: none;
      padding: 8px 0;
      margin-bottom: 16px;
      border-bottom: 2px solid transparent;
      transition: border-color 150ms;

      &:focus {
        border-bottom-color: var(--accent-primary);
      }
    }

    .description-input {
      width: 100%;
      font-size: 14px;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      outline: none;
      padding: 8px 0;
      resize: vertical;
      line-height: 1.6;
      font-family: inherit;
      border-bottom: 2px solid transparent;
      transition: border-color 150ms;

      &:focus {
        border-bottom-color: var(--accent-primary);
      }
    }

    .detail-sidebar {
      width: 280px;
      padding: 24px;
      border-left: 1px solid var(--surface-border);
      flex-shrink: 0;
    }

    .property {
      margin-bottom: 20px;
    }

    .property-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-tertiary);
      margin-bottom: 6px;
    }

    .property-value {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .property-select {
      font-size: 13px;
      width: 100%;

      ::ng-deep .mat-mdc-select-trigger {
        padding: 6px 0;
      }

      ::ng-deep .mat-mdc-select-value {
        color: var(--text-primary);
      }
    }

    .label-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      flex-shrink: 0;
    }
  `]
})
export class IssueDetailComponent implements OnInit {
  issue: Issue | null = null;
  statuses = ISSUE_STATUSES;
  priorities = ISSUE_PRIORITIES;

  editTitle = '';
  editDescription = '';
  members: Member[] = [];
  availableLabels: Label[] = [];
  availableCycles: Cycle[] = [];
  currentLabelIds: string[] = [];

  private issueId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private issuesService: IssuesService,
    private membersService: MembersService,
    private labelsService: LabelsService,
    private cyclesService: CyclesService,
    private notification: NotificationService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.issueId = this.route.snapshot.params['id'];
    this.membersService.getAll().subscribe((m) => this.members = m);
    this.labelsService.getAll().subscribe((l) => this.availableLabels = l);
    this.loadIssue();
  }

  loadIssue() {
    this.issuesService.getById(this.issueId).subscribe({
      next: (issue) => {
        this.issue = issue;
        this.editTitle = issue.title;
        this.editDescription = issue.description || '';
        this.currentLabelIds = issue.labels?.map(l => l.id) || [];
        // Load cycles for this issue's project
        this.cyclesService.getAll(issue.projectId).subscribe((c) => this.availableCycles = c);
      },
      error: () => this.notification.error('Issue not found'),
    });
  }

  saveTitle() {
    if (this.editTitle !== this.issue?.title && this.editTitle.trim()) {
      this.updateField('title', this.editTitle);
    }
  }

  saveDescription() {
    if (this.editDescription !== (this.issue?.description || '')) {
      this.updateField('description', this.editDescription || null);
    }
  }

  updateField(field: string, value: any) {
    this.issuesService.update(this.issueId, { [field]: value }).subscribe({
      next: (updated) => {
        this.issue = updated;
        this.currentLabelIds = updated.labels?.map(l => l.id) || [];
        this.notification.success('Updated');
      },
      error: () => this.notification.error('Failed to update'),
    });
  }

  updateLabels(labelIds: string[]) {
    this.issuesService.update(this.issueId, { labelIds }).subscribe({
      next: (updated) => {
        this.issue = updated;
        this.currentLabelIds = updated.labels?.map(l => l.id) || [];
        this.notification.success('Labels updated');
      },
      error: () => this.notification.error('Failed to update labels'),
    });
  }

  deleteIssue() {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Issue', message: 'Are you sure you want to delete this issue?' },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.issuesService.delete(this.issueId).subscribe({
          next: () => {
            this.notification.success('Issue deleted');
            this.goBack();
          },
          error: () => this.notification.error('Failed to delete'),
        });
      }
    });
  }

  goBack() {
    if (this.issue?.projectId) {
      this.router.navigate(['/projects', this.issue.projectId]);
    } else {
      this.router.navigate(['/issues']);
    }
  }
}
