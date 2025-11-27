import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { collection, query, orderBy, startAt, endAt, getDocs } from "firebase/firestore";
import { db } from "../servicio/firebase-config";
import estilosComunes, { COLORES } from '../assets/estilos';

export default function BuscarNombre({ navigation }) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    if (busqueda.trim() === "") {
      setResultados([]);
      return;
    }

    const obtenerEquipos = async () => {
      try {
        const busquedaMayus = busqueda.toUpperCase();

        const q = query(
          collection(db, "equipos"),
          orderBy("nombre"),
          startAt(busquedaMayus),
          endAt(busquedaMayus + '\uf8ff')
        );

        const snapshot = await getDocs(q);
        const lista = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setResultados(lista);
      } catch (error) {
        console.error("❌ Error en búsqueda:", error);
      }
    };

    obtenerEquipos();
  }, [busqueda]);

  return (
    <View style={estilosComunes.contenedor}>
      <Text style={estilosComunes.titulo}>Buscar Equipo</Text>

      <Text style={estilosComunes.etiqueta}>Nombre del equipo:</Text>
      <TextInput
        style={estilosComunes.entrada}
        placeholder="Ej: HORNOS"
        onChangeText={setBusqueda}
        value={busqueda}
        placeholderTextColor="#999"
        autoCapitalize="characters"
      />

      <FlatList
        data={resultados}
        keyExtractor={(item) => item.id}
        style={{ width: '100%', marginTop: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={estilosComunes.tarjetaInforme}
            onPress={() => {
              navigation.navigate('InformesEquipo', {
                equipoId: item.id,
                equipoNombre: item.nombre
              });
            }}
          >
            <View style={estilosComunes.tarjetaContenido}>
              <Text style={estilosComunes.tituloTarjeta}>
                {item.nombre}
              </Text>
              <View style={[estilosComunes.tarjetaEstado, { backgroundColor: COLORES.primario }]}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                  {item.id}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          busqueda.trim() !== "" ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
              No se encontraron equipos
            </Text>
          ) : null
        }
      />
    </View>
  );
}