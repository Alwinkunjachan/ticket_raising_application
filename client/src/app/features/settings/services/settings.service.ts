import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Member } from '../../../core/models/member.model';

export interface AnalyticsOverview {
  totalProjects: number;
  totalIssues: number;
  openIssues: number;
  totalCycles: number;
  activeCycles: number;
  totalMembers: number;
  blockedMembers: number;
  totalLabels: number;
  completionRate: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface ProjectIssueCount {
  name: string;
  identifier: string;
  count: number;
}

export interface TopAssignee {
  name: string;
  email: string;
  total: number;
  completed: number;
}

export interface OverdueCycle {
  name: string;
  end_date: string;
  status: string;
  project_name: string;
}

export interface RecentIssue {
  identifier: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  project_name: string;
  assignee_name: string | null;
}

export interface IssueTimePoint {
  date: string;
  count: number;
}

export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  issuesByStatus: StatusCount[];
  issuesByPriority: PriorityCount[];
  issuesPerProject: ProjectIssueCount[];
  topAssignees: TopAssignee[];
  overdueCycles: OverdueCycle[];
  recentIssues: RecentIssue[];
  issuesOverTime: IssueTimePoint[];
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private api: ApiService) {}

  getNonAdminUsers(): Observable<Member[]> {
    return this.api.get<Member[]>('/members/users');
  }

  toggleBlock(id: string): Observable<Member> {
    return this.api.patch<Member>(`/members/${id}/toggle-block`, {});
  }

  getAnalytics(): Observable<AnalyticsDashboard> {
    return this.api.get<AnalyticsDashboard>('/analytics/dashboard');
  }
}
