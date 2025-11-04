import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../servicio/firebase-config';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function InformesDelEquipo({ route, navigation }) {

  const { equipoId, equipoNombre, equipo } = route.params;
  
  const idEquipo = equipo ? equipo.id : equipoId;
  const nombreEquipo = equipo ? equipo.equipo : equipoNombre;
  const codigoSGS = equipo ? equipo.codigo_sgs : equipoId;
  
  const [informes, setInformes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerInformes();
  }, [idEquipo]);

  const obtenerInformes = async () => {
    try {
      setCargando(true);

      const q = query(
        collection(db, "informePreventivo"),
        where("id_interno", "==", idEquipo)
      );

      const snapshot = await getDocs(q);
      console.log('📊 Informes preventivos encontrados:', snapshot.size);
      
      let listaInformes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fecha: data.fecha
        };
      });

      listaInformes.sort((a, b) => {
        const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fechaB - fechaA;
      });

      try {
        const qCorrectivo = query(
          collection(db, "informeCorrectivo"),
          where("id_interno", "==", idEquipo)
        );
        const snapshotCorrectivo = await getDocs(qCorrectivo);
        console.log('📊 Informes correctivos encontrados:', snapshotCorrectivo.size);
        
        const correctivos = snapshotCorrectivo.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            tipo: 'Correctivo',
            ...data
          };
        });

        listaInformes = listaInformes.map(inf => ({ ...inf, tipo: 'Preventivo' }));

        listaInformes = [...listaInformes, ...correctivos];

        listaInformes.sort((a, b) => {
          const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
          const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
          return fechaB - fechaA;
        });
      } catch (errorCorrectivo) {
        console.log('⚠️ No hay colección de informes correctivos o error:', errorCorrectivo.message);
      }

      setInformes(listaInformes);
      console.log('✅ Total de informes cargados:', listaInformes.length);
      
    } catch (error) {
      console.error("❌ Error al obtener informes:", error);
      
      if (error.code === 'failed-precondition') {
        console.log('⚠️ Necesitas crear un índice en Firebase');
        console.log('⚠️ Campo: id_interno');
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

  const obtenerColorTipo = (tipo) => {
    if (tipo === 'Correctivo') return '#e67e22';
    return '#3498db';
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
        <View style={estilosComunes.encabezado}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 24, color: COLORES.texto }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        
        <View style={{ paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' }}>
          <Text style={[estilosComunes.titulo, { textAlign: 'center' }]}>
            {nombreEquipo}
          </Text>
          <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
            Código SGS: {codigoSGS}
          </Text>
          <Text style={{ color: '#666', fontSize: 14, marginTop: 10 }}>
            {informes.length} {informes.length === 1 ? 'informe' : 'informes'}
          </Text>
        </View>

        {informes.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 }}>
            
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                No hay informes registrados{'\n'}para este equipo
              </Text>
            </View>

            <View style={{ paddingBottom: 20 }}>
              <TouchableOpacity
                style={[estilosComunes.boton, { backgroundColor: '#e67e22' }]}
                onPress={() =>
                  navigation.navigate('InformeCorrectivo', { 
                    equipoId: idEquipo,
                    equipoNombre: nombreEquipo,
                    equipo: equipo || { id: idEquipo, equipo: nombreEquipo, codigo_sgs: codigoSGS }
                  })
                }
              >
                <Text style={estilosComunes.textoBoton}>
                  + Crear informe correctivo
                </Text>
              </TouchableOpacity>
            </View>
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
                    borderWidth: 2,
                    borderColor: obtenerColorTipo(item.tipo || 'Preventivo')
                  }
                ]}
                onPress={() => {
                  const esCorrectivo = item.tipo === 'Correctivo';
                  navigation.navigate(
                    esCorrectivo ? 'VerInformeCorrectivo' : 'VerInformePreventivo',
                    {
                      informeId: item.id,
                      informe: item
                    }
                  );
                }}
              >
                <View style={estilosComunes.tarjetaContenido}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{
                        backgroundColor: obtenerColorTipo(item.tipo || 'Preventivo'),
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        marginRight: 10
                      }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                          {item.tipo || 'Preventivo'}
                        </Text>
                      </View>
                      <Text style={[estilosComunes.tituloTarjeta, { fontSize: 15, flex: 1 }]}>
                        Informe {item.tipo || 'Preventivo'}
                      </Text>
                    </View>
                    
                    <Text style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                      📅 {formatearFecha(item.fecha)}
                    </Text>
                    {item.usuario && (
                      <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                        👤 {item.usuario}
                      </Text>
                    )}
                    {item.tecnico && (
                      <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                        👤 {item.tecnico}
                      </Text>
                    )}
                    {item.responsable && (
                      <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                        👤 {item.responsable}
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
              <View style={{ paddingHorizontal: 24, marginTop: 20, marginBottom: 20 }}>
                <TouchableOpacity
                  style={[estilosComunes.boton, { backgroundColor: '#e67e22' }]}
                  onPress={() =>
                    navigation.navigate('InformeCorrectivo', { 
                      equipoId: idEquipo,
                      equipoNombre: nombreEquipo,
                      equipo: equipo || { id: idEquipo, equipo: nombreEquipo, codigo_sgs: codigoSGS }
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