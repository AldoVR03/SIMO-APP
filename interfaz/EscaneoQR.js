import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORES } from '../assets/estilos';

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
  console.log("✅ Datos recibidos en Evidencia:", route.params);
  const { informe, respuestas, mantenimientoId } = route.params;
  const [imagenes, setImagenes] = useState([]);

  const seleccionarImagen = async () => {
    if (imagenes.length >= 2) {
      Alert.alert('Límite alcanzado', 'Solo se permiten 2 evidencias.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!resultado.canceled) {
      const uri = resultado.assets[0].uri;
      const cloudUrl = await uploadToCloudinary(uri);

      if (cloudUrl) {
        setImageenes([...imagenes, cloudUrl]);
      }
    }
  };

  const fechaActual = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <View style={estilos.contenedor}>
      <SafeAreaView style={estilos.contenedor}>
        <View style={estilos.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.backButton}>
            <Text style={estilos.flechaVolver}>←</Text>
          </TouchableOpacity>
          <Text style={estilos.titulo}>Evidencia</Text>
        </View>

        <View style={estilos.areaImagenes}>
          {[...Array(2)].map((_, i) => (
            <TouchableOpacity
              key={i}
              style={estilos.recuadro}
              onPress={seleccionarImagen}
              disabled={imagenes[i] ? true : imagenes.length >= 2}
            >
              {imagenes[i] ? (
                <Image source={{ uri: imagenes[i] }} style={estilos.imagen} />
              ) : (
                <>
                  <Ionicons name="add" size={40} color="#aaa" />
                  <Text style={estilos.textoAgregar}>Agregar evidencia</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={estilos.botonesInferiores}>
          <TouchableOpacity
            style={estilos.botonFirmar}
            onPress={() => {
              console.log('📤 Navegando a Firma con mantenimientoId:', mantenimientoId);
              navigation.navigate('Firma', {
                equipo: informe?.equipo || "Equipo no definido",
                informe,
                respuestas,
                imagenes,
                mantenimientoId, // ← CRÍTICO: Pasar mantenimientoId
              });
            }}
          >
            <Text style={estilos.textoBoton}>Ir a firmar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}


const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginBottom: 20,
  },
  backButton: {
    paddingRight: 12,
  },
  flechaVolver: {
    fontSize: 26,
    color: '#ff9900',
    fontWeight: 'bold',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  fecha: {
    fontSize: 14,
    color: '#666',
  },
  areaImagenes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  recuadro: {
    width: '48%',
    height: 180,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  textoAgregar: {
    marginTop: 8,
    color: '#888',
    fontSize: 12,
  },
  imagen: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  botonesInferiores: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  botonFirmar: {
    backgroundColor: COLORES.primario,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  textoBoton: {
    color: '#fff',
    fontWeight: 'bold',
  },
});