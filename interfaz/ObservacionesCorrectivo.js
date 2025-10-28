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

export default function ObservacionesCorrectivo({ route, navigation }) {
  const { datosInforme, procesosRealizados } = route.params;

  const [observaciones, setObservaciones] = useState([]);
  const [nuevaObservacion, setNuevaObservacion] = useState('');

  const agregarObservacion = () => {
    if (!nuevaObservacion.trim()) {
      Alert.alert('Error', 'Escribe una observación antes de agregar');
      return;
    }

    const observacion = {
      texto: nuevaObservacion,
      id: Date.now().toString(),
      fecha: new Date().toLocaleString('es-CL'),
    };

    setObservaciones(prev => [...prev, observacion]);
    setNuevaObservacion('');
  };

  const eliminarObservacion = (id) => {
    setObservaciones(prev => prev.filter(o => o.id !== id));
  };

  const continuarAEvidencias = () => {
    if (observaciones.length === 0) {
      Alert.alert(
        'Sin observaciones',
        '¿Deseas continuar sin agregar observaciones?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Continuar', 
            onPress: () => {
              navigation.navigate('EvidenciasCorrectivo', {
                datosInforme,
                procesosRealizados,
                observaciones: [],
              });
            }
          },
        ]
      );
      return;
    }

    navigation.navigate('EvidenciasCorrectivo', {
      datosInforme,
      procesosRealizados,
      observaciones,
    });
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
          Observaciones
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 24 }}
      >
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
          Agrega observaciones relevantes del mantenimiento correctivo
        </Text>

        {/* Formulario para agregar observación */}
        <View style={{ 
          backgroundColor: '#f8f9fa', 
          padding: 16, 
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={estilosComunes.etiqueta}>Nueva Observación</Text>
          <TextInput
            style={[
              estilosComunes.entrada,
              { 
                height: 120, 
                textAlignVertical: 'top',
                paddingTop: 10,
              }
            ]}
            value={nuevaObservacion}
            onChangeText={setNuevaObservacion}
            placeholder="Escribe aquí tus observaciones..."
            multiline
            numberOfLines={5}
          />

          <TouchableOpacity
            style={[estilosComunes.boton, COLORES.primario]}
            onPress={agregarObservacion}
          >
            <Text style={estilosComunes.textoBoton}>
              + Agregar Observación
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de observaciones agregadas */}
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
          Observaciones Agregadas ({observaciones.length})
        </Text>

        {observaciones.length === 0 ? (
          <View style={{ 
            padding: 30, 
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}></Text>
            <Text style={{ color: '#666', textAlign: 'center' }}>
              No hay observaciones agregadas aún
            </Text>
          </View>
        ) : (
          observaciones.map((observacion, index) => (
            <View 
              key={observacion.id}
              style={{
                backgroundColor: '#fff',
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: COLORES.primario,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 12, color: '#999' }}>
                      Observación {index + 1}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#999' }}>
                      {observacion.fecha}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#333', lineHeight: 20 }}>
                    {observacion.texto}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => eliminarObservacion(observacion.id)}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 20, color: '#e74c3c' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[estilosComunes.boton, { backgroundColor: '#e67e22', marginTop: 20, top:100}]}
          onPress={continuarAEvidencias}
        >
          <Text style={estilosComunes.textoBoton}>
            Continuar a Evidencias →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}