import type { PlannedExercise } from '@gym/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '../theme';

import { Card } from './Card';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { TextField } from './TextField';

interface Props {
  planned: PlannedExercise;
  name: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Persist a patch; fields not changed are omitted. `null` clears an optional field. */
  onSave: (patch: {
    sets?: number;
    reps?: string;
    restSeconds?: number | null;
    notes?: string | null;
  }) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
}

/** One planned exercise of a day; edits persist on blur. */
export function PlannedExerciseCard({
  planned,
  name,
  canMoveUp,
  canMoveDown,
  onSave,
  onMove,
  onDelete,
}: Props) {
  const [sets, setSets] = useState(String(planned.sets));
  const [reps, setReps] = useState(planned.reps);
  const [rest, setRest] = useState(
    planned.restSeconds === undefined ? '' : String(planned.restSeconds),
  );
  const [notes, setNotes] = useState(planned.notes ?? '');

  function saveSets() {
    const n = parseInt(sets, 10);
    if (!Number.isFinite(n) || n < 1) return setSets(String(planned.sets));
    if (n !== planned.sets) onSave({ sets: n });
  }
  function saveReps() {
    const v = reps.trim();
    if (!v) return setReps(planned.reps);
    if (v !== planned.reps) onSave({ reps: v });
  }
  function saveRest() {
    const v = rest.trim();
    if (!v) {
      if (planned.restSeconds !== undefined) onSave({ restSeconds: null });
      return;
    }
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0)
      return setRest(planned.restSeconds === undefined ? '' : String(planned.restSeconds));
    if (n !== planned.restSeconds) onSave({ restSeconds: n });
  }
  function saveNotes() {
    const v = notes.trim();
    if (v === (planned.notes ?? '')) return;
    onSave({ notes: v ? v : null });
  }

  return (
    <Card>
      <View style={styles.header}>
        <Text variant="bodyStrong" style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <IconButton
          glyph="↑"
          label="Subir ejercicio"
          disabled={!canMoveUp}
          onPress={() => onMove(-1)}
        />
        <IconButton
          glyph="↓"
          label="Bajar ejercicio"
          disabled={!canMoveDown}
          onPress={() => onMove(1)}
        />
        <IconButton glyph="✕" label="Quitar ejercicio" danger onPress={onDelete} />
      </View>
      <View style={styles.fields}>
        <View style={styles.field}>
          <TextField
            label="Series"
            value={sets}
            onChangeText={setSets}
            onBlur={saveSets}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.field}>
          <TextField
            label="Reps"
            value={reps}
            onChangeText={setReps}
            onBlur={saveReps}
            placeholder="8-10, AMRAP"
            autoCapitalize="characters"
          />
        </View>
        <View style={styles.field}>
          <TextField
            label="Descanso (s)"
            value={rest}
            onChangeText={setRest}
            onBlur={saveRest}
            keyboardType="number-pad"
            placeholder="Opcional"
          />
        </View>
      </View>
      <TextField
        label="Notas"
        value={notes}
        onChangeText={setNotes}
        onBlur={saveNotes}
        placeholder="Opcional"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flex: 1 },
  fields: { flexDirection: 'row', gap: space.sm },
  field: { flex: 1 },
});
