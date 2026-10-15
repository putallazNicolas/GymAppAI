import { EmptyState } from './EmptyState';
import { ScreenContainer } from './ScreenContainer';

/** Temporary body for routes whose real screen arrives in a later milestone. */
export function PlaceholderScreen({ title, message }: { title: string; message?: string }) {
  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <EmptyState title={title} message={message ?? 'Esta pantalla llega pronto.'} />
    </ScreenContainer>
  );
}
