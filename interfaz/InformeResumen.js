import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { auth, db } from "../servicio/firebase-config"; // conexión firebase
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import uploadImage from "../servicio/cloudinary-config";

export default function InformeResumen({ route, navigation }) {
  // Desestructuración segura
  const {
    informe = {},
    respuestas = {},
    imagenes = [],
    firmas = {},
    respaldos = {},
  } = route?.params || {};

  // Guardar informe en Firebase
  const guardarInforme = async () => {
    try {
      const docRef = await addDoc(collection(db, "informePreventivo"), {
        equipo: informe.equipo || "Equipo no definido",
        id_interno: informe.id || "N/A",
        codigo_sgs: informe.codigo_sgs || "N/A",
        fecha: serverTimestamp(),
        respuestas: respuestas,
        evidencias: imagenes, 
        firmas: firmas,
        respaldos: respaldos,
        usuario: auth.currentUser ? auth.currentUser.email : "Anon",
      });

      Alert.alert("Éxito", "El informe se guardó correctamente en Firebase.");

      navigation.navigate("InicioMantenedor");

    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el informe en Firebase.");
    }
  };

  const fechaActual = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <SafeAreaView style={estilos.safeArea}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenedor}
      >
        <Text style={estilos.titulo}>Resumen del Informe</Text>

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Datos del equipo</Text>
          <Text style={estilos.textoItem}>Nombre: {informe.equipo || 'Equipo no definido'}</Text>
          <Text style={estilos.textoItem}>ID interno: {informe.id || 'N/A'}</Text>
          <Text style={estilos.textoItem}>Código SGS: {informe.codigo_sgs || 'N/A'}</Text>
          <Text style={estilos.textoItem}>Fecha: {fechaActual}</Text>
          <Text style={estilos.textoItem}>Estado: {informe.estado || 'N/A'}</Text>
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Respuestas del formulario</Text>
          {Object.entries(respuestas).length === 0 ? (
            <Text style={estilos.sinDatos}>No se ingresaron respuestas.</Text>
          ) : (
            Object.entries(respuestas).map(([index, respuesta], i) => (
              <View key={i} style={estilos.respuestaItem}>
                <Text style={estilos.pregunta}>
                  {parseInt(index) + 1}. {respuesta.pregunta}
                </Text>
                <Text style={estilos.respuesta}>
                  Respuesta: {respuesta.respuesta}
                </Text>
                {respuesta.otros && respuesta.otros.length > 0 && (
                  <>
                    <Text style={estilos.otrosTitulo}>Observaciones:</Text>
                    {respuesta.otros.map((item, idx) => (
                      <Text key={idx} style={estilos.otros}>• {item}</Text>
                    ))}
                  </>
                )}
              </View>
            ))
          )}
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Evidencia fotográfica</Text>
          {imagenes.length === 0 ? (
            <Text style={estilos.sinDatos}>No se subieron imágenes.</Text>
          ) : (
            imagenes.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={estilos.imagenEvidencia}
                resizeMode="cover"
              />
            ))
          )}
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Firmas y respaldos</Text>
          {['mantenedor', 'supervisor', 'calidad'].map((rol, i) => (
            <View key={i} style={estilos.firmaBloque}>
              <Text style={estilos.nombreRol}>
                {rol === "calidad" ? "A. Calidad DGM" : rol.charAt(0).toUpperCase() + rol.slice(1)}
              </Text>
              {/* Firma */}
              <View style={estilos.firmaContenedor}>
                {firmas[`firma_${rol}`] ? (
                  <Image
                    source={{ uri: firmas[`firma_${rol}`] }}
                    style={estilos.firmaImagen}
                  />
                ) : (
                  <Text style={estilos.textoFaltante}>Firma pendiente</Text>
                )}
              </View>
              {/* Respaldo */}
              <View style={estilos.respaldoContenedor}>
                <Text style={estilos.subtitulo}>Respaldo:</Text>
                {respaldos[`firma_${rol}_Respaldo`] ? (
                  <Image
                    source={{ uri: respaldos[`firma_${rol}_Respaldo`] }}
                    style={estilos.imagenRespaldo}
                  />
                ) : (
                  <Text style={estilos.textoFaltante}>Respaldo no ingresado</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={estilos.botonFinalizar}
          onPress={guardarInforme}
        >
          <Text style={estilos.textoBoton}>Guardar informe y finalizar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  contenedor: {
    padding: 20,
    paddingBottom: 60,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    alignSelf: 'center',
    color: '#333',
  },
  seccion: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tituloSeccion: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
    color: '#333',
  },
  textoItem: {
    fontSize: 14,
    marginBottom: 4,
    color: '#555',
  },
  respuestaItem: {
    marginBottom: 16,
  },
  pregunta: {
    fontWeight: 'bold',
    color: '#444',
    fontSize: 14,
  },
  respuesta: {
    color: '#555',
    marginLeft: 10,
    fontSize: 14,
  },
  otrosTitulo: {
    fontWeight: 'bold',
    marginTop: 8,
    marginLeft: 10,
    color: '#444',
  },
  otros: {
    fontStyle: 'italic',
    color: '#666',
    marginLeft: 20,
  },
  imagenEvidencia: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 10,
  },
  firmaBloque: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  nombreRol: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
  },
  firmaContenedor: {
    height: 120,
    width: '100%',
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 4,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  sinFirma: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  textoFaltante: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
  },
  firmaImagen: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  respaldoContenedor: {
    marginTop: 8,
  },
  subtitulo: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  imagenRespaldo: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#aaa',
  },
  sinDatos: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
  },
  botonFinalizar: {
    backgroundColor: '#ff9900',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#ff9900',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  textoBoton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});