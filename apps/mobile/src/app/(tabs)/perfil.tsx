import { EmptyState, ScreenContainer, Text } from '../../components';

export default function PerfilScreen() {
  return (
    <ScreenContainer>
      <Text variant="heading">Perfil</Text>
      <EmptyState icon="profile" title="Perfil" message="Esta pantalla llega pronto." />
    </ScreenContainer>
  );
}
