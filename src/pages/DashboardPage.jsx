import { useAllProjects } from '../hooks/useAllProjects';
import StatsSection from '../components/dashboard/StatsSection';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import { colors, fonts, fontSizes, spacing } from '../lib/theme';

export default function DashboardPage() {
  const { projects, loading } = useAllProjects();

  if (loading) return <div style={{ color: colors.textMuted }}>Chargement…</div>;

  return (
    <div style={{ fontFamily: fonts.body, maxWidth: 900, padding: spacing.xxl }}>
      <h2 style={{ color: colors.text, fontWeight: 600, marginBottom: spacing.xl, fontSize: fontSizes.xl }}>
        Dashboard
      </h2>

      <StatsSection projects={projects} />

      <h3 style={{
        color: colors.text, fontWeight: 600, marginTop: 32, marginBottom: spacing.md, fontSize: fontSizes.lg,
      }}>
        Activité récente
      </h3>

      <ActivityFeed projects={projects} />
    </div>
  );
}
