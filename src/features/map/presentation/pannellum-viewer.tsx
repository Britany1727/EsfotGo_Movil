import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Pressable,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import WebView from 'react-native-webview';
import { LightTheme as T } from '@/constants/design-system';

interface Props {
  imageUrl: string;
  onClose: () => void;
  title?: string;
}

function generateHtml(imageUrl: string): string {
  const sanitized = imageUrl.replace(/\\/g, '/').replace(/'/g, "\\'");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css">
  <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #container { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script>
    try {
      var viewer = pannellum.viewer('container', {
        type: 'equirectangular',
        panorama: '${sanitized}',
        autoLoad: true,
        autoRotate: -2,
        autoRotateInactivityDelay: 5000,
        compass: false,
        hotSpotDebug: false,
        showFullscreenCtrl: false,
        showZoomCtrl: true,
        keyboardZoom: true,
        mouseZoom: true,
        friction: 0.15,
        yaw: 0,
        pitch: -5,
        minPitch: -60,
        maxPitch: 60,
      });
    } catch(e) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;font-family:sans-serif;padding:20px;text-align:center;">Error al cargar la imagen 360°</div>';
    }
  </script>
</body>
</html>`;
}

export function PannellumViewer({ imageUrl, onClose, title }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const insets = useSafeAreaInsets();
  const html = generateHtml(imageUrl);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.root}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topBarTitle} numberOfLines={1}>{title ?? 'Vista 360°'}</Text>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <X size={22} strokeWidth={2.5} color="#FFFFFF" />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudo cargar la imagen 360°</Text>
        </View>
      ) : (
        <View style={styles.webviewWrap}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={T.primary} />
              <Text style={styles.loadingText}>Cargando panorama 360°...</Text>
            </View>
          )}
          <WebView
            source={{ html, baseUrl: 'https://cdn.jsdelivr.net' }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            mixedContentMode="always"
            originWhitelist={['*']}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            scrollEnabled={false}
            bounces={false}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000',
    zIndex: 9999, elevation: 9999,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CC0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  errorText: {
    color: T.error,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  webviewWrap: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    zIndex: 10,
    gap: 12,
  },
  loadingText: {
    color: T.textSecondary,
    fontSize: 14,
  },
});
