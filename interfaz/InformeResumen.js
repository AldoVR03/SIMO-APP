import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from "../servicio/firebase-config";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { format } from 'date-fns';
import { verificarConexionInternet } from "../servicio/network-service";
import { guardarMantenimientoOffline } from "../servicio/offline-storage";

// Usar Firebase Storage en lugar de Cloudinary
import { subirImagenStorage, subirBase64Storage } from '../servicio/Storageservice'

export default function InformeResumen({ route, navigation }) {
  const [guardando, setGuardando] = useState(false);

  const {
    informe = {},
    respuestas = {},
    imagenes = [],
    firmas = {},
    respaldos = {},
    nombres = {},
    mantenimientoId = null,
    firmaValidada = false,
    similitudFirma = null,
  } = route?.params || {};

  const guardarInforme = async () => {
    setGuardando(true);
    try {
      const conectado = await verificarConexionInternet();

      if (!conectado) {
        console.log('🔴 Modo offline: Guardando localmente...');

        // Verificar si faltan firmas
        const firmasRequeridas = ['firma_mantenedor', 'firma_supervisor', 'firma_a_calidad_dgm'];
        const faltanFirmas = firmasRequeridas.some(key => !firmas[key]);

        // Determinar el estado basado en las firmas
        const estadoOffline = faltanFirmas ? "Faltante de firmas" : "Pendiente de sincronización";

        const informeOffline = {
          mantenimientoId,
          informe,
          respuestas,
          imagenes, // URIs locales
          firmas,   // Data URIs
          respaldos,
          nombres,
          usuario: auth.currentUser ? auth.currentUser.email : "Anon",
          fecha_creacion: new Date().toISOString(),
          estado: estadoOffline,
          firmaValidada,
          similitudFirma,
        };

        const guardado = await guardarMantenimientoOffline(informeOffline);

        if (guardado) {
          const mensaje = faltanFirmas
            ? "El informe se ha guardado en el dispositivo con firmas faltantes. Se subirá automáticamente cuando recuperes la conexión y podrás completar las firmas pendientes."
            : "El informe se ha guardado en el dispositivo. Se subirá automáticamente cuando recuperes la conexión.";

          Alert.alert(
            "Guardado Offline",
            mensaje,
            [{ text: "Entendido", onPress: () => navigation.navigate("InicioMantenedor") }]
          );
        } else {
          Alert.alert("Error", "No se pudo guardar el informe offline.");
        }
        return;
      }

      // ===== MODO ONLINE: Subir a Firebase Storage =====

      // Subir imágenes de evidencia a Firebase Storage
      console.log('📤 Subiendo evidencias a Firebase Storage...');
      const urlsImagenes = [];
      for (let i = 0; i < imagenes.length; i++) {
        const uri = imagenes[i];
        try {
          // Si ya es una URL de Firebase Storage, no volver a subir
          if (uri.includes('firebasestorage.googleapis.com') || uri.includes('storage.googleapis.com')) {
            urlsImagenes.push(uri);
            console.log(`✅ Evidencia ${i + 1} ya está en Storage`);
          } else {
            const urlStorage = await subirImagenStorage(
              uri, 
              `evidencias/${mantenimientoId || 'sin_id'}`,
              `evidencia_${i + 1}_${Date.now()}.jpg`
            );
            urlsImagenes.push(urlStorage);
            console.log(`✅ Evidencia ${i + 1} subida a Storage`);
          }
        } catch (error) {
          console.error(`Error subiendo evidencia ${i + 1}:`, error);
          urlsImagenes.push(uri); // Mantener URI local como fallback
        }
      }

      // Subir firmas a Firebase Storage
      console.log('📤 Subiendo firmas a Firebase Storage...');
      const urlsFirmas = {};
      for (const [key, dataUri] of Object.entries(firmas)) {
        if (dataUri && dataUri.startsWith('data:image')) {
          try {
            const urlStorage = await subirBase64Storage(
              dataUri,
              `firmas_informes/${mantenimientoId || 'sin_id'}`,
              `${key}_${Date.now()}.png`
            );
            urlsFirmas[key] = urlStorage;
            console.log(`✅ Firma ${key} subida a Storage`);
          } catch (error) {
            console.error(`Error subiendo firma ${key}:`, error);
            urlsFirmas[key] = dataUri; // Mantener base64 como fallback
          }
        } else {
          urlsFirmas[key] = dataUri;
        }
      }

      // Subir respaldos (carnets) a Firebase Storage
      console.log('📤 Subiendo respaldos a Firebase Storage...');
      const urlsRespaldos = {};
      for (const [key, uri] of Object.entries(respaldos)) {
        if (uri) {
          try {
            if (uri.includes('firebasestorage.googleapis.com') || uri.includes('storage.googleapis.com')) {
              urlsRespaldos[key] = uri;
            } else {
              const urlStorage = await subirImagenStorage(
                uri,
                `respaldos/${mantenimientoId || 'sin_id'}`,
                `${key}_${Date.now()}.jpg`
              );
              urlsRespaldos[key] = urlStorage;
              console.log(`✅ Respaldo ${key} subido a Storage`);
            }
          } catch (error) {
            console.error(`Error subiendo respaldo ${key}:`, error);
            urlsRespaldos[key] = uri;
          }
        }
      }

      // Verificar si faltan firmas
      const firmasRequeridas = ['firma_mantenedor', 'firma_supervisor', 'firma_a_calidad_dgm'];
      const faltanFirmas = firmasRequeridas.some(key => !urlsFirmas[key]);

      // Determinar el nuevo estado
      const nuevoEstado = faltanFirmas ? "Faltante de firmas" : "Completado";

      // Guardar el informe en la colección informePreventivo
      console.log('💾 Guardando informe en Firestore...');
      const docRef = await addDoc(collection(db, "informePreventivo"), {
        codigo_sgs: informe.codigo_sgs || informe.id || "SIN_CODIGO",
        equipo: informe.equipo || "Equipo no definido",
        estado: nuevoEstado,
        evidencias: urlsImagenes,
        fecha: serverTimestamp(),
        firmas: urlsFirmas,
        id_interno: informe.id || informe.codigo_sgs || "SIN_ID",
        marca: informe.marca || "No especificado",
        modelo: informe.modelo || "No especificado",
        nombres: nombres,
        numero_serie: informe.numero_serie || "No especificado",
        respaldos: urlsRespaldos,
        respuestas: respuestas,
        usuario: auth.currentUser ? auth.currentUser.email : "Anon",
        // Datos de validación de firma
        firmaValidada: firmaValidada,
        similitudFirma: similitudFirma,
        storage: 'firebase', // Indicar que usa Firebase Storage
      });

      console.log('✅ Informe guardado con ID:', docRef.id);

      // Actualizar el estado del mantenimiento en planificacion
      if (mantenimientoId && informe.id) {
        const mantenimientoRef = doc(
          db,
          "planificacion",
          informe.id,
          "mantenimientos",
          mantenimientoId
        );

        const datosActualizacion = {
          estado: nuevoEstado,
          informeId: docRef.id,
          fechaActualizacion: serverTimestamp(),
        };

        if (nuevoEstado === "Completado") {
          datosActualizacion.fechaCompletado = format(new Date(), 'yyyy-MM-dd');
        }

        await updateDoc(mantenimientoRef, datosActualizacion);
        console.log(`✅ Estado del mantenimiento actualizado a: ${nuevoEstado}`);
      } else {
        console.warn("⚠️ No se pudo actualizar el estado: falta mantenimientoId o informe.id");
      }

      Alert.alert(
        "Éxito",
        `El informe se guardó correctamente.\nEstado: ${nuevoEstado}${firmaValidada ? '\n✅ Firma validada' : ''}`,
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("InicioMantenedor")
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error guardando informe:', error);
      Alert.alert("Error", "No se pudo guardar el informe: " + error.message);
    } finally {
      setGuardando(false);
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

        {/* Indicador de validación de firma */}
        {firmaValidada && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#d4edda',
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <Ionicons name="shield-checkmark" size={20} color="#155724" />
            <Text style={{ color: '#155724', fontWeight: '600', marginLeft: 8 }}>
              Firma del mantenedor validada ({similitudFirma}% similitud)
            </Text>
          </View>
        )}

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Datos del equipo</Text>
          <Text style={estilos.textoItem}>Nombre: {informe.equipo || 'Equipo no definido'}</Text>
          <Text style={estilos.textoItem}>Código SGS: {informe.codigo_sgs || 'N/A'}</Text>
          <Text style={estilos.textoItem}>Marca: {informe.marca || 'N/A'}</Text>
          <Text style={estilos.textoItem}>Modelo: {informe.modelo || 'N/A'}</Text>
          <Text style={estilos.textoItem}>Numero de serie: {informe.numero_serie || 'N/A'}</Text>
          <Text style={estilos.textoItem}>Fecha: {fechaActual}</Text>
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
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
            📦 Almacenamiento: Firebase Storage
          </Text>
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
          <Text style={estilos.tituloSeccion}>Firmas</Text>
          {['mantenedor', 'supervisor', 'calidad'].map((rol, i) => {
            const firmaKey = rol === 'calidad' ? 'firma_a_calidad_dgm' : `firma_${rol}`;
            const nombreKey = `nombre_${rol}`;

            return (
              <View key={i} style={estilos.firmaBloque}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={estilos.nombreRol}>
                    {rol === "calidad" ? "A. Calidad DGM" : rol.charAt(0).toUpperCase() + rol.slice(1)}
                  </Text>
                  {rol === 'mantenedor' && firmaValidada && (
                    <View style={{
                      backgroundColor: '#28a745',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                      marginLeft: 10,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                        ✓ Validada
                      </Text>
                    </View>
                  )}
                </View>

                {nombres[nombreKey] && (
                  <Text style={estilos.nombrePersona}>
                    Nombre: {nombres[nombreKey]}
                  </Text>
                )}

                <View style={estilos.firmaContenedor}>
                  <Text style={estilos.subtitulo}>Firma:</Text>
                  {firmas[firmaKey] ? (
                    <Image
                      source={{ uri: firmas[firmaKey] }}
                      style={estilos.firmaImagen}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={estilos.textoFaltante}>Firma pendiente</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[estilos.botonFinalizar, guardando && estilos.botonDeshabilitado]}
          onPress={guardarInforme}
          disabled={guardando}
        >
          {guardando ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" />
              <Text style={[estilos.textoBoton, { marginLeft: 10 }]}>
                Subiendo a Firebase Storage...
              </Text>
            </View>
          ) : (
            <Text style={estilos.textoBoton}>Guardar informe y finalizar</Text>
          )}
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
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  seccion: {
    marginBottom: 24,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#ff9900',
  },
  textoItem: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  sinDatos: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  respuestaItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderRadius: 8,
  },
  pregunta: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  respuesta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  otrosTitulo: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    color: '#555',
  },
  otros: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
  },
  imagenEvidencia: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  firmaBloque: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  nombreRol: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333',
  },
  nombrePersona: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  firmaContenedor: {
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  firmaImagen: {
    width: '100%',
    height: 120,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  textoFaltante: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  botonFinalizar: {
    backgroundColor: '#ff9900',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  botonDeshabilitado: {
    backgroundColor: '#ccc',
  },
  textoBoton: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});