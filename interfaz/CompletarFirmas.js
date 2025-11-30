
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../servicio/firebase-config';
import { format } from 'date-fns';
import { COLORES } from '../assets/estilos';
import { obtenerMantenimientosOffline, actualizarMantenimientoOffline } from '../servicio/offline-storage';
import { validarFirmaInforme } from '../servicio/verificacionService';

const SignatureCanvas =
  Platform.OS !== 'web' ? require('react-native-signature-canvas').default : () => null;

export default function CompletarFirmas({ navigation, route }) {
  const { informe, mantenimientoId } = route.params;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [datosInforme, setDatosInforme] = useState(null);
  const [rolUsuario, setRolUsuario] = useState(null);
  const [usuarioVerificado, setUsuarioVerificado] = useState(false);
  const [validandoFirma, setValidandoFirma] = useState(false);
  const [firmaValidada, setFirmaValidada] = useState(false);
  const [resultadoValidacion, setResultadoValidacion] = useState(null);

  const [firmas, setFirmas] = useState({
    firma_mantenedor: null,
    firma_supervisor: null,
    firma_a_calidad_dgm: null,
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

  useEffect(() => {
    cargarInformeExistente();
    cargarNombreUsuario();
  }, []);

  const cargarNombreUsuario = async () => {
    try {
      const usuarioActual = auth.currentUser;
      if (usuarioActual) {
        const uid = usuarioActual.uid;
        const docRef = doc(db, 'Usuario', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const datosUsuario = docSnap.data();
          const nombreCompleto = datosUsuario.nombre || datosUsuario.displayName || '';
          const rol = datosUsuario.rol;

          setRolUsuario(rol);

          // Verificar si el usuario tiene verificación de identidad
          const verificacion = datosUsuario.verificacion;
          if (verificacion && verificacion.estado === 'verificado') {
            setUsuarioVerificado(true);
          } else {
            setUsuarioVerificado(false);
          }

          if (nombreCompleto && rol) {
            let roleKey = '';
            if (rol === 'mantenedor') roleKey = 'nombre_mantenedor';
            else if (rol === 'supervisor') roleKey = 'nombre_supervisor';
            else if (rol === 'crl_calidad') roleKey = 'nombre_calidad';

            if (roleKey) {
              setNombres(prev => ({
                ...prev,
                [roleKey]: nombreCompleto
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar nombre del usuario:', error);
    }
  };

  const cargarInformeExistente = async () => {
    try {
      setCargando(true);
      const mantenimientoRef = doc(db, 'planificacion', informe.id, 'mantenimientos', mantenimientoId);
      const mantenimientoSnap = await getDoc(mantenimientoRef);

      if (mantenimientoSnap.exists()) {
        const data = mantenimientoSnap.data();
        // Inicializar datosInforme con los datos del mantenimiento
        let datosCompletos = { ...data };

        if (data.informeId) {
          const informeRef = doc(db, 'informePreventivo', data.informeId);
          const informeSnap = await getDoc(informeRef);

          if (informeSnap.exists()) {
            const informeData = informeSnap.data();
            setFirmas(informeData.firmas || {});
            setNombres(prev => ({
              ...prev,
              ...informeData.nombres
            }));

            // MERGE: Combinar datos del mantenimiento con los del informe preventivo
            // Priorizar datos del informe preventivo (respuestas, evidencias, etc.)
            datosCompletos = {
              ...datosCompletos,
              ...informeData
            };
          }
        }
        setDatosInforme(datosCompletos);
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
      console.error(`Error subiendo ${nombre}: `, error);
      return null;
    }
  };

  const roles = ['mantenedor', 'supervisor', 'calidad'];

  const getFirmaKey = (rol) => {
    return rol === 'calidad' ? 'firma_a_calidad_dgm' : `firma_${rol} `;
  };

  const getNombreKey = (rol) => {
    return `nombre_${rol} `;
  };

  const manejarFirma = (signature, rol) => {
    const key = getFirmaKey(rol);
    let dataUri;
    if (signature.startsWith('data:image')) {
      dataUri = signature;
    } else {
      dataUri = `data: image / png; base64, ${signature} `;
    }
    setFirmas({ ...firmas, [key]: dataUri });
    console.log(`✅ Firma guardada para ${rol} `);

    // Resetear validación al firmar de nuevo
    setFirmaValidada(false);
    setResultadoValidacion(null);
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
      setFirmaValidada(false);
      setResultadoValidacion(null);
    }
  };

  const validarFirmaUsuario = async (rol) => {
    const firmaKey = getFirmaKey(rol);
    const firmaActual = firmas[firmaKey];

    if (!firmaActual) {
      Alert.alert('Error', 'Primero debes firmar en el canvas');
      return;
    }

    if (!usuarioVerificado) {
      Alert.alert(
        'Verificación Requerida',
        'Debes verificar tu identidad en tu perfil antes de poder validar tu firma.',
        [{ text: 'OK' }]
      );
      return;
    }

    setValidandoFirma(true);

    try {
      console.log('🔍 Validando firma...');
      const resultado = await validarFirmaInforme(firmaActual);

      if (resultado.success) {
        setResultadoValidacion(resultado.resultado);

        if (resultado.resultado.esValida) {
          setFirmaValidada(true);
          Alert.alert(
            '✅ Firma Válida',
            `Tu firma coincide con la registrada.\nSimilitud: ${resultado.resultado.similitud}% `,
            [{ text: 'Continuar' }]
          );
        } else {
          setFirmaValidada(false);
          Alert.alert(
            '❌ Firma No Válida',
            `Tu firma no coincide con la registrada.\nSimilitud: ${resultado.resultado.similitud}%\nRequerido: ${resultado.resultado.umbral}%\n\nPor favor, intenta firmar de nuevo.`,
            [{ text: 'Reintentar' }]
          );
        }
      } else {
        throw new Error(resultado.error || 'Error en validación');
      }
    } catch (error) {
      console.error('❌ Error validando firma:', error);
      Alert.alert(
        'Error',
        'No se pudo validar la firma. ' + error.message,
        [{ text: 'OK' }]
      );
    } finally {
      setValidandoFirma(false);
    }
  };

  const guardarFirmasFaltantes = async () => {
    // Validar que la firma esté validada si el usuario está verificado
    if (usuarioVerificado && !firmaValidada) {
      Alert.alert(
        'Validación Requerida',
        'Debes validar tu firma antes de guardar.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setGuardando(true);

      // Verificar si existe en offline storage
      const mantenimientosOffline = await obtenerMantenimientosOffline();
      const enOffline = mantenimientosOffline.find(m => m.mantenimientoId === mantenimientoId);

      if (enOffline) {
        console.log("📴 Actualizando registro en almacenamiento offline...");

        const firmasRequeridas = ['firma_mantenedor', 'firma_supervisor', 'firma_a_calidad_dgm'];
        const faltanFirmas = firmasRequeridas.some(key => !firmas[key]);
        const nuevoEstado = faltanFirmas ? "Faltante de firmas" : "Completado";

        const mantenimientoActualizado = {
          ...enOffline,
          firmas: firmas,
          nombres: nombres,
          estado: nuevoEstado,
          fechaCompletado: nuevoEstado === "Completado" ? format(new Date(), 'yyyy-MM-dd') : enOffline.fechaCompletado
        };

        await actualizarMantenimientoOffline(mantenimientoActualizado);

        Alert.alert(
          'Guardado Offline',
          `Firmas guardadas localmente.\nEstado: ${nuevoEstado} \nSe sincronizará cuando tengas conexión.`,
          [{ text: 'OK', onPress: () => navigation.navigate('InicioMantenedor') }]
        );
        return;
      }

      // Flujo Online Normal
      const urlsFirmas = { ...firmas };
      for (const [key, dataUri] of Object.entries(firmas)) {
        if (dataUri && dataUri.startsWith('data:image')) {
          const urlCloudinary = await uploadDataUri(dataUri, key);
          urlsFirmas[key] = urlCloudinary || dataUri;
        }
      }

      const firmasRequeridas = ['firma_mantenedor', 'firma_supervisor', 'firma_a_calidad_dgm'];
      const faltanFirmas = firmasRequeridas.some(key => !urlsFirmas[key]);
      const nuevoEstado = faltanFirmas ? "Faltante de firmas" : "Completado";

      if (datosInforme.informeId) {
        const informeRef = doc(db, 'informePreventivo', datosInforme.informeId);
        await updateDoc(informeRef, {
          firmas: urlsFirmas,
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
        `Firmas actualizadas correctamente.\nEstado: ${nuevoEstado} `,
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
    <View style={estilos.contenedorPrincipal}>
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
        scrollEnabled={scrollEnabled}
      >
        <View style={estilos.infoEquipo}>
          <Text style={estilos.textoInfo}>Equipo: {informe.equipo}</Text>
          <Text style={estilos.textoInfo}>Código SGS: {informe.codigo_sgs}</Text>
        </View>

        {/* --- DETALLES DEL INFORME (PREGUNTAS Y RESPUESTAS) --- */}
        {datosInforme && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' }}>Detalles del Informe</Text>

            {/* Pauta */}
            {(() => {
              let respuestasArray = [];
              if (datosInforme.respuestas) {
                if (Array.isArray(datosInforme.respuestas)) {
                  respuestasArray = datosInforme.respuestas;
                } else {
                  respuestasArray = Object.values(datosInforme.respuestas).filter(r => r && r.pregunta);
                }
              }

              if (respuestasArray.length === 0) return null;

              return respuestasArray.map((item, index) => (
                <View key={index} style={{ backgroundColor: '#f9f9f9', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#eee' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ flex: 1, fontSize: 14, color: '#333' }}>{item.pregunta}</Text>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8, minWidth: 40, alignItems: 'center',
                      backgroundColor: item.respuesta === 'Sí' || item.respuesta === 'Si' ? '#27ae60' :
                        item.respuesta === 'No' ? '#e74c3c' : '#95a5a6'
                    }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{item.respuesta}</Text>
                    </View>
                  </View>

                  {item.pregunta === 'Otros' && item.otros && Array.isArray(item.otros) && (
                    <View style={{ marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#ddd' }}>
                      {item.otros.map((accion, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                          <Text style={{ flex: 1, fontSize: 13, color: '#555' }}>• {accion.accion}</Text>
                          <Text style={{
                            fontSize: 12, fontWeight: 'bold', color:
                              accion.respuesta === 'Sí' || accion.respuesta === 'Si' ? '#27ae60' :
                                accion.respuesta === 'No' ? '#e74c3c' : '#95a5a6'
                          }}>
                            {accion.respuesta}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ));
            })()}

            {/* Evidencias */}
            {(() => {
              const imagenes = datosInforme.evidencias || datosInforme.imagenes || [];
              if (imagenes.length === 0) return (
                <Text style={{ color: '#777', fontStyle: 'italic', marginTop: 10 }}>No hay evidencias adjuntas.</Text>
              );

              return (
                <View style={{ marginTop: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#555' }}>Evidencias ({imagenes.length})</Text>
                  {imagenes.map((url, index) => (
                    <View key={index} style={{ marginBottom: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 5 }}>
                      <Text style={{ fontSize: 12, color: '#666', marginBottom: 5, marginLeft: 2 }}>Evidencia {index + 1}</Text>
                      <Image
                        source={{ uri: url }}
                        style={{ width: '100%', height: 200, borderRadius: 8, backgroundColor: '#eee' }}
                        resizeMode="contain"
                      />
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}
        {/* --- FIN DETALLES DEL INFORME --- */}

        {roles.map((rol, i) => {
          // Filtrar para mostrar solo el bloque correspondiente al rol del usuario
          let userRoleMapped = rolUsuario;
          if (rolUsuario === 'crl_calidad') userRoleMapped = 'calidad';

          // Si el rol del usuario no coincide con el bloque actual, no renderizarlo
          if (userRoleMapped && userRoleMapped !== rol) return null;

          const firmaKey = getFirmaKey(rol);
          const yaFirmado = firmas[firmaKey] && firmas[firmaKey].startsWith('http');

          return (
            <View key={i} style={estilos.bloqueFirma}>
              <View style={estilos.headerRol}>
                <Text style={estilos.rolTexto}>{capitalizar(rol)}</Text>
                {yaFirmado && (
                  <View style={estilos.badgeYaFirmado}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={estilos.textoYaFirmado}>Ya firmado</Text>
                  </View>
                )}
              </View>

              <TextInput
                style={[estilos.inputNombre, yaFirmado && estilos.inputDeshabilitado]}
                placeholder={`Nombre completo del ${capitalizar(rol)} `}
                value={nombres[getNombreKey(rol)]}
                onChangeText={(texto) =>
                  setNombres({ ...nombres, [getNombreKey(rol)]: texto })
                }
                editable={!yaFirmado}
              />

              <View style={estilos.contenedorFirma}>
                <View style={[
                  estilos.cajaFirma,
                  yaFirmado && estilos.cajaFirmaDeshabilitada,
                  firmaValidada && { borderColor: '#28a745' },
                  resultadoValidacion && !resultadoValidacion.esValida && { borderColor: '#dc3545' }
                ]}>
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
                      onEmpty={() => console.log(`Canvas vacío: ${rol} `)}
                      onBegin={() => setScrollEnabled(false)}
                      onEnd={() => setScrollEnabled(true)}
                      descriptionText="Firme aquí"
                      clearText="Limpiar"
                      confirmText="Guardar"
                      webStyle={`
  .m - signature - pad {
  box - shadow: none;
  border: none;
  margin: 0;
}
                        .m - signature - pad--body {
  border: none;
  margin: 0;
}
                        .m - signature - pad--footer {
  display: none;
}
body, html {
  margin: 0;
  padding: 0;
  width: 100 %;
  height: 100 %;
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

                {/* Botón de validación */}
                {!yaFirmado && usuarioVerificado && firmas[firmaKey] && (
                  <TouchableOpacity
                    onPress={() => validarFirmaUsuario(rol)}
                    disabled={validandoFirma}
                    style={{
                      backgroundColor: firmaValidada ? '#28a745' : '#007bff',
                      padding: 12,
                      borderRadius: 6,
                      marginTop: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {validandoFirma ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name={firmaValidada ? 'checkmark-circle' : 'finger-print'}
                          size={18}
                          color="#fff"
                        />
                        <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>
                          {firmaValidada ? 'Firma Validada ✓' : 'Validar Firma'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Resultado de validación */}
                {!yaFirmado && resultadoValidacion && (
                  <View style={{
                    marginTop: 8,
                    padding: 10,
                    backgroundColor: resultadoValidacion.esValida ? '#d4edda' : '#f8d7da',
                    borderRadius: 6,
                  }}>
                    <Text style={{
                      color: resultadoValidacion.esValida ? '#155724' : '#721c24',
                      fontSize: 12,
                      textAlign: 'center',
                    }}>
                      Similitud: {resultadoValidacion.similitud}% | Requerido: {resultadoValidacion.umbral}%
                    </Text>
                  </View>
                )}

                {firmas[firmaKey] && !yaFirmado && (
                  <View style={estilos.indicadorGuardado}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={estilos.textoGuardado}>Firma guardada</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={[estilos.botonFinalizar, (guardando || (usuarioVerificado && !firmaValidada)) && estilos.botonDeshabilitado]}
          onPress={guardarFirmasFaltantes}
          disabled={guardando || (usuarioVerificado && !firmaValidada)}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.textoBotonFinalizar}>
              {usuarioVerificado && !firmaValidada ? 'Valida tu firma para guardar' : 'Guardar firmas'}
            </Text>
          )}
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
  contenedorCargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoEquipo: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textoInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  bloqueFirma: {
    marginBottom: 30,
    marginTop: 16,
  },
  headerRol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rolTexto: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  badgeYaFirmado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  textoYaFirmado: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  inputDeshabilitado: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  contenedorFirma: {
    width: '100%',
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
    backgroundColor: '#666',
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
    marginTop: 8,
  },
  textoGuardado: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
