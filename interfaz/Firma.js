import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../assets/estilos';

const SignatureCanvas =
  Platform.OS !== 'web'
    ? require('react-native-signature-canvas').default
    : () => null;

export default function Firma({ navigation, route }) {
  console.log("✅ Datos recibidos en Firma:", route.params);
  const {
    equipo = 'Equipo no definido',
    informe = {},
    respuestas = {},
    imagenes = [],
    mantenimientoId, // ← RECIBIR mantenimientoId
  } = route?.params || {};

  const [firmas, setFirmas] = useState({
    firma_mantenedor: null,
    firma_supervisor: null,
    firma_a_calidad_dgm: null,
  });

  const [respaldos, setRespaldos] = useState({
    firma_mantenedor_Respaldo: null,
    firma_supervisor_Respaldo: null,
    firma_a_calidad_dgm_Respaldo: null,
  });

  const [nombres, setNombres] = useState({
    nombre_mantenedor: '',
    nombre_supervisor: '',
    nombre_calidad: '',
  });

  const canvasRefs = {
    mantenedor: useRef(),
    supervisor: useRef(),
    calidad: useRef(),
  };
const [scrollEnabled, setScrollEnabled] = useState(true);
  const roles = ['mantenedor', 'supervisor', 'calidad'];

  const getFirmaKey = (rol) => {
    if (rol === 'calidad') {
      return 'firma_a_calidad_dgm';
    }
    return `firma_${rol}`;
  };

  const getRespaldoKey = (rol) => {
    if (rol === 'calidad') {
      return 'firma_a_calidad_dgm_Respaldo';
    }
    return `firma_${rol}_Respaldo`;
  };

  const getNombreKey = (rol) => {
    return `nombre_${rol}`;
  };

  const seleccionarImagen = async (rol) => {
    const key = getRespaldoKey(rol);
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!resultado.canceled) {
      setRespaldos({ ...respaldos, [key]: resultado.assets[0].uri });
    }
  };

  const manejarFirma = (signature, rol) => {
    const key = getFirmaKey(rol);

    let dataUri;
    if (signature.startsWith('data:image')) {
      dataUri = signature;
    } else {
      dataUri = `data:image/png;base64,${signature}`;
    }
    
    setFirmas({ ...firmas, [key]: dataUri });
    console.log(`✅ Firma guardada para ${rol}:`, dataUri.substring(0, 50) + '...');
  };

  const guardarFirma = (rol) => {
    const ref = canvasRefs[rol]?.current;
    if (ref && ref.readSignature) {
      ref.readSignature();
    } else {
      Alert.alert('Error', 'No se pudo guardar la firma');
    }
  };

  const limpiarFirma = (rol) => {
    const key = getFirmaKey(rol);
    const ref = canvasRefs[rol]?.current;
    if (ref && ref.clearSignature) {
      ref.clearSignature();
      setFirmas({ ...firmas, [key]: null });
      console.log(`🗑️ Firma limpiada para ${rol}`);
    }
  };

  const capitalizar = (text) =>
    text === 'calidad' ? 'A. Calidad DGM' : text.charAt(0).toUpperCase() + text.slice(1);

  const navegarAResumen = () => {
    console.log('📤 Navegando a InformeResumen con mantenimientoId:', mantenimientoId);
    
    navigation.navigate('InformeResumen', {
      informe,
      respuestas,
      imagenes,
      firmas,
      respaldos,
      nombres,
      mantenimientoId, // ← CRÍTICO: Pasar mantenimientoId
    });
  };

  return (
    <View style={estilos.contenedorPrincipal}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botonVolver}>
          <Ionicons name="arrow-back" size={24} color="#ff9900" />
        </TouchableOpacity>
        <Text style={estilos.titulo}>{equipo}</Text>
      </View>

      <ScrollView 
        style={estilos.scrollContenido} 
        contentContainerStyle={estilos.contenedorContenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {roles.map((rol, i) => (
          <View key={i} style={estilos.bloqueFirma}>
            <Text style={estilos.rolTexto}>{capitalizar(rol)}</Text>

            <TextInput
              style={estilos.inputNombre}
              placeholder={`Nombre completo del ${capitalizar(rol)}`}
              value={nombres[getNombreKey(rol)]}
              onChangeText={(texto) => 
                setNombres({ ...nombres, [getNombreKey(rol)]: texto })
              }
            />

            <View style={estilos.fila}>
              <View style={estilos.contenedorFirma}>
                <View style={estilos.cajaFirma}>
                  {Platform.OS !== 'web' ? (
                    <SignatureCanvas
                      ref={canvasRefs[rol]}
                      onOK={(signature) => manejarFirma(signature, rol)}
                      onEmpty={() => console.log(`Canvas vacío: ${rol}`)}
                      onBegin={() => setScrollEnabled(false)}
                      onEnd={() => setScrollEnabled(true)}
                      descriptionText="Firme aquí"
                      clearText="Limpiar"
                      confirmText="Guardar"
                      webStyle={`
                        .m-signature-pad {
                          box-shadow: none;
                          border: none;
                          margin: 0;
                        }
                        .m-signature-pad--body {
                          border: none;
                          margin: 0;
                        }
                        .m-signature-pad--footer {
                          display: none;
                        }
                        body, html {
                          margin: 0;
                          padding: 0;
                          width: 100%;
                          height: 100%;
                        }
                      `}
                    />
                  ) : (
                    <Text style={estilos.textoWeb}>Canvas no disponible en web</Text>
                  )}
                </View>
                {Platform.OS !== 'web' && (
                  <View style={estilos.botonesCanvas}>
                    <TouchableOpacity
                      onPress={() => guardarFirma(rol)}
                      style={[estilos.botonCanvas, estilos.botonGuardar]}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={estilos.textoBotonCanvas}>Guardar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => limpiarFirma(rol)}
                      style={[estilos.botonCanvas, estilos.botonLimpiar]}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text style={estilos.textoBotonCanvas}>Limpiar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {firmas[getFirmaKey(rol)] && (
                  <View style={estilos.indicadorGuardado}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={estilos.textoGuardado}>Firma guardada</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={estilos.cajaCarnet}
                onPress={() => seleccionarImagen(rol)}
              >
                {respaldos[getRespaldoKey(rol)] ? (
                  <Image 
                    source={{ uri: respaldos[getRespaldoKey(rol)] }} 
                    style={estilos.imgRespaldo} 
                  />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={28} color="#777" />
                    <Text style={estilos.textoCarnet}>Subir carnet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={estilos.botonFinalizar}
          onPress={() => {
            const hayFirmas = Object.values(firmas).some(f => f !== null);
            if (!hayFirmas) {
              Alert.alert(
                'Advertencia', 
                '¿Desea continuar sin firmas?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Continuar', 
                    onPress: navegarAResumen
                  }
                ]
              );
            } else {
              navegarAResumen();
            }
          }}
        >
          <Text style={estilos.textoBotonFinalizar}>Finalizar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  botonVolver: {
    position: 'absolute',
    left: 20,
    top: 40,
    zIndex: 10,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollContenido: {
    flex: 1,
  },
  contenedorContenido: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bloqueFirma: {
    marginBottom: 30,
    marginTop: 16,
  },
  rolTexto: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
  },
  inputNombre: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contenedorFirma: {
    flex: 1,
    marginRight: 12,
  },
  cajaFirma: {
    height: 180,
    borderWidth: 2,
    borderColor: '#ff9900',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  textoWeb: {
    textAlign: 'center',
    marginTop: 60,
    color: '#999',
  },
  botonesCanvas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  botonCanvas: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  botonGuardar: {
    backgroundColor: '#4CAF50',
  },
  botonLimpiar: {
    backgroundColor: '#f44336',
  },
  textoBotonCanvas: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  indicadorGuardado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  textoGuardado: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cajaCarnet: {
    width: 110,
    height: 110,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  imgRespaldo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textoCarnet: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    textAlign: 'center',
  },
  botonFinalizar: {
    backgroundColor: '#ff9900',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  textoBotonFinalizar: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});