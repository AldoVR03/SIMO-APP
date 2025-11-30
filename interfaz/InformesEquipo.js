import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../servicio/firebase-config';
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

  // Debug: mostrar qué valores estamos buscando
  useEffect(() => {
    console.log('🔍 Buscando informes para:');
    console.log('   idEquipo:', idEquipo);
    console.log('   codigoSGS:', codigoSGS);
    console.log('   nombreEquipo:', nombreEquipo);
  }, [idEquipo, codigoSGS, nombreEquipo]);

  // EFECTO 1: Cargar datos Offline y suscribirse a Firestore
  useEffect(() => {
    setCargando(true);

    // A) CARGAR DATOS OFFLINE
    const cargarOffline = async () => {
      try {
        const pendientes = await obtenerMantenimientosOffline();
        const misPendientes = pendientes.filter(m =>
          m.equipo_id === idEquipo ||
          (m.informe && m.informe.id_interno === idEquipo) ||
          (m.informe && m.informe.codigo_sgs === codigoSGS)
        ).map(m => ({
          ...m,
          id: m.mantenimientoId || `temp-${Date.now()}`,
          tipo: m.tipo || 'Pendiente',
          fecha: m.timestamp_offline || new Date(),
          esLocal: true,
          usuario: 'Tú (Sincronizando...)'
        }));
        setListaOffline(misPendientes);
      } catch (e) {
        console.error("Error cargando offline:", e);
      }
    };
    cargarOffline();

    // B) SUSCRIPCIÓN PREVENTIVOS - Buscar por múltiples campos
    let preventivosById = [];
    let preventivosByCodigo = [];
    let preventivosByEquipo = [];

    // Query por id_interno
    const qPrev1 = query(
      collection(db, "informePreventivo"),
      where("id_interno", "==", idEquipo)
    );

    // Query por codigo_sgs
    const qPrev2 = query(
      collection(db, "informePreventivo"),
      where("codigo_sgs", "==", codigoSGS)
    );

    // Query por equipo (nombre)
    const qPrev3 = query(
      collection(db, "informePreventivo"),
      where("equipo", "==", nombreEquipo)
    );

    const combinarPreventivos = () => {
      const combined = [...preventivosById, ...preventivosByCodigo, ...preventivosByEquipo];
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      // Filtrar solo completados
      const completados = unique.filter(item => item.estado === 'Completado');
      console.log(`📋 Preventivos encontrados: ${unique.length} (Completados: ${completados.length})`);
      setListaPreventivos(completados);
    };

    const unsubscribePrev1 = onSnapshot(qPrev1, (snapshot) => {
      preventivosById = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Preventivo',
        ...doc.data()
      }));
      console.log(`   Por id_interno: ${preventivosById.length}`);
      combinarPreventivos();
    }, (error) => console.log("Error preventivos por id:", error));

    const unsubscribePrev2 = onSnapshot(qPrev2, (snapshot) => {
      preventivosByCodigo = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Preventivo',
        ...doc.data()
      }));
      console.log(`   Por codigo_sgs: ${preventivosByCodigo.length}`);
      combinarPreventivos();
    }, (error) => console.log("Error preventivos por codigo:", error));

    const unsubscribePrev3 = onSnapshot(qPrev3, (snapshot) => {
      preventivosByEquipo = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Preventivo',
        ...doc.data()
      }));
      console.log(`   Por equipo: ${preventivosByEquipo.length}`);
      combinarPreventivos();
    }, (error) => console.log("Error preventivos por equipo:", error));

    // C) SUSCRIPCIÓN CORRECTIVOS
    let correctivosById = [];
    let correctivosByCodigo = [];

    const qCorr1 = query(
      collection(db, "informeCorrectivo"),
      where("id_interno", "==", idEquipo)
    );

    const qCorr2 = query(
      collection(db, "informeCorrectivo"),
      where("codigoSGS", "==", codigoSGS)
    );

    const combinarCorrectivos = () => {
      const combined = [...correctivosById, ...correctivosByCodigo];
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      // Filtrar solo completados
      const completados = unique.filter(item => item.estado === 'Completado');
      console.log(`🔧 Correctivos encontrados: ${unique.length} (Completados: ${completados.length})`);
      setListaCorrectivos(completados);
    };

    const unsubscribeCorr1 = onSnapshot(qCorr1, (snapshot) => {
      correctivosById = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Correctivo',
        ...doc.data()
      }));
      combinarCorrectivos();
    }, (error) => console.log("Error correctivos por id:", error));

    const unsubscribeCorr2 = onSnapshot(qCorr2, (snapshot) => {
      correctivosByCodigo = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Correctivo',
        ...doc.data()
      }));
      combinarCorrectivos();
    }, (error) => console.log("Error correctivos por codigo:", error));

    // Limpieza al salir de la pantalla
    return () => {
      unsubscribePrev1();
      unsubscribePrev2();
      unsubscribePrev3();
      unsubscribeCorr1();
      unsubscribeCorr2();
    };
  }, [idEquipo, codigoSGS, nombreEquipo]);

  // EFECTO 2: Unificar y Ordenar listas cada vez que cambie alguna fuente
  useEffect(() => {
    let consolidado = [...listaOffline, ...listaPreventivos, ...listaCorrectivos];

    consolidado.sort((a, b) => {
      const fechaA = obtenerFechaObjeto(a.fecha);
      const fechaB = obtenerFechaObjeto(b.fecha);
      return fechaB - fechaA;
    });

    setInformes(consolidado);
    setCargando(false);
  }, [listaOffline, listaPreventivos, listaCorrectivos]);

  const obtenerFechaObjeto = (fecha) => {
    if (!fecha) return new Date(0);
    if (fecha.toDate) return fecha.toDate();
    return new Date(fecha);
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
    if (item.esLocal) return '#f1c40f';
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