import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Project } from '../../../core/models/project.model';
import { Member } from '../../../core/models/member.model';
import { Label } from '../../../core/models/label.model';
import { Cycle } from '../../../core/models/cycle.model';
import { ISSUE_STATUSES, ISSUE_PRIORITIES, CreateIssueDto } from '../../../core/models/issue.model';
import { ProjectsService } from '../../projects/services/projects.service';
import { MembersService } from '../services/members.service';
import { LabelsService } from '../../labels/services/labels.service';
import { CyclesService } from '../../cycles/services/cycles.service';

@Component({
  selector: 'app-issue-create-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Create Issue</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <input matInput [(ngModel)]="form.title" placeholder="Title" autofocus>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <textarea matInput [(ngModel)]="form.description" rows="3" placeholder="Description"></textarea>
      </mat-form-field>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-select [(ngModel)]="form.projectId" (selectionChange)="onProjectChange()" placeholder="Project">
            @for (project of projects(); track project.id) {
              <mat-option [value]="project.id">{{ project.identifier }} - {{ project.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-select [(ngModel)]="form.status" placeholder="Status">
            @for (s of statuses; track s.value) {
              <mat-option [value]="s.value">{{ s.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-select [(ngModel)]="form.priority" placeholder="Priority">
            @for (p of priorities; track p.value) {
              <mat-option [value]="p.value">{{ p.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-select [(ngModel)]="form.assigneeId" placeholder="Assignee">
            <mat-option [value]="null">Unassigned</mat-option>
            @for (member of members(); track member.id) {
              <mat-option [value]="member.id">{{ member.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-select [(ngModel)]="form.labelIds" multiple placeholder="Labels">
            @for (label of labels(); track label.id) {
              <mat-option [value]="label.id">
                <span class="label-dot" [style.background]="label.color"></span>
                {{ label.name }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-select [(ngModel)]="form.cycleId" placeholder="Cycle">
            <mat-option [value]="null">No cycle</mat-option>
            @for (cycle of cycles(); track cycle.id) {
              <mat-option [value]="cycle.id">{{ cycle.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="!form.title || !form.projectId">
        Create Issue
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      width: 100%;
      max-width: 90vw;
      padding-top: 8px !important;
      overflow-x: hidden;
      overflow-y: auto;
    }
    .full-width {
      width: 100%;
    }
    .form-row {
      display: flex;
      gap: 12px;

      mat-form-field {
        flex: 1;
        min-width: 0;
      }
    }
    .label-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      flex-shrink: 0;
      vertical-align: middle;
    }
  `]
})
export class IssueCreateDialogComponent implements OnInit {
  statuses = ISSUE_STATUSES;
  priorities = ISSUE_PRIORITIES;

  projects = signal<Project[]>([]);
  members = signal<Member[]>([]);
  labels = signal<Label[]>([]);
  cycles = signal<Cycle[]>([]);

  form: CreateIssueDto = {
    title: '',
    description: '',
    status: 'backlog',
    priority: 'none',
    projectId: '',
    assigneeId: null,
    cycleId: null,
    labelIds: [],
  };

  constructor(
    private dialogRef: MatDialogRef<IssueCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectId?: string },
    private projectsService: ProjectsService,
    private membersService: MembersService,
    private labelsService: LabelsService,
    private cyclesService: CyclesService,
  ) {}

  ngOnInit() {
    this.projectsService.getAll().subscribe((p) => this.projects.set(p));
    this.membersService.getAll().subscribe((m) => this.members.set(m));
    this.labelsService.getAll().subscribe((l) => this.labels.set(l));

    if (this.data?.projectId) {
      this.form.projectId = this.data.projectId;
      this.onProjectChange();
    }
  }

  onProjectChange() {
    if (this.form.projectId) {
      this.cyclesService.getAll(this.form.projectId).subscribe((c) => this.cycles.set(c));
    }
  }

  submit() {
    this.dialogRef.close(this.form);
  }
}
