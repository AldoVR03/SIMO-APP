import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ref, set } from 'firebase/database';
import { database } from '../servicio/firebase-config';
import estilosComunes, { COLORES } from '../assets/estilos';
import { Ionicons } from '@expo/vector-icons';

const AgregarEquipo = ({ navigation }) => {
  const [equipo, setEquipo] = useState('');
  const [codigoSgs, setCodigoSgs] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [preguntas, setPreguntas] = useState([]);
  const [nuevaPregunta, setNuevaPregunta] = useState('');

  // Agregar pregunta a la lista
  const agregarPregunta = () => {
    if (nuevaPregunta.trim() === '') {
      Alert.alert('Error', 'Por favor ingrese una pregunta');
      return;
    }

    setPreguntas([...preguntas, nuevaPregunta.trim()]);
    setNuevaPregunta('');
  };

  // Eliminar pregunta de la lista
  const eliminarPregunta = (index) => {
    const nuevasPreguntas = preguntas.filter((_, i) => i !== index);
    setPreguntas(nuevasPreguntas);
  };

  // Validar formulario
  const validarFormulario = () => {
    if (!equipo.trim()) {
      Alert.alert('Error', 'Por favor ingrese el nombre del equipo');
      return false;
    }
    if (!codigoSgs.trim()) {
      Alert.alert('Error', 'Por favor ingrese el código SGS');
      return false;
    }
    if (!marca.trim()) {
      Alert.alert('Error', 'Por favor ingrese la marca');
      return false;
    }
    if (!modelo.trim()) {
      Alert.alert('Error', 'Por favor ingrese el modelo');
      return false;
    }
    if (preguntas.length === 0) {
      Alert.alert('Error', 'Por favor agregue al menos una pregunta');
      return false;
    }
    return true;
  };

  // Guardar equipo en Firebase
  const guardarEquipo = async () => {
    if (!validarFormulario()) return;

    try {
      const equipoData = {
        // Datos del formulario
        equipo: equipo.trim(),
        codigo_sgs: codigoSgs.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        numero_serie: numeroSerie.trim(),
        pauta_mantenimiento: preguntas.map((pregunta, index) => ({
          id: index + 1,
          pregunta: pregunta,
          respuesta: '',
        })),

        // Campos que se inicializan vacíos
        fecha: '',
        mantenedor: '',
        firma_mantenedor: '',
        supervisor: '',
        firma_supervisor: '',
        a_calidad_dgm: '',
        firma_a_calidad_dgm: '',
      };

      // Guardar en Firebase usando el codigo_sgs como clave
      await set(ref(database, `plantilla/${codigoSgs.trim()}`), equipoData);

      Alert.alert('Éxito', 'Equipo guardado correctamente', [
        {
          text: 'OK',
          onPress: () => {
            // Limpiar formulario
            setEquipo('');
            setCodigoSgs('');
            setMarca('');
            setModelo('');
            setNumeroSerie('');
            setPreguntas([]);
            setNuevaPregunta('');
            
            // Opcional: volver atrás
            // navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert('Error', 'No se pudo guardar el equipo. Intente nuevamente.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORES.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={estilosComunes.encabezado}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
          </TouchableOpacity>
          <Text style={estilosComunes.logoTexto}>SIMO-APP</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Título */}
        <Text style={estilosComunes.titulo}>Agregar Equipo</Text>

        {/* Formulario de datos del equipo */}
        <Text style={estilosComunes.etiqueta}>Nombre del Equipo</Text>
        <TextInput
          style={estilosComunes.entrada}
          placeholder="Ej: HORNO DE SECADO n2"
          value={equipo}
          onChangeText={setEquipo}
        />

        <Text style={estilosComunes.etiqueta}>Código SGS</Text>
        <TextInput
          style={estilosComunes.entrada}
          placeholder="Ej: LAB-DGM-HOR-002"
          value={codigoSgs}
          onChangeText={setCodigoSgs}
          autoCapitalize="characters"
        />

        <Text style={estilosComunes.etiqueta}>Marca</Text>
        <TextInput
          style={estilosComunes.entrada}
          placeholder="Ej: AINGETHERM"
          value={marca}
          onChangeText={setMarca}
        />

        <Text style={estilosComunes.etiqueta}>Modelo</Text>
        <TextInput
          style={estilosComunes.entrada}
          placeholder="Ej: HS200.1000.AG"
          value={modelo}
          onChangeText={setModelo}
        />

        <Text style={estilosComunes.etiqueta}>Número de Serie (Opcional)</Text>
        <TextInput
          style={estilosComunes.entrada}
          placeholder="Ej: 5237278"
          value={numeroSerie}
          onChangeText={setNumeroSerie}
        />

        {/* Sección de preguntas */}
        <View style={{ marginTop: 20 }}>
          <Text style={[estilosComunes.etiqueta, { fontSize: 16, fontWeight: 'bold' }]}>
            Pauta de Mantenimiento
          </Text>

          {/* Input para agregar pregunta */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <TextInput
              style={[estilosComunes.entrada, { flex: 1, marginBottom: 0, marginRight: 8 }]}
              placeholder="Escriba una pregunta"
              value={nuevaPregunta}
              onChangeText={setNuevaPregunta}
              multiline
            />
            <TouchableOpacity
              onPress={agregarPregunta}
              style={{
                backgroundColor: COLORES.primario,
                padding: 12,
                borderRadius: 6,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Lista de preguntas agregadas */}
          {preguntas.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[estilosComunes.etiqueta, { fontWeight: 'bold' }]}>
                Preguntas agregadas ({preguntas.length}):
              </Text>
              {preguntas.map((pregunta, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ flex: 1, color: COLORES.texto }}>
                    {index + 1}. {pregunta}
                  </Text>
                  <TouchableOpacity onPress={() => eliminarPregunta(index)}>
                    <Ionicons name="trash-outline" size={20} color="#d9534f" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          style={[estilosComunes.boton, { marginTop: 24 }]}
          onPress={guardarEquipo}
        >
          <Text style={estilosComunes.textoBoton}>Guardar Equipo</Text>
        </TouchableOpacity>

        {/* Espacio inferior */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AgregarEquipo;