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
import { BleManager, Device } from 'react-native-ble-plx';
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

export default function BluetoothLocationPOC() {
  const colorScheme = useColorScheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  const bleManagerRef = useRef<BleManager | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const connectedDeviceRef = useRef<Device | null>(null);

  console.log('🟢 [Explore] Component rendered');

  // Lazy initialize BleManager
  const getBleManager = () => {
    if (!bleManagerRef.current) {
      bleManagerRef.current = new BleManager();
    }
    return bleManagerRef.current;
  };

  // Utility to add logs
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

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        console.log('🔵 [System] Requesting permissions...');

        // Request location permissions
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        if (locationStatus === 'granted') {
          console.log('✓ [Location] Foreground permission granted');
          addLog('system', 'Foreground location permission granted');

          // Request background location permission
          try {
            console.log('🔵 [Location] Attempting to request background permission...');
            const bgStatus = await Location.requestBackgroundPermissionsAsync();
            console.log('🔵 [Location] Background permission response:', bgStatus);

            if (bgStatus?.status === 'granted') {
              console.log('✓ [Location] Background permission granted');
              addLog('system', 'Background location permission granted');
            } else {
              console.log('✗ [Location] Background permission denied:', bgStatus?.status);
              addLog('system', `Background location permission denied: ${bgStatus?.status || 'unknown'}`);
            }
          } catch (bgError) {
            console.error('❌ [Location] Background permission error:', bgError);
            addLog('system', `Background permission error: ${bgError instanceof Error ? bgError.message : String(bgError)}`);
          }
        } else {
          console.log('✗ [Location] Foreground permission denied');
          addLog('system', 'Foreground location permission denied');
        }

        // BLE permissions are requested on Android automatically
        if (Platform.OS === 'android') {
          addLog('system', 'BLE permissions handled by system');
        } else {
          console.log('🔵 Ready for BLE scan');
          addLog('system', 'Ready for BLE scan on iOS');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [System] Permission error:', errorMsg);
        addLog('system', `Permission error: ${errorMsg}`);
      }
    };

    // Delay permission request slightly to ensure component is mounted
    const timer = setTimeout(() => {
      requestPermissions();
    }, 500);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      if (bleManagerRef.current) {
        try {
          bleManagerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying BleManager:', e);
        }
      }
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  // Start BLE scanning
  const startBluetoothScan = async () => {
    if (isScanning) {
      addLog('system', 'Scan already in progress');
      return;
    }

    try {
      console.log('🔵 [Bluetooth] Starting scan...');
      setIsScanning(true);
      addLog('bluetooth', 'Starting Bluetooth scan...');

      const bleManager = getBleManager();
      console.log('✓ [Bluetooth] BleManager initialized');

      // Check if Bluetooth is enabled
      const state = await bleManager.state();
      console.log(`🔵 [Bluetooth] BLE State: ${state}`);
      addLog('bluetooth', `BLE State: ${state}`);

      // Start scanning
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          addLog('bluetooth', `Scan error: ${error.message}`);
          setIsScanning(false);
          return;
        }

        if (device) {
          const details = {
            name: device.name || 'Unknown',
            id: device.id,
          };

          addLog('bluetooth', `Device discovered: ${device.name || 'Unknown'}`, details);

          // Attempt to connect to any device that appears
          connectToDevice(device);
        }
      });

      // Stop scan after 15 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        addLog('bluetooth', 'Bluetooth scan stopped');
      }, 15000);
    } catch (error) {
      setIsScanning(false);
      addLog('bluetooth', `Failed to start scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Connect to a BLE device
  const connectToDevice = async (device: Device) => {
    if (connectedDeviceRef.current) {
      addLog('system', `Already connected to ${connectedDeviceRef.current.name}. Skipping connection.`);
      return;
    }

    try {
      const bleManager = getBleManager();

      addLog('bluetooth', `Attempting to connect to ${device.name || device.id}...`);

      const connectedDevice = await bleManager.connectToDevice(device.id);
      connectedDeviceRef.current = connectedDevice;
      setConnectedDevice(connectedDevice);

      addLog('bluetooth', `✓ Connected to ${device.name || device.id}`, {
        id: device.id,
        name: device.name,
      });

      // Stop scanning once connected
      bleManager.stopDeviceScan();
      setIsScanning(false);

      // Start location tracking
      await startLocationTracking();
    } catch (error) {
      addLog('bluetooth', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

      // Request location updates every 5 seconds
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 0, // Update regardless of distance
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

          addLog('location', `Location update`, {
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

  // Handle device disconnection
  const handleDeviceDisconnection = async () => {
    if (connectedDeviceRef.current) {
      try {
        const bleManager = getBleManager();
        await bleManager.cancelDeviceConnection(connectedDeviceRef.current.id);

        addLog('bluetooth', `Disconnected from ${connectedDeviceRef.current.name || 'device'}`);
        connectedDeviceRef.current = null;
        setConnectedDevice(null);

        // Stop location tracking on disconnect
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

  console.log('🟢 [Explore] Rendering UI...');

  return (
    <ThemedView style={styles.container}>
      {/* Controls */}
      <View style={styles.controlsSection}>
        <ThemedText type="title" style={styles.title}>
          BLE & Location POC
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
            <Text style={styles.buttonText}>
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

        {/* Status */}
        <View style={styles.statusContainer}>
          <ThemedText type="defaultSemiBold">
            Scanning: {isScanning ? 'Yes ◉' : 'No'}
          </ThemedText>
          <ThemedText type="defaultSemiBold">
            Connected: {connectedDevice ? `${connectedDevice.name || connectedDevice.id} ◉` : 'No'}
          </ThemedText>
          <ThemedText type="defaultSemiBold">
            Tracking: {isTracking ? 'Yes ◉' : 'No'}
          </ThemedText>
        </View>
      </View>

      {/* Logs Section */}
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
              <Text
                style={[
                  styles.logTimestamp,
                  { color: isDark ? '#aaa' : '#666' },
                ]}
              >
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
            <Text style={[styles.logMessage, { color: colors.text }]}>
              {item.message}
            </Text>
            {item.details && (
              <View style={styles.logDetails}>
                {Object.entries(item.details).map(([key, value]) => (
                  <Text
                    key={key}
                    style={[styles.logDetail, { color: isDark ? '#bbb' : '#777' }]}
                  >
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
