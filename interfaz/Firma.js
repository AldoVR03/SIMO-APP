import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../assets/estilos';
import { auth, db } from '../servicio/firebase-config';
import { doc, getDoc } from 'firebase/firestore';

// Importar servicio de validación de firmas
import { validarFirmaInforme } from '../servicio/verificacionService';

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
    mantenimientoId,
  } = route?.params || {};

  // Solo firma del mantenedor
  const [firma, setFirma] = useState(null);
  const [nombreMantenedor, setNombreMantenedor] = useState('');

  const [validandoFirma, setValidandoFirma] = useState(false);
  const [firmaValidada, setFirmaValidada] = useState(false);
  const [resultadoValidacion, setResultadoValidacion] = useState(null);
  const [usuarioVerificado, setUsuarioVerificado] = useState(false);

  const canvasRef = useRef();
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Cargar nombre del usuario y verificar si tiene verificación de identidad
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      try {
        const usuarioActual = auth.currentUser;
        if (usuarioActual) {
          const uid = usuarioActual.uid;
          console.log('📋 Cargando datos del usuario:', uid);

          const docRef = doc(db, 'Usuario', uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const datosUsuario = docSnap.data();
            const nombre = datosUsuario.nombre || datosUsuario.displayName || '';

            if (nombre) {
              setNombreMantenedor(nombre);
              console.log('✅ Nombre del mantenedor cargado:', nombre);
            }

            // Verificar si el usuario tiene verificación de identidad
            const verificacion = datosUsuario.verificacion;
            if (verificacion && verificacion.estado === 'verificado') {
              setUsuarioVerificado(true);
              console.log('✅ Usuario verificado, umbral:', verificacion.umbralSimilitud);
            } else {
              setUsuarioVerificado(false);
              console.log('⚠️ Usuario NO verificado');
            }
          } else {
            console.log('⚠️ No se encontró documento del usuario en Firestore');
          }
        } else {
          console.log('⚠️ No hay usuario autenticado');
        }
      } catch (error) {
        console.error('❌ Error al cargar datos del usuario:', error);
      }
    };

    cargarDatosUsuario();
  }, []);

  const manejarFirma = (signature) => {
    let dataUri;
    if (signature.startsWith('data:image')) {
      dataUri = signature;
    } else {
      dataUri = `data:image/png;base64,${signature}`;
    }

    setFirma(dataUri);
    console.log('✅ Firma guardada');

    // Resetear validación cuando se firma de nuevo
    setFirmaValidada(false);
    setResultadoValidacion(null);
  };

  const guardarFirma = () => {
    if (canvasRef.current && canvasRef.current.readSignature) {
      canvasRef.current.readSignature();
    } else {
      Alert.alert('Error', 'No se pudo guardar la firma');
    }
  };

  const limpiarFirma = () => {
    if (canvasRef.current && canvasRef.current.clearSignature) {
      canvasRef.current.clearSignature();
      setFirma(null);
      setFirmaValidada(false);
      setResultadoValidacion(null);
      console.log('🗑️ Firma limpiada');
    }
  };

  // Validar firma del mantenedor contra las de referencia
  const validarFirmaMantenedor = async () => {
    if (!firma) {
      Alert.alert('Error', 'Primero debes firmar en el canvas');
      return;
    }

    if (!usuarioVerificado) {
      Alert.alert(
        'Verificación Requerida',
        'Debes verificar tu identidad en tu perfil antes de poder validar tu firma.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ir a Perfil',
            onPress: () => navigation.navigate('PerfilMantenedor')
          }
        ]
      );
      return;
    }

    setValidandoFirma(true);

    try {
      console.log('🔍 Validando firma del mantenedor...');
      const resultado = await validarFirmaInforme(firma);

      if (resultado.success) {
        setResultadoValidacion(resultado.resultado);

        if (resultado.resultado.esValida) {
          setFirmaValidada(true);
          Alert.alert(
            '✅ Firma Válida',
            `Tu firma coincide con la registrada.\nSimilitud: ${resultado.resultado.similitud}%`,
            [{ text: 'Continuar' }]
          );
        } else {
          setFirmaValidada(false);
          Alert.alert(
            '❌ Firma No Válida',
            `Tu firma no coincide con la registrada.\nSimilitud: ${resultado.resultado.similitud}%\nRequerido: ${resultado.resultado.umbral}%\n\nPor favor, intenta firmar de nuevo de manera similar a como lo hiciste durante la calibración.`,
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

  const navegarAResumen = () => {
    // Validar que la firma esté presente
    if (!firma) {
      Alert.alert(
        'Firma requerida',
        'Debes firmar antes de continuar.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    // Si el usuario está verificado, la firma debe estar validada
    if (usuarioVerificado && !firmaValidada) {
      Alert.alert(
        'Validación requerida',
        'Debes validar tu firma antes de continuar. Presiona el botón "Validar Firma".',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    console.log('📤 Navegando a InformeResumen con mantenimientoId:', mantenimientoId);

    // Preparar objeto de firmas (solo mantenedor por ahora)
    const firmas = {
      firma_mantenedor: firma,
      firma_supervisor: null,
      firma_a_calidad_dgm: null,
    };

    const nombres = {
      nombre_mantenedor: nombreMantenedor,
      nombre_supervisor: '',
      nombre_calidad: '',
    };

    navigation.navigate('InformeResumen', {
      informe,
      respuestas,
      imagenes,
      firmas,
      nombres,
      mantenimientoId,
      firmaValidada: firmaValidada,
      similitudFirma: resultadoValidacion?.similitud || null,
    });
  };

  return (
    <View style={estilos.contenedorPrincipal}>
      {/* Header */}
      <View style={estilos.header}>
        <TouchableOpacity
          style={estilos.botonVolver}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={estilos.titulo}>Firma del Mantenedor</Text>
      </View>

      <ScrollView
        style={estilos.scrollContenido}
        contentContainerStyle={estilos.contenedorContenido}
        scrollEnabled={scrollEnabled}
      >
        {/* Información del equipo */}
        <View style={estilos.infoEquipo}>
          <Text style={estilos.equipoNombre}>{informe.equipo || equipo}</Text>
          <Text style={estilos.equipoCodigo}>{informe.codigo_sgs || 'Sin código'}</Text>
        </View>

        {/* Banner de verificación */}
        {usuarioVerificado ? (
          <View style={[estilos.bannerVerificacion, { backgroundColor: '#d4edda' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#155724" />
            <Text style={[estilos.bannerTexto, { color: '#155724' }]}>
              Identidad verificada - Se validará tu firma
            </Text>
          </View>
        ) : (
          <View style={[estilos.bannerVerificacion, { backgroundColor: '#fff3cd' }]}>
            <Ionicons name="warning" size={20} color="#856404" />
            <Text style={[estilos.bannerTexto, { color: '#856404' }]}>
              Identidad no verificada - Verifica en tu perfil
            </Text>
          </View>
        )}

        {/* Nombre del mantenedor */}
        <View style={estilos.campoNombre}>
          <Text style={estilos.etiquetaNombre}>Tu nombre:</Text>
          <TextInput
            style={estilos.inputNombre}
            value={nombreMantenedor}
            onChangeText={setNombreMantenedor}
            placeholder="Nombre completo"
            placeholderTextColor="#999"
          />
        </View>

        {/* Canvas de firma */}
        <View style={estilos.contenedorFirma}>
          <Text style={estilos.tituloFirma}>Dibuja tu firma:</Text>

          <View style={[
            estilos.cajaFirma,
            firma && { borderColor: firmaValidada ? '#27ae60' : COLORES.primario },
            !firma && { borderStyle: 'dashed' }
          ]}>
            {Platform.OS !== 'web' ? (
              <SignatureCanvas
                ref={canvasRef}
                onOK={manejarFirma}
                onEmpty={() => Alert.alert('Firma vacía', 'Por favor dibuja tu firma')}
                onBegin={() => setScrollEnabled(false)}
                onEnd={() => setScrollEnabled(true)}
                descriptionText=""
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

          {/* Botones del canvas */}
          {Platform.OS !== 'web' && (
            <View style={estilos.botonesCanvas}>
              <TouchableOpacity
                onPress={guardarFirma}
                style={[estilos.botonCanvas, estilos.botonGuardar]}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={estilos.textoBotonCanvas}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={limpiarFirma}
                style={[estilos.botonCanvas, estilos.botonLimpiar]}
              >
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={estilos.textoBotonCanvas}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Indicador de firma guardada */}
          {firma && (
            <View style={estilos.indicadorGuardado}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={estilos.textoGuardado}>Firma capturada</Text>
            </View>
          )}

          {/* Botón de validación (solo si está verificado) */}
          {usuarioVerificado && firma && (
            <TouchableOpacity
              onPress={validarFirmaMantenedor}
              disabled={validandoFirma}
              style={{
                backgroundColor: firmaValidada ? '#28a745' : '#007bff',
                padding: 14,
                borderRadius: 8,
                marginTop: 12,
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
                    size={20}
                    color="#fff"
                  />
                  <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 15 }}>
                    {firmaValidada ? 'Firma Validada ✓' : 'Validar mi Firma'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Resultado de validación */}
          {resultadoValidacion && (
            <View style={{
              marginTop: 10,
              padding: 12,
              backgroundColor: resultadoValidacion.esValida ? '#d4edda' : '#f8d7da',
              borderRadius: 8,
            }}>
              <Text style={{
                color: resultadoValidacion.esValida ? '#155724' : '#721c24',
                fontSize: 13,
                textAlign: 'center',
                fontWeight: '600',
              }}>
                Similitud: {resultadoValidacion.similitud}% | Requerido: {resultadoValidacion.umbral}%
              </Text>
            </View>
          )}
        </View>

        {/* Nota informativa */}
        <View style={estilos.notaInfo}>
          <Ionicons name="information-circle" size={20} color="#17a2b8" />
          <Text style={estilos.notaTexto}>
            Tu firma será revisada y firmada posteriormente por el Supervisor y Control de Calidad de Codelco.
          </Text>
        </View>

        {/* Botón finalizar */}
        <TouchableOpacity
          style={[
            estilos.botonFinalizar,
            (!firma || (usuarioVerificado && !firmaValidada)) && { backgroundColor: '#ccc' }
          ]}
          onPress={navegarAResumen}
          disabled={!firma || (usuarioVerificado && !firmaValidada)}
        >
          <Ionicons name="arrow-forward" size={20} color="#fff" />
          <Text style={estilos.textoBotonFinalizar}>
            {!firma
              ? 'Primero firma arriba'
              : (usuarioVerificado && !firmaValidada)
                ? 'Valida tu firma primero'
                : 'Continuar al Resumen'
            }
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  botonVolver: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 10,
    padding: 4,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContenido: {
    flex: 1,
  },
  contenedorContenido: {
    padding: 20,
    paddingBottom: 40,
  },
  infoEquipo: {
    backgroundColor: COLORES.primario,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  equipoNombre: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  equipoCodigo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  bannerVerificacion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  bannerTexto: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  campoNombre: {
    marginBottom: 16,
  },
  etiquetaNombre: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  inputNombre: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#333',
  },
  contenedorFirma: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tituloFirma: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  cajaFirma: {
    height: 200,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  textoWeb: {
    textAlign: 'center',
    marginTop: 80,
    color: '#999',
  },
  botonesCanvas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  botonCanvas: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  botonGuardar: {
    backgroundColor: COLORES.primario,
  },
  botonLimpiar: {
    backgroundColor: '#6c757d',
  },
  textoBotonCanvas: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  indicadorGuardado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  textoGuardado: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  notaInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e7f5ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  notaTexto: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#17a2b8',
    lineHeight: 18,
  },
  botonFinalizar: {
    backgroundColor: COLORES.primario,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonFinalizar: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
});