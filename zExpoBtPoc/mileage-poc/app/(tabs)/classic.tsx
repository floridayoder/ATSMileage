import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
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
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);
    const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
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

        const startLocationTracking = async () => {
            try {
                const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
                if (locationStatus !== 'granted') {
                    addLog('Foreground location permission denied');
                    return;
                }

                try {
                    const bgStatus = await Location.requestBackgroundPermissionsAsync();
                    if (bgStatus?.status !== 'granted') {
                        addLog(`Background location permission denied: ${bgStatus?.status || 'unknown'}`);
                    }
                } catch (bgError) {
                    addLog(
                        `Background permission error: ${bgError instanceof Error ? bgError.message : 'Unknown error'}`
                    );
                }

                if (locationSubscriptionRef.current) {
                    addLog('Location tracking already active');
                    return;
                }

                addLog('Starting location tracking (every 5 seconds)...');
                setIsTrackingLocation(true);

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

                        setCurrentLocation(location.coords);
                        addLog(
                            `Location update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${speedKmH} km/h @ ${dateStr})`
                        );
                    }
                );

                locationSubscriptionRef.current = subscription;
            } catch (error) {
                addLog(
                    `Failed to start tracking: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
                setIsTrackingLocation(false);
            }
        };

        void startLocationTracking();

        return () => {
            subscription?.remove();
            if (locationSubscriptionRef.current) {
                locationSubscriptionRef.current.remove();
                locationSubscriptionRef.current = null;
            }
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
                        Location Tracking
                    </ThemedText>
                    <ThemedText style={styles.sectionSubtitle}>
                        Tracking: {isTrackingLocation ? 'Yes' : 'No'}
                    </ThemedText>
                    <View style={styles.routeCard}>
                        <ThemedText style={styles.routeText}>
                            {currentLocation
                                ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                                : 'No location yet.'}
                        </ThemedText>
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
