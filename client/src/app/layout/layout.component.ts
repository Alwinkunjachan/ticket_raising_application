import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { IdleService } from '../core/services/idle.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, ToolbarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar
        [collapsed]="sidebarCollapsed"
        (toggleCollapse)="sidebarCollapsed = !sidebarCollapsed">
      </app-sidebar>
      <main class="main-content">
        <app-toolbar></app-toolbar>
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--surface-bg);
      min-width: 0;
    }

    .content-area {
      flex: 1;
      overflow: auto;
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;

  constructor(private idleService: IdleService) {}

  ngOnInit(): void {
    this.idleService.start();
  }

  ngOnDestroy(): void {
    this.idleService.stop();
  }
}
