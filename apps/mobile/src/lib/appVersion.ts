import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Version from app.json (what EAS Update's runtime is tied to). */
export function configVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/**
 * "1.0.0 (12)" in a real build, from expo-application (design/L3). In Expo Go expo-application
 * reports Expo Go's own version, and on the web it has none, so there the app.json version is
 * shown without a build number.
 */
export function appVersionLabel(): string {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return configVersion();
  const version = Application.nativeApplicationVersion ?? configVersion();
  const build = Application.nativeBuildVersion;
  return build ? `${version} (${build})` : version;
}
