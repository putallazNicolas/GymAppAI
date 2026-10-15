import { DEFAULT_SETTINGS, exportFileName, type WeightUnit } from '@gym/core';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  ErrorState,
  Icon,
  LoadingState,
  ScreenContainer,
  ScreenHeader,
  SegmentedControl,
  Switch,
  Text,
  confirm,
} from '../../components';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useAsync } from '../../data/useAsync';
import { useFocusAsync } from '../../data/useFocusAsync';
import { attempt } from '../../lib/errors';
import { formatDayMonth, formatMonthYear, formatNumber, kgToUnit } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { colors, hit, radii, space, stroke } from '../../theme';

const UNITS: WeightUnit[] = ['kg', 'lb'];
const LAST_EXPORT_FILE = 'last-export.txt';

/** When the data was last exported; kept in a tiny local file (no settings contract field for it). */
async function readLastExport(): Promise<Date | undefined> {
  try {
    const file = new File(Paths.document, LAST_EXPORT_FILE);
    if (!file.exists) return undefined;
    const d = new Date((await file.text()).trim());
    return Number.isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

function writeLastExport(date: Date): void {
  try {
    const file = new File(Paths.document, LAST_EXPORT_FILE);
    file.create({ overwrite: true });
    file.write(date.toISOString());
  } catch {
    // Best effort: the hint just won't show.
  }
}

export default function PerfilScreen() {
  const repos = useRepositories();
  const services = useServices();
  const { data, loading, error, reload } = useFocusAsync(() => repos.settings.get());
  const stats = useAsync(async () => {
    const [items, last] = await Promise.all([services.getRecentWorkouts(100000), readLastExport()]);
    const oldest = items[items.length - 1];
    return {
      lastExport: last,
      totals: {
        workouts: items.length,
        sets: items.reduce((n, i) => n + i.completedSets, 0),
        since: oldest ? formatMonthYear(oldest.workout.startedAt) : undefined,
      },
    };
  }, [data]);
  const totals = stats.data?.totals;
  const [exportedAt, setExportedAt] = useState<Date | undefined>(undefined);
  const lastExport = exportedAt ?? stats.data?.lastExport;
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
      const now = new Date();
      writeLastExport(now);
      setExportedAt(now);
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

  const example =
    settings.unit === 'kg' ? '140 kg × 5' : `${formatNumber(kgToUnit(140, 'lb'))} lb × 5`;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader label="Ajustes y datos" title="Perfil" />

        <View style={styles.stats}>
          <StatCell label="ENTRENOS" value={String(totals?.workouts ?? 0)} />
          <StatCell label="SERIES" value={formatNumber(totals?.sets ?? 0, 0)} divider />
          <StatCell label="DESDE" value={totals?.since ?? '—'} divider />
        </View>

        <Text variant="label" style={styles.section}>
          UNIDAD DE PESO
        </Text>
        <SegmentedControl
          variant="unit"
          accessibilityLabel="Unidad de peso"
          options={UNITS.map((u) => ({ value: u, label: u }))}
          value={settings.unit}
          onChange={(u) => update({ unit: u })}
        />
        <View style={styles.example}>
          <Text variant="caption">Ejemplo:</Text>
          <Text variant="numRead">{example}</Text>
          <Text variant="caption" style={styles.shrink}>
            · tus datos se guardan siempre en kg
          </Text>
        </View>

        <Text variant="label" style={styles.section}>
          DESCANSO
        </Text>
        <View style={styles.switchCard}>
          <Text variant="bodyStrong" style={styles.switchLabel}>
            Temporizador de descanso
          </Text>
          <Switch
            accessibilityLabel="Temporizador de descanso"
            value={settings.restTimerEnabled}
            onValueChange={(v) => {
              haptics.light();
              update({ restTimerEnabled: v });
            }}
          />
        </View>

        <Text variant="label" style={styles.section}>
          TUS DATOS
        </Text>
        <View style={styles.dataCard}>
          <View style={styles.notice} accessibilityRole="alert">
            <Icon name="phone" size={22} color="accent" />
            <View style={styles.noticeTexts}>
              <Text variant="bodyMSemi">
                Tus datos se guardan solo en este teléfono. Si borrás la app, se pierden. Exportalos
                seguido.
              </Text>
              {lastExport ? (
                <Text variant="caption" color="textBody">
                  {`Última exportación: ${sinceText(lastExport)}`}
                </Text>
              ) : null}
            </View>
          </View>
          <Button
            title="Exportar datos"
            size="lg"
            icon="upload"
            loading={exporting}
            onPress={exportData}
          />
          <Button
            title="Importar datos"
            variant="secondary"
            icon="download"
            loading={importing}
            onPress={importData}
          />
          <Text variant="caption" color="textTertiary" style={styles.center}>
            Se exporta un archivo .json con rutinas, entrenamientos y ejercicios.
          </Text>
        </View>

        <View style={styles.version}>
          <Text variant="numS" color="textTertiary">
            GYM APP
          </Text>
          <Text variant="caption" color="textTertiary">
            Versión {version}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCell({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.statCell, divider && styles.statDivider]}>
      <Text variant="label">{label}</Text>
      <Text variant="numL" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** "hace 13 días (2 oct)". */
function sinceText(date: Date): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  const when = days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
  return `${when} (${formatDayMonth(date)})`;
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  center: { textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  statCell: { flex: 1, paddingHorizontal: space.md, paddingVertical: 10, gap: 3 },
  statDivider: { borderLeftWidth: stroke.hairline, borderLeftColor: colors.border },
  section: { marginTop: 22, marginBottom: space.sm },
  example: {
    marginTop: space.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space.xs + 1,
  },
  shrink: { flexShrink: 1 },
  switchCard: {
    minHeight: hit.row,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  switchLabel: { flex: 1 },
  dataCard: {
    padding: space.lg,
    gap: space.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  notice: {
    paddingVertical: space.md,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.accentMuted,
    borderWidth: stroke.hairline,
    borderColor: colors.accentBorder,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  noticeTexts: { flex: 1, gap: 3 },
  version: { marginTop: space.xxl, alignItems: 'center', gap: 2 },
});
