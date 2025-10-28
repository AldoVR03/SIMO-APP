import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function EvidenciasCorrectivo({ route, navigation }) {
  const { datosInforme, procesosRealizados, observaciones } = route.params;

  const [evidencias, setEvidencias] = useState([]);
  const [descripcionActual, setDescripcionActual] = useState('');
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  const tomarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        setImagenSeleccionada(resultado.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
    }
  };

  const seleccionarDeGaleria = async () => {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
        setImagenSeleccionada(resultado.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
    }
  };

  const agregarEvidencia = () => {
    if (!imagenSeleccionada || !descripcionActual.trim()) {
      return;
    }

    const evidencia = {
      uri: imagenSeleccionada,
      descripcion: descripcionActual,
      id: Date.now().toString(),
    };

    setEvidencias(prev => [...prev, evidencia]);
    setDescripcionActual('');
    setImagenSeleccionada(null);
  };

  const eliminarEvidencia = (id) => {
    setEvidencias(prev => prev.filter(e => e.id !== id));
  };

  const continuarSiguiente = () => {
    if (evidencias.length === 0) {
      return;
    }

    navigation.navigate('ResumenCorrectivo', {
      datosInforme,
      procesosRealizados,
      observaciones,
      evidencias,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={estilosComunes.encabezado}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
        </TouchableOpacity>
        <Text style={[estilosComunes.titulo, { margin: 0 }]}>
          Evidencias
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16 }}
      >
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
          Agrega fotografías como evidencia del mantenimiento realizado (requerido)
        </Text>

        <View style={styles.contenedorFormulario}>
          <Text style={estilosComunes.etiqueta}>Capturar/Seleccionar Imagen</Text>
          
          <View style={styles.botonesImagen}>
            <TouchableOpacity
              style={styles.botonIcono}
              onPress={tomarFoto}
            >
              <Ionicons name="camera" size={32} color={COLORES.primario} />
              <Text style={styles.textoBotonIcono}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonIcono}
              onPress={seleccionarDeGaleria}
            >
              <Ionicons name="image" size={32} color={COLORES.primario} />
              <Text style={styles.textoBotonIcono}>Galería</Text>
            </TouchableOpacity>
          </View>

          {imagenSeleccionada && (
            <View style={styles.vistaPrevia}>
              <Image
                source={{ uri: imagenSeleccionada }}
                style={styles.imagenPrevia}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.botonEliminarPrevia}
                onPress={() => setImagenSeleccionada(null)}
              >
                <Ionicons name="close-circle" size={28} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          )}

          <Text style={estilosComunes.etiqueta}>Descripción de la evidencia</Text>
          <TextInput
            style={[
              estilosComunes.entrada,
              { 
                height: 100, 
                textAlignVertical: 'top',
                paddingTop: 10,
              }
            ]}
            value={descripcionActual}
            onChangeText={setDescripcionActual}
            placeholder="Describe qué se muestra en la imagen..."
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[
              estilosComunes.boton, 
              { 
                backgroundColor: imagenSeleccionada && descripcionActual.trim() ? COLORES.primario : '#ccc',
                flexDirection: 'row',
              }
            ]}
            onPress={agregarEvidencia}
            disabled={!imagenSeleccionada || !descripcionActual.trim()}
          >
            <Ionicons 
              name="add-circle" 
              size={20} 
              color="#fff" 
              style={{ marginRight: 8 }} 
            />
            <Text style={estilosComunes.textoBoton}>
              Agregar Evidencia
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 12 }}>
          Evidencias Agregadas ({evidencias.length})
        </Text>

        {evidencias.length === 0 ? (
          <View style={styles.mensajeVacio}>
            <Ionicons name="images-outline" size={50} color="#ccc" />
            <Text style={{ color: '#666', textAlign: 'center', marginTop: 10 }}>
              No hay evidencias agregadas aún
            </Text>
            <Text style={{ color: '#e74c3c', textAlign: 'center', marginTop: 5, fontSize: 12 }}>
              * Se requiere al menos una evidencia
            </Text>
          </View>
        ) : (
          evidencias.map((evidencia, index) => (
            <View 
              key={evidencia.id}
              style={styles.tarjetaEvidencia}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="image" size={16} color={COLORES.primario} />
                  <Text style={{ fontWeight: 'bold', fontSize: 12, color: '#999', marginLeft: 6 }}>
                    Evidencia {index + 1}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => eliminarEvidencia(evidencia.id)}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="trash" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
              
              <Image
                source={{ uri: evidencia.uri }}
                style={styles.imagenEvidencia}
                resizeMode="cover"
              />
              
              <Text style={{ fontSize: 13, color: '#333', lineHeight: 18, marginTop: 8 }}>
                {evidencia.descripcion}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[
            estilosComunes.boton, 
            { 
              backgroundColor: evidencias.length > 0 ? COLORES.primario : '#ccc', 
              marginTop: 20,
              flexDirection: 'row',
              
            },
            
          ]}
          onPress={continuarSiguiente}
          disabled={evidencias.length === 0}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={20} 
            color="#fff" 
            style={{ marginRight: 8 }} 
          />
          <Text style={estilosComunes.textoBoton}>
            Continuar al Resumen
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedorFormulario: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  botonesImagen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  botonIcono: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORES.primario,
    width: '48%',
  },
  textoBotonIcono: {
    marginTop: 8,
    fontSize: 12,
    color: COLORES.texto,
    fontWeight: '600',
  },
  vistaPrevia: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagenPrevia: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  botonEliminarPrevia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  mensajeVacio: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  tarjetaEvidencia: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imagenEvidencia: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
});