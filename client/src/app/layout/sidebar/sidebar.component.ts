import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { SidebarNavItemComponent } from '../sidebar-nav-item/sidebar-nav-item.component';
import { ProjectsService } from '../../features/projects/services/projects.service';
import { CyclesService } from '../../features/cycles/services/cycles.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../core/models/project.model';
import { Cycle } from '../../core/models/cycle.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterModule,
    SidebarNavItemComponent,
  ],
  template: `
    <nav class="sidebar" [class.collapsed]="collapsed">
      <!-- Header -->
      <div class="sidebar-header">
        @if (!collapsed) {
          <div class="workspace-info">
            <div class="workspace-avatar">S</div>
            <span class="workspace-name">Sprintly</span>
          </div>
        }
        <button mat-icon-button class="collapse-btn" (click)="toggleCollapse.emit()"
                [matTooltip]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
          <mat-icon>{{ collapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
        </button>
      </div>

      <!-- Scrollable nav area -->
      <div class="sidebar-nav">
        <!-- Primary Nav -->
        <div class="nav-section">
          @if (authService.isAdmin()) {
            <app-sidebar-nav-item icon="list_alt" label="All Issues" route="/issues" [collapsed]="collapsed" />
          } @else {
            <app-sidebar-nav-item icon="assignment_ind" label="My Issues" route="/my-issues" [collapsed]="collapsed" />
          }
        </div>

        <!-- Projects Section -->
        <div class="nav-section">
          <div class="section-header" (click)="projectsExpanded = !projectsExpanded">
            @if (!collapsed) {
              <span class="section-title">Projects</span>
              <mat-icon class="expand-icon">{{ projectsExpanded ? 'expand_more' : 'chevron_right' }}</mat-icon>
            } @else {
              <mat-icon class="section-icon-collapsed">folder</mat-icon>
            }
          </div>
          @if (projectsExpanded && !collapsed) {
            <a routerLink="/projects" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: true }"
               class="all-projects-link">
              <mat-icon>dashboard</mat-icon>
              <span>All Projects</span>
            </a>
            @for (project of projects(); track project.id) {
              <!-- Project item -->
              <app-sidebar-nav-item
                icon="hexagon"
                [label]="project.name"
                [route]="'/projects/' + project.id"
                [collapsed]="collapsed"
                [forceActive]="activeProjectId() === project.id" />

              <!-- Cycles nested under active project -->
              @if (activeProjectId() === project.id) {
                @for (cycle of getCyclesForProject(project.id); track cycle.id) {
                  <app-sidebar-nav-item
                    icon="schedule"
                    [label]="cycle.name"
                    [route]="'/cycles/' + cycle.id"
                    [collapsed]="collapsed"
                    class="nested-item" />
                }
              }
            }
            @if (projects().length === 0) {
              <div class="section-empty">No projects yet</div>
            }
          }
        </div>
      </div>

    </nav>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100vh;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--sidebar-border);
      display: flex;
      flex-direction: column;
      transition: width 200ms ease;
      flex-shrink: 0;

      &.collapsed {
        width: 52px;
      }
    }

    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 8px 8px;
      min-height: 48px;
    }

    .workspace-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 4px;
    }

    .workspace-avatar {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: var(--accent-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    .workspace-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--sidebar-text-active);
      white-space: nowrap;
    }

    .collapse-btn {
      width: 28px;
      height: 28px;
      line-height: 28px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--sidebar-text);
      }
    }

    .nav-section {
      padding: 4px 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 16px;
      cursor: pointer;
      user-select: none;

      &:hover {
        background: var(--sidebar-hover);
      }
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--sidebar-text);
    }

    .expand-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--sidebar-text);
    }

    .section-icon-collapsed {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--sidebar-text);
      margin: 0 auto;
    }

    .all-projects-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      margin: 1px 8px 4px;
      border-radius: 6px;
      color: var(--accent-primary);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
      transition: all 150ms ease;
      min-height: 30px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--sidebar-hover);
      }

      &.active {
        background: var(--sidebar-hover);
        color: var(--sidebar-text-active);
      }
    }

    .nested-item ::ng-deep .nav-item {
      padding-left: 34px;
      font-size: 12px;
      min-height: 28px;
    }

    .section-empty {
      padding: 4px 20px;
      font-size: 12px;
      color: var(--text-tertiary);
    }

  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  projects = signal<Project[]>([]);
  allCycles = signal<Cycle[]>([]);
  activeProjectId = signal<string | null>(null);
  projectsExpanded = true;

  private routeSub!: Subscription;

  constructor(
    private projectsService: ProjectsService,
    private cyclesService: CyclesService,
    private router: Router,
    public authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.loadCycles();

    // Track active project from URL
    this.checkActiveProject(this.router.url);
    this.routeSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.checkActiveProject(e.urlAfterRedirects));
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  private checkActiveProject(url: string) {
    // Match /projects/:id
    const projectMatch = url.match(/\/projects\/([^\/]+)/);
    if (projectMatch) {
      this.activeProjectId.set(projectMatch[1]);
      return;
    }

    // Match /cycles/:id — find which project owns this cycle
    const cycleMatch = url.match(/\/cycles\/([^\/]+)/);
    if (cycleMatch) {
      const cycle = this.allCycles().find(c => c.id === cycleMatch[1]);
      if (cycle) {
        this.activeProjectId.set(cycle.projectId);
        return;
      }
    }

    // Don't collapse when navigating elsewhere — keep last project open
    // Only reset if going to a completely different section
    if (url === '/issues' || url === '/labels' || url === '/projects') {
      this.activeProjectId.set(null);
    }
  }

  getCyclesForProject(projectId: string): Cycle[] {
    return this.allCycles().filter(c => c.projectId === projectId);
  }

  loadProjects() {
    this.projectsService.getAll().subscribe({
      next: (projects) => this.projects.set(projects),
    });
  }

  loadCycles() {
    this.cyclesService.getAll().subscribe({
      next: (cycles) => this.allCycles.set(cycles),
    });
  }
}
