import { EmptyState, ScreenContainer, Text } from '../../components';

export default function RutinasScreen() {
  return (
    <ScreenContainer>
      <Text variant="heading">Mis rutinas</Text>
      <EmptyState icon="routines" title="Mis rutinas" message="Esta pantalla llega pronto." />
    </ScreenContainer>
  );
}
