import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../servicio/firebase-config';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function InformesDelEquipo({ route, navigation }) {
  const { equipoId, equipoNombre } = route.params;
  
  const [informes, setInformes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerInformes();
  }, [equipoId]);

  const obtenerInformes = async () => {
    try {
      setCargando(true);
      
      console.log('🔍 Buscando informes para:', equipoId);
      
      const q = query(
        collection(db, "informePreventivo"),
        where("codigo_sgs", "==", equipoId),
        orderBy("fecha", "asc")
      );

      const snapshot = await getDocs(q);
      console.log('📊 Documentos encontrados:', snapshot.size);
      
      const listaInformes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setInformes(listaInformes);
    } catch (error) {
      console.error("❌ Error al obtener informes:", error);
      
      if (error.code === 'failed-precondition') {
        console.log('⚠️ Crea el índice: codigo_sgs + fecha');
      }
    } finally {
      setCargando(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (fecha?.toDate) {
      return fecha.toDate().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    if (typeof fecha === 'string') {
      return new Date(fecha).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    return 'Fecha no disponible';
  };

  if (cargando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <View style={[estilosComunes.contenedor, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={COLORES.primario} />
          <Text style={{ marginTop: 10, color: COLORES.texto, textAlign: 'center' }}>
            Cargando informes...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={{ flex: 1 }}>
        {/* Header con flecha de regreso */}
        <View style={estilosComunes.encabezado}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 24, color: COLORES.texto }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        {/* Título y subtítulo centrados */}
        <View style={{ paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' }}>
          <Text style={[estilosComunes.titulo, { textAlign: 'center' }]}>
            {equipoNombre}
          </Text>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
            {equipoId}
          </Text>
          <Text style={{ color: '#666', fontSize: 14, marginTop: 10 }}>
            {informes.length} {informes.length === 1 ? 'informe' : 'informes'}
          </Text>
        </View>

        {informes.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 64, marginBottom: 20 }}>📋</Text>
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 40, textAlign: 'center' }}>
              No hay informes preventivos{'\n'}registrados para este equipo
            </Text>
            
            <TouchableOpacity
              style={[estilosComunes.boton, { backgroundColor: '#3b44c3' }]}
              onPress={() =>
                navigation.navigate('InformeCorrectivo', { 
                  equipoId: equipoId,
                  equipoNombre: equipoNombre 
                })
              }
            >
              <Text style={estilosComunes.textoBoton}>
                + Crear informe correctivo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={informes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  estilosComunes.tarjetaInforme,
                  { 
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#e0e0e0'
                  }
                ]}
                onPress={() =>
                  navigation.navigate('VerInforme', {
                    informeId: item.id,
                    informe: item
                  })
                }
              >
                <View style={estilosComunes.tarjetaContenido}>
                  <View style={{ flex: 1 }}>
                    <Text style={[estilosComunes.tituloTarjeta, { fontSize: 15 }]}>
                      Informe Preventivo
                    </Text>
                    <Text style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
                      📅 {formatearFecha(item.fecha)}
                    </Text>
                    {item.tecnico && (
                      <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                        👤 {item.tecnico}
                      </Text>
                    )}
                  </View>
                  
                  <View style={[
                    estilosComunes.tarjetaEstado,
                    { backgroundColor: COLORES.primario }
                  ]}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                      Ver
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
                <TouchableOpacity
                  style={[estilosComunes.boton, { backgroundColor: '#3b44c3' }]}
                  onPress={() =>
                    navigation.navigate('InformeCorrectivo', { 
                      equipoId: equipoId,
                      equipoNombre: equipoNombre 
                    })
                  }
                >
                  <Text style={estilosComunes.textoBoton}>
                    + Crear informe correctivo
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}