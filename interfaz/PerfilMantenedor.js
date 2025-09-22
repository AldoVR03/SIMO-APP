import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import estilos, { COLORES } from '../assets/estilos';

import { auth } from '../servicio/firebase-config';
import { db } from '../servicio/firebase-config';
import { doc, getDoc } from 'firebase/firestore';

export default function PerfilMantenedor({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, "Usuario", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            console.log("No se encontró el documento del usuario en Firestore.");
            Alert.alert("Error", "No se encontró la información del perfil.");
          }
        } catch (error) {
          console.error("Error al obtener el perfil del usuario:", error);
          Alert.alert("Error", "Hubo un problema al cargar el perfil.");
        }
      } else {
        Alert.alert("Error", "Usuario no autenticado.");
      }
      setCargando(false);
    }

    fetchUserData();
  }, []);

  if (cargando) {
    return (
      <View style={[estilos.contenedor, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={{ marginTop: 10 }}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>SGS</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={estilos.flechaVolver}>←</Text>
      </TouchableOpacity>
      <Text style={estilos.etiqueta}>Nombre Completo:</Text>
      <TextInput 
        style={estilos.entrada} 
        value={userData?.Nombre || 'Cargando...'} 
        editable={false} 
      />

      <Text style={estilos.etiqueta}>Correo:</Text>
      <TextInput 
        style={estilos.entrada} 
        value={userData?.correo || 'Cargando...'} 
        editable={false} 
      />

      <Text style={estilos.etiqueta}>Contraseña:</Text>
      <View style={estilos.fila}>
        <TextInput
          style={[estilos.entrada, { flex: 1 }]}
          value="**********"
          editable={false}
          secureTextEntry
        />
        <TouchableOpacity onPress={() => navigation.navigate('CambioContrasenaMantenedor')}>
          <Ionicons name="create-outline" size={24} color="#444" />
        </TouchableOpacity>
      </View>
      <Text style={estilos.etiqueta}>Rut:</Text>
      <TextInput 
        style={estilos.entrada} 
        value={userData?.rut || 'Cargando...'} 
        editable={false} 
      />
    </View>
  );
}