import { DEFAULT_SETTINGS, exportFileName, type WeightUnit } from '@gym/core';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ErrorState,
  LoadingState,
  ScreenContainer,
  Text,
  confirm,
} from '../../components';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useFocusAsync } from '../../data/useFocusAsync';
import { attempt } from '../../lib/errors';
import { colors, radii, spacing, touch } from '../../theme';

const UNITS: WeightUnit[] = ['kg', 'lb'];

export default function PerfilScreen() {
  const repos = useRepositories();
  const services = useServices();
  const { data, loading, error, reload } = useFocusAsync(() => repos.settings.get());
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const version = Constants.expoConfig?.version ?? '0.0.0';

  if (loading && !data)
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  if (error && !data)
    return (
      <ScreenContainer>
        <ErrorState message="No pudimos cargar tu perfil." onRetry={reload} />
      </ScreenContainer>
    );
  const settings = data ?? DEFAULT_SETTINGS;

  async function update(patch: { unit?: WeightUnit; restTimerEnabled?: boolean }) {
    await attempt(() => repos.settings.update(patch));
    reload();
  }

  async function exportData() {
    setExporting(true);
    try {
      const payload = await services.exportAllData({ appVersion: version });
      const file = new File(Paths.cache, exportFileName(new Date()));
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload));
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('No se pudo compartir', 'Este dispositivo no permite compartir archivos.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar datos',
        UTI: 'public.json',
      });
    } catch (e) {
      Alert.alert('No se pudo exportar', e instanceof Error ? e.message : 'Probá de nuevo.');
    } finally {
      setExporting(false);
    }
  }

  async function importData() {
    setImporting(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      const asset = picked.canceled ? undefined : picked.assets[0];
      if (!asset) return;
      const text = await new File(asset.uri).text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        Alert.alert('Archivo inválido', 'El archivo no es un JSON válido.');
        return;
      }
      const ok = await confirm({
        title: 'Importar datos',
        message: 'Esto reemplaza todos tus datos. ¿Querés continuar?',
        confirmLabel: 'Reemplazar',
        destructive: true,
      });
      if (!ok) return;
      const result = await services.importAllData(json);
      Alert.alert(
        'Datos importados',
        `${result.routines} rutinas, ${result.workouts} entrenamientos y ${result.exercises} ejercicios.`,
      );
      reload();
    } catch (e) {
      Alert.alert('No se pudo importar', e instanceof Error ? e.message : 'Probá de nuevo.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScreenContainer>
      <Text variant="heading">Perfil</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text variant="title">Unidad de peso</Text>
          <View style={styles.units}>
            {UNITS.map((u) => (
              <Chip
                key={u}
                label={u}
                selected={settings.unit === u}
                onPress={() => update({ unit: u })}
              />
            ))}
          </View>
          <Text variant="caption">Internamente se guarda todo en kg.</Text>
        </Card>

        <Card>
          <View style={styles.switchRow}>
            <Text variant="label" style={styles.switchLabel}>
              Temporizador de descanso
            </Text>
            <Switch
              accessibilityLabel="Temporizador de descanso"
              value={settings.restTimerEnabled}
              onValueChange={(v) => update({ restTimerEnabled: v })}
              trackColor={{ true: colors.success, false: colors.border }}
            />
          </View>
        </Card>

        <View style={styles.warning} accessibilityRole="alert">
          <Text color="warning" variant="label">
            Tus datos se guardan solo en este teléfono. Si borrás la app, se pierden. Exportalos
            seguido.
          </Text>
        </View>

        <Button title="Exportar datos" size="lg" loading={exporting} onPress={exportData} />
        <Button
          title="Importar datos"
          variant="secondary"
          loading={importing}
          onPress={importData}
        />

        <Text variant="caption" style={styles.version}>
          Versión {version}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.lg },
  units: { flexDirection: 'row', gap: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },
  switchLabel: { flex: 1 },
  warning: {
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  version: { textAlign: 'center' },
});
