import { useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import ProjectView from '../components/project/ProjectView';
import MarkdownPanel from '../components/project/MarkdownPanel';
import { colors } from '../lib/theme';

export default function ProjectPage() {
  const { slug } = useParams();
  const { data, loading, save } = useProject(slug);

  if (loading) return <div style={{ color: colors.textMuted }}>Chargement…</div>;
  if (!data) return <div style={{ color: colors.red }}>Projet non trouvé</div>;

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      gap: 0,
    }}>
      <ProjectView project={data} onSave={save} />
      <MarkdownPanel
        markdown={data.markdown || ''}
        onChange={(md) => save({ markdown: md })}
      />
    </div>
  );
}
