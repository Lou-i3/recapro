import { colors, fonts, fontSizes, spacing, radii, labelStyle, cardStyle } from '../../lib/theme';

export default function StatsSection({ projects }) {
  const allItems = projects.flatMap(p => p.items || []);
  const total = allItems.length;
  const done = allItems.filter(i => i.done).length;
  const high = allItems.filter(i => i.priority === 'high' && !i.done).length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;

  const statCard = (label, value, color = colors.text) => (
    <div style={{ ...cardStyle, minWidth: 130 }}>
      <div style={{ ...labelStyle, marginBottom: spacing.sm }}>{label}</div>
      <div style={{ fontSize: fontSizes.xxl, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.xxl }}>
        {statCard('Total items', total)}
        {statCard('Terminés', done, colors.green)}
        {statCard('Complétion', `${rate}%`, colors.blue)}
        {statCard('Priorité haute', high, high > 0 ? colors.red : colors.textMuted)}
        {statCard('Projets', projects.length)}
      </div>

      {projects.length > 0 && (
        <div style={cardStyle}>
          <div style={{ ...labelStyle, marginBottom: spacing.md }}>Par projet</div>
          {projects.map(p => {
            const pItems = p.items || [];
            const pDone = pItems.filter(i => i.done).length;
            const pTotal = pItems.length;
            const pRate = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;
            return (
              <div key={p.slug} style={{
                display: 'flex', alignItems: 'center', gap: spacing.md,
                padding: `${spacing.sm}px 0`,
                borderBottom: `1px solid ${colors.borderLight}`,
                fontSize: fontSizes.base,
              }}>
                <span style={{ flex: 1, color: colors.text }}>{p.projectName}</span>
                <span style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: fontSizes.sm }}>
                  {pDone}/{pTotal}
                </span>
                <div style={{
                  width: 70, height: 5, background: colors.surface3,
                  borderRadius: radii.sm, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${pRate}%`, height: '100%',
                    background: colors.blue, borderRadius: radii.sm,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <span style={{ fontFamily: fonts.mono, fontSize: fontSizes.sm, color: colors.blue, minWidth: 34, textAlign: 'right' }}>
                  {pRate}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
