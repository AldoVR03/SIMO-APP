import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function ProcesosCorrectivo({ route, navigation }) {
  const { datosInforme } = route.params;

  const [procesosRealizados, setProcesosRealizados] = useState([]);
  const [nuevoProceso, setNuevoProceso] = useState('');
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState('Si');

  const agregarProceso = () => {
    if (!nuevoProceso.trim()) {
      Alert.alert('Error', 'Escribe un proceso antes de agregar');
      return;
    }

    const proceso = {
      descripcion: nuevoProceso,
      respuesta: respuestaSeleccionada,
      id: Date.now().toString(),
    };

    setProcesosRealizados(prev => [...prev, proceso]);
    setNuevoProceso('');
    setRespuestaSeleccionada('Si');
  };

  const eliminarProceso = (id) => {
    setProcesosRealizados(prev => prev.filter(p => p.id !== id));
  };

  const continuarAObservaciones = () => {
    if (procesosRealizados.length === 0) {
      Alert.alert('Error', 'Agrega al menos un proceso realizado');
      return;
    }

    navigation.navigate('ObservacionesCorrectivo', {
      datosInforme,
      procesosRealizados,
    });
  };

  const obtenerColorRespuesta = (respuesta) => {
    switch (respuesta) {
      case 'Si': return '#27ae60';
      case 'No': return '#e74c3c';
      case 'No aplica': return '#95a5a6';
      default: return '#000';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={estilosComunes.encabezado}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 24, color: COLORES.texto }}>←</Text>
        </TouchableOpacity>
        <Text style={[estilosComunes.titulo, { margin: 0 }]}>
          Procesos Realizados
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 24 }}
      >
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
          Agrega los procesos realizados durante el mantenimiento correctivo
        </Text>
        <View style={{ 
          backgroundColor: '#f8f9fa', 
          padding: 16, 
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={estilosComunes.etiqueta}>Descripción del Proceso</Text>
          <TextInput
            style={estilosComunes.entrada}
            value={nuevoProceso}
            onChangeText={setNuevoProceso}
            placeholder="Ej: Limpieza de horno"
            multiline
          />

          <Text style={estilosComunes.etiqueta}>Estado</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {['Si', 'No', 'No aplica'].map((opcion) => (
              <TouchableOpacity
                key={opcion}
                style={{
                  flex: 1,
                  padding: 10,
                  marginHorizontal: 4,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: respuestaSeleccionada === opcion 
                    ? obtenerColorRespuesta(opcion) 
                    : '#ddd',
                  backgroundColor: respuestaSeleccionada === opcion 
                    ? obtenerColorRespuesta(opcion) 
                    : '#fff',
                  alignItems: 'center',
                }}
                onPress={() => setRespuestaSeleccionada(opcion)}
              >
                <Text style={{
                  fontWeight: 'bold',
                  color: respuestaSeleccionada === opcion ? '#fff' : '#666',
                }}>
                  {opcion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[estilosComunes.boton, COLORES.primario]}
            onPress={agregarProceso}
          >
            <Text style={estilosComunes.textoBoton}>
              + Agregar Proceso
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
          Procesos Agregados ({procesosRealizados.length})
        </Text>

        {procesosRealizados.length === 0 ? (
          <View style={{ 
            padding: 30, 
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}></Text>
            <Text style={{ color: '#666', textAlign: 'center' }}>
              No hay procesos agregados aún
            </Text>
          </View>
        ) : (
          procesosRealizados.map((proceso, index) => (
            <View 
              key={proceso.id}
              style={{
                backgroundColor: '#fff',
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: obtenerColorRespuesta(proceso.respuesta),
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 12, color: '#999', marginBottom: 4 }}>
                    Proceso {index + 1}
                  </Text>
                  <Text style={{ fontSize: 15, color: '#333', marginBottom: 8 }}>
                    {proceso.descripcion}
                  </Text>
                  <View style={{
                    alignSelf: 'flex-start',
                    backgroundColor: obtenerColorRespuesta(proceso.respuesta),
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                      {proceso.respuesta}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => eliminarProceso(proceso.id)}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 20, color: '#e74c3c' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[estilosComunes.boton, { backgroundColor: '#e67e22', marginTop: 20, top:100 }]}
          onPress={continuarAObservaciones}
        >
          <Text style={estilosComunes.textoBoton}>
            Continuar a Observaciones →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}