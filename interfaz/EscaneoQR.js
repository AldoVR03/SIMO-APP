import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../servicio/firebase-config';

export default function EscaneoQR({ navigation }) {
  const [tienePermiso, setTienePermiso] = useState(null);
  const [escaneado, setEscaneado] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setTienePermiso(status === 'granted');
    })();
  }, []);

  const buscarEquipoPorCodigo = async (codigoQR) => {
    try {
      setBuscando(true);
      console.log('🔍 Buscando equipo con código:', codigoQR);

      const equiposQuery = query(
        collection(db, 'planificacion'),
        where('codigo_sgs', '==', codigoQR)
      );
      
      const equiposSnapshot = await getDocs(equiposQuery);
      
      if (equiposSnapshot.empty) {
        console.log('❌ No encontrado por codigo_sgs, buscando por ID...');

        const equipoDocQuery = query(collection(db, 'planificacion'));
        const todosEquipos = await getDocs(equipoDocQuery);
        
        const equipoEncontrado = todosEquipos.docs.find(
          doc => doc.id === codigoQR
        );
        
        if (equipoEncontrado) {
          const equipoData = equipoEncontrado.data();
          console.log('✅ Equipo encontrado por ID:', equipoData.equipo);
          return {
            id: equipoEncontrado.id,
            equipo: equipoData.equipo,
            codigo_sgs: equipoData.codigo_sgs || equipoEncontrado.id,
            ...equipoData,
          };
        }
        
        console.log('❌ No se encontró el equipo');
        return null;
      }

      const equipoDoc = equiposSnapshot.docs[0];
      const equipoData = equipoDoc.data();
      console.log('✅ Equipo encontrado:', equipoData.equipo);
      
      return {
        id: equipoDoc.id,
        equipo: equipoData.equipo,
        codigo_sgs: equipoData.codigo_sgs || equipoDoc.id,
        ...equipoData,
      };
      
    } catch (error) {
      console.error('❌ Error buscando equipo:', error);
      return null;
    } finally {
      setBuscando(false);
    }
  };

  const manejarEscaneo = async ({ data }) => {
    if (escaneado || buscando) return;
    
    setEscaneado(true);
    console.log('📱 QR escaneado:', data);

    const equipoEncontrado = await buscarEquipoPorCodigo(data);
    
    if (equipoEncontrado) {
      console.log('✅ Navegando a InformesEquipo con:', equipoEncontrado.equipo);
      navigation.replace('InformesEquipo', {
        equipo: equipoEncontrado,
      });
    } else {
      Alert.alert(
        '❌ Equipo no encontrado',
        `No se encontró ningún equipo con el código: ${data}`,
        [
          {
            text: 'Reintentar',
            onPress: () => setEscaneado(false),
          },
          {
            text: 'Volver',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  if (tienePermiso === null) {
    return (
      <View style={estilos.contenedor}>
        <ActivityIndicator size="large" color="#ff9900" />
        <Text style={estilos.textoInfo}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (tienePermiso === false) {
    return (
      <View style={estilos.contenedor}>
        <Ionicons name="camera-off" size={80} color="#999" />
        <Text style={estilos.textoError}>
          No se otorgaron permisos para usar la cámara
        </Text>
        <Text style={estilos.textoAyuda}>
          Por favor, ve a la configuración de tu dispositivo y habilita el acceso a la cámara para esta aplicación.
        </Text>
        <TouchableOpacity
          style={estilos.botonVolver}
          onPress={() => navigation.goBack()}
        >
          <Text style={estilos.textoBotonVolver}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={estilos.botonAtras}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={estilos.titulo}>Escanear código QR</Text>
      </View>

      <View style={estilos.contenedorCamara}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={escaneado ? undefined : manejarEscaneo}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        <View style={estilos.overlay}>
          <View style={estilos.overlayTop} />
          <View style={estilos.overlayMedio}>
            <View style={estilos.overlayLado} />
            <View style={estilos.marcoEscaneo}>
              <View style={[estilos.esquina, estilos.esquinaSuperiorIzq]} />
              <View style={[estilos.esquina, estilos.esquinaSuperiorDer]} />
              <View style={[estilos.esquina, estilos.esquinaInferiorIzq]} />
              <View style={[estilos.esquina, estilos.esquinaInferiorDer]} />
              
              <View style={estilos.lineaEscaneo} />
            </View>
            <View style={estilos.overlayLado} />
          </View>
          <View style={estilos.overlayBottom}>
            <Text style={estilos.textoInstrucciones}>
              {escaneado ? 'Código escaneado...' : 'Coloca el código QR dentro del marco'}
            </Text>
          </View>
        </View>

        {buscando && (
          <View style={estilos.overlayBuscando}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={estilos.textoBuscando}>Buscando equipo...</Text>
          </View>
        )}
      </View>

      {escaneado && !buscando && (
        <View style={estilos.contenedorBoton}>
          <TouchableOpacity
            style={estilos.botonReintentar}
            onPress={() => setEscaneado(false)}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={estilos.textoBotonReintentar}>Escanear otro QR</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  botonAtras: {
    marginRight: 15,
  },
  titulo: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  contenedorCamara: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMedio: {
    flexDirection: 'row',
    height: 300,
  },
  overlayLado: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  marcoEscaneo: {
    width: 300,
    height: 300,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineaEscaneo: {
    width: '80%',
    height: 2,
    backgroundColor: '#ff9900',
  },
  esquina: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#ff9900',
    borderWidth: 4,
  },
  esquinaSuperiorIzq: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  esquinaSuperiorDer: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  esquinaInferiorIzq: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  esquinaInferiorDer: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  textoInstrucciones: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
  overlayBuscando: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  textoBuscando: {
    color: '#fff',
    fontSize: 18,
    marginTop: 15,
    fontWeight: '600',
  },
  contenedorBoton: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  botonReintentar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9900',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  textoBotonReintentar: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  textoInfo: {
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
  textoError: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  textoAyuda: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  botonVolver: {
    backgroundColor: '#ff9900',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 30,
  },
  textoBotonVolver: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});