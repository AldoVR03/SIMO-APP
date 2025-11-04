import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../assets/estilos';
import { db } from '../servicio/firebase-config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function ListaTrabajadores({ navigation }) {
  const [vistaActual, setVistaActual] = useState('trabajadores'); // 'trabajadores' o 'equipos'
  const [trabajadores, setTrabajadores] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    await Promise.all([
      cargarTrabajadores(),
      cargarEquipos()
    ]);
  };

  const cargarTrabajadores = async () => {
    try {
      setCargando(true);
      
      // Buscar en colección "usuarios" con rol "mantenedor"
      const q = query(
        collection(db, 'usuarios'),
        where('rol', '==', 'mantenedor')
      );
      
      const snapshot = await getDocs(q);
      const listaTrabajadores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Si no hay resultados, intentar con "Usuario"
      if (listaTrabajadores.length === 0) {
        const qAlt = query(
          collection(db, 'Usuario'),
          where('rol', '==', 'mantenedor')
        );
        const snapshotAlt = await getDocs(qAlt);
        const listaTrabajadoresAlt = snapshotAlt.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrabajadores(listaTrabajadoresAlt);
      } else {
        setTrabajadores(listaTrabajadores);
      }

      console.log('✅ Trabajadores cargados:', listaTrabajadores.length);
    } catch (error) {
      console.error('❌ Error al cargar trabajadores:', error);
      Alert.alert('Error', 'No se pudieron cargar los trabajadores');
    } finally {
      setCargando(false);
    }
  };

  const cargarEquipos = async () => {
    try {
      // Intentar cargar equipos desde la colección "equipos"
      const snapshot = await getDocs(collection(db, 'equipos'));
      const listaEquipos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setEquipos(listaEquipos);
      console.log('✅ Equipos cargados:', listaEquipos.length);
    } catch (error) {
      console.error('❌ Error al cargar equipos:', error);
      // No mostramos alerta aquí para no interrumpir la carga de trabajadores
    }
  };

  const cambiarEstadoTrabajador = async (trabajadorId, estadoActual, coleccion) => {
    try {
      const nuevoEstado = !estadoActual;
      
      // Actualizar en Firebase
      const trabajadorRef = doc(db, coleccion || 'usuarios', trabajadorId);
      await updateDoc(trabajadorRef, {
        habilitado: nuevoEstado
      });

      // Actualizar estado local
      setTrabajadores(prevTrabajadores =>
        prevTrabajadores.map(t =>
          t.id === trabajadorId ? { ...t, habilitado: nuevoEstado } : t
        )
      );

      Alert.alert(
        'Estado actualizado',
        `El trabajador ha sido ${nuevoEstado ? 'habilitado' : 'deshabilitado'}`
      );
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const cambiarEstadoEquipo = async (equipoId, estadoActual) => {
    try {
      const nuevoEstado = !estadoActual;
      
      // Actualizar en Firebase
      const equipoRef = doc(db, 'equipos', equipoId);
      await updateDoc(equipoRef, {
        disponible: nuevoEstado
      });

      // Actualizar estado local
      setEquipos(prevEquipos =>
        prevEquipos.map(e =>
          e.id === equipoId ? { ...e, disponible: nuevoEstado } : e
        )
      );

      Alert.alert(
        'Estado actualizado',
        `El equipo ha sido ${nuevoEstado ? 'habilitado' : 'deshabilitado'}`
      );
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const toggleExpandir = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  const renderTrabajador = ({ item }) => {
    const estaExpandido = expandido === item.id;
    const habilitado = item.habilitado !== false; // Por defecto habilitado

    return (
      <View style={styles.card}>
        {/* Header del card (siempre visible) */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleExpandir(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatar,
              { backgroundColor: habilitado ? COLORES.primario : '#999' }
            ]}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>
              {item.nombre || item.Nombre || 'Sin nombre'}
            </Text>
            <Text style={styles.rut}>
              RUT: {item.rut || item.Rut || 'Sin RUT'}
            </Text>
          </View>

          <Ionicons
            name={estaExpandido ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>

        {/* Contenido expandido */}
        {estaExpandido && (
          <View style={styles.cardBody}>
            <View style={styles.separador} />
            
            {/* Correo */}
            <View style={styles.infoFila}>
              <Ionicons name="mail-outline" size={18} color="#666" />
              <Text style={styles.infoTexto}>
                {item.correo || item.email || item.Correo || 'Sin correo'}
              </Text>
            </View>

            {/* Estado */}
            <View style={styles.estadoContainer}>
              <View style={styles.estadoFila}>
                <View style={styles.estadoInfo}>
                  <Ionicons 
                    name={habilitado ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={habilitado ? '#27ae60' : '#e74c3c'} 
                  />
                  <Text style={[
                    styles.estadoTexto,
                    { color: habilitado ? '#27ae60' : '#e74c3c' }
                  ]}>
                    {habilitado ? 'Habilitado' : 'Deshabilitado'}
                  </Text>
                </View>
                
                <Switch
                  value={habilitado}
                  onValueChange={() => cambiarEstadoTrabajador(
                    item.id, 
                    habilitado,
                    item.coleccion || 'usuarios'
                  )}
                  trackColor={{ false: '#e0e0e0', true: COLORES.primario + '80' }}
                  thumbColor={habilitado ? COLORES.primario : '#999'}
                />
              </View>
              
              <Text style={styles.estadoDescripcion}>
                {habilitado 
                  ? 'El trabajador puede iniciar sesión y realizar mantenimientos'
                  : 'El trabajador no puede acceder al sistema'
                }
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEquipo = ({ item }) => {
    const estaExpandido = expandido === item.id;
    const disponible = item.disponible !== false; // Por defecto disponible

    return (
      <View style={styles.card}>
        {/* Header del card (siempre visible) */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleExpandir(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatar,
              { backgroundColor: disponible ? COLORES.primario : '#999' }
            ]}>
              <Ionicons name="construct" size={24} color="#fff" />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>
              {item.nombre || item.tipo || 'Sin nombre'}
            </Text>
            <Text style={styles.rut}>
              Código: {item.codigo || item.id || 'Sin código'}
            </Text>
          </View>

          <Ionicons
            name={estaExpandido ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>

        {/* Contenido expandido */}
        {estaExpandido && (
          <View style={styles.cardBody}>
            <View style={styles.separador} />
            
            {/* Tipo de equipo */}
            {item.tipo && (
              <View style={styles.infoFila}>
                <Ionicons name="pricetag-outline" size={18} color="#666" />
                <Text style={styles.infoTexto}>{item.tipo}</Text>
              </View>
            )}

            {/* Marca/Modelo */}
            {(item.marca || item.modelo) && (
              <View style={styles.infoFila}>
                <Ionicons name="information-circle-outline" size={18} color="#666" />
                <Text style={styles.infoTexto}>
                  {[item.marca, item.modelo].filter(Boolean).join(' - ')}
                </Text>
              </View>
            )}

            {/* Estado */}
            <View style={styles.estadoContainer}>
              <View style={styles.estadoFila}>
                <View style={styles.estadoInfo}>
                  <Ionicons 
                    name={disponible ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={disponible ? '#27ae60' : '#e74c3c'} 
                  />
                  <Text style={[
                    styles.estadoTexto,
                    { color: disponible ? '#27ae60' : '#e74c3c' }
                  ]}>
                    {disponible ? 'Disponible' : 'No disponible'}
                  </Text>
                </View>
                
                <Switch
                  value={disponible}
                  onValueChange={() => cambiarEstadoEquipo(item.id, disponible)}
                  trackColor={{ false: '#e0e0e0', true: COLORES.primario + '80' }}
                  thumbColor={disponible ? COLORES.primario : '#999'}
                />
              </View>
              
              <Text style={styles.estadoDescripcion}>
                {disponible 
                  ? 'El equipo está disponible para asignar a mantenimientos'
                  : 'El equipo no está disponible para uso'
                }
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={styles.contenedorCentrado}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando datos...</Text>
      </View>
    );
  }

  const datosActuales = vistaActual === 'trabajadores' ? trabajadores : equipos;
  const renderItemActual = vistaActual === 'trabajadores' ? renderTrabajador : renderEquipo;

  return (
    <View style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      {/* Pestañas */}
      <View style={styles.contenedorPestanas}>
        <TouchableOpacity
          style={[
            styles.pestana,
            vistaActual === 'trabajadores' && styles.pestanaActiva
          ]}
          onPress={() => {
            setVistaActual('trabajadores');
            setExpandido(null);
          }}
        >
          <Ionicons 
            name="people" 
            size={20} 
            color={vistaActual === 'trabajadores' ? COLORES.primario : '#666'} 
          />
          <Text style={[
            styles.textoPestana,
            vistaActual === 'trabajadores' && styles.textoPestanaActiva
          ]}>
            Trabajadores
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pestana,
            vistaActual === 'equipos' && styles.pestanaActiva
          ]}
          onPress={() => {
            setVistaActual('equipos');
            setExpandido(null);
          }}
        >
          <Ionicons 
            name="construct" 
            size={20} 
            color={vistaActual === 'equipos' ? COLORES.primario : '#666'} 
          />
          <Text style={[
            styles.textoPestana,
            vistaActual === 'equipos' && styles.textoPestanaActiva
          ]}>
            Equipos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={datosActuales}
        renderItem={renderItemActual}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.contenedorVacio}>
            <Ionicons 
              name={vistaActual === 'trabajadores' ? "people-outline" : "construct-outline"} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.textoVacio}>
              {vistaActual === 'trabajadores' 
                ? 'No hay trabajadores registrados' 
                : 'No hay equipos registrados'
              }
            </Text>
            <Text style={styles.textoVacioSecundario}>
              Toca el botón "+" para agregar {vistaActual === 'trabajadores' ? 'un nuevo trabajador' : 'un nuevo equipo'}
            </Text>
          </View>
        }
      />

      {/* Botón flotante para agregar */}
      <TouchableOpacity
        style={styles.botonFlotante}
        onPress={() => {
          if (vistaActual === 'trabajadores') {
            navigation.navigate('AgregarTrabajador', {
              onTrabajadorAgregado: cargarTrabajadores
            });
          } else {
            navigation.navigate('AgregarEquipo', {
              onEquipoAgregado: cargarEquipos
            });
          }
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorCentrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORES.fondo,
  },
  contenedorPestanas: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pestana: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  pestanaActiva: {
    borderBottomWidth: 3,
    borderBottomColor: COLORES.primario,
  },
  textoPestana: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  textoPestanaActiva: {
    color: COLORES.primario,
    fontWeight: '600',
  },
  contenedorVacio: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  textoVacio: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  textoVacioSecundario: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.texto,
    marginBottom: 4,
  },
  rut: {
    fontSize: 13,
    color: '#666',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  separador: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  infoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTexto: {
    fontSize: 14,
    color: COLORES.texto,
    marginLeft: 10,
    flex: 1,
  },
  estadoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  estadoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  estadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estadoTexto: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  estadoDescripcion: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  botonFlotante: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORES.primario,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});