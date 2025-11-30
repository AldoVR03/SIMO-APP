import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import estilosComunes, { COLORES } from '../assets/estilos';
import { useConexionInternet } from '../servicio/network-service';

// Usar Firebase Storage en lugar de Cloudinary
import { procesarImagenParaStorage } from '../servicio/Storageservice';

export default function Evidencia({ navigation, route }) {
  console.log("Datos recibidos en Evidencia:", route.params);
  const { informe, respuestas, mantenimientoId } = route.params;

  const [imagenes, setImagenes] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Usar el hook para detección en tiempo real
  const { estaConectado } = useConexionInternet();

  const seleccionarImagen = async () => {
    if (imagenes.length >= 2) {
      Alert.alert('Límite alcanzado', 'Solo se permiten 2 evidencias.');
      return;
    }

    try {
      setCargando(true);

      // Abrir selector de archivos
      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('📁 Resultado DocumentPicker:', resultado);

      if (resultado.canceled) {
        setCargando(false);
        return;
      }

      // Verificar que sea una imagen
      const archivo = resultado.assets[0];
      if (!archivo.mimeType?.startsWith('image/')) {
        Alert.alert('Error', 'Por favor selecciona una imagen válida');
        setCargando(false);
        return;
      }

      console.log('📸 Procesando imagen:', archivo.uri);

      // Procesar imagen con Firebase Storage
      const imagenProcesada = await procesarImagenParaStorage(archivo.uri);

      if (imagenProcesada && imagenProcesada.url) {
        setImagenes([...imagenes, {
          url: imagenProcesada.url,
          tipo: imagenProcesada.tipo, // 'cloud' o 'local'
        }]);

        if (imagenProcesada.tipo === 'cloud') {
          Alert.alert('✅ Éxito', 'Imagen subida a Firebase Storage correctamente');
        } else {
          Alert.alert(
            '🔴 Modo Offline',
            'Imagen guardada localmente. Se subirá automáticamente cuando haya conexión.',
            [{ text: 'Entendido' }]
          );
        }
      } else {
        Alert.alert('Error', 'No se pudo procesar la imagen. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('❌ Error al seleccionar imagen:', error);
      Alert.alert('Error', 'Ocurrió un problema al seleccionar la imagen: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarImagen = (index) => {
    Alert.alert(
      'Eliminar evidencia',
      '¿Estás seguro de eliminar esta imagen?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const nuevasImagenes = imagenes.filter((_, i) => i !== index);
            setImagenes(nuevasImagenes);
          },
        },
      ]
    );
  };

  const navegarAFirma = () => {
    if (imagenes.length === 0) {
      Alert.alert(
        'Evidencia requerida',
        'Debes subir al menos una imagen como evidencia antes de continuar.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    // Extraer solo las URLs para pasar a Firma
    const urlsImagenes = imagenes.map(img => img.url);

    console.log('📤 Navegando a Firma con:', {
      imagenes: urlsImagenes,
      tipos: imagenes.map(img => img.tipo)
    });

    navigation.navigate('Firma', {
      equipo: informe?.equipo || "Equipo no definido",
      informe,
      respuestas,
      imagenes: urlsImagenes,
      mantenimientoId,
    });
  };

  return (
    <SafeAreaView style={[estilosComunes.contenedor, { backgroundColor: COLORES.fondo }]}>
      {/* Header */}
      <View style={estilosComunes.encabezado}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
        </TouchableOpacity>
        <Text style={estilosComunes.logoTexto}>Evidencia</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Indicador de conexión */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: estaConectado ? '#d4edda' : '#fff3cd',
        borderRadius: 8,
        marginHorizontal: 20,
        marginBottom: 10,
      }}>
        <Ionicons
          name={estaConectado ? 'cloud-done' : 'cloud-offline'}
          size={20}
          color={estaConectado ? '#155724' : '#856404'}
        />
        <Text style={{
          marginLeft: 8,
          color: estaConectado ? '#155724' : '#856404',
          fontWeight: 'bold',
          fontSize: 12,
        }}>
          {estaConectado ? 'Conectado - Firebase Storage' : 'Modo Offline'}
        </Text>
      </View>

      {/* Título */}
      <Text style={estilosComunes.titulo}>Agregar Evidencias</Text>
      <Text style={[estilosComunes.etiqueta, { textAlign: 'center', marginBottom: 20 }]}>
        Sube hasta 2 imágenes como evidencia del mantenimiento
        {!estaConectado && '\n(Se guardarán localmente y subirán después)'}
      </Text>

      {/* Área de imágenes */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, paddingHorizontal: 20 }}>
        {[...Array(2)].map((_, i) => (
          <TouchableOpacity
            key={i}
            style={{
              width: '48%',
              height: 200,
              borderWidth: 2,
              borderColor: COLORES.borde,
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#fafafa',
              borderStyle: imagenes[i] ? 'solid' : 'dashed',
              opacity: cargando ? 0.5 : 1,
            }}
            onPress={() => {
              if (imagenes[i]) {
                eliminarImagen(i);
              } else {
                seleccionarImagen();
              }
            }}
            disabled={cargando || (!imagenes[i] && imagenes.length >= 2)}
          >
            {imagenes[i] ? (
              <>
                <Image
                  source={{ uri: imagenes[i].url }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8
                  }}
                  resizeMode="cover"
                />
                {/* Indicador de tipo de imagen */}
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    backgroundColor: imagenes[i].tipo === 'cloud'
                      ? 'rgba(40, 167, 69, 0.9)'
                      : 'rgba(255, 193, 7, 0.9)',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    {imagenes[i].tipo === 'cloud' ? '☁️ Storage' : '📱 Local'}
                  </Text>
                </View>
                {/* Botón eliminar */}
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                    borderRadius: 15,
                    width: 30,
                    height: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="trash" size={16} color="#fff" />
                </View>
              </>
            ) : (
              <>
                <Ionicons
                  name="document-attach"
                  size={40}
                  color={imagenes.length >= 2 ? '#ccc' : COLORES.primario}
                />
                <Text style={{
                  marginTop: 8,
                  color: imagenes.length >= 2 ? '#ccc' : '#666',
                  fontSize: 12,
                  textAlign: 'center',
                  paddingHorizontal: 10,
                }}>
                  {cargando
                    ? 'Procesando...'
                    : imagenes.length >= 2
                      ? 'Límite alcanzado'
                      : 'Seleccionar archivo'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Indicador de carga */}
      {cargando && (
        <View style={{
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <ActivityIndicator size="large" color={COLORES.primario} />
          <Text style={{
            marginTop: 10,
            textAlign: 'center',
            color: COLORES.primario,
            fontWeight: 'bold'
          }}>
            {estaConectado ? 'Subiendo a Firebase Storage...' : 'Guardando imagen localmente...'}
          </Text>
        </View>
      )}

      {/* Resumen de imágenes */}
      {imagenes.length > 0 && (
        <View style={{
          marginHorizontal: 20,
          marginBottom: 20,
          padding: 12,
          backgroundColor: '#f8f9fa',
          borderRadius: 8,
        }}>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            {imagenes.length} de 2 imágenes agregadas
          </Text>
          {!estaConectado && imagenes.some(img => img.tipo === 'local') && (
            <Text style={{
              fontSize: 12,
              color: '#856404',
              textAlign: 'center',
              marginTop: 4,
            }}>
              ⚠️ Algunas imágenes se subirán cuando haya conexión
            </Text>
          )}
        </View>
      )}

      {/* Botón continuar */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <TouchableOpacity
          style={[
            estilosComunes.boton,
            (imagenes.length === 0 || cargando) && { backgroundColor: '#ccc' }
          ]}
          onPress={navegarAFirma}
          disabled={imagenes.length === 0 || cargando}
        >
          <Text style={estilosComunes.textoBoton}>
            {cargando ? 'Procesando...' : 'Continuar a Firmas'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}