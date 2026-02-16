import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AudioManager, type AudioDeviceInfo, type AudioDevicesInfo } from 'react-native-audio-api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type LogEntry = {
  id: string;
  timestamp: string;
  message: string;
};

const externalPortTypes = new Set([
  'BluetoothA2DP',
  'BluetoothHFP',
  'BluetoothLE',
  'Bluetooth',
  'CarAudio',
  'AirPlay',
  'USBHeadset',
  'USBAudio',
  'HDMI',
  'LineOut',
]);

const formatOutputs = (outputs: AudioDeviceInfo[]) => {
  if (!outputs.length) {
    return 'None';
  }

  return outputs
    .map(output => `${output.name || 'Unknown'} (${output.category || 'Unknown'})`)
    .join(', ');
};

const isExternalRoute = (outputs: AudioDeviceInfo[]) =>
  outputs.some(output => output.category && externalPortTypes.has(output.category));

export default function AvAudioRoutePOC() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentOutputs, setCurrentOutputs] = useState<AudioDeviceInfo[]>([]);
  const lastRouteSignatureRef = useRef<string>('');
  const lastExternalRef = useRef<boolean>(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    setLogs(prev => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp,
        message,
      },
      ...prev,
    ]);
  };

  const handleRouteUpdate = (outputs: AudioDeviceInfo[], reason?: string) => {
    setCurrentOutputs(outputs);

    const signature = outputs
      .map(output => `${output.name || 'Unknown'}:${output.category || 'Unknown'}`)
      .join('|');

    if (signature === lastRouteSignatureRef.current) {
      return;
    }

    lastRouteSignatureRef.current = signature;
    const nowExternal = isExternalRoute(outputs);
    const reasonSuffix = reason ? ` (reason: ${reason})` : '';

    if (nowExternal) {
      addLog(`Audio route connected: ${formatOutputs(outputs)}${reasonSuffix}`);
    } else if (lastExternalRef.current) {
      addLog(`Audio route disconnected${reasonSuffix}`);
    } else {
      addLog(`Audio route changed: ${formatOutputs(outputs)}${reasonSuffix}`);
    }

    lastExternalRef.current = nowExternal;
  };

  const fetchCurrentRoute = async (reason?: string) => {
    try {
      const devicesInfo = (await AudioManager.getDevicesInfo()) as AudioDevicesInfo;
      handleRouteUpdate(devicesInfo.currentOutputs ?? [], reason);
    } catch (error) {
      addLog(`Failed to read current route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    fetchCurrentRoute();

    const subscription = AudioManager.addSystemEventListener('routeChange', event => {
      void fetchCurrentRoute(event?.reason);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            AVAudioSession Route
          </ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Logs audio route changes and connection state via AVAudioSession outputs.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Current Route
          </ThemedText>
          <View style={styles.routeCard}>
            <ThemedText style={styles.routeText}>{formatOutputs(currentOutputs)}</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Logs
          </ThemedText>
          {logs.length === 0 ? (
            <ThemedText style={styles.placeholderText}>No logs yet.</ThemedText>
          ) : (
            logs.map(entry => (
              <View key={entry.id} style={styles.logEntry}>
                <ThemedText style={styles.logTimestamp}>{entry.timestamp}</ThemedText>
                <ThemedText style={styles.logMessage}>{entry.message}</ThemedText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: '#b0b0b0',
  },
  routeCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  routeText: {
    fontWeight: '600',
    color: '#fff',
  },
  placeholderText: {
    color: '#b0b0b0',
  },
  logEntry: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  logMessage: {
    marginTop: 4,
  },
});
