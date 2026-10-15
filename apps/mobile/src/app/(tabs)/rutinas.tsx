import { StyleSheet, Text, View } from 'react-native';

export default function RutinasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Rutinas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontSize: 20 },
});
