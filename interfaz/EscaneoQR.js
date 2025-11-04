import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORES } from '../assets/estilos';

export default function EscanerQR({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    // Solicitar permisos al montar el componente
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, []);

  const manejarEscaneo = ({ data }) => {
    if (escaneado || procesando) return;

    setEscaneado(true);
    setProcesando(true);

    try {
      console.log('📱 QR escaneado:', data);

      // Aquí puedes parsear el QR según tu formato
      // Ejemplo: Si el QR contiene un ID de equipo
      const equipoId = data;

      // Navegar a InformesEquipo con los datos del QR
      navigation.navigate('InformesEquipo', {
        equipoId: equipoId,
        qrData: data,
      });

      // Reset después de navegar
      setTimeout(() => {
        setEscaneado(false);
        setProcesando(false);
      }, 1000);

    } catch (error) {
      console.error('Error procesando QR:', error);
      Alert.alert('Error', 'Código QR inválido');
      setEscaneado(false);
      setProcesando(false);
    }
  };

  // Si no hay permisos aún
  if (!permission) {
    return (
      <View style={estilos.contenedor}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={estilos.textoCargando}>Cargando cámara...</Text>
      </View>
    );
  }

  // Si los permisos fueron denegados
  if (!permission.granted) {
    return (
      <View style={estilos.contenedor}>
        <SafeAreaView style={estilos.contenedor}>
          <View style={estilos.sinPermiso}>
            <Ionicons name="camera-off" size={60} color="#999" />
            <Text style={estilos.textoSinPermiso}>
              Se necesita acceso a la cámara para escanear códigos QR
            </Text>
            <TouchableOpacity
              style={estilos.botonPermiso}
              onPress={requestPermission}
            >
              <Text style={estilos.textoBotonPermiso}>Otorgar Permiso</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <SafeAreaView style={estilos.contenedor}>
        {/* Header */}
        <View style={estilos.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={estilos.backButton}
          >
            <Text style={estilos.flechaVolver}>←</Text>
          </TouchableOpacity>
          <Text style={estilos.titulo}>Escanear QR</Text>
          <View style={estilos.espaciador} />
        </View>

        {/* Cámara */}
        <View style={estilos.camaraContainer}>
          <CameraView
            style={estilos.camara}
            facing="back"
            onBarcodeScanned={escaneado ? undefined : manejarEscaneo}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            {/* Overlay con marco */}
            <View style={estilos.overlay}>
              <View style={estilos.marcoQR}>
                <View style={[estilos.esquina, estilos.esquinaSuperiorIzq]} />
                <View style={[estilos.esquina, estilos.esquinaSuperiorDer]} />
                <View style={[estilos.esquina, estilos.esquinaInferiorIzq]} />
                <View style={[estilos.esquina, estilos.esquinaInferiorDer]} />
              </View>
            </View>

            {/* Texto de instrucción */}
            <View style={estilos.instruccionContainer}>
              <Text style={estilos.textoInstruccion}>
                {procesando ? 'Procesando...' : 'Apunta al código QR del equipo'}
              </Text>
            </View>

            {/* Indicador de procesamiento */}
            {procesando && (
              <View style={estilos.procesandoContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </CameraView>
        </View>

        {/* Botón manual (opcional) */}
        <View style={estilos.botonesInferiores}>
          <TouchableOpacity
            style={estilos.botonManual}
            onPress={() => {
              Alert.alert(
                'Entrada manual',
                'Ingrese el ID del equipo',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'OK',
                    onPress: () => {
                      // Aquí puedes implementar entrada manual si lo necesitas
                      navigation.navigate('InformesEquipo', {
                        equipoId: 'MANUAL',
                      });
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={estilos.textoBotonManual}>Entrada Manual</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  backButton: {
    paddingRight: 12,
  },
  flechaVolver: {
    fontSize: 26,
    color: COLORES.primario,
    fontWeight: 'bold',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    color: '#000',
  },
  espaciador: {
    width: 38,
  },
  camaraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camara: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  marcoQR: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  esquina: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORES.primario,
  },
  esquinaSuperiorIzq: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  esquinaSuperiorDer: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  esquinaInferiorIzq: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  esquinaInferiorDer: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruccionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  textoInstruccion: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  procesandoContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
  },
  botonesInferiores: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  botonManual: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  textoBotonManual: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sinPermiso: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#fff',
  },
  textoSinPermiso: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
  },
  botonPermiso: {
    backgroundColor: COLORES.primario,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  textoBotonPermiso: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  textoCargando: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});