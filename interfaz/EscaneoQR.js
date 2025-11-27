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
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../servicio/firebase-config'; // Asegúrate que esta ruta sea correcta
import { COLORES } from '../assets/estilos'; // Asegúrate que esta ruta sea correcta

export default function EscanerQR({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, []);

  // --- FUNCIÓN DE BÚSQUEDA MEJORADA ---
const buscarEquipoPorID = async (idEquipoRaw) => {
    try {
      console.log(`🔍 Buscando: [${idEquipoRaw}]`);
      
      // 1. DEFINICIÓN EXACTA DE COLECCIONES (Minúsculas según tus fotos)
      // La colección se llama 'equipos' (plural) y 'plantilla' (singular)
      const colecciones = ['equipos', 'plantilla']; 

      for (const nombreColeccion of colecciones) {
        
        // A. Búsqueda directa por ID del Documento (Lo más probable)
        // (Ej: El documento se llama "LAB-DGM-HOR-006")
        try {
            const docRef = doc(db, nombreColeccion, idEquipoRaw);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                console.log(`✅ Encontrado por ID Documento en '${nombreColeccion}'`);
                return { id: docSnap.id, ...docSnap.data() };
            }
        } catch (e) {
            console.log(`Pasando búsqueda doc ID en ${nombreColeccion}`);
        }

        // B. Búsqueda por campos internos (Query)
        const refColeccion = collection(db, nombreColeccion);
        
        // En tus fotos: 'plantilla' usa 'codigo_sgs', pero 'equipos' usa 'id'
        // Vamos a buscar en ambos campos por si acaso.
        
        // Intento 1: Buscar por campo 'codigo_sgs' (Común en plantilla)
        const q1 = query(refColeccion, where('codigo_sgs', '==', idEquipoRaw));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
             console.log(`✅ Encontrado por codigo_sgs en '${nombreColeccion}'`);
             return { id: snap1.docs[0].id, ...snap1.docs[0].data() };
        }

        // Intento 2: Buscar por campo 'id' (Común en equipos según tu foto 2)
        const q2 = query(refColeccion, where('id', '==', idEquipoRaw));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
             console.log(`✅ Encontrado por campo 'id' en '${nombreColeccion}'`);
             return { id: snap2.docs[0].id, ...snap2.docs[0].data() };
        }
      }

      console.log('❌ No se encontró el equipo en equipos ni plantilla.');
      return null;

    } catch (error) {
      console.error('❌ Error buscando equipo:', error);
      throw error;
    }
  };

  const manejarEscaneo = async ({ data }) => {
    if (escaneado || procesando) return;

    setEscaneado(true);
    setProcesando(true);

    try {
      console.log('📱 Data Cruda del QR:', JSON.stringify(data));

      let idEquipo = data;

      // 1. Limpieza de URL
      if (idEquipo.includes('http://') || idEquipo.includes('https://')) {
        const urlParts = idEquipo.split('/');
        const partesValidas = urlParts.filter(p => p.length > 0);
        idEquipo = partesValidas[partesValidas.length - 1];
      }

      // 2. Limpieza formato "Etiqueta: VALOR"
      if (idEquipo.includes(':')) {
        idEquipo = idEquipo.split(':').pop();
      }

      // 3. LIMPIEZA CRÍTICA: Quitar espacios y saltos de línea invisibles
      idEquipo = idEquipo.trim().replace(/(\r\n|\n|\r)/gm, "");

      console.log(`📱 ID Limpio a buscar: [${idEquipo}]`);

      // Buscar en Firebase
      const equipo = await buscarEquipoPorID(idEquipo);

      if (equipo) {
        console.log('✅ Navegando a InformesEquipo');
        navigation.navigate('InformesEquipo', {
          equipoId: equipo.id,
          equipoNombre: equipo.equipo || equipo.nombre || idEquipo,
          equipo: equipo,
        });

        // Pequeño delay para permitir que la navegación ocurra antes de resetear
        setTimeout(() => {
          setEscaneado(false);
          setProcesando(false);
        }, 1500);

      } else {
        Alert.alert(
          'Equipo no encontrado',
          `No se encontró coincidencias para:\n"${idEquipo}"\n\nVerifica que el código coincida con 'codigo_sgs' o el ID en Firebase.`,
          [
            {
              text: 'Reintentar',
              onPress: () => {
                setEscaneado(false);
                setProcesando(false);
              },
            },
            {
              text: 'Volver',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }

    } catch (error) {
      console.error('❌ Error procesando QR:', error);
      Alert.alert(
        'Error',
        'Hubo un problema al procesar el código: ' + error.message,
        [
          {
            text: 'OK',
            onPress: () => {
              setEscaneado(false);
              setProcesando(false);
            },
          },
        ]
      );
    }
  };

  if (!permission) {
    return (
      <View style={estilos.contenedor}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={estilos.textoCargando}>Cargando cámara...</Text>
      </View>
    );
  }

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

        <View style={estilos.camaraContainer}>
          <CameraView
            style={estilos.camara}
            facing="back"
            onBarcodeScanned={escaneado ? undefined : manejarEscaneo}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={estilos.overlay}>
              <View style={estilos.marcoQR}>
                <View style={[estilos.esquina, estilos.esquinaSuperiorIzq]} />
                <View style={[estilos.esquina, estilos.esquinaSuperiorDer]} />
                <View style={[estilos.esquina, estilos.esquinaInferiorIzq]} />
                <View style={[estilos.esquina, estilos.esquinaInferiorDer]} />
              </View>
            </View>

            <View style={estilos.instruccionContainer}>
              <Text style={estilos.textoInstruccion}>
                {procesando ? 'Buscando equipo en base de datos...' : 'Escanea el QR del equipo'}
              </Text>
            </View>

            {procesando && (
              <View style={estilos.procesandoContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </CameraView>
        </View>

        <View style={estilos.botonesInferiores}>
          <TouchableOpacity
            style={estilos.botonManual}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="list-outline" size={20} color="#fff" />
            <Text style={estilos.textoBotonManual}>Ver Lista de Equipos</Text>
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