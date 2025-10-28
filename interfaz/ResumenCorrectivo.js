import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../servicio/firebase-config';
import uploadImage from '../servicio/cloudinary-config';
import estilosComunes, { COLORES } from '../assets/estilos';
import { Ionicons } from '@expo/vector-icons';

export default function ResumenCorrectivo({ route, navigation }) {
  const { datosInforme, procesosRealizados, observaciones, evidencias } = route.params;

  const [guardando, setGuardando] = useState(false);

  const guardarInformeCorrectivo = async () => {
    try {
      setGuardando(true);

      const evidenciasConUrls = [];
      for (const evidencia of evidencias) {
        const url = await uploadImage(evidencia.uri);
        
        if (url) {
          evidenciasConUrls.push({
            url: url,
            descripcion: evidencia.descripcion,
          });
        }
      }

      const informeCompleto = {
        id_interno: datosInforme.codigoSGS,
        nombreEquipo: datosInforme.nombreEquipo,
        codigoSGS: datosInforme.codigoSGS,
        responsable: datosInforme.responsable,
        duracionEstimada: `${datosInforme.duracionEstimada} minutos`,
        ubicacion: datosInforme.ubicacion,
        prioridad: datosInforme.prioridad,
        localidad: datosInforme.localidad,
        jefeLaboratorio: datosInforme.jefeLaboratorio,
        ubicacionEquipo: datosInforme.ubicacionEquipo,
        fechaProgramada: datosInforme.fechaProgramada,
        fechaInicio: datosInforme.fechaInicio,
        horaInicio: datosInforme.horaInicio,
        fechaFinalizacion: datosInforme.fechaFinalizacion,
        horaFinalizacion: datosInforme.horaFinalizacion,
        tiempoDetenido: `${datosInforme.tiempoDetenido} minutos`,

        procesosRealizados: procesosRealizados.map(p => ({
          descripcion: p.descripcion,
          respuesta: p.respuesta,
        })),

        observaciones: observaciones.map(o => o.texto),

        evidencias: evidenciasConUrls,

        fecha: new Date(),
        fechaCreacion: new Date(),
        tipo: 'Correctivo',
      };

      const docRef = await addDoc(collection(db, 'informeCorrectivo'), informeCompleto);
      
      console.log('✅ Informe correctivo guardado con ID:', docRef.id);

      navigation.pop(5);

    } catch (error) {
      console.error('❌ Error al guardar informe correctivo:', error);
    } finally {
      setGuardando(false);
    }
  };

  const obtenerColorRespuesta = (respuesta) => {
    switch (respuesta) {
      case 'Si': return '#27ae60';
      case 'No': return '#e74c3c';
      case 'No aplica': return '#95a5a6';
      default: return '#000';
    }
  };

  const obtenerColorPrioridad = (prioridad) => {
    switch (prioridad) {
      case 'Baja': return '#95a5a6';
      case 'Media': return '#f39c12';
      case 'Alta': return '#e67e22';
      case 'Crítica': return '#e74c3c';
      default: return '#000';
    }
  };

  if (guardando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORES.primario} />
          <Text style={{ marginTop: 20, fontSize: 16, color: COLORES.texto }}>
            Guardando informe correctivo...
          </Text>
          <Text style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
            Subiendo {evidencias.length} {evidencias.length === 1 ? 'imagen' : 'imágenes'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          Resumen del Informe
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        <View style={{
          backgroundColor: '#e67e22',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
          alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            INFORME CORRECTIVO
          </Text>
          <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>
            {datosInforme.nombreEquipo}
          </Text>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Datos Generales</Text>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Equipo:</Text>
            <Text style={styles.valorCampo}>{datosInforme.nombreEquipo}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Código SGS:</Text>
            <Text style={styles.valorCampo}>{datosInforme.codigoSGS}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Responsable:</Text>
            <Text style={styles.valorCampo}>{datosInforme.responsable}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Duración Estimada:</Text>
            <Text style={styles.valorCampo}>{datosInforme.duracionEstimada} minutos</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Prioridad:</Text>
            <View style={{
              backgroundColor: obtenerColorPrioridad(datosInforme.prioridad),
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                {datosInforme.prioridad}
              </Text>
            </View>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Ubicación:</Text>
            <Text style={styles.valorCampo}>{datosInforme.ubicacion}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Localidad:</Text>
            <Text style={styles.valorCampo}>{datosInforme.localidad}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Jefe de Laboratorio:</Text>
            <Text style={styles.valorCampo}>{datosInforme.jefeLaboratorio}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Ubicación del Equipo:</Text>
            <Text style={styles.valorCampo}>{datosInforme.ubicacionEquipo}</Text>
          </View>
        </View>

        {/* Fechas y Tiempos */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Fechas y Tiempos</Text>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Fecha Programada:</Text>
            <Text style={styles.valorCampo}>{datosInforme.fechaProgramada}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Inicio:</Text>
            <Text style={styles.valorCampo}>
              {datosInforme.fechaInicio} - {datosInforme.horaInicio}
            </Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Finalización:</Text>
            <Text style={styles.valorCampo}>
              {datosInforme.fechaFinalizacion} - {datosInforme.horaFinalizacion}
            </Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Tiempo Detenido:</Text>
            <Text style={[styles.valorCampo, { fontWeight: 'bold', color: '#e74c3c' }]}>
              {datosInforme.tiempoDetenido} minutos
            </Text>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>
            Procesos Realizados ({procesosRealizados.length})
          </Text>
          
          {procesosRealizados.map((proceso, index) => (
            <View 
              key={proceso.id}
              style={{
                backgroundColor: '#f8f9fa',
                padding: 12,
                borderRadius: 6,
                marginBottom: 8,
                borderLeftWidth: 3,
                borderLeftColor: obtenerColorRespuesta(proceso.respuesta),
              }}
            >
              <Text style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                Proceso {index + 1}
              </Text>
              <Text style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>
                {proceso.descripcion}
              </Text>
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: obtenerColorRespuesta(proceso.respuesta),
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                  {proceso.respuesta}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {observaciones.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              Observaciones ({observaciones.length})
            </Text>
            
            {observaciones.map((obs, index) => (
              <View 
                key={obs.id}
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                  Observación {index + 1}
                </Text>
                <Text style={{ fontSize: 13, color: '#333', lineHeight: 18 }}>
                  {obs.texto}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Evidencias */}
        {evidencias.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              Evidencias Fotográficas ({evidencias.length})
            </Text>
            
            {evidencias.map((evidencia, index) => (
              <View 
                key={evidencia.id}
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                  Evidencia {index + 1}
                </Text>
                <Image
                  source={{ uri: evidencia.uri }}
                  style={{ 
                    width: '100%', 
                    height: 200, 
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                  resizeMode="cover"
                />
                <Text style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                  {evidencia.descripcion}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[estilosComunes.boton, { backgroundColor: COLORES.primario, marginTop: 20, flexDirection: 'row' }]}
          onPress={guardarInformeCorrectivo}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={estilosComunes.textoBoton}>
            Guardar Informe Correctivo
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  seccion: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  etiquetaCampo: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  valorCampo: {
    fontSize: 13,
    color: '#333',
    flex: 1.5,
    textAlign: 'right',
  },
};