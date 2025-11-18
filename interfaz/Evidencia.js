import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import estilosComunes, { COLORES } from '../assets/estilos';

const uploadToCloudinary = async (uri) => {
  const data = new FormData();
  data.append("file", {
    uri,
    type: "image/jpeg",
    name: "evidencia.jpg",
  });
  data.append("upload_preset", "SIMO-APP-Evidencia-Firma");

  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/due9nyqmr/image/upload", {
      method: "POST",
      body: data,
    });

    const json = await res.json();
    return json.secure_url;
  } catch (err) {
    console.error("Error subiendo a Cloudinary:", err);
    return null;
  }
};

export default function Evidencia({ navigation, route }) {
  console.log("Datos recibidos en Evidencia:", route.params);
  const { informe, respuestas, mantenimientoId } = route.params;
  const [imagenes, setImagenes] = useState([]);
  const [cargando, setCargando] = useState(false);

  // ✅ Usar DocumentPicker para seleccionar imágenes desde archivos
  const seleccionarImagen = async () => {
    if (imagenes.length >= 2) {
      Alert.alert('Límite alcanzado', 'Solo se permiten 2 evidencias.');
      return;
    }

    try {
      setCargando(true);

      // ✅ Abrir selector de archivos (no requiere permisos especiales)
      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'image/*', // Solo imágenes
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('Resultado DocumentPicker:', resultado);

      if (resultado.canceled) {
        setCargando(false);
        return;
      }

      // ✅ Verificar que sea una imagen
      const archivo = resultado.assets[0];
      if (!archivo.mimeType?.startsWith('image/')) {
        Alert.alert('Error', 'Por favor selecciona una imagen válida');
        setCargando(false);
        return;
      }

      // ✅ Subir a Cloudinary
      const cloudUrl = await uploadToCloudinary(archivo.uri);

      if (cloudUrl) {
        setImagenes([...imagenes, cloudUrl]);
        Alert.alert('Éxito', 'Imagen subida correctamente');
      } else {
        Alert.alert('Error', 'No se pudo subir la imagen. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'Ocurrió un problema al seleccionar la imagen.');
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

    navigation.navigate('Firma', {
      equipo: informe?.equipo || "Equipo no definido",
      informe,
      respuestas,
      imagenes,
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

      {/* Título */}
      <Text style={estilosComunes.titulo}>Agregar Evidencias</Text>
      <Text style={[estilosComunes.etiqueta, { textAlign: 'center', marginBottom: 20 }]}>
        Sube hasta 2 imágenes como evidencia del mantenimiento
      </Text>

      {/* Área de imágenes */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
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
                  source={{ uri: imagenes[i] }} 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: 8 
                  }} 
                />
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
                    ? 'Subiendo...' 
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
        <Text style={{ 
          textAlign: 'center', 
          color: COLORES.primario, 
          marginBottom: 10,
          fontWeight: 'bold' 
        }}>
          Subiendo imagen a la nube...
        </Text>
      )}

      {/* Botón continuar */}
      <TouchableOpacity
        style={[
          estilosComunes.boton,
          { marginTop: 'auto', marginBottom: 20 },
          (imagenes.length === 0 || cargando) && { backgroundColor: '#ccc' }
        ]}
        onPress={navegarAFirma}
        disabled={imagenes.length === 0 || cargando}
      >
        <Text style={estilosComunes.textoBoton}>
          {cargando ? 'Subiendo...' : 'Continuar a Firmas'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}