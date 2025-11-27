import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
// 1. Importamos onSnapshot para tiempo real
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../servicio/firebase-config';
// 2. Importamos la función para leer lo que está pendiente en el celular
import { obtenerMantenimientosOffline } from '../servicio/offline-storage';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function InformesDelEquipo({ route, navigation }) {

  const { equipoId, equipoNombre, equipo } = route.params;

  const idEquipo = equipo ? equipo.id : equipoId;
  const nombreEquipo = equipo ? equipo.equipo : equipoNombre;
  const codigoSGS = equipo ? equipo.codigo_sgs : equipoId;

  // Estados separados para mezclar fuentes de datos
  const [listaPreventivos, setListaPreventivos] = useState([]);
  const [listaCorrectivos, setListaCorrectivos] = useState([]);
  const [listaOffline, setListaOffline] = useState([]);

  const [informes, setInformes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // EFECTO 1: Cargar datos Offline y suscribirse a Firestore
  useEffect(() => {
    setCargando(true);

    // A) CARGAR DATOS OFFLINE (Lo que está pendiente de subir)
    const cargarOffline = async () => {
      try {
        const pendientes = await obtenerMantenimientosOffline();
        // Filtramos solo los que pertenecen a este equipo
        const misPendientes = pendientes.filter(m =>
          m.equipo_id === idEquipo ||
          (m.informe && m.informe.id_interno === idEquipo)
        ).map(m => ({
          ...m,
          // Asignamos una ID temporal y datos para que no rompa la lista
          id: m.mantenimientoId || `temp-${Date.now()}`,
          tipo: m.tipo || 'Pendiente',
          fecha: m.timestamp_offline || new Date(),
          esLocal: true, // Bandera para pintarlo diferente
          usuario: 'Tú (Sincronizando...)'
        }));
        setListaOffline(misPendientes);
      } catch (e) {
        console.error("Error cargando offline:", e);
      }
    };
    cargarOffline();

    // B) SUSCRIPCIÓN PREVENTIVOS (Tiempo Real)
    const qPrev = query(
      collection(db, "informePreventivo"),
      where("id_interno", "==", idEquipo)
    );

    const unsubscribePrev = onSnapshot(qPrev, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Preventivo',
        ...doc.data()
      }));
      setListaPreventivos(data);
    }, (error) => console.log("Error preventivos:", error));

    // C) SUSCRIPCIÓN CORRECTIVOS (Tiempo Real)
    const qCorr = query(
      collection(db, "informeCorrectivo"),
      where("id_interno", "==", idEquipo)
    );

    const unsubscribeCorr = onSnapshot(qCorr, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Correctivo',
        ...doc.data()
      }));
      setListaCorrectivos(data);
    }, (error) => console.log("Error correctivos (puede estar vacía):", error));

    // Limpieza al salir de la pantalla
    return () => {
      unsubscribePrev();
      unsubscribeCorr();
    };
  }, [idEquipo]);

  // EFECTO 2: Unificar y Ordenar listas cada vez que cambie alguna fuente
  useEffect(() => {
    // Unimos todo: Offline + Preventivos + Correctivos
    let consolidado = [...listaOffline, ...listaPreventivos, ...listaCorrectivos];

    // Ordenamos por fecha (más reciente primero)
    consolidado.sort((a, b) => {
      const fechaA = obtenerFechaObjeto(a.fecha);
      const fechaB = obtenerFechaObjeto(b.fecha);
      return fechaB - fechaA;
    });

    setInformes(consolidado);
    setCargando(false);
  }, [listaOffline, listaPreventivos, listaCorrectivos]);

  // Función auxiliar para manejar fechas de Firestore (Timestamp) y Strings
  const obtenerFechaObjeto = (fecha) => {
    if (!fecha) return new Date(0);
    if (fecha.toDate) return fecha.toDate(); // Es Timestamp de Firestore
    return new Date(fecha); // Es String o Date JS
  };

  const formatearFecha = (fecha) => {
    const dateObj = obtenerFechaObjeto(fecha);
    return dateObj.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const obtenerColorTipo = (item) => {
    if (item.esLocal) return '#f1c40f'; // Amarillo para pendientes offline
    if (item.tipo === 'Correctivo') return '#e67e22';
    return '#3498db';
  };

  if (cargando && informes.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <View style={[estilosComunes.contenedor, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={COLORES.primario} />
          <Text style={{ marginTop: 10, color: COLORES.texto, textAlign: 'center' }}>
            Cargando historial...
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
            {/* Botón para crear nuevo */}
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
                <Text style={estilosComunes.textoBoton}>+ Crear informe correctivo</Text>
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
                    // Si es local, borde amarillo, si no, su color normal
                    borderColor: obtenerColorTipo(item)
                  }
                ]}
                onPress={() => {
                  if (item.esLocal) {
                    alert("Este informe está pendiente de sincronización.");
                    return;
                  }
                  const esCorrectivo = item.tipo === 'Correctivo';
                  navigation.navigate(
                    esCorrectivo ? 'VerInformeCorrectivo' : 'VerInformePreventivo',
                    { informeId: item.id, informe: item }
                  );
                }}
              >
                <View style={estilosComunes.tarjetaContenido}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{
                        backgroundColor: obtenerColorTipo(item),
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        marginRight: 10
                      }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                          {item.esLocal ? 'PENDIENTE' : (item.tipo || 'Preventivo')}
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
                  </View>

                  <View style={[
                    estilosComunes.tarjetaEstado,
                    { backgroundColor: item.esLocal ? '#f1c40f' : COLORES.primario }
                  ]}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                      {item.esLocal ? 'Sync...' : 'Ver'}
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
                  <Text style={estilosComunes.textoBoton}>+ Crear informe correctivo</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}