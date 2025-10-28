import React, { useRef, useState, useEffect } from 'react';
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
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../servicio/firebase-config';
import { format } from 'date-fns';
import { COLORES } from '../assets/estilos';

const SignatureCanvas =
  Platform.OS !== 'web' ? require('react-native-signature-canvas').default : () => null;

export default function CompletarFirmas({ navigation, route }) {
  const { informe, mantenimientoId } = route.params;
  
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [datosInforme, setDatosInforme] = useState(null);
  
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

  useEffect(() => {
    cargarInformeExistente();
  }, []);

  const cargarInformeExistente = async () => {
    try {
      setCargando(true);
      const mantenimientoRef = doc(db, 'planificacion', informe.id, 'mantenimientos', mantenimientoId);
      const mantenimientoSnap = await getDoc(mantenimientoRef);
      
      if (mantenimientoSnap.exists()) {
        const data = mantenimientoSnap.data();
        setDatosInforme(data);

        if (data.informeId) {
          const informeRef = doc(db, 'informePreventivo', data.informeId);
          const informeSnap = await getDoc(informeRef);
          
          if (informeSnap.exists()) {
            const informeData = informeSnap.data();
            setFirmas(informeData.firmas || {});
            setRespaldos(informeData.respaldos || {});
            setNombres(informeData.nombres || {});
          }
        }
      }
    } catch (error) {
      console.error('Error cargando informe:', error);
      Alert.alert('Error', 'No se pudo cargar el informe');
    } finally {
      setCargando(false);
    }
  };

  const uploadDataUri = async (dataUri, nombre = 'firma') => {
    const formData = new FormData();
    formData.append("file", dataUri);
    formData.append("upload_preset", "SIMO-APP-Evidencia-Firma");
    formData.append("cloud_name", "due9nyqmr");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/due9nyqmr/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );
      const json = await response.json();
      return json.secure_url || null;
    } catch (error) {
      console.error(`Error subiendo ${nombre}:`, error);
      return null;
    }
  };

  const uploadImage = async (uri) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: "respaldo.jpg",
    });
    formData.append("upload_preset", "SIMO-APP-Evidencia-Firma");
    formData.append("cloud_name", "due9nyqmr");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/due9nyqmr/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );
      const json = await response.json();
      return json.secure_url;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      return null;
    }
  };

  const roles = ['mantenedor', 'supervisor', 'calidad'];

  const getFirmaKey = (rol) => {
    return rol === 'calidad' ? 'firma_a_calidad_dgm' : `firma_${rol}`;
  };

  const getRespaldoKey = (rol) => {
    return rol === 'calidad' ? 'firma_a_calidad_dgm_Respaldo' : `firma_${rol}_Respaldo`;
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
    console.log(`✅ Firma guardada para ${rol}`);
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
    }
  };

  const guardarFirmasFaltantes = async () => {
    try {
      setGuardando(true);

      // Subir nuevas firmas
      const urlsFirmas = { ...firmas };
      for (const [key, dataUri] of Object.entries(firmas)) {
        if (dataUri && dataUri.startsWith('data:image')) {
          const urlCloudinary = await uploadDataUri(dataUri, key);
          urlsFirmas[key] = urlCloudinary || dataUri;
        }
      }

      // Subir nuevos respaldos
      const urlsRespaldos = { ...respaldos };
      for (const [key, uri] of Object.entries(respaldos)) {
        if (uri && !uri.startsWith('http')) {
          const urlCloudinary = await uploadImage(uri);
          urlsRespaldos[key] = urlCloudinary || uri;
        }
      }

      const firmasRequeridas = ['firma_mantenedor', 'firma_supervisor', 'firma_a_calidad_dgm'];
      const faltanFirmas = firmasRequeridas.some(key => !urlsFirmas[key]);
      const nuevoEstado = faltanFirmas ? "Faltante de firmas" : "Completado";

      if (datosInforme.informeId) {
        const informeRef = doc(db, 'informePreventivo', datosInforme.informeId);
        await updateDoc(informeRef, {
          firmas: urlsFirmas,
          respaldos: urlsRespaldos,
          nombres: nombres,
          estado: nuevoEstado,
        });
      }

      const mantenimientoRef = doc(db, 'planificacion', informe.id, 'mantenimientos', mantenimientoId);
      const datosActualizacion = {
        estado: nuevoEstado,
        fechaActualizacion: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      };

      if (nuevoEstado === "Completado") {
        datosActualizacion.fechaCompletado = format(new Date(), 'yyyy-MM-dd');
      }

      await updateDoc(mantenimientoRef, datosActualizacion);

      Alert.alert(
        'Éxito',
        `Firmas actualizadas correctamente.\nEstado: ${nuevoEstado}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('InicioMantenedor'),
          },
        ]
      );
    } catch (error) {
      console.error('Error guardando firmas:', error);
      Alert.alert('Error', 'No se pudieron guardar las firmas: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const capitalizar = (text) =>
    text === 'calidad' ? 'A. Calidad DGM' : text.charAt(0).toUpperCase() + text.slice(1);

  if (cargando) {
    return (
      <View style={estilos.contenedorCargando}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={{ marginTop: 10 }}>Cargando informe...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={estilos.contenedorPrincipal}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botonVolver}>
          <Ionicons name="arrow-back" size={24} color={COLORES.primario} />
        </TouchableOpacity>
        <Text style={estilos.titulo}>Completar Firmas</Text>
      </View>

      <ScrollView 
        style={estilos.scrollContenido} 
        contentContainerStyle={estilos.contenedorContenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.infoEquipo}>
          <Text style={estilos.textoInfo}>Equipo: {informe.equipo}</Text>
          <Text style={estilos.textoInfo}>Código SGS: {informe.codigo_sgs}</Text>
        </View>

        {roles.map((rol, i) => {
          const firmaKey = getFirmaKey(rol);
          const yaFirmado = firmas[firmaKey] && firmas[firmaKey].startsWith('http');

          return (
            <View key={i} style={estilos.bloqueFirma}>
              <Text style={estilos.rolTexto}>{capitalizar(rol)}</Text>

              {yaFirmado && (
                <View style={estilos.alertaYaFirmado}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={estilos.textoYaFirmado}>Ya firmado</Text>
                </View>
              )}

              <TextInput
                style={estilos.inputNombre}
                placeholder={`Nombre completo del ${capitalizar(rol)}`}
                value={nombres[getNombreKey(rol)]}
                onChangeText={(texto) => 
                  setNombres({ ...nombres, [getNombreKey(rol)]: texto })
                }
                editable={!yaFirmado}
              />

              <View style={estilos.fila}>
                <View style={estilos.contenedorFirma}>
                  <View style={[estilos.cajaFirma, yaFirmado && estilos.cajaFirmaDeshabilitada]}>
                    {yaFirmado ? (
                      <Image 
                        source={{ uri: firmas[firmaKey] }} 
                        style={estilos.firmaExistente}
                        resizeMode="contain"
                      />
                    ) : Platform.OS !== 'web' ? (
                      <SignatureCanvas
                        ref={canvasRefs[rol]}
                        onOK={(signature) => manejarFirma(signature, rol)}
                        onEmpty={() => console.log(`Canvas vacío: ${rol}`)}
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
                            overflow: hidden;
                          }
                        `}
                      />
                    ) : (
                      <Text style={estilos.textoWeb}>Canvas no disponible en web</Text>
                    )}
                  </View>
                  
                  {!yaFirmado && Platform.OS !== 'web' && (
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

                  {firmas[firmaKey] && !yaFirmado && (
                    <View style={estilos.indicadorGuardado}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={estilos.textoGuardado}>Firma guardada</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={estilos.cajaCarnet}
                  onPress={() => !yaFirmado && seleccionarImagen(rol)}
                  disabled={yaFirmado}
                >
                  {respaldos[getRespaldoKey(rol)] ? (
                    <Image 
                      source={{ uri: respaldos[getRespaldoKey(rol)] }} 
                      style={estilos.imgRespaldo} 
                    />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={28} color={yaFirmado ? '#ccc' : '#777'} />
                      <Text style={[estilos.textoCarnet, yaFirmado && { color: '#ccc' }]}>
                        Subir carnet
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={[estilos.botonFinalizar, guardando && estilos.botonDeshabilitado]}
          onPress={guardarFirmasFaltantes}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.textoBotonFinalizar}>Guardar firmas</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contenedorCargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  botonVolver: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 10,
  },
  titulo: {
    fontSize: 20,
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
  infoEquipo: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
  },
  textoInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  bloqueFirma: {
    marginBottom: 25,
  },
  rolTexto: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
  },
  alertaYaFirmado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  textoYaFirmado: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
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
    borderColor: COLORES.primario,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cajaFirmaDeshabilitada: {
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  firmaExistente: {
    width: '100%',
    height: '100%',
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
    backgroundColor: COLORES.primario,
  },
  botonLimpiar: {
    backgroundColor: '#e74c3c',
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
    backgroundColor: COLORES.primario,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  botonDeshabilitado: {
    backgroundColor: '#ccc',
  },
  textoBotonFinalizar: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});