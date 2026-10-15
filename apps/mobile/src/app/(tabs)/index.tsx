import { EmptyState, ScreenContainer, Text } from '../../components';
import { formatDate } from '../../lib/format';

export default function HoyScreen() {
  return (
    <ScreenContainer>
      <Text variant="caption">{formatDate(new Date())}</Text>
      <Text variant="heading">Hoy</Text>
      <EmptyState
        icon="today"
        title="Todavía no hay rutinas"
        message="Armá tu primera rutina para empezar a entrenar."
      />
    </ScreenContainer>
  );
}
