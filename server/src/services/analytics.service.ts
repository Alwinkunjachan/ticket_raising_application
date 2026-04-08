import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import { Project, Issue, Cycle, Member, Label } from '../models';

class AnalyticsService {
  async getDashboard() {
    const [
      totalProjects,
      totalIssues,
      totalCycles,
      totalMembers,
      totalLabels,
      blockedMembers,
      issuesByStatus,
      issuesByPriority,
      issuesPerProject,
      topAssignees,
      activeCycles,
      overdueCycles,
      recentIssues,
      issuesOverTime,
    ] = await Promise.all([
      Project.count(),
      Issue.count(),
      Cycle.count(),
      Member.count(),
      Label.count(),
      Member.count({ where: { blocked: true } }),
      this.getIssuesByStatus(),
      this.getIssuesByPriority(),
      this.getIssuesPerProject(),
      this.getTopAssignees(),
      Cycle.count({ where: { status: 'active' } }),
      this.getOverdueCycles(),
      this.getRecentIssues(),
      this.getIssuesOverTime(),
    ]);

    const completedIssues = (issuesByStatus as any[]).find(
      (s) => s.status === 'done'
    );
    const openIssues = totalIssues - (completedIssues?.count || 0) -
      ((issuesByStatus as any[]).find((s) => s.status === 'cancelled')?.count || 0);
    const completionRate =
      totalIssues > 0
        ? Math.round(((completedIssues?.count || 0) / totalIssues) * 100)
        : 0;

    return {
      overview: {
        totalProjects,
        totalIssues,
        openIssues,
        totalCycles,
        activeCycles,
        totalMembers,
        blockedMembers,
        totalLabels,
        completionRate,
      },
      issuesByStatus,
      issuesByPriority,
      issuesPerProject,
      topAssignees,
      overdueCycles,
      recentIssues,
      issuesOverTime,
    };
  }

  private async getIssuesByStatus() {
    return sequelize.query(
      `SELECT status, COUNT(*)::int as count FROM issues GROUP BY status ORDER BY count DESC`,
      { type: QueryTypes.SELECT }
    );
  }

  private async getIssuesByPriority() {
    return sequelize.query(
      `SELECT priority, COUNT(*)::int as count FROM issues GROUP BY priority ORDER BY count DESC`,
      { type: QueryTypes.SELECT }
    );
  }

  private async getIssuesPerProject() {
    return sequelize.query(
      `SELECT p.name, p.identifier, COUNT(i.id)::int as count
       FROM projects p
       LEFT JOIN issues i ON i.project_id = p.id
       GROUP BY p.id, p.name, p.identifier
       ORDER BY count DESC
       LIMIT 10`,
      { type: QueryTypes.SELECT }
    );
  }

  private async getTopAssignees() {
    return sequelize.query(
      `SELECT m.name, m.email, COUNT(i.id)::int as total,
              SUM(CASE WHEN i.status = 'done' THEN 1 ELSE 0 END)::int as completed
       FROM members m
       INNER JOIN issues i ON i.assignee_id = m.id
       GROUP BY m.id, m.name, m.email
       ORDER BY total DESC
       LIMIT 5`,
      { type: QueryTypes.SELECT }
    );
  }

  private async getOverdueCycles() {
    return sequelize.query(
      `SELECT c.name, c.end_date, c.status, p.name as project_name
       FROM cycles c
       LEFT JOIN projects p ON c.project_id = p.id
       WHERE c.status != 'completed' AND c.end_date < CURRENT_DATE
       ORDER BY c.end_date ASC
       LIMIT 5`,
      { type: QueryTypes.SELECT }
    );
  }

  private async getRecentIssues() {
    return sequelize.query(
      `SELECT i.identifier, i.title, i.status, i.priority, i.created_at,
              p.name as project_name, m.name as assignee_name
       FROM issues i
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN members m ON i.assignee_id = m.id
       ORDER BY i.created_at DESC
       LIMIT 5`,
      { type: QueryTypes.SELECT }
    );
  }

  private async getIssuesOverTime() {
    return sequelize.query(
      `SELECT DATE(created_at) as date, COUNT(*)::int as count
       FROM issues
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      { type: QueryTypes.SELECT }
    );
  }
}

export const analyticsService = new AnalyticsService();
