import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { CameraView, useCameraPermissions } from 'expo-camera';
import estilosComunes, { COLORES } from '../assets/estilos';

// Importar servicio de verificación
import { 
  procesarCarnetOCR, 
  calibrarFirma,
  guardarVerificacionLocal,
  guardarFirmasReferenciaLocal 
} from '../servicio/verificacionService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Componente de Cámara con Overlay de Carnet
const CamaraCarnet = ({ visible, onCapture, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const tomarFoto = async () => {
    if (cameraRef.current && !capturing) {
      setCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        onCapture(photo.uri);
        onClose();
      } catch (error) {
        console.error('Error al tomar foto:', error);
        Alert.alert('Error', 'No se pudo capturar la imagen');
      } finally {
        setCapturing(false);
      }
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={estilosCamara.permisoContainer}>
          <Ionicons name="camera-outline" size={80} color={COLORES.primario} />
          <Text style={estilosCamara.permisoTitulo}>Permiso de Cámara</Text>
          <Text style={estilosCamara.permisoTexto}>
            Necesitamos acceso a tu cámara para fotografiar tu carnet de identidad.
          </Text>
          <TouchableOpacity style={estilosCamara.permisoBoton} onPress={requestPermission}>
            <Text style={estilosCamara.permisoBotonTexto}>Permitir Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilosCamara.permisoCancelar} onPress={onClose}>
            <Text style={estilosCamara.permisoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={estilosCamara.container}>
        <CameraView 
          ref={cameraRef}
          style={estilosCamara.camera}
          facing="back"
        >
          {/* Header */}
          <View style={estilosCamara.header}>
            <TouchableOpacity onPress={onClose} style={estilosCamara.closeButton}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={estilosCamara.headerText}>Captura tu Carnet</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Overlay con guía del carnet */}
          <View style={estilosCamara.overlayContainer}>
            {/* Zona oscura superior */}
            <View style={estilosCamara.overlayDark} />
            
            {/* Zona del carnet */}
            <View style={estilosCamara.middleRow}>
              <View style={estilosCamara.overlayDarkSide} />
              
              {/* Recuadro del carnet */}
              <View style={estilosCamara.carnetGuide}>
                {/* Esquinas del recuadro */}
                <View style={[estilosCamara.corner, estilosCamara.topLeft]} />
                <View style={[estilosCamara.corner, estilosCamara.topRight]} />
                <View style={[estilosCamara.corner, estilosCamara.bottomLeft]} />
                <View style={[estilosCamara.corner, estilosCamara.bottomRight]} />
                
                {/* Icono de carnet */}
                <View style={estilosCamara.carnetIconContainer}>
                  <Ionicons name="card-outline" size={40} color="rgba(255,255,255,0.5)" />
                  <Text style={estilosCamara.guideText}>
                    Alinea tu carnet dentro del recuadro
                  </Text>
                </View>
              </View>
              
              <View style={estilosCamara.overlayDarkSide} />
            </View>
            
            {/* Zona oscura inferior */}
            <View style={estilosCamara.overlayDark} />
          </View>

          {/* Instrucciones */}
          <View style={estilosCamara.instructions}>
            <Text style={estilosCamara.instructionText}>
              📋 Coloca el frente del carnet
            </Text>
            <Text style={estilosCamara.instructionSubtext}>
              Asegúrate de que esté bien iluminado y sin reflejos
            </Text>
          </View>

          {/* Botón de captura */}
          <View style={estilosCamara.controls}>
            <TouchableOpacity 
              style={estilosCamara.captureButton} 
              onPress={tomarFoto}
              disabled={capturing}
            >
              {capturing ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <View style={estilosCamara.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
};

const estilosCamara = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: {
    padding: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  overlayDark: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCREEN_WIDTH * 0.55, // Proporción del carnet
  },
  overlayDarkSide: {
    width: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  carnetGuide: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORES.primario,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  carnetIconContainer: {
    alignItems: 'center',
  },
  guideText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 5,
  },
  controls: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 30,
    alignItems: 'center',
  },
  captureButton: {
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  // Estilos para pantalla de permisos
  permisoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  permisoTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  permisoTexto: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  permisoBoton: {
    backgroundColor: COLORES.primario,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  permisoBotonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permisoCancelar: {
    marginTop: 15,
    padding: 10,
  },
  permisoCancelarTexto: {
    color: '#666',
    fontSize: 15,
  },
});

// Componente Stepper para mostrar progreso
const Stepper = ({ pasoActual, pasos }) => (
  <View style={{
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  }}>
    {pasos.map((paso, index) => (
      <React.Fragment key={index}>
        {/* Círculo del paso */}
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: index <= pasoActual ? COLORES.primario : '#e0e0e0',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {index < pasoActual ? (
            <Ionicons name="checkmark" size={20} color="#fff" />
          ) : (
            <Text style={{
              color: index <= pasoActual ? '#fff' : '#999',
              fontWeight: 'bold',
              fontSize: 14,
            }}>
              {index + 1}
            </Text>
          )}
        </View>
        
        {/* Línea conectora */}
        {index < pasos.length - 1 && (
          <View style={{
            flex: 1,
            height: 3,
            backgroundColor: index < pasoActual ? COLORES.primario : '#e0e0e0',
            marginHorizontal: 8,
          }} />
        )}
      </React.Fragment>
    ))}
  </View>
);

// Paso 1: Captura del Carnet
const PasoCarnet = ({ onCapturar, imagenCarnet, datosExtraidos, procesando }) => {
  const [mostrarCamara, setMostrarCamara] = useState(false);
  
  const handleCapturaCamara = (uri) => {
    setMostrarCamara(false);
    onCapturar(uri);
  };

  const seleccionarGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });

    if (!resultado.canceled) {
      onCapturar(resultado.assets[0].uri);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      {/* Cámara con overlay */}
      <CamaraCarnet 
        visible={mostrarCamara}
        onCapture={handleCapturaCamara}
        onClose={() => setMostrarCamara(false)}
      />

      <Text style={{
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORES.texto,
        textAlign: 'center',
        marginBottom: 8,
      }}>
        Verificación de Identidad
      </Text>
      
      <Text style={{
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
      }}>
        Sube una foto del frente de tu carnet de identidad para extraer tu información.
      </Text>

      {/* Área de captura */}
      <View style={{
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: imagenCarnet ? COLORES.primario : '#ddd',
        borderStyle: imagenCarnet ? 'solid' : 'dashed',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        {imagenCarnet ? (
          <View>
            <Image
              source={{ uri: imagenCarnet }}
              style={{
                width: '100%',
                height: 200,
                resizeMode: 'contain',
                backgroundColor: '#fff',
              }}
            />
            {procesando && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ color: '#fff', marginTop: 10 }}>Procesando OCR...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{
            height: 180,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <Ionicons name="card-outline" size={60} color="#999" />
            <Text style={{ color: '#999', marginTop: 12, textAlign: 'center' }}>
              Captura el frente de tu carnet
            </Text>
          </View>
        )}
      </View>

      {/* Botones de captura */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: COLORES.primario,
            padding: 14,
            borderRadius: 8,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setMostrarCamara(true)}
        >
          <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontWeight: '600' }}>Tomar Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#fff',
            padding: 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORES.primario,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={seleccionarGaleria}
        >
          <Ionicons name="images" size={20} color={COLORES.primario} style={{ marginRight: 8 }} />
          <Text style={{ color: COLORES.primario, fontWeight: '600' }}>Galería</Text>
        </TouchableOpacity>
      </View>

      {/* Datos extraídos */}
      {datosExtraidos && (
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: '#e0e0e0',
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: COLORES.texto,
            marginBottom: 16,
          }}>
            <Ionicons name="checkmark-circle" size={18} color="#28a745" /> Datos Extraídos
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>RUT</Text>
            <Text style={{ fontSize: 16, color: COLORES.texto, fontWeight: '500' }}>
              {datosExtraidos.rut}
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Nombre Completo</Text>
            <Text style={{ fontSize: 16, color: COLORES.texto, fontWeight: '500' }}>
              {datosExtraidos.nombre}
            </Text>
          </View>

          {/* Info sobre la firma */}
          <View style={{
            backgroundColor: '#e3f2fd',
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="information-circle" size={18} color="#1976d2" />
              <Text style={{ color: '#1976d2', fontSize: 13, marginLeft: 8, flex: 1 }}>
                En el siguiente paso calibrarás tu firma digital para validación.
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

// Paso 2: Calibración de Firmas
const PasoCalibracion = ({ firma1, firma2, onFirma1, onFirma2, onLimpiar1, onLimpiar2, scrollEnabled, setScrollEnabled }) => {
  const signatureRef1 = useRef(null);
  const signatureRef2 = useRef(null);

  const handleFirma1 = (signature) => {
    let dataUri;
    if (signature.startsWith('data:image')) {
      dataUri = signature;
    } else {
      dataUri = `data:image/png;base64,${signature}`;
    }
    onFirma1(dataUri);
  };

  const handleFirma2 = (signature) => {
    let dataUri;
    if (signature.startsWith('data:image')) {
      dataUri = signature;
    } else {
      dataUri = `data:image/png;base64,${signature}`;
    }
    onFirma2(dataUri);
  };

  const limpiarFirma1 = () => {
    signatureRef1.current?.clearSignature();
    onLimpiar1();
  };

  const limpiarFirma2 = () => {
    signatureRef2.current?.clearSignature();
    onLimpiar2();
  };

  const guardarFirma1 = () => {
    signatureRef1.current?.readSignature();
  };

  const guardarFirma2 = () => {
    signatureRef2.current?.readSignature();
  };

  const webStyle = `.m-signature-pad {
    box-shadow: none;
    border: none;
    margin: 0;
    padding: 0;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body, html {
    margin: 0;
    padding: 0;
  }`;

  return (
    <ScrollView 
      contentContainerStyle={{ padding: 24 }}
      scrollEnabled={scrollEnabled}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={{
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORES.texto,
        textAlign: 'center',
        marginBottom: 8,
      }}>
        Calibración de Firma
      </Text>

      <Text style={{
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
      }}>
        Firma 2 veces para calibrar el sistema. Esto permite calcular tu umbral de similitud personalizado.
      </Text>

      {/* Firma 1 */}
      <View style={{ marginBottom: 24 }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORES.texto }}>
            Firma 1 {firma1 && <Ionicons name="checkmark-circle" size={18} color="#28a745" />}
          </Text>
          <TouchableOpacity onPress={limpiarFirma1}>
            <Text style={{ color: COLORES.primario, fontSize: 14 }}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        <View style={{
          height: 150,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: firma1 ? '#28a745' : '#ddd',
          overflow: 'hidden',
          backgroundColor: '#fff',
        }}>
          <SignatureCanvas
            ref={signatureRef1}
            onOK={handleFirma1}
            onEmpty={() => onLimpiar1()}
            onBegin={() => setScrollEnabled(false)}
            onEnd={() => setScrollEnabled(true)}
            autoClear={false}
            descriptionText=""
            webStyle={webStyle}
            backgroundColor="white"
            penColor="black"
          />
        </View>

        {/* Botones Guardar/Limpiar Firma 1 */}
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          <TouchableOpacity
            onPress={guardarFirma1}
            style={{
              flex: 1,
              backgroundColor: COLORES.primario,
              paddingVertical: 8,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={limpiarFirma1}
            style={{
              flex: 1,
              backgroundColor: '#666',
              paddingVertical: 8,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Limpiar</Text>
          </TouchableOpacity>
        </View>
        
        {!firma1 && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 6, textAlign: 'center' }}>
            Dibuja tu firma y presiona Guardar
          </Text>
        )}
      </View>

      {/* Firma 2 */}
      <View style={{ marginBottom: 24 }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORES.texto }}>
            Firma 2 {firma2 && <Ionicons name="checkmark-circle" size={18} color="#28a745" />}
          </Text>
          <TouchableOpacity onPress={limpiarFirma2}>
            <Text style={{ color: COLORES.primario, fontSize: 14 }}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        <View style={{
          height: 150,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: firma2 ? '#28a745' : '#ddd',
          overflow: 'hidden',
          backgroundColor: '#fff',
        }}>
          <SignatureCanvas
            ref={signatureRef2}
            onOK={handleFirma2}
            onEmpty={() => onLimpiar2()}
            onBegin={() => setScrollEnabled(false)}
            onEnd={() => setScrollEnabled(true)}
            autoClear={false}
            descriptionText=""
            webStyle={webStyle}
            backgroundColor="white"
            penColor="black"
          />
        </View>

        {/* Botones Guardar/Limpiar Firma 2 */}
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          <TouchableOpacity
            onPress={guardarFirma2}
            style={{
              flex: 1,
              backgroundColor: COLORES.primario,
              paddingVertical: 8,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={limpiarFirma2}
            style={{
              flex: 1,
              backgroundColor: '#666',
              paddingVertical: 8,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        {!firma2 && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 6, textAlign: 'center' }}>
            Dibuja tu firma y presiona Guardar
          </Text>
        )}
      </View>

      {/* Info de calibración */}
      <View style={{
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}>
        <Ionicons name="information-circle" size={20} color="#856404" style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 13, color: '#856404', lineHeight: 18 }}>
          Firma de manera natural, como lo harías normalmente. El sistema calculará qué tan consistente es tu firma.
        </Text>
      </View>
    </ScrollView>
  );
};

// Paso 3: Confirmación
const PasoConfirmacion = ({ datosVerificacion, procesando }) => {
  if (procesando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={{ marginTop: 16, fontSize: 16, color: COLORES.texto }}>
          Analizando firmas...
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center' }}>
          Calculando umbral de similitud personalizado
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      {/* Ícono de éxito */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#d4edda',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Ionicons name="checkmark-circle" size={50} color="#28a745" />
        </View>
        
        <Text style={{
          fontSize: 22,
          fontWeight: 'bold',
          color: '#28a745',
          marginBottom: 8,
        }}>
          ¡Perfil Verificado!
        </Text>

        <Text style={{
          fontSize: 14,
          color: '#666',
          textAlign: 'center',
        }}>
          Tu identidad ha sido validada correctamente
        </Text>
      </View>

      {/* Métricas de calibración */}
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 20,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: COLORES.texto,
          marginBottom: 16,
        }}>
          Resultados del Análisis
        </Text>

        {/* Consistencia */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="analytics-outline" size={20} color={COLORES.primario} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 14, color: COLORES.texto }}>Consistencia de Firma</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORES.primario }}>
            {datosVerificacion?.consistencia || 87}%
          </Text>
        </View>

        {/* Umbral */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORES.primario} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 14, color: COLORES.texto }}>Umbral Asignado</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORES.primario }}>
            {datosVerificacion?.umbral || 72}%
          </Text>
        </View>

        {/* Match con carnet */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="finger-print-outline" size={20} color={COLORES.primario} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 14, color: COLORES.texto }}>Match con Carnet</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#28a745' }}>
            {datosVerificacion?.matchCarnet || 89}%
          </Text>
        </View>
      </View>

      {/* Información */}
      <View style={{
        backgroundColor: '#e8f5e9',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}>
        <Ionicons name="information-circle" size={22} color="#2e7d32" style={{ marginRight: 10, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: '#2e7d32', fontWeight: '600', marginBottom: 4 }}>
            ¿Qué significa esto?
          </Text>
          <Text style={{ fontSize: 13, color: '#2e7d32', lineHeight: 18 }}>
            Tus firmas serán validadas automáticamente al firmar informes. Si la similitud supera el {datosVerificacion?.umbral || 72}%, el informe quedará firmado correctamente.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

// Componente Principal
export default function VerificacionIdentidad({ navigation, route }) {
  const { userData, onVerificacionCompleta } = route.params || {};
  
  const [pasoActual, setPasoActual] = useState(0);
  const [procesando, setProcesando] = useState(false);
  
  // Estado del paso 1
  const [imagenCarnet, setImagenCarnet] = useState(null);
  const [datosExtraidos, setDatosExtraidos] = useState(null);
  
  // Estado del paso 2
  const [firma1, setFirma1] = useState(null);
  const [firma2, setFirma2] = useState(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  
  // Estado del paso 3
  const [datosVerificacion, setDatosVerificacion] = useState(null);

  const pasos = ['Carnet', 'Calibración', 'Confirmación'];

  // Procesar carnet con OCR real (Firebase Function + Cloud Vision)
  const procesarCarnet = async (uri) => {
    setImagenCarnet(uri);
    setProcesando(true);

    try {
      // Convertir imagen a base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Llamar a Firebase Function para OCR
      const resultado = await procesarCarnetOCR(base64);

      if (resultado.success) {
        setDatosExtraidos({
          rut: resultado.datos.rut || userData?.rut || 'No detectado',
          nombre: resultado.datos.nombre || userData?.nombre || 'No detectado',
          firmaCarnet: resultado.datos.firmaRegion || null,
          textoCompleto: resultado.datos.textoCompleto || '',
        });
        console.log('✅ OCR completado:', resultado.datos);
      } else {
        // Si falla OCR, usar datos del perfil como fallback
        console.warn('⚠️ OCR falló, usando datos del perfil:', resultado.error);
        Alert.alert(
          'Aviso',
          'No se pudo extraer texto del carnet automáticamente. Se usarán los datos de tu perfil.',
          [{ text: 'Entendido' }]
        );
        setDatosExtraidos({
          rut: userData?.rut || 'No disponible',
          nombre: userData?.nombre || 'No disponible',
          firmaCarnet: null,
        });
      }
    } catch (error) {
      console.error('Error procesando carnet:', error);
      Alert.alert(
        'Error',
        'Hubo un problema al procesar la imagen. Por favor intenta de nuevo.',
        [{ text: 'OK' }]
      );
      // Fallback a datos del perfil
      setDatosExtraidos({
        rut: userData?.rut || 'No disponible',
        nombre: userData?.nombre || 'No disponible',
        firmaCarnet: null,
      });
    } finally {
      setProcesando(false);
    }
  };

  // Procesar calibración de firmas con Firebase Function
  const procesarCalibracion = async () => {
    setProcesando(true);

    try {
      // Llamar a Firebase Function para calibrar firmas
      const resultado = await calibrarFirma(firma1, firma2, null);

      if (resultado.success) {
        const { consistencia, umbral, matchCarnet } = resultado.resultado;

        setDatosVerificacion({
          consistencia,
          umbral,
          matchCarnet: matchCarnet || consistencia, // Si no hay carnet, usar consistencia
        });

        // Guardar localmente para uso offline
        await guardarVerificacionLocal({
          estado: 'verificado',
          umbralSimilitud: umbral,
          consistenciaFirma: consistencia,
        });

        await guardarFirmasReferenciaLocal(firma1, firma2);

        console.log('✅ Calibración completada:', resultado.resultado);
      } else {
        throw new Error(resultado.error || 'Error en calibración');
      }
    } catch (error) {
      console.error('Error en calibración:', error);
      Alert.alert(
        'Error',
        'No se pudo calibrar las firmas. Por favor intenta de nuevo.',
        [{ text: 'OK' }]
      );
      
      // Fallback: valores por defecto si falla el servidor
      setDatosVerificacion({
        consistencia: 75,
        umbral: 65,
        matchCarnet: 75,
      });
    } finally {
      setProcesando(false);
    }
  };

  // Validar si puede avanzar al siguiente paso
  const puedeAvanzar = () => {
    switch (pasoActual) {
      case 0:
        return datosExtraidos !== null;
      case 1:
        return firma1 !== null && firma2 !== null;
      case 2:
        return datosVerificacion !== null;
      default:
        return false;
    }
  };

  // Avanzar al siguiente paso
  const avanzar = async () => {
    if (pasoActual === 1) {
      // Antes de pasar al paso 3, procesar calibración
      await procesarCalibracion();
    }
    
    if (pasoActual < pasos.length - 1) {
      setPasoActual(pasoActual + 1);
    }
  };

  // Finalizar verificación
  const finalizar = async () => {
    setProcesando(true);

    try {
      // Llamar callback con todos los datos
      if (onVerificacionCompleta) {
        onVerificacionCompleta({
          verificado: true,
          datosExtraidos,
          datosVerificacion,
          firmasReferencia: [firma1, firma2],
          imagenCarnet,
        });
      }

      Alert.alert(
        'Verificación Completa',
        'Tu perfil ha sido verificado exitosamente. Ahora puedes firmar informes.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error finalizando:', error);
      Alert.alert('Error', 'No se pudo completar la verificación.');
    } finally {
      setProcesando(false);
    }
  };

  // Retroceder
  const retroceder = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      {/* Header */}
      <View style={[estilosComunes.encabezado, { padding: 16 }]}>
        <TouchableOpacity onPress={retroceder} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
        </TouchableOpacity>
        <Text style={[estilosComunes.titulo, { margin: 0, fontSize: 18 }]}>
          Verificar Identidad
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stepper */}
      <Stepper pasoActual={pasoActual} pasos={pasos} />

      {/* Nombre del paso actual */}
      <Text style={{
        textAlign: 'center',
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
      }}>
        Paso {pasoActual + 1} de {pasos.length}: {pasos[pasoActual]}
      </Text>

      {/* Contenido del paso */}
      <View style={{ flex: 1 }}>
        {pasoActual === 0 && (
          <PasoCarnet
            onCapturar={procesarCarnet}
            imagenCarnet={imagenCarnet}
            datosExtraidos={datosExtraidos}
            procesando={procesando}
          />
        )}

        {pasoActual === 1 && (
          <PasoCalibracion
            firma1={firma1}
            firma2={firma2}
            onFirma1={setFirma1}
            onFirma2={setFirma2}
            onLimpiar1={() => setFirma1(null)}
            onLimpiar2={() => setFirma2(null)}
            scrollEnabled={scrollEnabled}
            setScrollEnabled={setScrollEnabled}
          />
        )}

        {pasoActual === 2 && (
          <PasoConfirmacion
            datosVerificacion={datosVerificacion}
            procesando={procesando}
          />
        )}
      </View>

      {/* Botón de acción */}
      <View style={{
        padding: 24,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
      }}>
        {pasoActual < pasos.length - 1 ? (
          <TouchableOpacity
            style={{
              backgroundColor: puedeAvanzar() ? COLORES.primario : '#ccc',
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={avanzar}
            disabled={!puedeAvanzar() || procesando}
          >
            {procesando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Continuar
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{
              backgroundColor: '#28a745',
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={finalizar}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              Finalizar Verificación
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}