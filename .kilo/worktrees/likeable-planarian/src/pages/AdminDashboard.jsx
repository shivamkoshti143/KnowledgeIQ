import { Clock3, FileText, MessageCircle, Users, BarChart3, TrendingUp, Building2, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { request } from "../api/client";
import { EmptyState, Metric, PageTitle } from "../components/UI";
import { hasPermission } from "../utils/permissions";
import { getInitials } from "../utils/initials";

export function AdminDashboard({ data, session }) {
  const canViewDashboard = session?.role === "admin" || hasPermission(session, "dashboard");

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (canViewDashboard) {
      request("/admin/analytics")
        .then((payload) => setAnalytics(payload))
        .catch(() => setAnalytics(null))
        .finally(() => setAnalyticsLoading(false));
    } else {
      setAnalyticsLoading(false);
    }
  }, [canViewDashboard]);

  const overview = analytics?.overview || {};
  const statusStats = analytics?.statusStats || {};
  const departmentStats = analytics?.departmentStats || [];
  const topContributors = analytics?.topContributors || [];
  const topTasks = analytics?.topTasks || [];
  const topKnowledge = analytics?.topKnowledge || [];

  const maxDeptTotal = departmentStats.length ? Math.max(departmentStats[0].total, 1) : 1;
  const maxContributorTotal = topContributors.length ? Math.max(topContributors[0].total, 1) : 1;
  const maxViews = Math.max(
    (topTasks[0]?.viewCount || 0),
    (topKnowledge[0]?.viewCount || 0),
    1
  );

  return (
    <div className="admin-dashboard-page">
      <PageTitle
        eyebrow="Knowledge Portal"
        title="Management Dashboard"
        subtitle="Platform analytics, team engagement metrics, and organizational knowledge distribution."
      />

      {/* Metrics Row */}
      {canViewDashboard && (
        <div className="metric-grid" style={{ marginBottom: 24 }}>
          <Metric icon={<FileText />} label="Total Tasks" value={overview.totalTasks ?? (data.tasks || []).length} />
          <Metric icon={<MessageCircle />} label="Knowledge Posts" value={overview.totalKnowledgePosts ?? (data.knowledgePosts || []).length} />
          <Metric icon={<Users />} label="Total Users" value={overview.totalUsers ?? data.users.length} />
          <Metric icon={<Building2 />} label="Active Departments" value={departmentStats.length || (data.departments || []).length} />
        </div>
      )}

      {analyticsLoading ? (
        <div className="table-card" style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          Loading dashboard metrics...
        </div>
      ) : canViewDashboard ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Status Breakdown Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Task Status */}
            <section className="table-card" style={{ padding: "22px 26px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <BarChart3 size={18} style={{ color: "#2563eb" }} />
                <h2 style={{ fontSize: 16.5, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Task Guidelines Status
                </h2>
              </div>
              <div className="status-breakdown" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <StatusBar label="Approved" count={statusStats.tasks?.approved || 0} total={overview.totalTasks || 1} color="#16a34a" />
                <StatusBar label="Pending Review" count={statusStats.tasks?.pending || 0} total={overview.totalTasks || 1} color="#2563eb" />
                <StatusBar label="Rejected" count={statusStats.tasks?.rejected || 0} total={overview.totalTasks || 1} color="#dc2626" />
              </div>
            </section>

            {/* Knowledge Status */}
            <section className="table-card" style={{ padding: "22px 26px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <TrendingUp size={18} style={{ color: "#0ea5e9" }} />
                <h2 style={{ fontSize: 16.5, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Knowledge Posts Status
                </h2>
              </div>
              <div className="status-breakdown" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <StatusBar label="Published" count={statusStats.knowledge?.published || 0} total={overview.totalKnowledgePosts || 1} color="#16a34a" />
                <StatusBar label="Pending / Draft" count={statusStats.knowledge?.draft || 0} total={overview.totalKnowledgePosts || 1} color="#64748b" />
              </div>
            </section>
          </div>

          {/* Contributors & Department Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Top Contributors */}
            <section className="table-card" style={{ padding: "22px 26px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <Award size={18} style={{ color: "#2563eb" }} />
                <h2 style={{ fontSize: 16.5, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Top Contributors
                </h2>
              </div>
              {topContributors.length === 0 ? (
                <EmptyState title="No submissions yet" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {topContributors.map((item, idx) => (
                    <div
                      key={item.user.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        padding: "14px 16px",
                        borderRadius: 14,
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}
                    >
                      {/* Top line: Avatar + User Info + Total Badge */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              background: idx === 0 ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "linear-gradient(135deg, #eff6ff, #dbeafe)",
                              color: idx === 0 ? "#ffffff" : "#2563eb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: 13,
                              flexShrink: 0,
                              border: idx === 0 ? "none" : "1px solid #bfdbfe"
                            }}
                          >
                            {getInitials(item.user.name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.user.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.user.email}
                            </div>
                          </div>
                        </div>

                        {/* Total Badge */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 10px",
                            borderRadius: 8,
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            flexShrink: 0
                          }}
                        >
                          <span>{item.total}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#2563eb" }}>{item.total === 1 ? "contribution" : "contributions"}</span>
                        </div>
                      </div>

                      {/* Middle: Progress Bar */}
                      <div
                        style={{
                          width: "100%",
                          height: 6,
                          borderRadius: 999,
                          background: "#f1f5f9",
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max((item.total / maxContributorTotal) * 100, 4)}%`,
                            background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                            borderRadius: 999,
                            transition: "width 0.3s ease"
                          }}
                        />
                      </div>

                      {/* Bottom line: Task & Knowledge Breakdown */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, fontSize: 11.5, color: "#64748b" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", padding: "2px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          <strong style={{ color: "#334155" }}>{item.tasks}</strong> tasks
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", padding: "2px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          <strong style={{ color: "#334155" }}>{item.knowledge}</strong> knowledge
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Department Distribution */}
            <section className="table-card" style={{ padding: "22px 26px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <Building2 size={18} style={{ color: "#2563eb" }} />
                <h2 style={{ fontSize: 16.5, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Department Distribution
                </h2>
              </div>
              {departmentStats.length === 0 ? (
                <EmptyState title="No departments yet" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {departmentStats.map((item) => (
                    <div
                      key={item.department.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        padding: "14px 16px",
                        borderRadius: 14,
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}
                    >
                      {/* Top line: Department Name + Total Items Badge */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.department.name}
                        </div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 10px",
                            borderRadius: 8,
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            flexShrink: 0
                          }}
                        >
                          <span>{item.total}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#2563eb" }}>{item.total === 1 ? "item" : "items"}</span>
                        </div>
                      </div>

                      {/* Middle: Progress Bar */}
                      <div
                        style={{
                          width: "100%",
                          height: 6,
                          borderRadius: 999,
                          background: "#f1f5f9",
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max((item.total / maxDeptTotal) * 100, 4)}%`,
                            background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                            borderRadius: 999,
                            transition: "width 0.3s ease"
                          }}
                        />
                      </div>

                      {/* Bottom line: Task & Knowledge Breakdown */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, fontSize: 11.5, color: "#64748b" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", padding: "2px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          <strong style={{ color: "#334155" }}>{item.tasks}</strong> tasks
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", padding: "2px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                          <strong style={{ color: "#334155" }}>{item.knowledge}</strong> knowledge
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Views Analytics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <section className="table-card" style={{ padding: "22px 26px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <TrendingUp size={18} style={{ color: "#16a34a" }} />
                <h2 style={{ fontSize: 16.5, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Most Viewed Knowledge Posts
                </h2>
              </div>
              {topKnowledge.length === 0 ? (
                <EmptyState title="No knowledge posts yet" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {topKnowledge.map((post, idx) => (
                    <div key={post.id} className="leader-row">
                      <span className="rank">{idx + 1}</span>
                      <div className="mini-thumb thumb-upload" />
                      <div className="leader-info">
                        <strong>{post.title}</strong>
                        <span>{post.department?.name}</span>
                      </div>
                      <span className="leader-value">{(post.viewCount || 0).toLocaleString()} views</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="table-card" style={{ padding: "22px 26px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <BarChart3 size={18} style={{ color: "#2563eb" }} />
                <h2 style={{ fontSize: 16.5, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Views Comparison
                </h2>
              </div>
              <div className="views-chart">
                {topTasks.map((task, idx) => (
                  <div key={`task-${task.id}`} className="views-bar-row">
                    <span className="views-label" title={task.title}>Task {idx + 1}</span>
                    <div className="views-track">
                      <div className="views-fill task-fill" style={{ width: `${Math.max(((task.viewCount || 0) / maxViews) * 100, 2)}%` }} />
                    </div>
                    <span className="views-value">{(task.viewCount || 0).toLocaleString()}</span>
                  </div>
                ))}
                {topKnowledge.map((post, idx) => (
                  <div key={`knowledge-${post.id}`} className="views-bar-row">
                    <span className="views-label" title={post.title}>Knowledge {idx + 1}</span>
                    <div className="views-track">
                      <div className="views-fill knowledge-fill" style={{ width: `${Math.max(((post.viewCount || 0) / maxViews) * 100, 2)}%` }} />
                    </div>
                    <span className="views-value">{(post.viewCount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="table-card" style={{ padding: 40, textAlign: "center" }}>
          <EmptyState title="No dashboard features assigned to your role." />
        </div>
      )}
    </div>
  );
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="status-bar-row">
      <div className="status-bar-label">
        <span>{label}</span>
        <span className="status-bar-count">{count}</span>
      </div>
      <div className="status-bar-track">
        <div className="status-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="status-bar-pct">{pct}%</div>
    </div>
  );
}
