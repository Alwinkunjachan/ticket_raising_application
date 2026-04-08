import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LabelsService } from '../services/labels.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Label, CreateLabelDto } from '../../../core/models/label.model';

@Component({
  selector: 'app-label-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, EmptyStateComponent,
  ],
  template: `
    <div class="label-list-page">
      <div class="page-header">
        <h1>Labels</h1>
      </div>

      <!-- Create Label Form -->
      <div class="create-form">
        <mat-form-field appearance="outline" class="field-name">
          <input matInput [(ngModel)]="newLabel.name" placeholder="Label Name">
        </mat-form-field>

        <mat-form-field appearance="outline" class="field-color">
          <input matInput [(ngModel)]="newLabel.color" placeholder="Color">
          <div matSuffix class="color-preview" [style.background]="newLabel.color">
            <input type="color" [(ngModel)]="newLabel.color" class="color-swatch-hidden">
          </div>
        </mat-form-field>

        <button mat-flat-button color="primary" class="add-btn" (click)="createLabel()"
                [disabled]="!newLabel.name">
          <mat-icon>add</mat-icon>
          Add
        </button>
      </div>

      <!-- Labels List -->
      <div class="labels-table">
        @for (label of labels(); track label.id) {
          <div class="label-row">
            <span class="label-color-dot" [style.background]="label.color"></span>
            <span class="label-name">{{ label.name }}</span>
            <button mat-icon-button (click)="deleteLabel(label)" class="delete-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        } @empty {
          <app-empty-state
            icon="label"
            title="No labels yet"
            description="Create labels to categorize your issues." />
        }
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      padding: 16px 20px;
      h1 { font-size: 18px; font-weight: 600; margin: 0; color: var(--text-primary); }
    }

    .create-form {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 0 20px 20px;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        height: 0;
        overflow: hidden;
      }
    }

    .field-name {
      flex: 1;
      max-width: 280px;
    }

    .field-color {
      width: 160px;
    }

    .color-preview {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid var(--surface-border);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      margin-right: 4px;
    }

    .color-swatch-hidden {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      border: none;
      padding: 0;
    }

    .add-btn {
      margin-top: 4px;
      height: 48px;
      white-space: nowrap;
    }

    .labels-table {
      padding: 0 20px;
    }

    .label-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--surface-border);
      transition: background 100ms;

      &:first-child {
        border-top: 1px solid var(--surface-border);
      }

      &:hover {
        background: var(--row-hover);
      }
    }

    .label-color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .label-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      flex: 1;
    }

    .delete-btn {
      width: 28px;
      height: 28px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 150ms;

      ::ng-deep .mat-mdc-button-touch-target {
        width: 28px;
        height: 28px;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .label-row:hover .delete-btn {
      opacity: 1;
    }
  `]
})
export class LabelListComponent implements OnInit {
  labels = signal<Label[]>([]);
  newLabel: CreateLabelDto = { name: '', color: '#7c5cfc' };

  constructor(
    private labelsService: LabelsService,
    private notification: NotificationService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.loadLabels();
  }

  loadLabels() {
    this.labelsService.getAll().subscribe({
      next: (labels) => this.labels.set(labels),
    });
  }

  createLabel() {
    this.labelsService.create(this.newLabel).subscribe({
      next: () => {
        this.notification.success('Label created');
        this.newLabel = { name: '', color: '#7c5cfc' };
        this.loadLabels();
      },
      error: () => this.notification.error('Failed to create label'),
    });
  }

  deleteLabel(label: Label) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Label', message: `Delete label "${label.name}"?` },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.labelsService.delete(label.id).subscribe({
          next: () => { this.notification.success('Label deleted'); this.loadLabels(); },
        });
      }
    });
  }
}
