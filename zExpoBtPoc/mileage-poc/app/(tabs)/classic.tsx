import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Text,
  Alert,
  Platform,
} from 'react-native';
import BluetoothClassic, {
  type BluetoothDevice,
  type BluetoothDeviceEvent,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';
import * as Location from 'expo-location';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'bluetooth' | 'location' | 'system';
  message: string;
  details?: Record<string, any>;
}

interface DiscoveredDevice {
  id: string;
  name: string;
  address: string;
  rssi: number | null;
  bonded: boolean | null;
  lastSeen: number;
}

export default function ClassicBluetoothLocationPOC() {
  const colorScheme = useColorScheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const connectedDeviceRef = useRef<BluetoothDevice | null>(null);
  const seenDeviceIdsRef = useRef<Set<string>>(new Set());
  const discoverySubscriptionRef = useRef<BluetoothEventSubscription | null>(null);
  const connectedSubscriptionRef = useRef<BluetoothEventSubscription | null>(null);
  const disconnectedSubscriptionRef = useRef<BluetoothEventSubscription | null>(null);

  const addLog = (type: 'bluetooth' | 'location' | 'system', message: string, details?: Record<string, any>) => {
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
        type,
        message,
        details,
      },
      ...prev,
    ]);
  };

  const upsertDiscoveredDevice = (device: BluetoothDevice) => {
    const deviceId = device.id || device.address;
    const deviceName = device.name || 'Unknown';

    if (!deviceId) {
      return;
    }

    if (!seenDeviceIdsRef.current.has(deviceId)) {
      seenDeviceIdsRef.current.add(deviceId);
      addLog('bluetooth', `Device discovered: ${deviceName}`, {
        name: deviceName,
        address: device.address,
      });
    }

    setDiscoveredDevices(prev => {
      const existingIndex = prev.findIndex(entry => entry.id === deviceId);
      const nextEntry: DiscoveredDevice = {
        id: deviceId,
        name: deviceName,
        address: device.address,
        rssi: typeof device.rssi === 'number' ? device.rssi : device.rssi ? Number(device.rssi) : null,
        bonded: typeof device.bonded === 'boolean' ? device.bonded : null,
        lastSeen: Date.now(),
      };

      if (existingIndex === -1) {
        return [nextEntry, ...prev];
      }

      const updated = [...prev];
      updated[existingIndex] = { ...updated[existingIndex], ...nextEntry };
      return updated;
    });
  };

  const attachDiscoveryListener = () => {
    if (discoverySubscriptionRef.current) {
      discoverySubscriptionRef.current.remove();
    }

    discoverySubscriptionRef.current = BluetoothClassic.onDeviceDiscovered(
      (event: BluetoothDeviceEvent) => {
        if (event?.device) {
          upsertDiscoveredDevice(event.device as BluetoothDevice);
        }
      }
    );
  };

  // Start location tracking
  const startLocationTracking = async () => {
    try {
      if (locationSubscriptionRef.current) {
        addLog('location', 'Location tracking already active');
        return;
      }

      addLog('location', 'Starting location tracking (every 5 seconds)...');
      setIsTracking(true);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 0,
        },
        location => {
          const { latitude, longitude, speed, timestamp } = location.coords;

          const speedKmH = speed ? (speed * 3.6).toFixed(2) : 'N/A';
          const dateStr = new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          addLog('location', 'Location update', {
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            speed: `${speedKmH} km/h`,
            timestamp: dateStr,
          });
        }
      );

      locationSubscriptionRef.current = subscription;
    } catch (error) {
      addLog('location', `Failed to start tracking: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsTracking(false);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
      setIsTracking(false);
      addLog('location', 'Location tracking stopped');
    }
  };

  const logClassicBluetoothState = async () => {
    try {
      const available = await BluetoothClassic.isBluetoothAvailable();
      addLog('system', `Classic Bluetooth available: ${available ? 'Yes' : 'No'}`);
      if (!available) {
        return;
      }

      const enabled = await BluetoothClassic.isBluetoothEnabled();
      addLog('system', `Classic Bluetooth enabled: ${enabled ? 'Yes' : 'No'}`);

      if (!enabled && Platform.OS === 'android') {
        const requested = await BluetoothClassic.requestBluetoothEnabled();
        addLog('system', `Requested Bluetooth enable: ${requested ? 'Yes' : 'No'}`);
      }
    } catch (error) {
      addLog('system', `Bluetooth status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        if (locationStatus === 'granted') {
          addLog('system', 'Foreground location permission granted');

          try {
            const bgStatus = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus?.status === 'granted') {
              addLog('system', 'Background location permission granted');
            } else {
              addLog('system', `Background location permission denied: ${bgStatus?.status || 'unknown'}`);
            }
          } catch (bgError) {
            addLog('system', `Background permission error: ${bgError instanceof Error ? bgError.message : String(bgError)}`);
          }
        } else {
          addLog('system', 'Foreground location permission denied');
        }

        await logClassicBluetoothState();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        addLog('system', `Permission error: ${errorMsg}`);
      }
    };

    const timer = setTimeout(() => {
      requestPermissions();
    }, 500);

    connectedSubscriptionRef.current = BluetoothClassic.onDeviceConnected(async event => {
      if (!event?.device) {
        return;
      }

      addLog('bluetooth', `Device connected: ${event.device.name || event.device.address}`, {
        address: event.device.address,
        name: event.device.name,
      });

      try {
        const device = await BluetoothClassic.getConnectedDevice(event.device.address);
        connectedDeviceRef.current = device;
        setConnectedDevice(device);
        await startLocationTracking();
      } catch (connectError) {
        addLog('bluetooth', `Failed to hydrate connected device: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`);
      }
    });

    disconnectedSubscriptionRef.current = BluetoothClassic.onDeviceDisconnected(event => {
      if (event?.device) {
        addLog('bluetooth', `Device disconnected: ${event.device.name || event.device.address}`, {
          address: event.device.address,
          name: event.device.name,
        });
      } else {
        addLog('bluetooth', 'Device disconnected');
      }

      connectedDeviceRef.current = null;
      setConnectedDevice(null);
      stopLocationTracking();
    });

    return () => {
      clearTimeout(timer);
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
      if (discoverySubscriptionRef.current) {
        discoverySubscriptionRef.current.remove();
      }
      if (connectedSubscriptionRef.current) {
        connectedSubscriptionRef.current.remove();
      }
      if (disconnectedSubscriptionRef.current) {
        disconnectedSubscriptionRef.current.remove();
      }
    };
  }, []);

  // Start Classic Bluetooth scanning
  const startBluetoothScan = async () => {
    if (isScanning) {
      addLog('system', 'Scan already in progress');
      return;
    }

    try {
      setIsScanning(true);
      setDiscoveredDevices([]);
      seenDeviceIdsRef.current.clear();
      addLog('bluetooth', 'Starting Classic Bluetooth scan...');

      const available = await BluetoothClassic.isBluetoothAvailable();
      if (!available) {
        addLog('bluetooth', 'Classic Bluetooth not available on this device');
        setIsScanning(false);
        return;
      }

      const enabled = await BluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        addLog('bluetooth', 'Classic Bluetooth is disabled');
        if (Platform.OS === 'android') {
          const requested = await BluetoothClassic.requestBluetoothEnabled();
          addLog('bluetooth', `Requested Bluetooth enable: ${requested ? 'Yes' : 'No'}`);
        }
        setIsScanning(false);
        return;
      }

      if (Platform.OS === 'android') {
        attachDiscoveryListener();
        const devices = await BluetoothClassic.startDiscovery();
        devices.forEach(device => upsertDiscoveredDevice(device));
      } else {
        addLog('bluetooth', 'iOS does not support discovery; showing connected accessories only');
        const devices = await BluetoothClassic.getConnectedDevices();
        devices.forEach(device => upsertDiscoveredDevice(device));
      }

      setTimeout(async () => {
        if (Platform.OS === 'android') {
          await BluetoothClassic.cancelDiscovery();
          if (discoverySubscriptionRef.current) {
            discoverySubscriptionRef.current.remove();
            discoverySubscriptionRef.current = null;
          }
        }
        setIsScanning(false);
        addLog('bluetooth', 'Classic Bluetooth scan stopped');
      }, 15000);
    } catch (error) {
      setIsScanning(false);
      addLog('bluetooth', `Failed to start scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Connect to a Classic Bluetooth device
  const connectToDeviceByAddress = async (address: string, deviceName?: string) => {
    if (connectedDeviceRef.current) {
      addLog('system', `Already connected to ${connectedDeviceRef.current.name || connectedDeviceRef.current.address}. Skipping connection.`);
      return;
    }

    try {
      addLog('bluetooth', `Attempting to connect to ${deviceName || address}...`);

      const device = await BluetoothClassic.connectToDevice(address);
      connectedDeviceRef.current = device;
      setConnectedDevice(device);

      addLog('bluetooth', `Connected to ${deviceName || address}`, {
        address,
        name: deviceName,
      });

      if (Platform.OS === 'android') {
        await BluetoothClassic.cancelDiscovery();
      }
      setIsScanning(false);

      await startLocationTracking();
    } catch (error) {
      addLog('bluetooth', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle device disconnection
  const handleDeviceDisconnection = async () => {
    if (connectedDeviceRef.current) {
      try {
        await connectedDeviceRef.current.disconnect();

        addLog('bluetooth', `Disconnected from ${connectedDeviceRef.current.name || connectedDeviceRef.current.address || 'device'}`);
        connectedDeviceRef.current = null;
        setConnectedDevice(null);

        stopLocationTracking();
      } catch (error) {
        addLog('bluetooth', `Disconnection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Clear logs
  const clearLogs = () => {
    Alert.alert('Clear Logs', 'Are you sure?', [
      { text: 'Cancel', onPress: () => { }, style: 'cancel' },
      {
        text: 'Clear',
        onPress: () => {
          setLogs([]);
          addLog('system', 'Logs cleared');
        },
        style: 'destructive',
      },
    ]);
  };

  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const primaryButtonTextColor = isDark ? '#000' : '#fff';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.controlsSection}>
        <ThemedText type="title" style={styles.title}>
          Classic BT & Location POC
        </ThemedText>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isScanning ? '#888' : colors.tint },
              isScanning && styles.buttonDisabled,
            ]}
            onPress={startBluetoothScan}
            disabled={isScanning || !!connectedDevice}
          >
            <Text style={[styles.buttonText, { color: primaryButtonTextColor }]}>
              {isScanning ? 'Scanning...' : 'Start Scan'}
            </Text>
          </TouchableOpacity>

          {connectedDevice && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#d32f2f' }]}
              onPress={handleDeviceDisconnection}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statusContainer}>
          <ThemedText type="defaultSemiBold">Scanning: {isScanning ? 'Yes' : 'No'}</ThemedText>
          <ThemedText type="defaultSemiBold">
            Connected: {connectedDevice ? `${connectedDevice.name || connectedDevice.address || connectedDevice.id}` : 'No'}
          </ThemedText>
          <ThemedText type="defaultSemiBold">Tracking: {isTracking ? 'Yes' : 'No'}</ThemedText>
        </View>
      </View>

      <View style={styles.devicesSection}>
        <View style={styles.devicesHeader}>
          <ThemedText type="defaultSemiBold">Discovered Devices ({discoveredDevices.length})</ThemedText>
          {isScanning && <Text style={{ color: colors.tint, fontWeight: '600' }}>Scanning...</Text>}
        </View>
        {discoveredDevices.length === 0 ? (
          <Text style={[styles.emptyState, { color: isDark ? '#bbb' : '#777' }]}>No devices yet. Start a scan to populate this list.</Text>
        ) : (
          <ScrollView style={styles.devicesList}>
            {discoveredDevices.map(device => (
              <View key={device.id} style={styles.deviceRow}>
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: colors.text }]}>{device.name}</Text>
                  <Text style={[styles.deviceMeta, { color: isDark ? '#bbb' : '#777' }]}
                  >
                    {device.address}
                    {device.rssi !== null ? ` • RSSI ${device.rssi}` : ''}
                    {device.bonded === false ? ' • Not paired' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.deviceConnectButton,
                    { backgroundColor: colors.tint },
                    connectedDevice && styles.buttonDisabled,
                  ]}
                  onPress={() => connectToDeviceByAddress(device.address, device.name)}
                  disabled={!!connectedDevice}
                >
                  <Text style={[styles.deviceConnectText, { color: primaryButtonTextColor }]}>Connect</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.logsHeader}>
        <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
          Event Log ({logs.length})
        </ThemedText>
        <TouchableOpacity onPress={clearLogs}>
          <Text style={{ color: colors.tint, fontWeight: '600' }}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.logEntry,
              {
                borderLeftColor:
                  item.type === 'bluetooth'
                    ? '#2196F3'
                    : item.type === 'location'
                      ? '#4CAF50'
                      : '#FF9800',
              },
            ]}
          >
            <View style={styles.logHeader}>
              <Text style={[styles.logTimestamp, { color: isDark ? '#aaa' : '#666' }]}>
                {item.timestamp}
              </Text>
              <Text
                style={[
                  styles.logType,
                  {
                    color:
                      item.type === 'bluetooth'
                        ? '#2196F3'
                        : item.type === 'location'
                          ? '#4CAF50'
                          : '#FF9800',
                  },
                ]}
              >
                {item.type.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.logMessage, { color: colors.text }]}>{item.message}</Text>
            {item.details && (
              <View style={styles.logDetails}>
                {Object.entries(item.details).map(([key, value]) => (
                  <Text key={key} style={[styles.logDetail, { color: isDark ? '#bbb' : '#777' }]}>
                    {key}: {JSON.stringify(value)}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
        scrollEnabled={true}
        style={styles.logsList}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  controlsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusContainer: {
    gap: 4,
  },
  logsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devicesSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  devicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devicesList: {
    maxHeight: 180,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  deviceInfo: {
    flex: 1,
    paddingRight: 8,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  deviceConnectButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deviceConnectText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    fontSize: 12,
  },
  logsList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  logEntry: {
    marginHorizontal: 8,
    marginVertical: 4,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 8,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logTimestamp: {
    fontSize: 12,
    fontFamily: 'Courier New',
  },
  logType: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logMessage: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  logDetails: {
    marginTop: 4,
  },
  logDetail: {
    fontSize: 11,
    fontFamily: 'Courier New',
    marginVertical: 1,
  },
});
