import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import WebView from 'react-native-webview';
import { LightTheme as T } from '@/constants/design-system';

interface Props {
  imageUrl: string;
  onClose?: () => void;
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
    .pnlm-load-button { display: none !important; }
    .pnlm-controls { display: none !important; }
    .pnlm-compass { display: none !important; }
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

export function PannellumViewer({ imageUrl }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const html = generateHtml(imageUrl);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar la imagen 360°</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: {
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
});
