import { EmptyState, ScreenContainer, Text } from '../../components';

export default function ProgresoScreen() {
  return (
    <ScreenContainer>
      <Text variant="heading">Progreso</Text>
      <EmptyState icon="progress" title="Progreso" message="Esta pantalla llega pronto." />
    </ScreenContainer>
  );
}
