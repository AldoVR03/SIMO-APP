import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../servicio/firebase-config';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function InformeCorrectivo({ route, navigation }) {
  const { equipoId, equipoNombre, equipo } = route.params;
  
  const auth = getAuth();
  const usuario = auth.currentUser;

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [cargandoUsuario, setCargandoUsuario] = useState(true);

  const [datosInforme, setDatosInforme] = useState({
    nombreEquipo: equipo?.equipo || equipoNombre || '',
    codigoSGS: equipo?.codigo_sgs || equipoId || '',
    responsable: '',
    duracionEstimada: '',
    ubicacion: '',
    prioridad: 'Media',
    localidad: '',
    jefeLaboratorio: '',
    ubicacionEquipo: '',
    fechaProgramada: '',
    fechaInicio: '',
    horaInicio: '',
    fechaFinalizacion: '',
    horaFinalizacion: '',
    tiempoDetenido: '',
  });

  useEffect(() => {
    obtenerNombreUsuario();
  }, []);

  const obtenerNombreUsuario = async () => {
    try {
      setCargandoUsuario(true);
      
      console.log('🔍 Usuario autenticado:', usuario?.email);
      console.log('🔍 UID del usuario:', usuario?.uid);
      
      if (!usuario?.uid) {
        console.log('❌ No hay usuario autenticado');
        setNombreUsuario('Usuario desconocido');
        setDatosInforme(prev => ({ ...prev, responsable: 'Usuario desconocido' }));
        setCargandoUsuario(false);
        return;
      }

      console.log('🔍 Buscando documento en Usuario con ID:', usuario.uid);
      
      // ✅ CORRECCIÓN: Eliminar el await import() ya que los imports están al inicio
      const docRef = doc(db, 'Usuario', usuario.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        console.log('✅ Datos del usuario encontrados:', userData);

        const nombre = userData.nombre || '';
        const apellido = userData.apellido || '';
        const nombreCompleto = `${nombre} ${apellido}`.trim();

        if (!nombre || !apellido) {
          console.log('⚠️ Advertencia: Faltan datos del usuario');
          console.log('   Nombre:', nombre || 'NO DISPONIBLE');
          console.log('   Apellido:', apellido || 'NO DISPONIBLE');
        }
        const nombreFinal = nombreCompleto || usuario.email;
        
        console.log('✅ Nombre completo obtenido:', nombreFinal);
        setNombreUsuario(nombreFinal);
        setDatosInforme(prev => ({ ...prev, responsable: nombreFinal }));
      } else {
        console.log('⚠️ No se encontró documento con UID:', usuario.uid);
        const fallbackName = usuario.displayName || usuario.email;
        setNombreUsuario(fallbackName);
        setDatosInforme(prev => ({ ...prev, responsable: fallbackName }));
      }
    } catch (error) {
      console.error('❌ Error al obtener nombre de usuario:', error);
      const fallbackName = usuario?.displayName || usuario?.email || 'Usuario';
      setNombreUsuario(fallbackName);
      setDatosInforme(prev => ({ ...prev, responsable: fallbackName }));
    } finally {
      setCargandoUsuario(false);
    }
  };

  const prioridades = ['Baja', 'Media', 'Alta', 'Crítica'];

  const actualizarCampo = (campo, valor) => {
    setDatosInforme(prev => ({ ...prev, [campo]: valor }));
  };

  const obtenerColorPrioridad = (prioridad) => {
    switch (prioridad) {
      case 'Baja': return '#95a5a6';
      case 'Media': return '#f39c12';
      case 'Alta': return '#e67e22';
      case 'Crítica': return '#e74c3c';
      default: return '#ccc';
    }
  };

  const validarCampos = () => {
    if (!datosInforme.duracionEstimada) {
      Alert.alert('Error', 'Ingresa la duración estimada en minutos');
      return false;
    }
    if (!datosInforme.ubicacion.trim()) {
      Alert.alert('Error', 'Ingresa la ubicación');
      return false;
    }
    if (!datosInforme.localidad.trim()) {
      Alert.alert('Error', 'Ingresa la localidad');
      return false;
    }
    if (!datosInforme.jefeLaboratorio.trim()) {
      Alert.alert('Error', 'Ingresa el jefe de laboratorio');
      return false;
    }
    if (!datosInforme.ubicacionEquipo.trim()) {
      Alert.alert('Error', 'Ingresa la ubicación del equipo');
      return false;
    }
    if (!datosInforme.fechaProgramada.trim()) {
      Alert.alert('Error', 'Ingresa la fecha programada (dd/mm/aaaa)');
      return false;
    }
    if (!datosInforme.fechaInicio.trim()) {
      Alert.alert('Error', 'Ingresa la fecha de inicio (dd/mm/aaaa)');
      return false;
    }
    if (!datosInforme.horaInicio.trim()) {
      Alert.alert('Error', 'Ingresa la hora de inicio (HH:MM)');
      return false;
    }
    if (!datosInforme.fechaFinalizacion.trim()) {
      Alert.alert('Error', 'Ingresa la fecha de finalización (dd/mm/aaaa)');
      return false;
    }
    if (!datosInforme.horaFinalizacion.trim()) {
      Alert.alert('Error', 'Ingresa la hora de finalización (HH:MM)');
      return false;
    }
    if (!datosInforme.tiempoDetenido) {
      Alert.alert('Error', 'Ingresa el tiempo detenido en minutos');
      return false;
    }
    return true;
  };

  const continuarAProcesos = () => {
    if (!validarCampos()) return;

    navigation.navigate('ProcesosCorrectivo', {
      datosInforme: datosInforme
    });
  };

  if (cargandoUsuario) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORES.primario} />
          <Text style={{ marginTop: 10, color: COLORES.texto }}>
            Cargando datos del usuario...
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
          <Text style={{ fontSize: 24, color: COLORES.texto }}>←</Text>
        </TouchableOpacity>
        <Text style={[estilosComunes.titulo, { margin: 0, flex: 1, textAlign: 'center' }]}>
          Informe Correctivo
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 24, paddingBottom: 50 }}
      >

        <Text style={estilosComunes.etiqueta}>Nombre del Equipo</Text>
        <TextInput
          style={[estilosComunes.entrada, { backgroundColor: '#f5f5f5', color: '#666' }]}
          value={datosInforme.nombreEquipo}
          editable={false}
        />

        <Text style={estilosComunes.etiqueta}>Código SGS</Text>
        <TextInput
          style={[estilosComunes.entrada, { backgroundColor: '#f5f5f5', color: '#666' }]}
          value={datosInforme.codigoSGS}
          editable={false}
        />

        <Text style={estilosComunes.etiqueta}>Responsable</Text>
        <TextInput
          style={[estilosComunes.entrada, { backgroundColor: '#f5f5f5', color: '#666' }]}
          value={datosInforme.responsable}
          editable={false}
        />

        <Text style={estilosComunes.etiqueta}>Duración Estimada (minutos)</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.duracionEstimada}
          onChangeText={(valor) => actualizarCampo('duracionEstimada', valor)}
          keyboardType="numeric"
          placeholder="Ej: 60"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Ubicación</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.ubicacion}
          onChangeText={(valor) => actualizarCampo('ubicacion', valor)}
          placeholder="Ingresa la ubicación"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Prioridad</Text>
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          marginBottom: 16,
          gap: 8,
        }}>
          {prioridades.map((prioridad) => (
            <TouchableOpacity
              key={prioridad}
              style={{
                flex: 1,
                minWidth: '45%',
                padding: 12,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: datosInforme.prioridad === prioridad 
                  ? obtenerColorPrioridad(prioridad) 
                  : '#ddd',
                backgroundColor: datosInforme.prioridad === prioridad 
                  ? obtenerColorPrioridad(prioridad) 
                  : '#fff',
                alignItems: 'center',
              }}
              onPress={() => actualizarCampo('prioridad', prioridad)}
            >
              <Text style={{
                fontWeight: 'bold',
                color: datosInforme.prioridad === prioridad ? '#fff' : '#666',
              }}>
                {prioridad}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={estilosComunes.etiqueta}>Localidad</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.localidad}
          onChangeText={(valor) => actualizarCampo('localidad', valor)}
          placeholder="Ingresa la localidad"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Jefe de Laboratorio</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.jefeLaboratorio}
          onChangeText={(valor) => actualizarCampo('jefeLaboratorio', valor)}
          placeholder="Nombre del jefe de laboratorio"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Ubicación del Equipo</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.ubicacionEquipo}
          onChangeText={(valor) => actualizarCampo('ubicacionEquipo', valor)}
          placeholder="Ubicación específica del equipo"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Fecha Programada</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.fechaProgramada}
          onChangeText={(valor) => actualizarCampo('fechaProgramada', valor)}
          placeholder="dd/mm/aaaa"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Fecha de Inicio</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.fechaInicio}
          onChangeText={(valor) => actualizarCampo('fechaInicio', valor)}
          placeholder="dd/mm/aaaa"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Hora de Inicio</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.horaInicio}
          onChangeText={(valor) => actualizarCampo('horaInicio', valor)}
          placeholder="HH:MM"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Fecha de Finalización</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.fechaFinalizacion}
          onChangeText={(valor) => actualizarCampo('fechaFinalizacion', valor)}
          placeholder="dd/mm/aaaa"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Hora de Finalización</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.horaFinalizacion}
          onChangeText={(valor) => actualizarCampo('horaFinalizacion', valor)}
          placeholder="HH:MM"
          placeholderTextColor="#999"
        />

        <Text style={estilosComunes.etiqueta}>Tiempo Detenido (minutos)</Text>
        <TextInput
          style={estilosComunes.entrada}
          value={datosInforme.tiempoDetenido}
          onChangeText={(valor) => actualizarCampo('tiempoDetenido', valor)}
          keyboardType="numeric"
          placeholder="Ej: 120"
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[estilosComunes.boton, { backgroundColor: '#e67e22', marginTop: 20 }]}
          onPress={continuarAProcesos}
        >
          <Text style={estilosComunes.textoBoton}>
            Continuar a Procesos →
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}